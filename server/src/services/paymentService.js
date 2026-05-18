const Transaction = require('../models/Transaction');
const User = require('../models/User');

const createPaymentReference = () =>
  `PAY-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

const calculateCoinsFromAmount = (amount) => {
  const conversionRate = Number(process.env.COINS_PER_USDT || 1000);
  return Number((amount * conversionRate).toFixed(2));
};

const approveAndCreditPayment = async (
  payment,
  {
    reviewedBy = null,
    reason = 'Payment approved',
    metadata = {}
  } = {}
) => {
  if (payment.creditedAt) {
    const existingUser = await User.findById(payment.userId);
    return {
      payment,
      user: existingUser,
      alreadyCredited: true
    };
  }

  payment.status = 'approved';
  payment.reviewedBy = reviewedBy;
  payment.creditedAt = new Date();
  await payment.save();

  const updatedUser = await User.findByIdAndUpdate(
    payment.userId,
    { $inc: { coins: payment.coins } },
    { new: true }
  );

  await Transaction.create({
    userId: payment.userId,
    type: 'credit',
    amount: payment.coins,
    reason,
    metadata: {
      paymentId: payment._id,
      reference: payment.reference,
      amount: payment.amount,
      ...metadata
    }
  });

  return {
    payment,
    user: updatedUser,
    alreadyCredited: false
  };
};

module.exports = {
  createPaymentReference,
  calculateCoinsFromAmount,
  approveAndCreditPayment
};
