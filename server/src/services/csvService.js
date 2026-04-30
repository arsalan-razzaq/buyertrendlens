const { Parser } = require('json2csv');

const preferredExportFields = [
  { label: 'ID', value: '_id' },
  { label: 'Title', value: 'title' },
  { label: 'Category', value: 'category' },
  { label: 'Game Name', value: 'gameName' },
  { label: 'Seller Name', value: 'sellerName' },
  { label: 'Price', value: 'price' },
  { label: 'Rating', value: 'rating' },
  { label: 'User Level', value: 'userLevel' },
  { label: 'Seller Rank', value: 'sellerRank' },
  { label: 'Score', value: 'score' },
  { label: 'Group', value: 'groupName' },
  { label: 'Orders Sold', value: 'ordersSold' },
  { label: 'Created At', value: 'createdAt' },
  { label: 'Updated At', value: 'updatedAt' },
  { label: 'Offer Id', value: 'offerId' },
  { label: 'Brand Id', value: 'brandId' },
  { label: 'Product Name', value: 'productName' },
  { label: 'Product Url', value: 'productUrl' },
  { label: 'Total Offer', value: 'totalOffer' },
  { label: 'Display Currency', value: 'displayCurrency' },
  { label: 'Display Price', value: 'displayPrice' },
  { label: 'Converted Unit Price', value: 'convertedUnitPrice' },
  { label: 'Is Unique', value: 'isUnique' },
  { label: 'Is Group Display', value: 'isGroupDisplay' },
  { label: 'Description', value: 'description' },
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

const createCsv = (records) => {
  const parser = new Parser({ fields: buildExportFields(records) });
  return parser.parse(records);
};

const createTsv = (records) => {
  const parser = new Parser({ fields: buildExportFields(records), delimiter: '\t' });
  return parser.parse(records);
};

const createJson = (records) => JSON.stringify(records, null, 2);

module.exports = {
  exportFields: preferredExportFields,
  buildExportFields,
  createCsv,
  createJson,
  createTsv
};
