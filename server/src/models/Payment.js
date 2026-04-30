const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    coins: {
      type: Number,
      required: true
    },
    paymentMethod: {
      type: String,
      enum: ['binance', 'tron_wallet', 'binance_pay', 'binance_deposit'],
      default: 'binance'
    },
    network: {
      type: String,
      default: 'Binance'
    },
    walletAddress: {
      type: String,
      required: true
    },
    senderWalletAddress: {
      type: String,
      default: ''
    },
    receiverAddress: {
      type: String,
      default: ''
    },
    token: {
      type: String,
      default: 'USDT'
    },
    amountBaseUnits: {
      type: String,
      default: ''
    },
    reference: {
      type: String,
      required: true,
      unique: true
    },
    providerReference: {
      type: String,
      default: ''
    },
    checkoutUrl: {
      type: String,
      default: ''
    },
    deepLinkUrl: {
      type: String,
      default: ''
    },
    qrCodeLink: {
      type: String,
      default: ''
    },
    expiresAt: {
      type: Date,
      default: null
    },
    txHash: {
      type: String,
      default: null
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'failed', 'expired'],
      default: 'pending'
    },
    creditedAt: {
      type: Date,
      default: null
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Payment', paymentSchema);
