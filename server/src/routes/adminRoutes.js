const express = require('express');
const { body } = require('express-validator');
const {
  upload,
  getUsers,
  adjustCoins,
  importDataset,
  getPendingPayments
} = require('../controllers/adminController');
const { approvePayment, rejectPayment } = require('../controllers/paymentController');
const { protect, requireRole } = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

router.use(protect, requireRole('admin'));

router.get('/users', getUsers);
router.get('/payments/pending', getPendingPayments);
router.post('/datasets/import', upload.single('file'), importDataset);
router.patch(
  '/users/:userId/coins',
  [
    body('amount')
      .isFloat()
      .withMessage('Amount must be a number')
      .custom((value) => Number(value) !== 0)
      .withMessage('Amount must be a non-zero number'),
    body('reason').optional().isString()
  ],
  validateRequest,
  adjustCoins
);
router.patch('/payments/:paymentId/approve', approvePayment);
router.patch('/payments/:paymentId/reject', rejectPayment);

module.exports = router;
