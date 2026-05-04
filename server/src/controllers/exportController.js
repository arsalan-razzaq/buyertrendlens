const DataRecord = require('../models/DataRecord');
const ExportFile = require('../models/ExportFile');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const zlib = require('zlib');
const asyncHandler = require('../utils/asyncHandler');
const { buildFilters, clearQueryCaches } = require('../services/filterService');
const { createCsv, createJson, createTsv } = require('../services/csvService');
const {
  isRemoteDatasetEnabled,
  countRemoteDatasetRecords,
  fetchAllRemoteDatasetRecords,
  enrichRemoteDatasetRecordsForExport
} = require('../services/remoteDatasetService');
const { normalizeDataset } = require('../utils/dataset');
const { EXPORT_RETENTION_DAYS, buildExportExpiryDate } = require('../utils/exportRetention');

const COIN_COST_PER_ROW = 1;
const DEFAULT_EXPORT_FORMAT = 'csv';
const MAX_EXPORT_ROWS = Math.max(Number(process.env.MAX_EXPORT_ROWS) || 50000, 1000);
const activeExportJobs = new Set();

const exportFormatConfig = {
  csv: {
    filenameExtension: 'csv',
    mimeType: 'text/csv;charset=utf-8;',
    createContent: createCsv,
    reason: 'CSV export'
  },
  json: {
    filenameExtension: 'json',
    mimeType: 'application/json;charset=utf-8;',
    createContent: createJson,
    reason: 'JSON export'
  },
  tsv: {
    filenameExtension: 'tsv',
    mimeType: 'text/tab-separated-values;charset=utf-8;',
    createContent: createTsv,
    reason: 'TSV export'
  }
};

const getExportFormat = (value) => exportFormatConfig[String(value || DEFAULT_EXPORT_FORMAT).toLowerCase()] ? String(value || DEFAULT_EXPORT_FORMAT).toLowerCase() : DEFAULT_EXPORT_FORMAT;

const assertLocalDatasetSupported = (dataset, res) => {
  if (dataset !== 'g2g') {
    res.status(501);
    throw new Error(`${dataset.toUpperCase()} dataset is not configured on this backend.`);
  }
};

const buildExportJobKey = (userId, dataset, format) => `${String(userId)}:${dataset}:${format}`;

const assertExportWithinLimit = (totalRows, res) => {
  if (Number(totalRows) > MAX_EXPORT_ROWS) {
    res.status(400);
    throw new Error(`Export exceeds the ${MAX_EXPORT_ROWS.toLocaleString()} row safety limit. Please narrow your filters.`);
  }
};

const coerceBinaryToBuffer = (value) => {
  if (!value) {
    return null;
  }

  if (Buffer.isBuffer(value)) {
    return value;
  }

  if (value instanceof Uint8Array) {
    return Buffer.from(value);
  }

  if (value && Buffer.isBuffer(value.buffer)) {
    return value.buffer;
  }

  if (value && value.buffer instanceof ArrayBuffer) {
    return Buffer.from(value.buffer);
  }

  if (typeof value?.value === 'function') {
    const resolved = value.value(true);
    if (Buffer.isBuffer(resolved)) {
      return resolved;
    }
    if (resolved instanceof Uint8Array) {
      return Buffer.from(resolved);
    }
  }

  if (Array.isArray(value?.data)) {
    return Buffer.from(value.data);
  }

  return null;
};

const resolveExportFileContent = (exportFile) => {
  const contentBuffer = coerceBinaryToBuffer(exportFile?.contentBuffer);

  if (contentBuffer?.length) {
    if (exportFile.contentEncoding === 'gzip') {
      return zlib.gunzipSync(contentBuffer).toString('utf8');
    }

    return contentBuffer.toString('utf8');
  }

  return String(exportFile?.content || '');
};

const previewExport = asyncHandler(async (req, res) => {
  const rawFilters = req.body || {};
  const dataset = normalizeDataset(rawFilters.dataset);
  const format = getExportFormat(rawFilters.format);
  const filters = buildFilters(rawFilters);
  const totalRows = isRemoteDatasetEnabled(dataset)
    ? await countRemoteDatasetRecords(rawFilters, dataset)
    : await (() => {
        assertLocalDatasetSupported(dataset, res);
        return DataRecord.countDocuments(filters);
      })();
  const cost = Number((totalRows * COIN_COST_PER_ROW).toFixed(2));
  const remainingBalance = Number(Math.max(req.user.coins - cost, 0).toFixed(2));

  res.json({
    totalRows,
    cost,
    currentBalance: req.user.coins,
    remainingBalance,
    canExport: req.user.coins >= cost,
    format
  });
});

