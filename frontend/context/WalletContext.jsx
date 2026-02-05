'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { 
  useCurrentAccount, 
  useDisconnectWallet,
  useSignAndExecuteTransaction,
  useSuiClient
} from '@mysten/dapp-kit';

const WalletContext = createContext();

/**
 * SUI Wallet Context Provider
 * Manages SUI wallet connection state and provides transaction signing
 */
export function WalletProvider({ children }) {
  const currentAccount = useCurrentAccount();
  const { mutate: disconnect } = useDisconnectWallet();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();
  
  const [suiBalance, setSuiBalance] = useState(null);
  const [pmtBalance, setPmtBalance] = useState(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  // Derive wallet state from dapp-kit
  const isConnected = !!currentAccount;
  const walletAddress = currentAccount?.address || '';

  // Fetch all balances when connected
  const refreshBalances = useCallback(async () => {
    if (!currentAccount?.address) {
      setSuiBalance(null);
      setPmtBalance(null);
      return;
    }

    try {
      setIsLoadingBalance(true);
      
      // Fetch SUI balance
      const balanceData = await suiClient.getBalance({
        owner: currentAccount.address,
      });
      setSuiBalance(balanceData.totalBalance);

      // Fetch PMT token balance
      const packageId = process.env.NEXT_PUBLIC_PMARKET_PACKAGE_ID;
      if (packageId) {
        try {
          const coins = await suiClient.getCoins({
            owner: currentAccount.address,
            coinType: `${packageId}::pmarket_token::PMARKET_TOKEN`,
          });
          const totalPMT = coins.data.reduce((sum, coin) => sum + Number(coin.balance), 0);
          setPmtBalance(totalPMT / 1_000_000); // 6 decimals
        } catch {
          setPmtBalance(0);
        }
      } else {
        setPmtBalance(0);
      }
    } catch (error) {
      console.error('[WalletContext] Error fetching balances:', error);
      setSuiBalance(null);
      setPmtBalance(null);
    } finally {
      setIsLoadingBalance(false);
    }
  }, [currentAccount?.address, suiClient]);

  useEffect(() => {
    refreshBalances();
  }, [refreshBalances]);

  // Legacy fetchBalance for backward compatibility
  const fetchBalance = refreshBalances;

  // Disconnect wallet
  const disconnectWallet = useCallback(() => {
    disconnect();
    setBalance(null);
    toast('Đã ngắt kết nối ví SUI.');
  }, [disconnect]);

  // Sign and execute a transaction
  const executeTransaction = useCallback(async (transaction) => {
    if (!currentAccount) {
      throw new Error('Vui lòng kết nối ví SUI trước.');
    }

    try {
      const result = await signAndExecute({
        transaction,
      });
      
      // Wait for transaction confirmation
      const txResult = await suiClient.waitForTransaction({
        digest: result.digest,
        options: {
          showEffects: true,
          showEvents: true,
        },
      });

      // Refresh balance after transaction
      await fetchBalance();

      return txResult;
    } catch (error) {
      console.error('[WalletContext] Transaction error:', error);
      throw error;
    }
  }, [currentAccount, signAndExecute, suiClient, fetchBalance]);

  // Get PMT token balance (custom token)
  const getPMTBalance = useCallback(async () => {
    if (!currentAccount?.address) return 0;

    try {
      // Get coins of PMT type
      // Note: Replace with actual package ID after deployment
      const packageId = process.env.NEXT_PUBLIC_PMARKET_PACKAGE_ID;
      if (!packageId) return 0;

      const coins = await suiClient.getCoins({
        owner: currentAccount.address,
        coinType: `${packageId}::pmarket_token::PMARKET_TOKEN`,
      });

      // Sum all PMT coin balances
      const totalBalance = coins.data.reduce((sum, coin) => {
        return sum + Number(coin.balance);
      }, 0);

      // Convert from smallest unit (6 decimals)
      return totalBalance / 1_000_000;
    } catch (error) {
      console.error('[WalletContext] Error fetching PMT balance:', error);
      return 0;
    }
  }, [currentAccount?.address, suiClient]);

  const value = {
    // Connection state
    isConnected,
    walletAddress,
    currentAccount,
    
    // Balances
    suiBalance,
    pmtBalance,
    balance: suiBalance ? Number(suiBalance) / 1_000_000_000 : null, // Legacy: SUI in decimal
    isLoadingBalance,
    refreshBalances,
    fetchBalance,
    getPMTBalance,
    
    // Actions
    disconnectWallet,
    executeTransaction,
    
    // SUI client for direct access
    suiClient,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

export default WalletContext;
