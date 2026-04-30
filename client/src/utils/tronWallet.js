const DEFAULT_TRON_USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';

const getBrowserWindow = () => (typeof window === 'undefined' ? null : window);

const inferTronNetworkLabel = (host = '') => {
  const normalizedHost = String(host || '').toLowerCase();

  if (!normalizedHost) {
    return 'Unknown network';
  }

  if (normalizedHost.includes('nile')) {
    return 'Nile testnet';
  }

  if (normalizedHost.includes('shasta')) {
    return 'Shasta testnet';
  }

  if (normalizedHost.includes('trongrid.io')) {
    return 'TRON mainnet';
  }

  return 'Custom network';
};

export const shortenWalletAddress = (value) => {
  const normalized = String(value || '').trim();

  if (normalized.length <= 12) {
    return normalized;
  }

  return `${normalized.slice(0, 6)}...${normalized.slice(-4)}`;
};

export const isMainnetTronWallet = (host) => inferTronNetworkLabel(host) === 'TRON mainnet';

export const getTronWalletStatus = () => {
  const browserWindow = getBrowserWindow();
  const tronWeb = browserWindow?.tronWeb;
  const account = String(tronWeb?.defaultAddress?.base58 || '').trim();
  const host = tronWeb?.fullNode?.host || '';

  return {
    available: Boolean(browserWindow?.tronLink || tronWeb),
    connected: Boolean(account),
    account,
    host,
    networkLabel: inferTronNetworkLabel(host)
  };
};

export const sendUsdtFromConnectedWallet = async ({
  contractAddress = DEFAULT_TRON_USDT_CONTRACT,
  receiverAddress,
  amountBaseUnits
}) => {
  const browserWindow = getBrowserWindow();
  const tronWeb = browserWindow?.tronWeb;

  if (!tronWeb?.contract) {
    throw new Error('Connected wallet is not ready for contract transactions.');
  }

  if (!receiverAddress) {
    throw new Error('Receiver address is missing.');
  }

  if (!amountBaseUnits) {
    throw new Error('Payment amount is missing.');
  }

  const status = getTronWalletStatus();

  if (!status.connected || !status.account) {
    throw new Error('Connect your TRON wallet before sending payment.');
  }

  const contract = await tronWeb.contract().at(contractAddress);
  const result = await contract.transfer(receiverAddress, amountBaseUnits).send({
    feeLimit: 100000000,
    callValue: 0,
    shouldPollResponse: false
  });

  const txHash =
    typeof result === 'string'
      ? result
      : result?.txid || result?.transaction?.txID || result?.transaction?.txId || '';

  if (!txHash) {
    throw new Error('Wallet transaction was submitted, but no transaction hash was returned.');
  }

  return {
    txHash,
    account: status.account,
    host: status.host,
    networkLabel: status.networkLabel
  };
};
