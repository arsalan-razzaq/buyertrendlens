const REMOTE_FILTER_KEYS = [
  'search',
  'category',
  'gameName',
  'sellerName',
  'priceMin',
  'priceMax',
  'rating',
  'userLevel',
  'minSellerRank',
  'score',
  'groupName',
  'group',
  'ordersSold'
];
const REMOTE_DATASET_MAX_LIMIT = 100;
const isEnabled = (value) => ['1', 'true', 'yes', 'on'].includes(String(value || '').trim().toLowerCase());

const getDatasetConfig = (dataset = 'g2g') => {
  const normalizedDataset = String(dataset || 'g2g').trim().toLowerCase();

  if (normalizedDataset === 'eldorado') {
    return {
      dataset: 'eldorado',
      enabled: isEnabled(process.env.ENABLE_REMOTE_DATASET_ELDORADO || process.env.ENABLE_REMOTE_DATASET),
      apiUrl: process.env.REMOTE_DATASET_API_URL_ELDORADO?.trim() || '',
      filtersUrl: process.env.REMOTE_DATASET_FILTERS_URL_ELDORADO?.trim() || '',
      categoriesUrl: process.env.REMOTE_DATASET_CATEGORIES_URL_ELDORADO?.trim() || '',
      productsUrl: process.env.REMOTE_PRODUCTS_API_URL_ELDORADO?.trim() || '',
      apiKey: process.env.REMOTE_DATASET_API_KEY_ELDORADO?.trim() || process.env.REMOTE_DATASET_API_KEY?.trim() || '',
      timeoutMs: Math.max(Number(process.env.REMOTE_DATASET_TIMEOUT_MS_ELDORADO || process.env.REMOTE_DATASET_TIMEOUT_MS) || 30000, 1000)
    };
  }

  return {
    dataset: 'g2g',
    enabled: isEnabled(process.env.ENABLE_REMOTE_DATASET),
    apiUrl: process.env.REMOTE_DATASET_API_URL?.trim() || '',
    filtersUrl: process.env.REMOTE_DATASET_FILTERS_URL?.trim() || '',
    categoriesUrl: process.env.REMOTE_DATASET_CATEGORIES_URL?.trim() || '',
    productsUrl: process.env.REMOTE_PRODUCTS_API_URL?.trim() || '',
    apiKey: process.env.REMOTE_DATASET_API_KEY?.trim() || '',
    timeoutMs: Math.max(Number(process.env.REMOTE_DATASET_TIMEOUT_MS) || 30000, 1000)
  };
};

const getRemoteDatasetApiUrl = (dataset = 'g2g') => getDatasetConfig(dataset).apiUrl;
const getRemoteFilterOptionsApiUrl = (dataset = 'g2g') => {
  const config = getDatasetConfig(dataset);
  const explicitUrl = config.filtersUrl;

  if (explicitUrl) {
    return explicitUrl;
  }

  const datasetUrl = config.apiUrl;

  if (!datasetUrl) {
    return '';
  }

  try {
    const url = new URL(datasetUrl);

    if (dataset === 'eldorado') {
      if (url.pathname.endsWith('/eldorado-products')) {
        url.pathname = url.pathname.replace(/\/eldorado-products$/, '/eldorado-products/filter-options');
        return url.toString();
      }

      url.pathname = `${url.pathname.replace(/\/$/, '')}/filter-options`;
      return url.toString();
    }

    if (url.pathname.endsWith('/dataset-marketplace')) {
      url.pathname = url.pathname.replace(/\/dataset-marketplace$/, '/filter-options');
      return url.toString();
    }

    if (url.pathname.endsWith('/products')) {
      url.pathname = url.pathname.replace(/\/products$/, '/filter-options');
      return url.toString();
    }

    url.pathname = `${url.pathname.replace(/\/$/, '')}/filter-options`;
    return url.toString();
  } catch (error) {
    return '';
  }
};

