const csv = require('csv-parser');
const { Readable } = require('stream');

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const normalizeRow = (row) => ({
  title: row.title || row.Title || '',
  category: row.category || row.Category || '',
  gameName: row.gameName || row['Game Name'] || row.game || '',
  sellerName: row.sellerName || row['Seller Name'] || row.seller || '',
  price: toNumber(row.price || row.Price),
  rating: toNumber(row.rating || row.Rating),
  userLevel: toNumber(row.userLevel || row['User Level']),
  sellerRank: row.sellerRank || row['Seller Rank'] || '',
  score: toNumber(row.score || row.Score),
  groupName: row.groupName || row.Group || row.group || '',
  ordersSold: toNumber(row.ordersSold || row['Orders Sold'])
});

const parseCsvBuffer = (buffer) =>
  new Promise((resolve, reject) => {
    const records = [];

    Readable.from([buffer])
      .pipe(csv())
      .on('data', (row) => records.push(normalizeRow(row)))
      .on('end', () => resolve(records.filter((record) => record.title)))
      .on('error', reject);
  });

module.exports = parseCsvBuffer;
