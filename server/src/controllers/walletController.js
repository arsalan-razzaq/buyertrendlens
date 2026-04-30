const Transaction = require('../models/Transaction');
const asyncHandler = require('../utils/asyncHandler');

const getWallet = asyncHandler(async (req, res) => {
  const transactions = await Transaction.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .limit(50);

  res.json({
    balance: req.user.coins,
    transactions
  });
});

module.exports = {
  getWallet
};
