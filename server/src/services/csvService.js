const { Parser } = require('json2csv');

const preferredExportFields = [
  { label: 'ID', value: '_id' },
  { label: 'Game Name', value: 'gameName' },
  { label: 'Product Url', value: 'productUrl' },
  { label: 'Title', value: 'title' },
  { label: 'Description', value: 'description' },
  { label: 'Price', value: 'price' },
  { label: 'Orders Sold', value: 'ordersSold' },
  { label: 'Seller Name', value: 'sellerName' },
  { label: 'Category', value: 'category' },
  { label: 'Rating', value: 'rating' },
  { label: 'User Level', value: 'userLevel' },
  { label: 'Seller Rank', value: 'sellerRank' },
  { label: 'Score', value: 'score' },
  { label: 'Group', value: 'groupName' },
  { label: 'Created At', value: 'createdAt' },
  { label: 'Updated At', value: 'updatedAt' },
  { label: 'Offer Id', value: 'offerId' },
  { label: 'Brand Id', value: 'brandId' },
  { label: 'Product Name', value: 'productName' },
  { label: 'Total Offer', value: 'totalOffer' },
  { label: 'Display Currency', value: 'displayCurrency' },
  { label: 'Display Price', value: 'displayPrice' },
  { label: 'Converted Unit Price', value: 'convertedUnitPrice' },
  { label: 'Is Unique', value: 'isUnique' },
  { label: 'Is Group Display', value: 'isGroupDisplay' },
  { label: 'Delivery Speed', value: 'deliverySpeed' },
  { label: 'Total Rating', value: 'totalRating' },
  { label: 'Status', value: 'status' },
  { label: 'Seller Id', value: 'sellerId' },
  { label: 'Is Online', value: 'isOnline' },
  { label: 'Online Datetime', value: 'onlineDatetime' },
  { label: 'Update Log', value: 'updateLog' },
  { label: 'Type', value: 'type' },
  { label: 'User Avatar', value: 'userAvatar' },
  { label: 'Offer Attributes', value: 'offerAttributes' },
  { label: 'Gallery Images', value: 'galleryImages' }
];

const IGNORED_EXPORT_KEYS = new Set(['__v']);

const humanizeFieldName = (value) =>
  String(value)
    .replace(/_/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const getFieldValue = (record, field) => {
  if (!record || typeof record !== 'object') {
    return '';
  }

  const rawValue =
    typeof field.value === 'function'
      ? field.value(record)
      : record?.[field.value];

  if (rawValue === undefined || rawValue === null) {
    return '';
  }

  if (Array.isArray(rawValue)) {
    return rawValue.join(', ');
  }

  if (typeof rawValue === 'object') {
    return JSON.stringify(rawValue);
  }

  return String(rawValue);
};

const normalizeCellText = (value) =>
  String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();

const escapeHtml = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const buildExportFields = (records = []) => {
  const availableKeys = new Set();

  for (const record of records) {
    if (!record || typeof record !== 'object') {
      continue;
    }

    for (const key of Object.keys(record)) {
      if (!IGNORED_EXPORT_KEYS.has(key)) {
        availableKeys.add(key);
      }
    }
  }

  const fields = [...preferredExportFields];
  const preferredKeys = new Set(fields.map((field) => field.value));

  for (const key of availableKeys) {
    if (!preferredKeys.has(key)) {
      fields.push({
        label: humanizeFieldName(key),
        value: key
      });
    }
  }

  return fields;
};

const mapRecordToExportRow = (record, fields) =>
  fields.reduce((row, field) => {
    row[field.label] = normalizeCellText(getFieldValue(record, field));
    return row;
  }, {});

const buildExportRows = (records = [], fields = buildExportFields(records)) =>
  (Array.isArray(records) ? records : []).map((record) => mapRecordToExportRow(record, fields));

const createCsv = (records) => {
  const fields = buildExportFields(records);
  const parser = new Parser({ fields: fields.map((field) => field.label) });
  return parser.parse(buildExportRows(records, fields));
};

const createTsv = (records) => {
  const fields = buildExportFields(records);
  const parser = new Parser({ fields: fields.map((field) => field.label), delimiter: '\t' });
  return parser.parse(buildExportRows(records, fields));
};

const createJson = (records) => JSON.stringify(buildExportRows(records), null, 2);

const createExcel = (records) => {
  const fields = buildExportFields(records);
  const descriptionFieldKey = 'description';
  const rows = (Array.isArray(records) ? records : []).map((record) =>
    fields
      .map((field) => {
        const rawValue = getFieldValue(record, field);
        const value = normalizeCellText(rawValue);
        const escapedValue = escapeHtml(value);

        if (field.value === 'productUrl' && /^https?:\/\//i.test(value)) {
          return `<td class="cell cell-url"><a href="${escapeHtml(value)}">${escapedValue}</a></td>`;
        }

        return `<td class="cell${field.value === descriptionFieldKey ? ' cell-description' : ''}">${escapedValue}</td>`;
      })
      .join('')
  );

  const headerMarkup = fields
    .map((field) => `<th class="header">${escapeHtml(field.label)}</th>`)
    .join('');

  return [
    '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">',
    '<head>',
    '<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />',
    '<meta name="ProgId" content="Excel.Sheet" />',
    '<meta name="Generator" content="Buyer Trend Lens" />',
    '<style>',
    'table { border-collapse: collapse; width: 100%; font-family: Calibri, Arial, sans-serif; table-layout: fixed; }',
    '.header { background: #dbeafe; color: #0f172a; font-weight: 700; text-align: center; border: 1px solid #cbd5e1; padding: 10px 12px; }',
    '.cell { border: 1px solid #e2e8f0; padding: 8px 10px; text-align: center; vertical-align: middle; }',
    '.cell-description { width: 180px; min-width: 180px; max-width: 180px; white-space: normal; word-break: break-word; line-height: 1.35; }',
    '.cell-url { min-width: 260px; max-width: 260px; }',
    '.cell-url a { color: #1d4ed8; text-decoration: underline; }',
    '</style>',
    '</head>',
    '<body>',
    '<table>',
    `<thead><tr>${headerMarkup}</tr></thead>`,
    `<tbody>${rows.map((row) => `<tr>${row}</tr>`).join('')}</tbody>`,
    '</table>',
    '</body>',
    '</html>'
  ].join('');
};

module.exports = {
  exportFields: preferredExportFields,
  buildExportFields,
  createCsv,
  createExcel,
  createJson,
  createTsv
};
