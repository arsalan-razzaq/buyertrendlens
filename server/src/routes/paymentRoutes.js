const express = require('express');
const { body } = require('express-validator');
const {
  createPaymentRequest,
  createBinancePayRequest,
  getBinancePayStatus,
  createBinanceDepositRequest,
  createCryptoPaymentIntent,
  getMyPayments,
  submitPaymentProof,
  approvePayment,
  verifyTronPayment,
  verifyBinanceDeposit
} = require('../controllers/paymentController');
const { protect, requireRole } = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

router.get('/', protect, getMyPayments);

router.post(
  '/binance-pay/request',
  protect,
  [body('amount').isFloat({ gt: 0 }).withMessage('Amount must be greater than zero')],
  validateRequest,
  createBinancePayRequest
);

router.get('/binance-pay/:paymentId/status', protect, getBinancePayStatus);

router.post(
  '/binance-deposit/request',
  protect,
  [
    body('amount').isFloat({ gt: 0 }).withMessage('Amount must be greater than zero'),
    body('network').isString().notEmpty().withMessage('Network is required')
  ],
  validateRequest,
  createBinanceDepositRequest
);

router.patch(
  '/:paymentId/verify-binance-deposit',
  protect,
  [body('txHash').isString().notEmpty().withMessage('Transaction hash is required')],
  validateRequest,
  verifyBinanceDeposit
);

router.post(
  '/crypto/request',
  protect,
  [
    body('amount').isString().notEmpty().withMessage('Amount is required'),
    body('walletAddress').isString().notEmpty().withMessage('Wallet address is required')
  ],
  validateRequest,
  createCryptoPaymentIntent
);

router.post(
  '/request',
  protect,
  [body('amount').isFloat({ gt: 0 }).withMessage('Amount must be greater than zero')],
  validateRequest,
  createPaymentRequest
);

router.patch(
  '/:paymentId/verify-tron',
  protect,
  [body('txHash').optional().isString().withMessage('Transaction hash must be a string')],
  validateRequest,
  verifyTronPayment
);

router.patch(
  '/:paymentId/submit-proof',
  protect,
  [body('txHash').optional().isString().withMessage('Transaction hash must be a string')],
  validateRequest,
  submitPaymentProof
);

router.patch('/confirm/:paymentId', protect, requireRole('admin'), approvePayment);

module.exports = router;