const getRemoteCategoryOptionsApiUrl = (dataset = 'g2g') => {
  const config = getDatasetConfig(dataset);
  const explicitUrl = config.categoriesUrl;

  if (explicitUrl) {
    return explicitUrl;
  }

  const filtersUrl = getRemoteFilterOptionsApiUrl(dataset);

  if (filtersUrl) {
    try {
      const url = new URL(filtersUrl);

      if (url.pathname.endsWith('/filter-options')) {
        url.pathname = url.pathname.replace(/\/filter-options$/, '/getcategory');
        return url.toString();
      }
    } catch (error) {
      return '';
    }
  }

  const datasetUrl = config.apiUrl;

  if (!datasetUrl) {
    return '';
  }

  try {
    const url = new URL(datasetUrl);

    if (url.pathname.endsWith('/dataset-marketplace')) {
      url.pathname = url.pathname.replace(/\/dataset-marketplace$/, '/getcategory');
      return url.toString();
    }

    if (url.pathname.endsWith('/products')) {
      url.pathname = url.pathname.replace(/\/products$/, '/getcategory');
      return url.toString();
    }

    url.pathname = `${url.pathname.replace(/\/$/, '')}/getcategory`;
    return url.toString();
  } catch (error) {
    return '';
  }
};

const getRemoteProductsApiUrl = (dataset = 'g2g') => {
  const config = getDatasetConfig(dataset);
  const explicitUrl = config.productsUrl;

  if (explicitUrl) {
    return explicitUrl;
  }

  const datasetUrl = config.apiUrl;

  if (!datasetUrl) {
    return '';
  }

  try {
    const url = new URL(datasetUrl);

    if (dataset === 'eldorado') {
      return url.toString();
    }

    if (url.pathname.endsWith('/dataset-marketplace')) {
      url.pathname = url.pathname.replace(/\/dataset-marketplace$/, '/products');
      return url.toString();
    }

    if (url.pathname.endsWith('/products')) {
      return url.toString();
    }

    url.pathname = `${url.pathname.replace(/\/$/, '')}/products`;
    return url.toString();
  } catch (error) {
    return '';
  }
};

const isRemoteDatasetEnabled = (dataset = 'g2g') => {
  const config = getDatasetConfig(dataset);
  return config.enabled && Boolean(config.apiUrl);
};

const buildRemoteQuery = (filters = {}, options = {}) => {
  const query = new URLSearchParams();

  for (const key of REMOTE_FILTER_KEYS) {
    const value = filters[key];

    if (value === undefined || value === null) {
      continue;
    }

    const normalized = String(value).trim();
    if (normalized) {
      if (key === 'minSellerRank') {
        query.set('minSellerRank', normalized);
        query.set('sellerRank', normalized);
      } else {
        query.set(key, normalized);
      }
    }
  }

  if (options.page) {
    query.set('page', String(options.page));
  }

  if (options.limit) {
    query.set('limit', String(options.limit));
  }

  if (options.paginate === false) {
    query.set('paginate', 'false');
  }

  return query;
};

const parseRemotePayload = async (response) => {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error('Remote dataset API returned invalid JSON.');
  }
};

const parseRemoteProductsPayload = async (response) => {
  const payload = await parseRemotePayload(response);
  const data = payload?.data || {};

  return {
    records: Array.isArray(data.data) ? data.data : [],
    currentPage: Number(data.current_page) || 1,
    totalPages: Number(data.last_page) || 1,
    nextPageUrl: data.next_page_url || null
  };
};

const formatRemoteProductUrl = (value) => {
  const normalized = String(value || '').trim();

  if (!normalized) {
    return '';
  }

  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  return `https://www.g2g.com/categories/${normalized.replace(/^\/+/, '')}`;
};

const formatEldoradoMarketplaceUrl = (value) => {
  const normalized = String(value || '').trim();
  return normalized || '';
};

const transformEldoradoRecord = (record = {}) => ({
  _id: String(record.id ?? record.offer_id ?? ''),
  title: String(record.offer_title || ''),
  category: String(record.category || record.category_name || ''),
  gameName: String(record.category_title || record.category_name || ''),
  sellerName: String(record.seller_username || ''),
  price: Number(record.price_usd_amount ?? record.price_amount ?? 0),
  rating: Number(record.seller_verified ? 1 : 0),
  userLevel: 0,
  sellerRank: record.seller_verified ? 'Verified Seller' : '',
  score: 0,
  groupName: '',
  ordersSold: 0,
  createdAt: record.created_at || '',
  updatedAt: record.updated_at || '',
  offerId: String(record.offer_id || ''),
  productName: String(record.offer_title || ''),
  productUrl: formatEldoradoMarketplaceUrl(record.marketplace_url),
  priceAmount: Number(record.price_amount ?? 0),
  priceUsdAmount: Number(record.price_usd_amount ?? 0),
  priceCurrency: String(record.price_currency || ''),
  quantity: Number(record.quantity ?? 0),
  deliveryTime: String(record.delivery_time || ''),
  offerState: String(record.offer_state || ''),
  sellerVerified: Boolean(record.seller_verified),
  categoryName: String(record.category_name || ''),
  categoryTitle: String(record.category_title || ''),
  marketplaceUrl: formatEldoradoMarketplaceUrl(record.marketplace_url)
});

