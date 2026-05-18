const multer = require('multer');
const User = require('../models/User');
const Payment = require('../models/Payment');
const DataRecord = require('../models/DataRecord');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const ExportFile = require('../models/ExportFile');
const asyncHandler = require('../utils/asyncHandler');
const parseCsvBuffer = require('../utils/csvImport');
const { clearQueryCaches } = require('../services/filterService');

const upload = multer({ storage: multer.memoryStorage() });

const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select('-password').sort({ createdAt: -1 });
  res.json({ users });
});

const deleteUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const user = await User.findById(userId).select('name email role');

  if (!user) {
    res.status(404);
    throw new Error('User not found.');
  }

  if (String(user._id) === String(req.user._id)) {
    res.status(400);
    throw new Error('You cannot delete your own account.');
  }

  await Promise.all([
    Payment.deleteMany({ userId: user._id }),
    Payment.updateMany({ reviewedBy: user._id }, { $set: { reviewedBy: null } }),
    Transaction.deleteMany({ userId: user._id }),
    Notification.deleteMany({ userId: user._id }),
    ExportFile.deleteMany({ userId: user._id }),
    User.deleteOne({ _id: user._id })
  ]);

  res.json({
    message: 'User deleted successfully.',
    deletedUserId: userId
  });
});

const adjustCoins = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.userId);
  const amount = Number(req.body.amount);
  const reason = req.body.reason || 'Admin adjustment';

  if (!user) {
    res.status(404);
    throw new Error('User not found.');
  }

  if (!amount) {
    res.status(400);
    throw new Error('Amount must be a non-zero number.');
  }

  if (user.coins + amount < 0) {
    res.status(400);
    throw new Error('Coin adjustment would result in a negative balance.');
  }

  user.coins += amount;
  await user.save();

  await Transaction.create({
    userId: user._id,
    type: amount > 0 ? 'credit' : 'debit',
    amount: Math.abs(amount),
    reason,
    metadata: {
      adminId: req.user._id
    }
  });

  res.json({
    message: 'User balance updated',
    user
  });
});

const importDataset = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('CSV file is required.');
  }

  const records = await parseCsvBuffer(req.file.buffer);

  if (!records.length) {
    res.status(400);
    throw new Error('No valid rows were found in the uploaded CSV.');
  }

  await DataRecord.insertMany(records);
  // Imported rows change the table/export result set, so query caches must be cleared.
  clearQueryCaches();

  res.status(201).json({
    message: 'Dataset imported successfully',
    inserted: records.length
  });
});

const getPendingPayments = asyncHandler(async (req, res) => {
  const payments = await Payment.find({ status: 'pending' })
    .populate('userId', 'email name')
    .sort({ createdAt: -1 });

  res.json({ payments });
});

module.exports = {
  upload,
  getUsers,
  deleteUser,
  adjustCoins,
  importDataset,
  getPendingPayments
};
