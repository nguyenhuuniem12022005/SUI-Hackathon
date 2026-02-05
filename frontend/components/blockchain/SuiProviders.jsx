'use client';

import { createNetworkConfig, SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@mysten/dapp-kit/dist/index.css';

// SUI Network URLs - hardcoded to avoid SSR issues
const SUI_NETWORKS = {
  localnet: 'http://127.0.0.1:9000',
  devnet: 'https://fullnode.devnet.sui.io:443',
  testnet: 'https://fullnode.testnet.sui.io:443',
  mainnet: 'https://fullnode.mainnet.sui.io:443',
};

// Config SUI networks
const { networkConfig } = createNetworkConfig({
  localnet: { url: SUI_NETWORKS.localnet },
  devnet: { url: SUI_NETWORKS.devnet },
  testnet: { url: SUI_NETWORKS.testnet },
  mainnet: { url: SUI_NETWORKS.mainnet },
});

// Create a single QueryClient instance
const queryClient = new QueryClient();

// Default network - change to 'mainnet' for production
const DEFAULT_NETWORK = 'testnet';

/**
 * SUI Providers wrapper component
 * Provides SUI blockchain connectivity and wallet management
 */
export function SuiProviders({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork={DEFAULT_NETWORK}>
        <WalletProvider
          autoConnect={true}
          preferredWallets={['Sui Wallet', 'Suiet', 'Martian Sui Wallet']}
        >
          {children}
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}

export default SuiProviders;
