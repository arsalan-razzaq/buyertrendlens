const NodeCache = require('node-cache');
const { OAuth2Client } = require('google-auth-library');

const cache = new NodeCache({ stdTTL: 300, checkperiod: 60, useClones: false });
const REALTIME_TTL_SECONDS = 60;
const REPORT_BASE_URL = 'https://analyticsdata.googleapis.com/v1beta';
const REPORT_SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';

const formatDate = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10);
};

const isConfigured = () =>
  Boolean(
    process.env.GA_PROPERTY_ID &&
      process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REFRESH_TOKEN
  );

const getMissingConfigMessage = () =>
  'Google Analytics is not configured yet. Add GA property and Google OAuth credentials on the server to enable analytics.';

const createOAuthClient = () => {
  const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
  client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN
  });
  return client;
};

const getAccessToken = async () => {
  const tokenCacheKey = 'ga:oauth-access-token';
  const cachedToken = cache.get(tokenCacheKey);

  if (cachedToken) {
    return cachedToken;
  }

  const client = createOAuthClient();
  const accessTokenResponse = await client.getAccessToken();
  const accessToken = typeof accessTokenResponse === 'string' ? accessTokenResponse : accessTokenResponse?.token;

  if (!accessToken) {
    const error = new Error('Unable to authorize Google Analytics requests.');
    error.statusCode = 502;
    throw error;
  }

  cache.set(tokenCacheKey, accessToken, 300);
  return accessToken;
};

const getPropertyName = () => `properties/${process.env.GA_PROPERTY_ID}`;

const buildDateRange = ({ preset = '7d', startDate, endDate } = {}) => {
  if (preset === 'custom') {
    const normalizedStartDate = formatDate(startDate);
    const normalizedEndDate = formatDate(endDate);

    if (!normalizedStartDate || !normalizedEndDate) {
      const error = new Error('Valid startDate and endDate are required for a custom range.');
      error.statusCode = 400;
      throw error;
    }

    if (normalizedStartDate > normalizedEndDate) {
      const error = new Error('startDate cannot be later than endDate.');
      error.statusCode = 400;
      throw error;
    }

    return {
      preset: 'custom',
      startDate: normalizedStartDate,
      endDate: normalizedEndDate
    };
  }

  if (preset === 'today') {
    return {
      preset: 'today',
      startDate: 'today',
      endDate: 'today'
    };
  }

  if (preset === '30d') {
    return {
      preset: '30d',
      startDate: '30daysAgo',
      endDate: 'today'
    };
  }

  return {
    preset: '7d',
    startDate: '7daysAgo',
    endDate: 'today'
  };
};

const buildCacheKey = (type, payload) => `ga:${type}:${JSON.stringify(payload)}`;

const parseMetricValue = (row, index) => {
  const rawValue = row?.metricValues?.[index]?.value ?? '0';
  const numericValue = Number(rawValue);
  return Number.isFinite(numericValue) ? numericValue : 0;
};

const parseDimensionValue = (row, index) => row?.dimensionValues?.[index]?.value || '';

const roundMetric = (value, digits = 2) => Number(Number(value || 0).toFixed(digits));

const parseDurationLabel = (seconds) => {
  const safeSeconds = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(safeSeconds / 60);
  const remainderSeconds = Math.round(safeSeconds % 60);

  if (!minutes) {
    return `${remainderSeconds}s`;
  }

  return `${minutes}m ${String(remainderSeconds).padStart(2, '0')}s`;
};

const formatCompactNumber = (value) =>
  new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: value >= 1000 ? 1 : 0
  }).format(Number(value) || 0);

const formatPercentLabel = (value) => `${roundMetric(value * 100, 1)}%`;

const convertDateDimension = (yyyymmdd) => {
  const normalized = String(yyyymmdd || '');

  if (!/^\d{8}$/.test(normalized)) {
    return normalized;
  }

  return `${normalized.slice(0, 4)}-${normalized.slice(4, 6)}-${normalized.slice(6, 8)}`;
};

