const NodeCache = require('node-cache');

const filterCache = new NodeCache({ stdTTL: 30 });
const filterOptionsCache = new NodeCache({ stdTTL: 300 });
const publicStatsCache = new NodeCache({ stdTTL: 120 });

const SELLER_RANK_MAP = {
  '1': 'Normal Seller',
  '2': 'Common Seller',
  '3': 'Uncommon Seller',
  '4': 'Rare Seller',
  '5': 'Epic Seller',
  '6': 'Legendary Seller'
};
const SELLER_RANKS = Object.values(SELLER_RANK_MAP);

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const toNumber = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const resolveSellerRankLabel = (value) => {
  const normalized = String(value || '').trim();

  if (!normalized) {
    return '';
  }

  return SELLER_RANK_MAP[normalized] || normalized;
};

const getSellerRankThresholdLabels = (value) => {
  const resolved = resolveSellerRankLabel(value);

  if (!resolved) {
    return [];
  }

  const startIndex = SELLER_RANKS.findIndex((item) => item.toLowerCase() === resolved.toLowerCase());
  return startIndex === -1 ? [resolved] : SELLER_RANKS.slice(startIndex);
};

const buildSellerRankMatch = (value) => {
  const ranks = getSellerRankThresholdLabels(value);

  if (!ranks.length) {
    return null;
  }

  return { $in: ranks };
};

const buildFilters = (input = {}) => {
  // Keep filter construction centralized so table and export queries stay identical.
  const query = {};
  const search = input.search?.trim();
  const category = input.category?.trim();
  const gameName = input.gameName?.trim();
  const sellerName = input.sellerName?.trim();
  const sellerRank = input.minSellerRank || input.sellerRank;
  const groupName = input.groupName?.trim() || input.group?.trim();

  if (search) {
    query.title = { $regex: escapeRegex(search), $options: 'i' };
  }

  if (category) {
    query.category = { $regex: `^${escapeRegex(category)}$`, $options: 'i' };
  }

  if (gameName) {
    query.gameName = { $regex: escapeRegex(gameName), $options: 'i' };
  }

  if (sellerName) {
    query.sellerName = { $regex: escapeRegex(sellerName), $options: 'i' };
  }

  const sellerRankMatch = buildSellerRankMatch(sellerRank);
  if (sellerRankMatch) {
    query.sellerRank = sellerRankMatch;
  }

  if (groupName) {
    query.groupName = { $regex: `^${escapeRegex(groupName)}$`, $options: 'i' };
  }

  const priceMin = toNumber(input.priceMin);
  const priceMax = toNumber(input.priceMax);
  if (priceMin !== null || priceMax !== null) {
    query.price = {};
    if (priceMin !== null) query.price.$gte = priceMin;
    if (priceMax !== null) query.price.$lte = priceMax;
  }

  const rating = toNumber(input.rating);
  if (rating !== null) {
    query.rating = { $gte: rating };
  }

  const userLevel = toNumber(input.userLevel);
  if (userLevel !== null) {
    query.userLevel = { $gte: userLevel };
  }

  const score = toNumber(input.score);
  if (score !== null) {
    query.score = { $gte: score };
  }

  const ordersSold = toNumber(input.ordersSold);
  if (ordersSold !== null) {
    query.ordersSold = { $gte: ordersSold };
  }

  return query;
};

const getCacheKey = (filters, page, limit) => JSON.stringify({ filters, page, limit });
const getOptionsCacheKey = (payload) => JSON.stringify(payload);
const clearQueryCaches = () => {
  filterCache.flushAll();
  filterOptionsCache.flushAll();
  publicStatsCache.flushAll();
};

module.exports = {
  buildFilters,
  buildSellerRankMatch,
  clearQueryCaches,
  filterCache,
  filterOptionsCache,
  getCacheKey,
  getOptionsCacheKey,
  getSellerRankThresholdLabels,
  publicStatsCache,
  resolveSellerRankLabel
};
