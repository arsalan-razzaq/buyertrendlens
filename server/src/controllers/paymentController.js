const Payment = require('../models/Payment');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const TronWeb = require('tronweb');
const {
  createPaymentReference,
  calculateCoinsFromAmount,
  approveAndCreditPayment
} = require('../services/paymentService');
const { sendPaymentStatusEmail } = require('../services/emailService');
const {
  getTronPaymentConfig,
  parseAmountToBaseUnits,
  verifyUsdtTransferTransaction
} = require('../services/tronPaymentService');
const {
  createBinancePayOrder,
  queryBinancePayOrder,
  getDepositAddressForNetwork,
  findMatchingDeposit,
  getManualBinancePaymentConfig,
  getPaymentWorkspaceOptions,
  isBinancePayConfigured,
  isBinanceDepositApiConfigured,
  resolveDepositNetwork
} = require('../services/binancePaymentService');

const parsePositiveAmount = (value) => {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Amount must be greater than zero.');
  }

  return amount;
};

const notifyPaymentDecision = async ({ user, payment, status }) => {
  if (!user?.email) {
    return false;
  }

  await sendPaymentStatusEmail({
    to: user.email,
    name: user.name || user.email,
    reference: payment.reference,
    amount: payment.amount,
    coins: payment.coins,
    status,
    reviewedAt: payment.updatedAt || new Date()
  });

  return true;
};

const getMyPayments = asyncHandler(async (req, res) => {
  const payments = await Payment.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(20);

  res.json({
    payments,
    paymentOptions: getPaymentWorkspaceOptions()
  });
});

const createPaymentRequest = asyncHandler(async (req, res) => {
  const amount = parsePositiveAmount(req.body.amount);
  const manualBinance = getManualBinancePaymentConfig();
  const walletAddress =
    manualBinance.accountValue ||
    process.env.BINANCE_RECEIVE_ADDRESS ||
    'Manual Binance payment';

  if (!manualBinance.enabled) {
    res.status(500);
    throw new Error(
      'Manual Binance payment is not configured. Add BINANCE_MANUAL_ACCOUNT, BINANCE_MANUAL_PAYMENT_LINK, or BINANCE_MANUAL_QR_IMAGE_URL.'
    );
  }

  const payment = await Payment.create({
    userId: req.user._id,
    amount,
    coins: calculateCoinsFromAmount(amount),
    paymentMethod: 'binance',
    network: 'Binance Manual',
    walletAddress,
    receiverAddress: walletAddress,
    reference: createPaymentReference()
  });

  res.status(201).json({
    message: 'Payment request created',
    payment,
    paymentOptions: getPaymentWorkspaceOptions()
  });
});

const createBinancePayRequest = asyncHandler(async (req, res) => {
  if (!isBinancePayConfigured()) {
    res.status(503);
    throw new Error(
      'Binance Pay merchant checkout is not configured yet. Add BINANCE_PAY_API_KEY, BINANCE_PAY_SECRET_KEY, and BINANCE_PAY_CERTIFICATE_SN.'
    );
  }

  const amount = parsePositiveAmount(req.body.amount);
  const coins = calculateCoinsFromAmount(amount);
  const reference = createPaymentReference();
  const payment = await Payment.create({
    userId: req.user._id,
    amount,
    coins,
    paymentMethod: 'binance_pay',
    network: 'BINANCE-PAY',
    walletAddress: 'Binance App Checkout',
    receiverAddress: 'Binance App Checkout',
    token: 'USDT',
    reference
  });

  try {
    const order = await createBinancePayOrder({
      amount,
      reference,
      coins
    });

    payment.providerReference = order.prepayId || '';
    payment.checkoutUrl = order.checkoutUrl || '';
    payment.deepLinkUrl = order.universalUrl || order.deeplink || '';
    payment.qrCodeLink = order.qrcodeLink || '';
    payment.expiresAt = order.expireTime ? new Date(Number(order.expireTime)) : null;
    await payment.save();

    res.status(201).json({
      message: 'Binance Pay checkout created.',
      payment,
      checkout: {
        prepayId: order.prepayId || '',
        checkoutUrl: order.checkoutUrl || '',
        universalUrl: order.universalUrl || '',
        deeplink: order.deeplink || '',
        qrcodeLink: order.qrcodeLink || '',
        expireTime: order.expireTime || null
      }
    });
  } catch (error) {
    payment.status = 'failed';
    await payment.save();

    res.status(error.status || 500);
    throw new Error(error.message || 'Unable to create Binance Pay checkout.');
  }
});