const resolveGoogleAnalyticsErrorMessage = (status, payload) => {
  const apiMessage = payload?.error?.message || 'Google Analytics request failed.';
  const errorDetails = Array.isArray(payload?.error?.details) ? payload.error.details : [];
  const errorReason = errorDetails.find((detail) => detail?.reason)?.reason || '';

  if (errorReason === 'SERVICE_DISABLED' || apiMessage.includes('analyticsdata.googleapis.com')) {
    return 'Google Analytics Data API is disabled for the configured Google Cloud project. Enable analyticsdata.googleapis.com in Google Cloud, wait a few minutes, then try again.';
  }

  if (status === 401) {
    return 'Google Analytics authorization failed. Verify the OAuth client and refresh token configured on the server.';
  }

  if (status === 403) {
    return 'Google Analytics access is denied for this property. Confirm the Google account has GA4 property access and the Data API is enabled.';
  }

  return apiMessage;
};

const runAnalyticsRequest = async ({ path, body, cacheKey, ttlSeconds = 300 }) => {
  if (!isConfigured()) {
    return {
      configured: false,
      message: getMissingConfigMessage()
    };
  }

  if (cacheKey) {
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }
  }

  try {
    const accessToken = await getAccessToken();
    const response = await fetch(`${REPORT_BASE_URL}/${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const payload = await response.json();

    if (!response.ok) {
      const error = new Error(resolveGoogleAnalyticsErrorMessage(response.status, payload));
      error.statusCode = 502;
      throw error;
    }

    if (cacheKey) {
      cache.set(cacheKey, payload, ttlSeconds);
    }

    return payload;
  } catch (error) {
    if (error.message?.includes('invalid_grant')) {
      error.message = 'Google Analytics refresh token is invalid or expired. Update the server credentials.';
      error.statusCode = 502;
    }

    if (!error.statusCode) {
      error.statusCode = 502;
      error.message = 'Unable to fetch Google Analytics data right now. Check Google Analytics credentials and network access on the server.';
    }

    throw error;
  }
};

const runReport = async (body, cacheKey) =>
  runAnalyticsRequest({
    path: `${getPropertyName()}:runReport`,
    body,
    cacheKey
  });

const runRealtimeReport = async (body, cacheKey) =>
  runAnalyticsRequest({
    path: `${getPropertyName()}:runRealtimeReport`,
    body,
    cacheKey,
    ttlSeconds: REALTIME_TTL_SECONDS
  });

const getOverview = async (rangeInput) => {
  const range = buildDateRange(rangeInput);
  const cacheKey = buildCacheKey('overview', range);

  const [summaryResponse, timelineResponse] = await Promise.all([
    runReport(
      {
        dateRanges: [{ startDate: range.startDate, endDate: range.endDate }],
        metrics: [
          { name: 'activeUsers' },
          { name: 'totalUsers' },
          { name: 'newUsers' },
          { name: 'sessions' },
          { name: 'screenPageViews' },
          { name: 'eventCount' },
          { name: 'engagementRate' },
          { name: 'averageSessionDuration' }
        ]
      },
      `${cacheKey}:summary`
    ),
    runReport(
      {
        dateRanges: [{ startDate: range.startDate, endDate: range.endDate }],
        dimensions: [{ name: 'date' }],
        metrics: [{ name: 'activeUsers' }],
        orderBys: [{ dimension: { dimensionName: 'date' } }]
      },
      `${cacheKey}:trend`
    )
  ]);

  if (summaryResponse.configured === false) {
    return {
      configured: false,
      message: summaryResponse.message,
      range
    };
  }

  const summaryRow = summaryResponse.rows?.[0];
  const metrics = {
    activeUsers: parseMetricValue(summaryRow, 0),
    totalUsers: parseMetricValue(summaryRow, 1),
    newUsers: parseMetricValue(summaryRow, 2),
    sessions: parseMetricValue(summaryRow, 3),
    pageViews: parseMetricValue(summaryRow, 4),
    eventCount: parseMetricValue(summaryRow, 5),
    engagementRate: roundMetric(parseMetricValue(summaryRow, 6), 4),
    averageSessionDuration: roundMetric(parseMetricValue(summaryRow, 7), 2)
  };

  const trend = (timelineResponse.rows || []).map((row) => ({
    date: convertDateDimension(parseDimensionValue(row, 0)),
    users: parseMetricValue(row, 0)
  }));

  return {
    configured: true,
    range,
    metrics: {
      ...metrics,
      labels: {
        activeUsers: formatCompactNumber(metrics.activeUsers),
        totalUsers: formatCompactNumber(metrics.totalUsers),
        newUsers: formatCompactNumber(metrics.newUsers),
        sessions: formatCompactNumber(metrics.sessions),
        pageViews: formatCompactNumber(metrics.pageViews),
        eventCount: formatCompactNumber(metrics.eventCount),
        engagementRate: formatPercentLabel(metrics.engagementRate),
        averageSessionDuration: parseDurationLabel(metrics.averageSessionDuration)
      }
    },
    trend
  };
};

const getRealtime = async () => {
  const response = await runRealtimeReport(
    {
      metrics: [{ name: 'activeUsers' }]
    },
    buildCacheKey('realtime', {})
  );

  if (response.configured === false) {
    return {
      configured: false,
      message: response.message
    };
  }

  const row = response.rows?.[0];
  const activeUsers = parseMetricValue(row, 0);

  return {
    configured: true,
    activeUsers,
    label: formatCompactNumber(activeUsers),
    updatedAt: new Date().toISOString()
  };
};

const getTopPages = async (rangeInput) => {
  const range = buildDateRange(rangeInput);
  const response = await runReport(
    {
      dateRanges: [{ startDate: range.startDate, endDate: range.endDate }],
      dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
      metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 10
    },
    buildCacheKey('pages', range)
  );

  if (response.configured === false) {
    return {
      configured: false,
      message: response.message,
      range
    };
  }

  return {
    configured: true,
    range,
    rows: (response.rows || []).map((row) => ({
      path: parseDimensionValue(row, 0) || '/',
      title: parseDimensionValue(row, 1) || 'Untitled page',
      pageViews: parseMetricValue(row, 0),
      activeUsers: parseMetricValue(row, 1)
    }))
  };
};

const getTrafficSources = async (rangeInput) => {
  const range = buildDateRange(rangeInput);
  const response = await runReport(
    {
      dateRanges: [{ startDate: range.startDate, endDate: range.endDate }],
      dimensions: [{ name: 'sessionDefaultChannelGroup' }],
      metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 8
    },
    buildCacheKey('traffic', range)
  );

  if (response.configured === false) {
    return {
      configured: false,
      message: response.message,
      range
    };
  }

  return {
    configured: true,
    range,
    rows: (response.rows || []).map((row) => ({
      source: parseDimensionValue(row, 0) || 'Unassigned',
      sessions: parseMetricValue(row, 0),
      activeUsers: parseMetricValue(row, 1)
    }))
  };
};

const getDevices = async (rangeInput) => {
  const range = buildDateRange(rangeInput);
  const response = await runReport(
    {
      dateRanges: [{ startDate: range.startDate, endDate: range.endDate }],
      dimensions: [{ name: 'deviceCategory' }],
      metrics: [{ name: 'activeUsers' }],
      orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
      limit: 6
    },
    buildCacheKey('devices', range)
  );

  if (response.configured === false) {
    return {
      configured: false,
      message: response.message,
      range
    };
  }

  return {
    configured: true,
    range,
    rows: (response.rows || []).map((row) => ({
      device: parseDimensionValue(row, 0) || 'Unknown',
      activeUsers: parseMetricValue(row, 0)
    }))
  };
};

const getCountries = async (rangeInput) => {
  const range = buildDateRange(rangeInput);
  const response = await runReport(
    {
      dateRanges: [{ startDate: range.startDate, endDate: range.endDate }],
      dimensions: [{ name: 'country' }],
      metrics: [{ name: 'activeUsers' }],
      orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
      limit: 8
    },
    buildCacheKey('countries', range)
  );

  if (response.configured === false) {
    return {
      configured: false,
      message: response.message,
      range
    };
  }

  return {
    configured: true,
    range,
    rows: (response.rows || []).map((row) => ({
      country: parseDimensionValue(row, 0) || 'Unknown',
      activeUsers: parseMetricValue(row, 0)
    }))
  };
};

module.exports = {
  buildDateRange,
  getDevices,
  getCountries,
  getMissingConfigMessage,
  getOverview,
  getRealtime,
  getTopPages,
  getTrafficSources,
  isConfigured,
  REPORT_SCOPE
};
