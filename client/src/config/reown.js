import { createAppKit } from '@reown/appkit/react';
import { TronAdapter } from '@reown/appkit-adapter-tron';
import { TronLinkAdapter } from '@tronweb3/tronwallet-adapter-tronlink';

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'cb05be1e4529483209b7a7d2ca5b0424';
const tronMainnet = {
  id: '0x2b6653dc',
  chainNamespace: 'tron',
  caipNetworkId: 'tron:0x2b6653dc',
  name: 'TRON',
  nativeCurrency: {
    name: 'TRX',
    symbol: 'TRX',
    decimals: 6
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.walletconnect.org/v1']
    }
  },
  blockExplorers: {
    default: {
      name: 'Tronscan',
      url: 'https://tronscan.org'
    }
  },
  testnet: false,
  network: 'tron-mainnet'
};
const networks = [tronMainnet];
const metadata = {
  name: 'Buyer Trend Lens',
  description: 'Buyer Trend Lens wallet recharge for marketplace data access.',
  url: window.location.origin,
  icons: [`${window.location.origin}/favicon.ico`]
};

const tronAdapter = new TronAdapter({
  walletAdapters: [new TronLinkAdapter()]
});

createAppKit({
  adapters: [tronAdapter],
  networks,
  projectId,
  metadata,
  features: {
    analytics: true
  }
});

export { projectId };