const getBinancePayStatus = asyncHandler(async (req, res) => {
  const payment = await Payment.findOne({
    _id: req.params.paymentId,
    userId: req.user._id
  });

  if (!payment) {
    res.status(404);
    throw new Error('Payment request not found.');
  }

  if (payment.paymentMethod !== 'binance_pay') {
    res.status(400);
    throw new Error('This payment is not a Binance Pay checkout.');
  }

  if (payment.status === 'approved' && payment.creditedAt) {
    return res.json({
      message: 'Payment already credited.',
      payment,
      balance: req.user.coins
    });
  }

  if (!isBinancePayConfigured()) {
    res.status(503);
    throw new Error('Binance Pay merchant credentials are missing on the server.');
  }

  const statusResponse = await queryBinancePayOrder({
    reference: payment.reference,
    providerReference: payment.providerReference
  });

  const externalStatus = statusResponse.status || 'PENDING';

  if (externalStatus === 'PAID') {
    payment.txHash = statusResponse.transactionId || payment.txHash;

    const { payment: approvedPayment, user } = await approveAndCreditPayment(payment, {
      reason: 'Binance Pay payment confirmed',
      metadata: {
        providerReference: payment.providerReference,
        transactionId: statusResponse.transactionId || undefined,
        payMethod: statusResponse.paymentInfo?.payMethod || undefined,
        channel: statusResponse.paymentInfo?.channel || undefined,
        network: 'BINANCE-PAY'
      }
    });

    return res.json({
      message: 'Binance Pay payment confirmed and coins credited.',
      payment: approvedPayment,
      balance: user.coins,
      providerStatus: externalStatus
    });
  }

  if (['EXPIRED', 'CANCELED', 'ERROR'].includes(externalStatus)) {
    payment.status = externalStatus === 'EXPIRED' ? 'expired' : 'failed';
    await payment.save();
  }

  return res.json({
    message: 'Binance Pay status checked.',
    payment,
    providerStatus: externalStatus,
    providerData: statusResponse
  });
});

const createBinanceDepositRequest = asyncHandler(async (req, res) => {
  const amount = parsePositiveAmount(req.body.amount);
  const network = resolveDepositNetwork(req.body.network);
  const depositAddress = await getDepositAddressForNetwork(network.key);
  const coins = calculateCoinsFromAmount(amount);

  const payment = await Payment.create({
    userId: req.user._id,
    amount,
    coins,
    paymentMethod: 'binance_deposit',
    network: `USDT-${network.key}`,
    walletAddress: depositAddress.address,
    receiverAddress: depositAddress.address,
    token: 'USDT',
    reference: createPaymentReference()
  });

  res.status(201).json({
    message: 'Deposit instructions generated.',
    payment,
    deposit: {
      network: network.key,
      label: network.label,
      address: depositAddress.address,
      addressTag: depositAddress.addressTag || '',
      source: depositAddress.source,
      amount: payment.amount.toFixed(2),
      token: 'USDT'
    }
  });
});

