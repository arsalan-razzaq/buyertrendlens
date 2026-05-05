const DataRecord = require('../models/DataRecord');
const asyncHandler = require('../utils/asyncHandler');
const {
  buildFilters,
  buildSellerRankMatch,
  filterCache,
  getCacheKey,
  getOptionsCacheKey,
  filterOptionsCache,
  publicStatsCache,
  resolveSellerRankLabel
} = require('../services/filterService');
const { normalizeDataset } = require('../utils/dataset');
const {
  isRemoteDatasetEnabled,
  fetchRemoteDataset,
  countRemoteDatasetRecords,
  fetchRemoteFilterOptions
} = require('../services/remoteDatasetService');

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const toTrimmedString = (value) => String(value || '').trim();
const normalize = (value) => toTrimmedString(value).toLowerCase();
const sortGamesByOrders = (games = []) =>
  [...games].sort((firstGame, secondGame) => {
    const firstOrders = Number(firstGame?.total_success_order) || 0;
    const secondOrders = Number(secondGame?.total_success_order) || 0;

    if (secondOrders !== firstOrders) {
      return secondOrders - firstOrders;
    }

    return toTrimmedString(firstGame?.name).localeCompare(toTrimmedString(secondGame?.name));
  });

const clampOptionLimit = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 100;
  }

  return Math.min(Math.max(Math.trunc(parsed), 1), 250);
};

const assertLocalDatasetSupported = (dataset, res) => {
  if (dataset !== 'g2g') {
    res.status(501);
    throw new Error(`${dataset.toUpperCase()} dataset is not configured on this backend.`);
  }
};

const createDistinctPipeline = (
  field,
  { equals = '', contains = '', category = '', gameName = '', sellerName = '', sellerRank = '', limit = 100 } = {}
) => {
  const match = {
    [field]: { $exists: true, $ne: null }
  };

  const trimmedField = {
    $trim: {
      input: { $ifNull: [`$${field}`, ''] }
    }
  };

  const pipeline = [
    { $match: match },
    {
      $addFields: {
        __value: trimmedField,
        __lower: { $toLower: trimmedField }
      }
    },
    {
      $match: {
        __value: { $ne: '' }
      }
    }
  ];

  if (category) {
    pipeline.push({
      $match: {
        category: { $regex: `^${escapeRegex(category)}$`, $options: 'i' }
      }
    });
  }

  if (gameName) {
    pipeline.push({
      $match: {
        gameName: { $regex: `^${escapeRegex(gameName)}$`, $options: 'i' }
      }
    });
  }

  if (sellerName) {
    pipeline.push({
      $match: {
        sellerName: { $regex: `^${escapeRegex(sellerName)}$`, $options: 'i' }
      }
    });
  }

  if (sellerRank) {
    pipeline.push({
      $match: {
        sellerRank: buildSellerRankMatch(sellerRank)
      }
    });
  }

  if (equals) {
    pipeline.push({
      $match: {
        __lower: equals
      }
    });
  }

  if (contains) {
    pipeline.push({
      $match: {
        __value: { $regex: escapeRegex(contains), $options: 'i' }
      }
    });
  }

  pipeline.push(
    {
      $group: {
        _id: '$__lower',
        value: { $first: '$__value' }
      }
    },
    {
      $sort: { value: 1 }
    },
    {
      $limit: limit
    }
  );

  return pipeline;
};

const getDataRecords = asyncHandler(async (req, res) => {
  const dataset = normalizeDataset(req.query.dataset);
  const useRemoteDataset = isRemoteDatasetEnabled(dataset);
  const filters = useRemoteDataset ? req.query : buildFilters(req.query);
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
  const cacheKey = getCacheKey({ dataset, ...filters }, page, limit);
  const cached = filterCache.get(cacheKey);

  if (cached) {
    return res.json(cached);
  }

  if (useRemoteDataset) {
    const payload = await fetchRemoteDataset({
      dataset,
      filters: req.query,
      page,
      limit,
      paginate: true
    });

    filterCache.set(cacheKey, payload);
    return res.json(payload);
  }

  assertLocalDatasetSupported(dataset, res);

  const skip = (page - 1) * limit;

  const [records, total] = await Promise.all([
    DataRecord.find(filters).sort({ createdAt: -1 }).skip(skip).limit(limit),
    DataRecord.countDocuments(filters)
  ]);

  const payload = {
    records,
    total,
    page,
    limit,
    totalPages: Math.max(Math.ceil(total / limit), 1)
  };

  filterCache.set(cacheKey, payload);
  res.json(payload);
});

