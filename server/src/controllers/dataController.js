const DataRecord = require('../models/DataRecord');
const asyncHandler = require('../utils/asyncHandler');
const {
  buildFilters,
  buildSellerRankMatch,
  filterCache,
  getCacheKey,
  resolveSellerRankLabel
} = require('../services/filterService');
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

const createDistinctPipeline = (
  field,
  { equals = '', contains = '', category = '', gameName = '', sellerName = '', sellerRank = '' } = {}
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
    }
  );

  return pipeline;
};

const getDataRecords = asyncHandler(async (req, res) => {
  const useRemoteDataset = isRemoteDatasetEnabled();
  const filters = useRemoteDataset ? req.query : buildFilters(req.query);
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
  const cacheKey = getCacheKey(filters, page, limit);
  const cached = filterCache.get(cacheKey);

  if (cached) {
    return res.json(cached);
  }

  if (useRemoteDataset) {
    const payload = await fetchRemoteDataset({
      filters: req.query,
      page,
      limit,
      paginate: true
    });

    filterCache.set(cacheKey, payload);
    return res.json(payload);
  }

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
  const totalRows = isRemoteDatasetEnabled()
    ? await countRemoteDatasetRecords()
    : await DataRecord.countDocuments({});

  res.json({
    totalRows
  });
});

const getFilterOptions = asyncHandler(async (req, res) => {
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

  if (isRemoteDatasetEnabled()) {
    const payload = await fetchRemoteFilterOptions({
      category,
      gameName,
      sellerName,
      minSellerRank,
      categorySearch,
      gameSearch,
      sellerSearch
    });

    const sortedGames = sortGamesByOrders(payload.games);

    return res.json({
      ...payload,
      games: sortedGames
    });
  }

  const [categories, games, sellers] = await Promise.all([
    DataRecord.aggregate(
      createDistinctPipeline('category', {
        contains: categorySearch,
        gameName,
        sellerName,
        sellerRank
      })
    ),
    DataRecord.aggregate([
      ...createDistinctPipeline('gameName', {
        category,
        sellerName,
        sellerRank,
        contains: gameSearch
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
        contains: sellerSearch
      })
    )
  ]);

  res.json({
    categories: categories.map((item) => item.value),
    games: games.map((item) => ({
      name: item.value,
      brand_ids: [],
      brand_id: null,
      total_success_order: Number(item.total_success_order) || 0
    })),
    sellers: sellers.map((item) => item.value)
  });
});

module.exports = {
  getDataRecords,
  getFilterOptions,
  getPublicStats
};
