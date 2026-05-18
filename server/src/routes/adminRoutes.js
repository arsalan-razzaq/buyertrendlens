const express = require('express');
const { body, param } = require('express-validator');
const {
  upload,
  getUsers,
  deleteUser,
  adjustCoins,
  importDataset,
  getPendingPayments
} = require('../controllers/adminController');
const {
  getAnalyticsCountries,
  getAnalyticsDevices,
  getAnalyticsOverview,
  getAnalyticsPages,
  getAnalyticsRealtime,
  getAnalyticsTraffic
} = require('../controllers/analyticsController');
const {
  getMailboxEmails,
  getMailboxEmailDetail,
  replyToMailboxEmail
} = require('../controllers/mailboxController');
const { approvePayment, rejectPayment } = require('../controllers/paymentController');
const { protect, requireRole } = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');

const isMailboxEmailId = (value) => /^\d+$/.test(String(value || '')) || /^(inbox|sent|drafts):\d+$/.test(String(value || ''));

const router = express.Router();

router.use(protect, requireRole('admin'));

router.get('/users', getUsers);
router.delete('/users/:userId', deleteUser);
router.get('/payments/pending', getPendingPayments);
router.get('/analytics/overview', getAnalyticsOverview);
router.get('/analytics/realtime', getAnalyticsRealtime);
router.get('/analytics/pages', getAnalyticsPages);
router.get('/analytics/traffic', getAnalyticsTraffic);
router.get('/analytics/devices', getAnalyticsDevices);
router.get('/analytics/countries', getAnalyticsCountries);
router.get('/mailbox/emails', getMailboxEmails);
router.get(
  '/mailbox/emails/:id',
  [param('id').custom(isMailboxEmailId).withMessage('Email id must be a positive number')],
  validateRequest,
  getMailboxEmailDetail
);
router.post(
  '/mailbox/reply',
  [
    body('emailId').custom(isMailboxEmailId).withMessage('Email id must be a positive number'),
    body('replyBody').trim().notEmpty().withMessage('Reply body is required')
  ],
  validateRequest,
  replyToMailboxEmail
);
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