const verifyBinanceDeposit = asyncHandler(async (req, res) => {
  const payment = await Payment.findOne({
    _id: req.params.paymentId,
    userId: req.user._id
  });

  if (!payment) {
    res.status(404);
    throw new Error('Payment request not found.');
  }

  if (payment.paymentMethod !== 'binance_deposit') {
    res.status(400);
    throw new Error('This payment is not a Binance deposit request.');
  }

  if (payment.status === 'approved' && payment.creditedAt) {
    return res.json({
      message: 'Payment already credited.',
      payment,
      balance: req.user.coins
    });
  }

  if (!isBinanceDepositApiConfigured()) {
    res.status(503);
    throw new Error(
      'Automatic Binance deposit verification is not configured. Add BINANCE_DEPOSIT_API_KEY and BINANCE_DEPOSIT_SECRET_KEY.'
    );
  }

  const txHash = String(req.body.txHash || payment.txHash || '').trim();

  if (!txHash) {
    res.status(400);
    throw new Error('Transaction hash is required to verify the Binance deposit.');
  }

  const duplicateTx = await Payment.findOne({
    txHash,
    _id: { $ne: payment._id },
    creditedAt: { $ne: null }
  });

  if (duplicateTx) {
    res.status(409);
    throw new Error('This transaction hash has already been used for another credited payment.');
  }

  const verification = await findMatchingDeposit({
    networkInput: payment.network.replace('USDT-', ''),
    txHash,
    amount: payment.amount,
    address: payment.walletAddress
  });

  payment.txHash = txHash;

  if (verification.status === 'not_found') {
    await payment.save();

    return res.status(202).json({
      message: 'Deposit not found on Binance yet. Wait a bit and try again.',
      payment,
      verification
    });
  }

  if (verification.status === 'pending') {
    await payment.save();

    return res.status(202).json({
      message: 'Deposit is detected but still pending confirmation inside Binance.',
      payment,
      verification
    });
  }

  if (!verification.amountMatches) {
    res.status(400);
    throw new Error('The deposit amount on Binance does not match the requested USDT amount.');
  }

  if (!verification.addressMatches) {
    res.status(400);
    throw new Error('The deposit address does not match the configured Binance deposit address.');
  }

  if (verification.status !== 'success') {
    payment.status = 'failed';
    await payment.save();

    res.status(400);
    throw new Error('Binance marked this deposit as failed or rejected.');
  }

  const deposit = verification.deposit || {};
  payment.status = 'pending';
  payment.txHash = txHash;

  const { payment: approvedPayment, user } = await approveAndCreditPayment(payment, {
    reason: 'Binance deposit verified automatically',
    metadata: {
      txHash,
      depositId: deposit.id || undefined,
      sourceAddress: deposit.sourceAddress || undefined,
      network: payment.network,
      receiverAddress: payment.walletAddress,
      completeTime: deposit.completeTime || undefined
    }
  });

  res.json({
    message: 'Binance deposit verified and coins credited.',
    payment: approvedPayment,
    balance: user.coins,
    verification
  });
});

const createCryptoPaymentIntent = asyncHandler(async (req, res) => {
  const amountInput = String(req.body.amount || '').trim();
  const senderWalletAddress = String(req.body.walletAddress || '').trim();
  const { receiverAddress, usdtDecimals } = getTronPaymentConfig();

  if (!amountInput) {
    res.status(400);
    throw new Error('Amount is required.');
  }

  if (!senderWalletAddress) {
    res.status(400);
    throw new Error('Sender wallet address is required.');
  }

  if (!TronWeb.isAddress(senderWalletAddress)) {
    res.status(400);
    throw new Error('Sender wallet address must be a valid TRON address.');
  }

  if (!receiverAddress) {
    res.status(500);
    throw new Error('TRON receiver address is not configured.');
  }

  if (!TronWeb.isAddress(receiverAddress)) {
    res.status(500);
    throw new Error('Configured TRON receiver address is invalid.');
  }

  const amountBaseUnits = parseAmountToBaseUnits(amountInput, usdtDecimals);
  const amount = parsePositiveAmount(amountInput);

  const payment = await Payment.create({
    userId: req.user._id,
    amount,
    amountBaseUnits,
    coins: calculateCoinsFromAmount(amount),
    paymentMethod: 'tron_wallet',
    network: 'TRON-TRC20',
    walletAddress: receiverAddress,
    receiverAddress,
    senderWalletAddress,
    token: 'USDT',
    reference: createPaymentReference()
  });

  res.status(201).json({
    message: 'TRON payment intent created',
    payment
  });
});

const submitPaymentProof = asyncHandler(async (req, res) => {
  const payment = await Payment.findOne({
    _id: req.params.paymentId,
    userId: req.user._id
  });

  if (!payment) {
    res.status(404);
    throw new Error('Payment request not found.');
  }

  if (payment.status !== 'pending') {
    res.status(400);
    throw new Error('Only pending requests can be updated.');
  }

  payment.txHash = req.body.txHash || payment.txHash;
  await payment.save();

  res.json({
    message: 'Payment proof submitted',
    payment
  });
});

const approvePayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.paymentId);

  if (!payment) {
    res.status(404);
    throw new Error('Payment request not found.');
  }

  if (payment.status !== 'pending') {
    res.status(400);
    throw new Error('Payment request has already been reviewed.');
  }

  const { payment: approvedPayment, user: updatedUser } = await approveAndCreditPayment(payment, {
    reviewedBy: req.user._id,
    reason:
      payment.paymentMethod === 'tron_wallet'
        ? 'TRON wallet payment verified'
        : payment.paymentMethod === 'binance_pay'
          ? 'Binance Pay approved'
          : 'Binance payment approved',
    metadata: {
      network: payment.network,
      txHash: payment.txHash || undefined
    }
  });

  let notificationSent = false;
  try {
    notificationSent = await notifyPaymentDecision({
      user: updatedUser,
      payment: approvedPayment,
      status: 'approved'
    });
  } catch (error) {
    console.error('Payment approval email failed:', error.message);
  }

  res.json({
    message: notificationSent
      ? 'Payment approved, coins added, and email notification sent.'
      : 'Payment approved and coins added.',
    payment: approvedPayment,
    balance: updatedUser.coins
  });
});

const verifyTronPayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findOne({
    _id: req.params.paymentId,
    userId: req.user._id
  });

  if (!payment) {
    res.status(404);
    throw new Error('Payment request not found.');
  }

  if (payment.paymentMethod !== 'tron_wallet') {
    res.status(400);
    throw new Error('This payment was not created for TRON wallet verification.');
  }

  if (payment.status === 'approved' && payment.creditedAt) {
    return res.json({
      message: 'Payment already verified.',
      payment,
      balance: req.user.coins
    });
  }

  const txHash = String(req.body.txHash || payment.txHash || '').trim();

  if (!txHash) {
    res.status(400);
    throw new Error('Transaction hash is required.');
  }

  const existingApprovedPayment = await Payment.findOne({
    txHash,
    _id: { $ne: payment._id },
    creditedAt: { $ne: null }
  });

  if (existingApprovedPayment) {
    res.status(409);
    throw new Error('This transaction hash has already been used for another payment.');
  }

  const verification = await verifyUsdtTransferTransaction(txHash);

  payment.txHash = txHash;

  if (verification.status === 'pending') {
    await payment.save();

    return res.status(202).json({
      message: 'Transaction is still pending on-chain.',
      payment,
      verification
    });
  }

  if (verification.status === 'failed') {
    payment.status = 'failed';
    await payment.save();

    res.status(400);
    throw new Error('Transaction failed on-chain and could not be credited.');
  }

  if (!verification.contractMatches) {
    res.status(400);
    throw new Error('Transaction was not sent to the configured USDT TRC20 contract.');
  }

  if (!verification.receiverMatches) {
    res.status(400);
    throw new Error('Transaction receiver does not match the configured payment wallet.');
  }

  if (payment.senderWalletAddress && verification.senderAddress !== payment.senderWalletAddress) {
    res.status(400);
    throw new Error('Transaction sender does not match the connected wallet used for this payment.');
  }

  if (payment.amountBaseUnits && verification.amountBaseUnits !== payment.amountBaseUnits) {
    res.status(400);
    throw new Error('Transaction amount does not match the requested USDT amount.');
  }

  payment.senderWalletAddress = verification.senderAddress;
  payment.receiverAddress = verification.receiverAddress;
  payment.walletAddress = verification.receiverAddress;
  payment.txHash = txHash;
  payment.token = 'USDT';
  payment.network = 'TRON-TRC20';

  const { payment: approvedPayment, user } = await approveAndCreditPayment(payment, {
    reason: 'TRON wallet payment verified',
    metadata: {
      txHash,
      senderWalletAddress: verification.senderAddress,
      receiverAddress: verification.receiverAddress,
      network: 'TRON-TRC20',
      token: 'USDT'
    }
  });

  res.json({
    message: 'TRON payment verified and coins added automatically.',
    payment: approvedPayment,
    balance: user.coins,
    verification
  });
});

const rejectPayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.paymentId);

  if (!payment) {
    res.status(404);
    throw new Error('Payment request not found.');
  }

  if (payment.status !== 'pending') {
    res.status(400);
    throw new Error('Payment request has already been reviewed.');
  }

  payment.status = 'rejected';
  payment.reviewedBy = req.user._id;
  await payment.save();

  const paymentUser = await User.findById(payment.userId);

  let notificationSent = false;
  try {
    notificationSent = await notifyPaymentDecision({
      user: paymentUser,
      payment,
      status: 'rejected'
    });
  } catch (error) {
    console.error('Payment rejection email failed:', error.message);
  }

  res.json({
    message: notificationSent
      ? 'Payment rejected and email notification sent.'
      : 'Payment rejected.',
    payment
  });
});

module.exports = {
  createPaymentRequest,
  createBinancePayRequest,
  getBinancePayStatus,
  createBinanceDepositRequest,
  createCryptoPaymentIntent,
  getMyPayments,
  submitPaymentProof,
  approvePayment,
  verifyTronPayment,
  verifyBinanceDeposit,
  rejectPayment
};
