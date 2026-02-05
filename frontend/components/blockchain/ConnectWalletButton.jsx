'use client';

import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit';
import { Wallet, LogOut, RefreshCw } from 'lucide-react';
import { useWallet } from '../../context/WalletContext';
import { useMemo, useState, useEffect } from 'react';
import { Button } from '../ui/Button';

/**
 * SUI Wallet Connect Button
 * Uses @mysten/dapp-kit for wallet connection
 */
export default function ConnectWalletButton({ 
  requiredReputation = 0,
  showBalance = true,
  variant = 'default' // 'default' | 'compact' | 'minimal'
}) {
  const currentAccount = useCurrentAccount();
  const { 
    isConnected, 
    walletAddress, 
    balance, 
    isLoadingBalance,
    disconnectWallet,
    fetchBalance,
    getPMTBalance 
  } = useWallet();
  
  const [pmtBalance, setPmtBalance] = useState(0);
  const userReputation = 85; // TODO: Get from user context

  // Fetch PMT balance
  useEffect(() => {
    if (isConnected) {
      getPMTBalance().then(setPmtBalance);
    }
  }, [isConnected, getPMTBalance]);

  // Masked address for display
  const maskedAddress = useMemo(() => {
    if (!walletAddress) return '';
    if (walletAddress.length <= 10) return walletAddress;
    return `${walletAddress.substring(0, 6)}…${walletAddress.substring(walletAddress.length - 4)}`;
  }, [walletAddress]);

  // Check reputation requirement
  if (userReputation < requiredReputation) {
    return (
      <div className="rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-700">
        Bạn cần tối thiểu {requiredReputation} điểm uy tín để sử dụng ví SUI.
      </div>
    );
  }

  // Not connected - show connect button
  if (!isConnected) {
    return (
      <div className="w-full">
        <ConnectButton 
          connectText={
            <span className="flex items-center gap-2">
              <Wallet size={18} />
              Kết nối ví SUI
            </span>
          }
        />
      </div>
    );
  }

  // Minimal variant - just address
  if (variant === 'minimal') {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Wallet size={14} className="text-emerald-600" />
        <span className="font-mono text-xs">{maskedAddress}</span>
      </div>
    );
  }

  // Compact variant
  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2">
        <div className="flex items-center gap-2">
          <Wallet size={16} className="text-emerald-600" />
          <span className="font-mono text-xs text-emerald-700">{maskedAddress}</span>
        </div>
        {showBalance && balance !== null && (
          <span className="text-xs font-medium text-emerald-600">
            {balance.toFixed(4)} SUI
          </span>
        )}
        <button
          onClick={disconnectWallet}
          className="ml-auto text-gray-400 hover:text-red-500 transition-colors"
          title="Ngắt kết nối"
        >
          <LogOut size={14} />
        </button>
      </div>
    );
  }

  // Default variant - full display
  return (
    <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50/60 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="font-semibold flex items-center gap-2 text-emerald-900">
          <Wallet size={16} /> Ví SUI đã kết nối
        </p>
        <button
          onClick={fetchBalance}
          disabled={isLoadingBalance}
          className="text-gray-400 hover:text-emerald-600 transition-colors disabled:opacity-50"
          title="Làm mới số dư"
        >
          <RefreshCw size={14} className={isLoadingBalance ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Address */}
      <div className="space-y-1">
        <p className="text-xs text-gray-500">Địa chỉ ví</p>
        <p className="font-mono text-sm text-emerald-700 break-all">{walletAddress}</p>
      </div>

      {/* Balances */}
      {showBalance && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-md bg-white/50 p-2">
            <p className="text-xs text-gray-500">SUI</p>
            <p className="font-semibold text-emerald-700">
              {isLoadingBalance ? '...' : balance !== null ? `${balance.toFixed(4)}` : '0'}
            </p>
          </div>
          <div className="rounded-md bg-white/50 p-2">
            <p className="text-xs text-gray-500">PMT Token</p>
            <p className="font-semibold text-blue-700">
              {pmtBalance.toFixed(2)}
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <ConnectButton connectText="Đổi ví" />
        <Button 
          variant="ghost" 
          onClick={disconnectWallet}
          className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <LogOut size={14} className="mr-1" />
          Ngắt kết nối
        </Button>
      </div>

      {/* Network indicator */}
      <div className="flex items-center gap-1 text-xs text-gray-500">
        <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
        Testnet
      </div>
    </div>
  );
}
