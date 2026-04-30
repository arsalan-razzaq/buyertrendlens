const express = require('express');
const { query } = require('express-validator');
const { getDataRecords, getFilterOptions, getPublicStats } = require('../controllers/dataController');
const validateRequest = require('../middleware/validateRequest');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/public/stats', getPublicStats);

router.get('/filter-options', protect, getFilterOptions);

router.get(
  '/',
  protect,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
  ],
  validateRequest,
  getDataRecords
);

module.exports = router;