const buildEldoradoQuery = (filters = {}, page = 1) => {
  const query = new URLSearchParams();
  const mappings = [
    ['search', 'title'],
    ['category', 'category'],
    ['gameName', 'game_name'],
    ['sellerName', 'seller_name'],
    ['priceMin', 'minPrice'],
    ['priceMax', 'maxPrice']
  ];

  for (const [sourceKey, targetKey] of mappings) {
    const value = String(filters[sourceKey] || '').trim();
    if (value) {
      query.set(targetKey, value);
    }
  }

  if (filters.verifiedOnly === true || String(filters.verifiedOnly).toLowerCase() === 'true') {
    query.set('verified_only', '1');
  }

  query.set('page', String(page));
  return query;
};

const fetchRemoteDataset = async ({ dataset = 'g2g', filters = {}, page = 1, limit = 10, paginate = true } = {}) => {
  if (dataset === 'eldorado') {
    const config = getDatasetConfig(dataset);
    const apiUrl = getRemoteDatasetApiUrl(dataset);

    if (!apiUrl) {
      throw new Error('ELDORADO remote dataset API URL is not configured.');
    }

    const url = new URL(apiUrl);
    const query = buildEldoradoQuery(filters, page);
    query.forEach((value, key) => url.searchParams.set(key, value));

    const headers = {
      Accept: 'application/json'
    };

    if (config.apiKey) {
      headers['X-Dataset-Key'] = config.apiKey;
    }

    const response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(config.timeoutMs)
    });

    const payload = await parseRemotePayload(response);

    if (!response.ok) {
      throw new Error(
        payload.message ||
          payload.error ||
          `Remote Eldorado dataset request failed with status ${response.status}.`
      );
    }

    const pagination = payload?.data || {};
    const rawRecords = Array.isArray(pagination.data) ? pagination.data : [];
    const total = Number(pagination.total) || rawRecords.length;
    const perPage = Number(pagination.per_page) || limit || rawRecords.length || 1;

    return {
      records: rawRecords.map(transformEldoradoRecord),
      total,
      page: Number(pagination.current_page) || page,
      limit: perPage,
      totalPages: Math.max(Number(pagination.last_page) || Math.ceil(total / perPage), 1)
    };
  }

  const config = getDatasetConfig(dataset);
  const apiUrl = config.apiUrl;

  if (!apiUrl) {
    throw new Error(`${config.dataset.toUpperCase()} remote dataset API URL is not configured.`);
  }

  const resolvedLimit = Math.min(Math.max(Number(limit) || 10, 1), REMOTE_DATASET_MAX_LIMIT);
  const url = new URL(apiUrl);
  const query = buildRemoteQuery(filters, { page, limit: resolvedLimit, paginate });
  query.forEach((value, key) => url.searchParams.set(key, value));

  const headers = {
    Accept: 'application/json'
  };

  if (config.apiKey) {
    headers['X-Dataset-Key'] = config.apiKey;
  }

  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(config.timeoutMs)
  });

  const payload = await parseRemotePayload(response);

  if (!response.ok) {
    throw new Error(
      payload.message ||
        payload.error ||
        `Remote dataset API request failed with status ${response.status}.`
    );
  }

  const records = Array.isArray(payload.records) ? payload.records : [];
  const total = Number(payload.total) || 0;
  const payloadLimit = Number(payload.limit) || (paginate ? resolvedLimit : records.length || total);

  return {
    records,
    total,
    page: Number(payload.page) || (paginate ? page : 1),
    limit: payloadLimit,
    totalPages: Number(payload.totalPages) || (paginate ? Math.max(Math.ceil(total / payloadLimit), 1) : 1)
  };
};

