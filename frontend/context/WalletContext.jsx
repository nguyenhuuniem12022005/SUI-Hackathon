'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import WalletConnectModal from '../components/blockchain/WalletConnectModal';
import { connectHsWallet, disconnectHsWallet, fetchWalletInfo } from '../lib/api';

const WalletContext = createContext();

export function WalletProvider({ children }) {
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [isModalOpen, setModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingWallet, setIsLoadingWallet] = useState(true);

  useEffect(() => {
    refreshWallet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshWallet = async () => {
    try {
      setIsLoadingWallet(true);
      const data = await fetchWalletInfo();
      if (data?.walletAddress) {
        setWalletAddress(data.walletAddress);
        setIsConnected(true);
      } else {
        setWalletAddress('');
        setIsConnected(false);
      }
    } catch (error) {
      console.warn('[WalletContext] Không thể tải thông tin ví:', error?.message || error);
    } finally {
      setIsLoadingWallet(false);
    }
  };

  const handleSubmit = async ({ walletAddress, privateKey }) => {
    setIsSubmitting(true);
    try {
      const data = await connectHsWallet({ walletAddress, privateKey });
      setWalletAddress(data?.walletAddress || walletAddress);
      setIsConnected(true);
      toast.success('Liên kết ví HScoin thành công!');
      setModalOpen(false);
    } catch (error) {
      toast.error(error.message || 'Không thể liên kết ví.');
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectHsWallet();
      setWalletAddress('');
      setIsConnected(false);
      toast('Đã hủy liên kết ví.');
    } catch (error) {
      toast.error(error.message || 'Không thể hủy liên kết ví.');
    }
  };

  const openModal = () => setModalOpen(true);

  const value = {
    isConnected,
    walletAddress,
    isLoadingWallet,
    connectWallet: openModal,
    disconnectWallet: handleDisconnect,
    refreshWallet,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
      <WalletConnectModal
        open={isModalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        isConnected={isConnected}
        walletAddress={walletAddress}
        onDisconnect={handleDisconnect}
      />
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
