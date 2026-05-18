const crypto = require('crypto');

const BINANCE_PAY_BASE_URL = process.env.BINANCE_PAY_BASE_URL || 'https://bpay.binanceapi.com';
const BINANCE_SPOT_BASE_URL = process.env.BINANCE_API_BASE_URL || 'https://api.binance.com';

const DEPOSIT_NETWORKS = [
  {
    key: 'TRC20',
    apiNetwork: 'TRX',
    label: 'USDT on TRON (TRC20)',
    envKey: 'BINANCE_USDT_TRC20_ADDRESS'
  },
  {
    key: 'BEP20',
    apiNetwork: 'BSC',
    label: 'USDT on BNB Smart Chain (BEP20)',
    envKey: 'BINANCE_USDT_BEP20_ADDRESS'
  },
  {
    key: 'ERC20',
    apiNetwork: 'ETH',
    label: 'USDT on Ethereum (ERC20)',
    envKey: 'BINANCE_USDT_ERC20_ADDRESS'
  }
];

const DEFAULT_MANUAL_BINANCE_ACCOUNT = 'User-07d6a';
const DEFAULT_MANUAL_BINANCE_PAYMENT_LINK = 'https://app.binance.com/uni-qr/W8e94BaB';
const DEFAULT_MANUAL_BINANCE_PAYEE_NAME = 'Binance Pay';
const DEFAULT_MANUAL_BINANCE_ACCOUNT_LABEL = 'Wallet ID';
const DEFAULT_MANUAL_BINANCE_INSTRUCTIONS =
  'Open the Binance payment link or scan the QR, send the exact amount to this wallet ID, then submit your TX hash or transfer reference for admin approval.';

const stringifyAmount = (value) => Number(value).toFixed(2);

const createJsonHeaders = (headers = {}) => ({
  'Content-Type': 'application/json',
  ...headers
});

const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: createJsonHeaders(options.headers)
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    const error = new Error(data.errorMessage || data.msg || `Request failed with status ${response.status}.`);
    error.status = response.status;
    error.payload = data;
    throw error;
  }

  return data;
};

const getBinancePayConfig = () => ({
  apiKey: process.env.BINANCE_PAY_API_KEY || '',
  secretKey: process.env.BINANCE_PAY_SECRET_KEY || '',
  certificateSn: process.env.BINANCE_PAY_CERTIFICATE_SN || process.env.BINANCE_PAY_API_KEY || '',
  baseUrl: BINANCE_PAY_BASE_URL,
  returnUrl: process.env.BINANCE_PAY_RETURN_URL || process.env.CLIENT_URL || 'http://localhost:5173/wallet',
  cancelUrl: process.env.BINANCE_PAY_CANCEL_URL || process.env.CLIENT_URL || 'http://localhost:5173/wallet',
  webhookUrl: process.env.BINANCE_PAY_WEBHOOK_URL || ''
});

const isBinancePayConfigured = () => {
  const config = getBinancePayConfig();
  return Boolean(config.secretKey && config.certificateSn);
};

const getBinanceDepositApiConfig = () => ({
  apiKey: process.env.BINANCE_DEPOSIT_API_KEY || process.env.BINANCE_API_KEY || '',
  secretKey: process.env.BINANCE_DEPOSIT_SECRET_KEY || process.env.BINANCE_API_SECRET || '',
  baseUrl: BINANCE_SPOT_BASE_URL
});

const isBinanceDepositApiConfigured = () => {
  const config = getBinanceDepositApiConfig();
  return Boolean(config.apiKey && config.secretKey);
};

const resolveDepositNetwork = (networkInput) => {
  const normalized = String(networkInput || '')
    .trim()
    .toUpperCase();

  const aliases = {
    TRC20: ['TRC20', 'TRX', 'TRON', 'USDT-TRC20'],
    BEP20: ['BEP20', 'BSC', 'BNB', 'USDT-BEP20'],
    ERC20: ['ERC20', 'ETH', 'ETHEREUM', 'USDT-ERC20']
  };

  const resolved = DEPOSIT_NETWORKS.find((network) => aliases[network.key].includes(normalized));

  if (!resolved) {
    throw new Error('Unsupported USDT network. Use TRC20, BEP20, or ERC20.');
  }

  return resolved;
};