const fetchRemoteFilterOptions = async ({
  dataset = 'g2g',
  category = '',
  gameName = '',
  sellerName = '',
  minSellerRank = '',
  categorySearch = '',
  gameSearch = '',
  sellerSearch = '',
  limit = 100
} = {}) => {
  if (dataset === 'eldorado') {
    const config = getDatasetConfig(dataset);
    const apiUrl = getRemoteFilterOptionsApiUrl(dataset);

    if (!apiUrl) {
      throw new Error('ELDORADO remote filters URL is not configured.');
    }

    const url = new URL(apiUrl);
    const query = {
      category: String(category || '').trim(),
      game_name: String(gameName || '').trim(),
      seller_name: String(sellerName || '').trim(),
      category_search: String(categorySearch || '').trim(),
      game_search: String(gameSearch || '').trim(),
      seller_search: String(sellerSearch || '').trim(),
      limit: String(limit || 100).trim()
    };

    for (const [key, value] of Object.entries(query)) {
      if (value) {
        url.searchParams.set(key, value);
      }
    }

    const headers = {
      Accept: 'application/json'
    };

    if (config.apiKey) {
      headers['X-Dataset-Key'] = config.apiKey;
    }

    const response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(config.timeoutMs)
    });

    const payload = await parseRemotePayload(response);

    if (!response.ok) {
      throw new Error(
        payload.message ||
          payload.error ||
          `Remote Eldorado filter options request failed with status ${response.status}.`
      );
    }

    const data = payload.data || {};
    const normalizedCategorySearch = String(categorySearch || '').trim().toLowerCase();
    const normalizedGameSearch = String(gameSearch || '').trim().toLowerCase();
    const normalizedSellerSearch = String(sellerSearch || '').trim().toLowerCase();
    const rawCategories = Array.isArray(data.categories) ? data.categories : [];
    const selectedCategory = String(category || '').trim().toLowerCase();
    const selectedGame = String(gameName || '').trim().toLowerCase();
    const categories = (Array.isArray(data.categoryTypes) ? data.categoryTypes : [])
      .map((item) => String(item || '').trim())
      .filter(Boolean)
      .filter((item) => !normalizedCategorySearch || item.toLowerCase().includes(normalizedCategorySearch))
      .slice(0, limit);

    const games = rawCategories
      .map((item) => ({
        category: String(item?.category || '').trim(),
        name: String(item?.name || '').trim()
      }))
      .filter((item) => item.name)
      .filter((item) => !selectedCategory || item.category.toLowerCase() === selectedCategory)
      .filter((item) => !normalizedGameSearch || item.name.toLowerCase().includes(normalizedGameSearch))
      .filter((item, index, list) => list.findIndex((candidate) => candidate.name.toLowerCase() === item.name.toLowerCase()) === index)
      .slice(0, limit)
      .map((item) => ({
        name: item.name,
        brand_ids: [],
        brand_id: null,
        total_success_order: 0
      }));

    const sellers = (Array.isArray(data.sellers) ? data.sellers : [])
      .map((item) => String(item || '').trim())
      .filter(Boolean)
      .filter((item) => !normalizedSellerSearch || item.toLowerCase().includes(normalizedSellerSearch))
      .slice(0, limit);

    return {
      categories,
      games,
      sellers
    };
  }

  const config = getDatasetConfig(dataset);
  const apiUrl = getRemoteFilterOptionsApiUrl(dataset);

  if (!apiUrl) {
    throw new Error(`${config.dataset.toUpperCase()} remote filters URL is not configured.`);
  }

  const url = new URL(apiUrl);
  const query = {
    category: String(category || '').trim(),
    game_name: String(gameName || '').trim(),
    seller_name: String(sellerName || '').trim(),
    minSellerRank: String(minSellerRank || '').trim(),
    category_search: String(categorySearch || '').trim(),
    game_search: String(gameSearch || '').trim(),
    seller_search: String(sellerSearch || '').trim(),
    limit: String(limit || 100).trim()
  };

  for (const [key, value] of Object.entries(query)) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }

  const headers = {
    Accept: 'application/json'
  };

  if (config.apiKey) {
    headers['X-Dataset-Key'] = config.apiKey;
  }

  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(config.timeoutMs)
  });

  const payload = await parseRemotePayload(response);

  if (!response.ok) {
    throw new Error(
      payload.message ||
        payload.error ||
        `Remote filter options request failed with status ${response.status}.`
    );
  }

  const data = payload.data || payload;
  const games = Array.isArray(data.games) ? data.games : [];
  let normalizedGames = games.map((game) =>
    typeof game === 'string'
      ? { name: game, brand_ids: [], brand_id: null, total_success_order: 0 }
      : {
          name: String(game.name || '').trim(),
          brand_ids: Array.isArray(game.brand_ids) ? game.brand_ids : [],
          brand_id: game.brand_id || null,
          total_success_order: Number(game.total_success_order) || 0
        }
  );

  const categoryOptionsUrl = getRemoteCategoryOptionsApiUrl(dataset);

  if (categoryOptionsUrl) {
    try {
      const categoryUrl = new URL(categoryOptionsUrl);
      const selectedCategory = String(category || '').trim();

      if (selectedCategory) {
        categoryUrl.searchParams.set('type', selectedCategory);
      }

        const categoryResponse = await fetch(categoryUrl, {
          headers,
          signal: AbortSignal.timeout(config.timeoutMs)
        });
      const categoryPayload = await parseRemotePayload(categoryResponse);

      if (categoryResponse.ok) {
        const categoryData = categoryPayload.data || categoryPayload;
        const categoryGames = Array.isArray(categoryData.categories_meta) ? categoryData.categories_meta : [];
        const nextGames = [];
        const seenGames = new Set();
        const normalizedGameSearch = String(gameSearch || '').trim().toLowerCase();

        for (const item of categoryGames) {
          const name = String(item?.name || '').trim();
          const normalizedName = name.toLowerCase();

          if (!name || seenGames.has(normalizedName)) {
            continue;
          }

          if (normalizedGameSearch && !normalizedName.includes(normalizedGameSearch)) {
            continue;
          }

          const brandIds = Array.isArray(item?.brand_ids)
            ? item.brand_ids.map((brandId) => String(brandId || '').trim()).filter(Boolean)
            : [];

          seenGames.add(normalizedName);
          nextGames.push({
            name,
            brand_ids: brandIds,
            brand_id: brandIds[0] || null,
            total_success_order: Number(item?.sold_total) || 0
          });
        }

        if (nextGames.length) {
          normalizedGames = nextGames;
        }
      }
    } catch (error) {
      // Fall back to the product-derived games list when the master category endpoint is unavailable.
    }
  }

  return {
    categories: Array.isArray(data.categories) ? data.categories.slice(0, limit) : [],
    games: normalizedGames.slice(0, limit),
    sellers: Array.isArray(data.sellers) ? data.sellers.slice(0, limit) : []
  };
};

