const TronWeb = require('tronweb');

const DEFAULT_TRONGRID_HOST = 'https://api.trongrid.io';
const DEFAULT_USDT_TRC20_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const DEFAULT_RECEIVER_ADDRESS = 'TCPaxsLzpdNhHRWevgRSXEYCgwzAtq7YQ9';
const DEFAULT_USDT_DECIMALS = 6;
const TRANSFER_SELECTOR = 'a9059cbb';

let tronClient;

const getTronPaymentConfig = () => ({
  receiverAddress: process.env.TRON_RECEIVER_ADDRESS || process.env.VITE_RECEIVER_ADDRESS || DEFAULT_RECEIVER_ADDRESS,
  usdtContractAddress:
    process.env.TRON_USDT_TRC20_CONTRACT ||
    process.env.VITE_USDT_TRC20_CONTRACT ||
    DEFAULT_USDT_TRC20_CONTRACT,
  trongridApiKey: process.env.TRONGRID_API_KEY || process.env.VITE_TRONGRID_API_KEY || '',
  usdtDecimals: Number(process.env.TRON_USDT_DECIMALS || DEFAULT_USDT_DECIMALS)
});

const getTronClient = () => {
  if (!tronClient) {
    const { trongridApiKey } = getTronPaymentConfig();

    tronClient = new TronWeb({
      fullHost: DEFAULT_TRONGRID_HOST,
      headers: trongridApiKey ? { 'TRON-PRO-API-KEY': trongridApiKey } : undefined
    });
  }

  return tronClient;
};

const normalizeNumericString = (value) => {
  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.trunc(value).toString() : '0';
  }

  return String(value || '0').trim();
};

const parseAmountToBaseUnits = (amount, decimals = DEFAULT_USDT_DECIMALS) => {
  const normalized = String(amount || '').trim();

  if (!normalized || !/^\d+(\.\d+)?$/.test(normalized)) {
    throw new Error('Amount must be a valid positive number.');
  }

  const [wholePart, fractionPart = ''] = normalized.split('.');

  if (fractionPart.length > decimals) {
    throw new Error(`Amount supports up to ${decimals} decimal places.`);
  }

  const paddedFraction = `${fractionPart}${'0'.repeat(decimals)}`.slice(0, decimals);
  const combined = `${wholePart}${paddedFraction}`.replace(/^0+(?=\d)/, '');

  return combined || '0';
};

const formatBaseUnitsToAmount = (amountBaseUnits, decimals = DEFAULT_USDT_DECIMALS) => {
  const normalized = normalizeNumericString(amountBaseUnits);
  const padded = normalized.padStart(decimals + 1, '0');
  const whole = padded.slice(0, -decimals).replace(/^0+(?=\d)/, '');
  const fraction = padded.slice(-decimals).replace(/0+$/, '');

  return fraction ? `${whole}.${fraction}` : whole;
};

const decodeTransferData = (rawData) => {
  const normalized = String(rawData || '').replace(/^0x/, '');

  if (!normalized.startsWith(TRANSFER_SELECTOR) || normalized.length < 8 + 64 + 64) {
    throw new Error('Transaction is not a USDT transfer call.');
  }

  const recipientChunk = normalized.slice(8, 72);
  const amountChunk = normalized.slice(72, 136);
  const receiverHex = `41${recipientChunk.slice(-40)}`;

  return {
    receiverAddress: TronWeb.address.fromHex(receiverHex),
    amountBaseUnits: BigInt(`0x${amountChunk}`).toString()
  };
};

const readTransaction = async (txHash) => {
  const tronWeb = getTronClient();

  try {
    const [transaction, transactionInfo] = await Promise.all([
      tronWeb.trx.getTransaction(txHash),
      tronWeb.trx.getTransactionInfo(txHash)
    ]);

    return {
      transaction,
      transactionInfo
    };
  } catch (error) {
    return {
      transaction: null,
      transactionInfo: null
    };
  }
};

const verifyUsdtTransferTransaction = async (txHash) => {
  const { receiverAddress, usdtContractAddress, usdtDecimals } = getTronPaymentConfig();
  const { transaction, transactionInfo } = await readTransaction(txHash);

  if (!transaction?.raw_data?.contract?.length) {
    return {
      status: 'pending'
    };
  }

  const contractCall = transaction.raw_data.contract[0];
  const parameterValue = contractCall?.parameter?.value || {};

  if (contractCall.type !== 'TriggerSmartContract' || !parameterValue.data) {
    throw new Error('Transaction is not a TRC20 smart contract transfer.');
  }

  const senderAddress = TronWeb.address.fromHex(parameterValue.owner_address);
  const contractAddress = TronWeb.address.fromHex(parameterValue.contract_address);
  const decodedTransfer = decodeTransferData(parameterValue.data);

  const receiptResult = transactionInfo?.receipt?.result;
  const status =
    receiptResult === 'SUCCESS'
      ? 'success'
      : transactionInfo?.result === 'FAILED' || receiptResult === 'FAILED'
      ? 'failed'
      : 'pending';

  return {
    status,
    txHash,
    senderAddress,
    receiverAddress: decodedTransfer.receiverAddress,
    receiverMatches: decodedTransfer.receiverAddress === receiverAddress,
    contractAddress,
    contractMatches: contractAddress === usdtContractAddress,
    amountBaseUnits: decodedTransfer.amountBaseUnits,
    amount: formatBaseUnitsToAmount(decodedTransfer.amountBaseUnits, usdtDecimals),
    receiptResult
  };
};

module.exports = {
  getTronPaymentConfig,
  getTronClient,
  parseAmountToBaseUnits,
  formatBaseUnitsToAmount,
  verifyUsdtTransferTransaction
};
