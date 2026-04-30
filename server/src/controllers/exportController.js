const DataRecord = require('../models/DataRecord');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { buildFilters } = require('../services/filterService');
const { createCsv, createJson, createTsv } = require('../services/csvService');
const {
  isRemoteDatasetEnabled,
  countRemoteDatasetRecords,
  fetchAllRemoteDatasetRecords,
  enrichRemoteDatasetRecordsForExport
} = require('../services/remoteDatasetService');

const COIN_COST_PER_ROW = 1;
const DEFAULT_EXPORT_FORMAT = 'csv';

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

const previewExport = asyncHandler(async (req, res) => {
  const rawFilters = req.body || {};
  const format = getExportFormat(rawFilters.format);
  const filters = buildFilters(rawFilters);
  const totalRows = isRemoteDatasetEnabled()
    ? await countRemoteDatasetRecords(rawFilters)
    : await DataRecord.countDocuments(filters);
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
  const format = getExportFormat(rawFilters.format);
  const exportConfig = exportFormatConfig[format];
  const filters = buildFilters(rawFilters);
  const totalRows = isRemoteDatasetEnabled()
    ? await countRemoteDatasetRecords(rawFilters)
    : await DataRecord.countDocuments(filters);

  if (!totalRows) {
    res.status(400);
    throw new Error('No rows match the selected filters.');
  }

  const cost = Number((totalRows * COIN_COST_PER_ROW).toFixed(2));

  const records = isRemoteDatasetEnabled()
    ? await enrichRemoteDatasetRecordsForExport(await fetchAllRemoteDatasetRecords(rawFilters))
    : await DataRecord.find(filters).sort({ createdAt: -1 }).lean();
  const content = exportConfig.createContent(records);

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
      filters,
      format
    }
  });

  res.json({
    filename: `dataset-export-${Date.now()}.${exportConfig.filenameExtension}`,
    content,
    mimeType: exportConfig.mimeType,
    format,
    totalRows,
    cost,
    balance: updatedUser.coins
  });
});

module.exports = {
  previewExport,
  exportCsv
};