const countRemoteDatasetRecords = async (filters = {}, dataset = 'g2g') => {
  const payload = await fetchRemoteDataset({ dataset, filters, page: 1, limit: 1, paginate: true });
  return payload.total;
};

const fetchAllRemoteDatasetRecords = async (filters = {}, dataset = 'g2g') => {
  const initialPayload = await fetchRemoteDataset({
    dataset,
    filters,
    page: 1,
    limit: REMOTE_DATASET_MAX_LIMIT,
    paginate: true
  });
  const total = Number(initialPayload.total) || 0;

  if (!total) {
    return [];
  }

  const records = Array.isArray(initialPayload.records) ? [...initialPayload.records] : [];
  const pageSize = Math.max(Number(initialPayload.limit) || records.length || REMOTE_DATASET_MAX_LIMIT, 1);
  const totalPages = Math.max(Number(initialPayload.totalPages) || Math.ceil(total / pageSize), 1);

  if (records.length >= total || totalPages === 1) {
    return records.slice(0, total);
  }

  for (let page = 2; page <= totalPages; page += 1) {
    const payload = await fetchRemoteDataset({
      dataset,
      filters,
      page,
      limit: pageSize,
      paginate: true
    });

    if (Array.isArray(payload.records) && payload.records.length) {
      records.push(...payload.records);
    }

    if (records.length >= total) {
      break;
    }
  }

  return records.slice(0, total);
};

const fetchRemoteProductsPage = async ({ dataset = 'g2g', gameName = '', sellerName = '', category = '', page = 1 } = {}) => {
  const config = getDatasetConfig(dataset);
  const apiUrl = getRemoteProductsApiUrl(dataset);

  if (!apiUrl) {
    return { records: [], currentPage: 1, totalPages: 1, nextPageUrl: null };
  }

  const url = new URL(apiUrl);
  const query = {
    name: String(gameName || '').trim(),
    seller_name: String(sellerName || '').trim(),
    type: String(category || '').trim(),
    page: String(page || 1)
  };

  for (const [key, value] of Object.entries(query)) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }

  const headers = {
    Accept: 'application/json'
  };

  if (config.apiKey) {
    headers['X-Dataset-Key'] = config.apiKey;
  }

  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(config.timeoutMs)
  });

  const payload = await parseRemotePayload(response);

  if (!response.ok) {
    throw new Error(
      payload.message ||
        payload.error ||
        `Remote products API request failed with status ${response.status}.`
    );
  }

  const data = payload?.data || {};

  return {
    records: Array.isArray(data.data) ? data.data : [],
    currentPage: Number(data.current_page) || 1,
    totalPages: Number(data.last_page) || 1,
    nextPageUrl: data.next_page_url || null
  };
};