const getSupportedDepositNetworks = () =>
  DEPOSIT_NETWORKS.map((network) => ({
    ...network,
    address: process.env[network.envKey] || ''
  })).filter((network) => network.address || isBinanceDepositApiConfigured());

const getManualBinancePaymentConfig = () => {
  const accountValue =
    process.env.BINANCE_MANUAL_ACCOUNT?.trim() ||
    process.env.BINANCE_RECEIVE_ADDRESS?.trim() ||
    DEFAULT_MANUAL_BINANCE_ACCOUNT;
  const paymentLink = process.env.BINANCE_MANUAL_PAYMENT_LINK?.trim() || DEFAULT_MANUAL_BINANCE_PAYMENT_LINK;
  const qrCodeImageUrl = process.env.BINANCE_MANUAL_QR_IMAGE_URL?.trim() || '';
  const qrCodeValue =
    process.env.BINANCE_MANUAL_QR_VALUE?.trim() ||
    paymentLink ||
    accountValue;
  const payeeName = process.env.BINANCE_MANUAL_PAYEE_NAME?.trim() || DEFAULT_MANUAL_BINANCE_PAYEE_NAME;

  return {
    enabled: Boolean(accountValue || paymentLink || qrCodeImageUrl || qrCodeValue),
    accountLabel: process.env.BINANCE_MANUAL_ACCOUNT_LABEL?.trim() || DEFAULT_MANUAL_BINANCE_ACCOUNT_LABEL,
    accountValue,
    payeeName,
    paymentLink,
    qrCodeImageUrl,
    qrCodeValue,
    instructions:
      process.env.BINANCE_MANUAL_INSTRUCTIONS?.trim() ||
      DEFAULT_MANUAL_BINANCE_INSTRUCTIONS
  };
};

const getPaymentWorkspaceOptions = () => ({
  binancePayEnabled: isBinancePayConfigured(),
  depositApiEnabled: isBinanceDepositApiConfigured(),
  coinsPerUsdt: Number(process.env.COINS_PER_USDT || 1000),
  manualBinance: getManualBinancePaymentConfig(),
  depositNetworks: getSupportedDepositNetworks().map((network) => ({
    key: network.key,
    apiNetwork: network.apiNetwork,
    label: network.label,
    configured: Boolean(network.address) || isBinanceDepositApiConfigured()
  }))
});

const createBinancePayHeaders = (body) => {
  const config = getBinancePayConfig();

  if (!isBinancePayConfigured()) {
    throw new Error('Binance Pay is not configured. Add BINANCE_PAY_API_KEY, BINANCE_PAY_SECRET_KEY, and BINANCE_PAY_CERTIFICATE_SN.');
  }

  const timestamp = Date.now().toString();
  const nonce = crypto.randomBytes(16).toString('hex');
  const payload = `${timestamp}\n${nonce}\n${body}\n`;
  const signature = crypto.createHmac('sha512', config.secretKey).update(payload).digest('hex').toUpperCase();

  return {
    'BinancePay-Timestamp': timestamp,
    'BinancePay-Nonce': nonce,
    'BinancePay-Certificate-SN': config.certificateSn,
    'BinancePay-Signature': signature
  };
};

const requestBinancePay = async (path, payload) => {
  const body = JSON.stringify(payload);
  const headers = createBinancePayHeaders(body);
  const response = await fetchJson(`${getBinancePayConfig().baseUrl}${path}`, {
    method: 'POST',
    body,
    headers
  });

  if (response.status !== 'SUCCESS' || response.code !== '000000') {
    const error = new Error(response.errorMessage || 'Binance Pay request failed.');
    error.payload = response;
    throw error;
  }

  return response.data;
};

const buildBinanceSpotSignedUrl = (path, params = {}) => {
  const config = getBinanceDepositApiConfig();

  if (!isBinanceDepositApiConfigured()) {
    throw new Error('Binance deposit verification is not configured. Add BINANCE_DEPOSIT_API_KEY and BINANCE_DEPOSIT_SECRET_KEY.');
  }

  const query = new URLSearchParams({
    ...params,
    recvWindow: '10000',
    timestamp: Date.now().toString()
  });

  const signature = crypto.createHmac('sha256', config.secretKey).update(query.toString()).digest('hex');
  query.append('signature', signature);

  return `${config.baseUrl}${path}?${query.toString()}`;
};

