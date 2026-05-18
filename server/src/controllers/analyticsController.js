const asyncHandler = require('../utils/asyncHandler');
const {
  getCountries,
  getDevices,
  getOverview,
  getRealtime,
  getTopPages,
  getTrafficSources
} = require('../services/gaAnalyticsService');

const getRangeInput = (req) => ({
  preset: req.query.preset,
  startDate: req.query.startDate,
  endDate: req.query.endDate
});

const getAnalyticsOverview = asyncHandler(async (req, res) => {
  const data = await getOverview(getRangeInput(req));
  res.json(data);
});

const getAnalyticsRealtime = asyncHandler(async (req, res) => {
  const data = await getRealtime();
  res.json(data);
});

const getAnalyticsPages = asyncHandler(async (req, res) => {
  const data = await getTopPages(getRangeInput(req));
  res.json(data);
});

const getAnalyticsTraffic = asyncHandler(async (req, res) => {
  const data = await getTrafficSources(getRangeInput(req));
  res.json(data);
});

const getAnalyticsDevices = asyncHandler(async (req, res) => {
  const data = await getDevices(getRangeInput(req));
  res.json(data);
});

const getAnalyticsCountries = asyncHandler(async (req, res) => {
  const data = await getCountries(getRangeInput(req));
  res.json(data);
});

module.exports = {
  getAnalyticsCountries,
  getAnalyticsDevices,
  getAnalyticsOverview,
  getAnalyticsPages,
  getAnalyticsRealtime,
  getAnalyticsTraffic
};
