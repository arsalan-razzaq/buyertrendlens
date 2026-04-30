require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Payment = require('../models/Payment');

const manualWalletAddress =
  process.env.BINANCE_MANUAL_ACCOUNT ||
  process.env.BINANCE_RECEIVE_ADDRESS ||
  'demo-binance-account@example.com';

const buildReference = (index) =>
  `DUMMY-PAY-${Date.now()}-${String(index + 1).padStart(2, '0')}`;

const buildTxHash = (index) =>
  `0xDEMO${Date.now().toString(16).toUpperCase()}${String(index + 1).padStart(4, '0')}`;

const seedDummyPayments = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not configured.');
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const users = await User.find({ role: 'user' }).sort({ createdAt: -1 }).limit(3);

  if (!users.length) {
    throw new Error('No user accounts found to attach dummy payments.');
  }

  const payments = await Promise.all(
    users.map((user, index) =>
      Payment.create({
        userId: user._id,
        amount: 25 + index * 10,
        coins: (25 + index * 10) * Number(process.env.COINS_PER_USDT || 100),
        paymentMethod: 'binance',
        network: 'Binance Manual',
        walletAddress: manualWalletAddress,
        receiverAddress: manualWalletAddress,
        txHash: buildTxHash(index),
        reference: buildReference(index),
        status: 'pending'
      })
    )
  );

  console.log(
    JSON.stringify(
      payments.map((payment) => ({
        _id: payment._id,
        reference: payment.reference,
        txHash: payment.txHash,
        userId: payment.userId
      })),
      null,
      2
    )
  );

  await mongoose.disconnect();
};

seedDummyPayments().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
