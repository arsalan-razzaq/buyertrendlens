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

const getRemoteDatasetApiUrl = () => process.env.REMOTE_DATASET_API_URL?.trim();
const getRemoteFilterOptionsApiUrl = () => {
  const explicitUrl = process.env.REMOTE_DATASET_FILTERS_URL?.trim();

  if (explicitUrl) {
    return explicitUrl;
  }

  const datasetUrl = getRemoteDatasetApiUrl();

  if (!datasetUrl) {
    return '';
  }

  try {
    const url = new URL(datasetUrl);

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

const getRemoteCategoryOptionsApiUrl = () => {
  const explicitUrl = process.env.REMOTE_DATASET_CATEGORIES_URL?.trim();

  if (explicitUrl) {
    return explicitUrl;
  }

  const filtersUrl = getRemoteFilterOptionsApiUrl();

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

  const datasetUrl = getRemoteDatasetApiUrl();

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

const getRemoteProductsApiUrl = () => {
  const explicitUrl = process.env.REMOTE_PRODUCTS_API_URL?.trim();

  if (explicitUrl) {
    return explicitUrl;
  }

  const datasetUrl = getRemoteDatasetApiUrl();

  if (!datasetUrl) {
    return '';
  }

  try {
    const url = new URL(datasetUrl);

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

const isRemoteDatasetEnabled = () => isEnabled(process.env.ENABLE_REMOTE_DATASET) && Boolean(getRemoteDatasetApiUrl());

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

const fetchRemoteDataset = async ({ filters = {}, page = 1, limit = 10, paginate = true } = {}) => {
  const apiUrl = getRemoteDatasetApiUrl();

  if (!apiUrl) {
    throw new Error('REMOTE_DATASET_API_URL is not configured.');
  }

  const resolvedLimit = Math.min(Math.max(Number(limit) || 10, 1), REMOTE_DATASET_MAX_LIMIT);
  const url = new URL(apiUrl);
  const query = buildRemoteQuery(filters, { page, limit: resolvedLimit, paginate });
  query.forEach((value, key) => url.searchParams.set(key, value));

  const headers = {
    Accept: 'application/json'
  };

  if (process.env.REMOTE_DATASET_API_KEY) {
    headers['X-Dataset-Key'] = process.env.REMOTE_DATASET_API_KEY;
  }

  const timeoutMs = Math.max(Number(process.env.REMOTE_DATASET_TIMEOUT_MS) || 30000, 1000);
  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(timeoutMs)
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
  category = '',
  gameName = '',
  sellerName = '',
  minSellerRank = '',
  categorySearch = '',
  gameSearch = '',
  sellerSearch = ''
} = {}) => {
  const apiUrl = getRemoteFilterOptionsApiUrl();

  if (!apiUrl) {
    throw new Error('REMOTE_DATASET_FILTERS_URL is not configured.');
  }

  const url = new URL(apiUrl);
  const query = {
    category: String(category || '').trim(),
    game_name: String(gameName || '').trim(),
    seller_name: String(sellerName || '').trim(),
    minSellerRank: String(minSellerRank || '').trim(),
    category_search: String(categorySearch || '').trim(),
    game_search: String(gameSearch || '').trim(),
    seller_search: String(sellerSearch || '').trim()
  };

  for (const [key, value] of Object.entries(query)) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }

  const headers = {
    Accept: 'application/json'
  };

  if (process.env.REMOTE_DATASET_API_KEY) {
    headers['X-Dataset-Key'] = process.env.REMOTE_DATASET_API_KEY;
  }

  const timeoutMs = Math.max(Number(process.env.REMOTE_DATASET_TIMEOUT_MS) || 30000, 1000);
  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(timeoutMs)
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

  const categoryOptionsUrl = getRemoteCategoryOptionsApiUrl();

  if (categoryOptionsUrl) {
    try {
      const categoryUrl = new URL(categoryOptionsUrl);
      const selectedCategory = String(category || '').trim();

      if (selectedCategory) {
        categoryUrl.searchParams.set('type', selectedCategory);
      }

      const categoryResponse = await fetch(categoryUrl, {
        headers,
        signal: AbortSignal.timeout(timeoutMs)
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
    categories: Array.isArray(data.categories) ? data.categories : [],
    games: normalizedGames,
    sellers: Array.isArray(data.sellers) ? data.sellers : []
  };
};

const countRemoteDatasetRecords = async (filters = {}) => {
  const payload = await fetchRemoteDataset({ filters, page: 1, limit: 1, paginate: true });
  return payload.total;
};

const fetchAllRemoteDatasetRecords = async (filters = {}) => {
  const initialPayload = await fetchRemoteDataset({
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

const fetchRemoteProductsPage = async ({ gameName = '', sellerName = '', category = '', page = 1 } = {}) => {
  const apiUrl = getRemoteProductsApiUrl();

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

  if (process.env.REMOTE_DATASET_API_KEY) {
    headers['X-Dataset-Key'] = process.env.REMOTE_DATASET_API_KEY;
  }

  const timeoutMs = Math.max(Number(process.env.REMOTE_DATASET_TIMEOUT_MS) || 30000, 1000);
  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(timeoutMs)
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

const enrichRemoteDatasetRecordsForExport = async (records = []) => {
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
