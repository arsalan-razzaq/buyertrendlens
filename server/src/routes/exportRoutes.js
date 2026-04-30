const express = require('express');
const { previewExport, exportCsv } = require('../controllers/exportController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/preview', protect, previewExport);
router.post('/', protect, exportCsv);

module.exports = router;