const requestBinanceSpot = async (path, params = {}) => {
  const config = getBinanceDepositApiConfig();
  const url = buildBinanceSpotSignedUrl(path, params);

  return fetchJson(url, {
    headers: {
      'X-MBX-APIKEY': config.apiKey
    }
  });
};

const createBinancePayOrder = async ({ amount, reference, coins }) => {
  const config = getBinancePayConfig();
  const safeAmount = Number(amount);

  const payload = {
    env: {
      terminalType: 'APP'
    },
    merchantTradeNo: reference,
    orderAmount: Number(safeAmount.toFixed(2)),
    currency: 'USDT',
    description: 'Buyer Trend Lens coin recharge',
    returnUrl: config.returnUrl,
    cancelUrl: config.cancelUrl,
    goodsDetails: [
      {
        goodsType: '02',
        goodsCategory: 'Z000',
        referenceGoodsId: reference,
        goodsName: 'Buyer Trend Lens Coins',
        goodsDetail: `${coins} access coins`
      }
    ]
  };

  if (config.webhookUrl) {
    payload.webhookUrl = config.webhookUrl;
  }

  return requestBinancePay('/binancepay/openapi/v3/order', payload);
};

const queryBinancePayOrder = async ({ reference, providerReference }) => {
  const payload = providerReference ? { prepayId: providerReference } : { merchantTradeNo: reference };
  return requestBinancePay('/binancepay/openapi/v2/order/query', payload);
};

const fetchDepositAddressFromBinance = async (networkInput) => {
  const network = resolveDepositNetwork(networkInput);
  const response = await requestBinanceSpot('/sapi/v1/capital/deposit/address', {
    coin: 'USDT',
    network: network.apiNetwork
  });

  return {
    ...network,
    address: response.address || '',
    addressTag: response.tag || '',
    source: 'binance_api'
  };
};

const getDepositAddressForNetwork = async (networkInput) => {
  const network = resolveDepositNetwork(networkInput);

  if (isBinanceDepositApiConfigured()) {
    try {
      const remoteAddress = await fetchDepositAddressFromBinance(network.key);

      if (remoteAddress.address) {
        return remoteAddress;
      }
    } catch (error) {
      const fallbackAddress = process.env[network.envKey] || '';
      if (!fallbackAddress) {
        throw error;
      }
    }
  }

  const fallbackAddress = process.env[network.envKey] || '';

  if (!fallbackAddress) {
    throw new Error(`Deposit address for ${network.key} is not configured.`);
  }

  return {
    ...network,
    address: fallbackAddress,
    addressTag: '',
    source: 'env'
  };
};

const mapDepositStatus = (statusCode) => {
  if ([0, 6, 8].includes(statusCode)) {
    return 'pending';
  }

  if (statusCode === 1) {
    return 'success';
  }

  return 'failed';
};

const findMatchingDeposit = async ({ networkInput, txHash, amount, address }) => {
  if (!txHash) {
    throw new Error('Transaction hash is required for Binance deposit verification.');
  }

  const network = resolveDepositNetwork(networkInput);
  const deposits = await requestBinanceSpot('/sapi/v1/capital/deposit/hisrec', {
    coin: 'USDT',
    txId: txHash,
    includeSource: 'true'
  });

  const matchedDeposit = Array.isArray(deposits)
    ? deposits.find((deposit) => {
        const sameNetwork = deposit.network === network.apiNetwork;
        const sameTxHash = String(deposit.txId || '').toLowerCase() === String(txHash).toLowerCase();
        return sameNetwork && sameTxHash;
      })
    : null;

  if (!matchedDeposit) {
    return {
      status: 'not_found',
      network
    };
  }

  const amountMatches = Number(matchedDeposit.amount) === Number(amount);
  const addressMatches = !address || String(matchedDeposit.address || '').trim() === String(address).trim();

  return {
    status: mapDepositStatus(Number(matchedDeposit.status)),
    network,
    deposit: matchedDeposit,
    amountMatches,
    addressMatches
  };
};

module.exports = {
  createBinancePayOrder,
  queryBinancePayOrder,
  getDepositAddressForNetwork,
  findMatchingDeposit,
  getPaymentWorkspaceOptions,
  getManualBinancePaymentConfig,
  getSupportedDepositNetworks,
  isBinancePayConfigured,
  isBinanceDepositApiConfigured,
  resolveDepositNetwork,
  stringifyAmount
};