const mergeNormalizedAndRawProduct = (record, rawProduct) => {
  if (!rawProduct) {
    return record;
  }

  return {
    ...record,
    updatedAt: rawProduct.updated_at || record.updatedAt || '',
    offerId: rawProduct.offer_id || '',
    brandId: rawProduct.brand_id || '',
    productName: rawProduct.name || '',
    productUrl: formatRemoteProductUrl(rawProduct.url),
    totalOffer: Number(rawProduct.total_offer) || 0,
    displayCurrency: rawProduct.display_currency || '',
    displayPrice: rawProduct.display_price || '',
    convertedUnitPrice: rawProduct.converted_unit_price || '',
    isUnique: Number(rawProduct.is_unique) || 0,
    isGroupDisplay: Number(rawProduct.is_group_display) || 0,
    description: rawProduct.description || '',
    deliverySpeed: rawProduct.delivery_speed || '',
    totalRating: Number(rawProduct.total_rating) || 0,
    status: rawProduct.status || '',
    sellerId: rawProduct.seller_id || '',
    isOnline: Number(rawProduct.is_online) || 0,
    onlineDatetime: rawProduct.online_datetime || '',
    updateLog: rawProduct.update_log || '',
    type: rawProduct.type || '',
    userAvatar: rawProduct.user_avatar || '',
    offerAttributes: rawProduct.offer_attributes || '',
    galleryImages: rawProduct.gallery_images || ''
  };
};

const enrichRemoteDatasetRecordsForExport = async (records = [], dataset = 'g2g') => {
  if (dataset === 'eldorado') {
    return records;
  }

  if (!Array.isArray(records) || !records.length) {
    return [];
  }

  const lookupGroups = new Map();

  for (const record of records) {
    const groupKey = JSON.stringify({
      gameName: String(record.gameName || '').trim(),
      sellerName: String(record.sellerName || '').trim(),
      category: String(record.category || '').trim()
    });
    const current = lookupGroups.get(groupKey) || {
      gameName: String(record.gameName || '').trim(),
      sellerName: String(record.sellerName || '').trim(),
      category: String(record.category || '').trim(),
      ids: new Set(),
      groups: new Set()
    };

    if (record._id !== undefined && record._id !== null) {
      current.ids.add(String(record._id));
    }

    if (record.groupName) {
      current.groups.add(String(record.groupName));
    }

    lookupGroups.set(groupKey, current);
  }

  const matchedProducts = new Map();

  for (const group of lookupGroups.values()) {
    if (!group.gameName && !group.sellerName) {
      continue;
    }

    let page = 1;
    let totalPages = 1;
    const expectedMatches = group.ids.size || group.groups.size;
    let matchedCount = 0;

    do {
      const payload = await fetchRemoteProductsPage({
        dataset,
        gameName: group.gameName,
        sellerName: group.sellerName,
        category: group.category,
        page
      });

      for (const rawProduct of payload.records) {
        const productId = rawProduct?.id !== undefined && rawProduct?.id !== null ? String(rawProduct.id) : '';
        const offerGroup = rawProduct?.offer_group ? String(rawProduct.offer_group) : '';

        if ((productId && group.ids.has(productId)) || (offerGroup && group.groups.has(offerGroup))) {
          let registered = false;
          if (productId) {
            registered = !matchedProducts.has(productId);
            matchedProducts.set(productId, rawProduct);
          }

          if (offerGroup) {
            matchedProducts.set(`group:${offerGroup}`, rawProduct);
          }

          if (registered) {
            matchedCount += 1;
          }
        }
      }

      totalPages = Number(payload.totalPages) || 1;
      page += 1;
    } while (page <= totalPages && matchedCount < expectedMatches);
  }

  return records.map((record) => {
    const rawProduct =
      matchedProducts.get(String(record._id || '')) ||
      matchedProducts.get(`group:${String(record.groupName || '')}`) ||
      null;

    return mergeNormalizedAndRawProduct(record, rawProduct);
  });
};

module.exports = {
  isRemoteDatasetEnabled,
  fetchRemoteDataset,
  countRemoteDatasetRecords,
  fetchAllRemoteDatasetRecords,
  fetchRemoteFilterOptions,
  enrichRemoteDatasetRecordsForExport
};
