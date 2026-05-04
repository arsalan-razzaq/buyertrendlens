const express = require('express');
const rateLimit = require('express-rate-limit');
const { previewExport, exportCsv, listExports, downloadExport, streamExportDownload } = require('../controllers/exportController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();
const shouldEnableRateLimit = process.env.ENABLE_RATE_LIMIT
  ? process.env.ENABLE_RATE_LIMIT === 'true'
  : process.env.NODE_ENV === 'production';
const exportLimiter = rateLimit({
  windowMs: Math.max(Number(process.env.EXPORT_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, 1000),
  max: Math.max(Number(process.env.EXPORT_RATE_LIMIT_MAX) || 6, 1),
  standardHeaders: true,
  skip: () => !shouldEnableRateLimit,
  message: {
    message: 'Too many export attempts. Please wait and try again shortly.'
  }
});

router.post('/preview', protect, previewExport);
router.get('/history', protect, listExports);
router.get('/:id/download', protect, streamExportDownload);
router.get('/:id', protect, downloadExport);
router.post('/', protect, exportLimiter, exportCsv);

module.exports = router;
