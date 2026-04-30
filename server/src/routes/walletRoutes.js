const express = require('express');
const { getWallet } = require('../controllers/walletController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, getWallet);

module.exports = router;