const getPublicStats = asyncHandler(async (req, res) => {
  const dataset = normalizeDataset(req.query.dataset);
  const statsCacheKey = `public-stats:${dataset}`;
  const cachedStats = publicStatsCache.get(statsCacheKey);

  if (cachedStats) {
    return res.json(cachedStats);
  }

  const totalRows = isRemoteDatasetEnabled(dataset)
    ? await countRemoteDatasetRecords({}, dataset)
    : (() => {
        assertLocalDatasetSupported(dataset, res);
        return DataRecord.countDocuments({});
      })();
  const payload = {
    totalRows
  };

  publicStatsCache.set(statsCacheKey, payload);
  res.json(payload);
});

const getFilterOptions = asyncHandler(async (req, res) => {
  const dataset = normalizeDataset(req.query.dataset);
  const category = toTrimmedString(req.query.category);
  const gameName = toTrimmedString(req.query.gameName || req.query.game_name);
  const sellerName = toTrimmedString(req.query.sellerName || req.query.seller_name);
  const minSellerRank = toTrimmedString(
    req.query.minSellerRank || req.query.min_seller_rank || req.query.sellerRank || req.query.seller_rank
  );
  const sellerRank = resolveSellerRankLabel(minSellerRank);
  const categorySearch = toTrimmedString(req.query.categorySearch || req.query.category_search);
  const gameSearch = toTrimmedString(req.query.gameSearch || req.query.game_search);
  const sellerSearch = toTrimmedString(req.query.sellerSearch || req.query.seller_search);
  const optionLimit = clampOptionLimit(req.query.limit || req.query.maxResults);
  const requestedField =
    toTrimmedString(req.query.field).toLowerCase() ||
    (categorySearch ? 'category' : gameSearch ? 'game' : sellerSearch ? 'seller' : '');
  const optionsCacheKey = getOptionsCacheKey({
    dataset,
    category,
    gameName,
    sellerName,
    minSellerRank,
    categorySearch,
    gameSearch,
    sellerSearch,
    optionLimit,
    requestedField
  });
  const cachedOptions = filterOptionsCache.get(optionsCacheKey);

  if (cachedOptions) {
    return res.json(cachedOptions);
  }

  if (isRemoteDatasetEnabled(dataset)) {
    const payload = await fetchRemoteFilterOptions({
      dataset,
      category,
      gameName,
      sellerName,
      minSellerRank,
      categorySearch,
      gameSearch,
      sellerSearch,
      limit: optionLimit,
      requestedField
    });

    const sortedGames = sortGamesByOrders(payload.games);

    const responsePayload = {
      ...payload,
      games: sortedGames
    };

    filterOptionsCache.set(optionsCacheKey, responsePayload);
    return res.json(responsePayload);
  }

  assertLocalDatasetSupported(dataset, res);

  const [categories, games, sellers] = await Promise.all([
    DataRecord.aggregate(
      createDistinctPipeline('category', {
        contains: categorySearch,
        gameName,
        sellerName,
        sellerRank,
        limit: optionLimit
      })
    ),
    DataRecord.aggregate([
      ...createDistinctPipeline('gameName', {
        category,
        sellerName,
        sellerRank,
        contains: gameSearch,
        limit: optionLimit
      }),
      {
        $lookup: {
          from: 'datarecords',
          let: { selectedGame: '$value' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: [{ $toLower: { $trim: { input: { $ifNull: ['$gameName', ''] } } } }, { $toLower: '$$selectedGame' }]
                }
              }
            },
            ...(category
              ? [
                  {
                    $match: {
                      category: { $regex: `^${escapeRegex(category)}$`, $options: 'i' }
                    }
                  }
                ]
              : []),
            ...(sellerName
              ? [
                  {
                    $match: {
                      sellerName: { $regex: `^${escapeRegex(sellerName)}$`, $options: 'i' }
                    }
                  }
                ]
              : []),
            ...(sellerRank
              ? [
                  {
                    $match: {
                      sellerRank: { $regex: `^${escapeRegex(sellerRank)}$`, $options: 'i' }
                    }
                  }
                ]
              : []),
            {
              $group: {
                _id: null,
                totalOrders: { $sum: '$ordersSold' }
              }
            }
          ],
          as: '__stats'
        }
      },
      {
        $addFields: {
          total_success_order: {
            $ifNull: [{ $first: '$__stats.totalOrders' }, 0]
          }
        }
      },
      {
        $sort: {
          total_success_order: -1,
          value: 1
        }
      }
    ]),
    DataRecord.aggregate(
      createDistinctPipeline('sellerName', {
        category,
        gameName,
        sellerRank,
        contains: sellerSearch,
        limit: optionLimit
      })
    )
  ]);

  const responsePayload = {
    categories: categories.map((item) => item.value),
    games: games.map((item) => ({
      name: item.value,
      brand_ids: [],
      brand_id: null,
      total_success_order: Number(item.total_success_order) || 0
    })),
    sellers: sellers.map((item) => item.value)
  };

  filterOptionsCache.set(optionsCacheKey, responsePayload);
  res.json(responsePayload);
});

module.exports = {
  getDataRecords,
  getFilterOptions,
  getPublicStats
};
