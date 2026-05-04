const multer = require('multer');
const User = require('../models/User');
const Payment = require('../models/Payment');
const DataRecord = require('../models/DataRecord');
const Transaction = require('../models/Transaction');
const asyncHandler = require('../utils/asyncHandler');
const parseCsvBuffer = require('../utils/csvImport');
const { clearQueryCaches } = require('../services/filterService');

const upload = multer({ storage: multer.memoryStorage() });

const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select('-password').sort({ createdAt: -1 });
  res.json({ users });
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
  adjustCoins,
  importDataset,
  getPendingPayments
};