const exportCsv = asyncHandler(async (req, res) => {
  const rawFilters = req.body || {};
  const dataset = normalizeDataset(rawFilters.dataset);
  const format = getExportFormat(rawFilters.format);
  const exportConfig = exportFormatConfig[format];
  const filters = buildFilters(rawFilters);
  const totalRows = isRemoteDatasetEnabled(dataset)
    ? await countRemoteDatasetRecords(rawFilters, dataset)
    : await (() => {
        assertLocalDatasetSupported(dataset, res);
        return DataRecord.countDocuments(filters);
      })();

  if (!totalRows) {
    res.status(400);
    throw new Error('No rows match the selected filters.');
  }
  assertExportWithinLimit(totalRows, res);

  const cost = Number((totalRows * COIN_COST_PER_ROW).toFixed(2));
  const jobKey = buildExportJobKey(req.user._id, dataset, format);

  if (activeExportJobs.has(jobKey)) {
    res.status(429);
    throw new Error('An export with the same dataset and format is already in progress for this account.');
  }

  activeExportJobs.add(jobKey);

  try {
    const records = isRemoteDatasetEnabled(dataset)
      ? await enrichRemoteDatasetRecordsForExport(await fetchAllRemoteDatasetRecords(rawFilters, dataset), dataset)
      : await (() => {
          assertLocalDatasetSupported(dataset, res);
          return DataRecord.find(filters).sort({ createdAt: -1 }).lean();
        })();
    const content = exportConfig.createContent(records);
    const compressedContent = zlib.gzipSync(Buffer.from(content, 'utf8'));

    // Deduct coins atomically so concurrent exports cannot overspend the same wallet balance.
    const updatedUser = await User.findOneAndUpdate(
      { _id: req.user._id, coins: { $gte: cost } },
      { $inc: { coins: -cost } },
      { new: true }
    );

    if (!updatedUser) {
      res.status(400);
      throw new Error('Insufficient coin balance for this export.');
    }

    await Transaction.create({
      userId: req.user._id,
      type: 'debit',
      amount: cost,
      reason: exportConfig.reason,
      metadata: {
        totalRows,
        dataset,
        filters,
        format
      }
    });

    const filename = `dataset-export-${dataset}-${Date.now()}.${exportConfig.filenameExtension}`;
    const exportFile = await ExportFile.create({
      userId: req.user._id,
      dataset,
      format,
      filename,
      mimeType: exportConfig.mimeType,
      contentBuffer: compressedContent,
      contentEncoding: 'gzip',
      totalRows,
      cost,
      filters: rawFilters,
      expiresAt: buildExportExpiryDate()
    });

    clearQueryCaches();

    res.json({
      id: exportFile._id,
      filename,
      mimeType: exportConfig.mimeType,
      format,
      totalRows,
      cost,
      balance: updatedUser.coins,
      expiresAt: exportFile.expiresAt,
      retentionDays: EXPORT_RETENTION_DAYS,
      downloadPath: `/export/${exportFile._id}/download`
    });
  } finally {
    activeExportJobs.delete(jobKey);
  }
});

const listExports = asyncHandler(async (req, res) => {
  const exports = await ExportFile.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  res.json({
    retentionDays: EXPORT_RETENTION_DAYS,
    exports: exports.map((item) => ({
      id: item._id,
      dataset: item.dataset,
      format: item.format,
      filename: item.filename,
      mimeType: item.mimeType,
      totalRows: Number(item.totalRows) || 0,
      cost: Number(item.cost) || 0,
      createdAt: item.createdAt,
      expiresAt: item.expiresAt
    }))
  });
});

const downloadExport = asyncHandler(async (req, res) => {
  const exportFile = await ExportFile.findOne({
    _id: req.params.id,
    userId: req.user._id
  }).lean();

  if (!exportFile) {
    res.status(404);
    throw new Error('Saved export file not found.');
  }

  res.json({
    id: exportFile._id,
    filename: exportFile.filename,
    mimeType: exportFile.mimeType,
    format: exportFile.format,
    totalRows: Number(exportFile.totalRows) || 0,
    cost: Number(exportFile.cost) || 0,
    createdAt: exportFile.createdAt,
    expiresAt: exportFile.expiresAt
  });
});

const streamExportDownload = asyncHandler(async (req, res) => {
  const exportFile = await ExportFile.findOne({
    _id: req.params.id,
    userId: req.user._id
  }).lean();

  if (!exportFile) {
    res.status(404);
    throw new Error('Saved export file not found.');
  }

  const content = resolveExportFileContent(exportFile);
  const filename = String(exportFile.filename || 'dataset-export');

  res.setHeader('Content-Type', exportFile.mimeType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${filename.replace(/"/g, '')}"`);
  res.send(Buffer.from(content, 'utf8'));
});

module.exports = {
  previewExport,
  exportCsv,
  listExports,
  downloadExport,
  streamExportDownload
};
