'use client';
import { Button } from '../ui/Button';
import { Wallet } from 'lucide-react';
import { useWallet } from '../../context/WalletContext';
import { useMemo } from 'react';

export default function ConnectWalletButton({ requiredReputation = 0 }) {
  const { isConnected, connectWallet, walletAddress, disconnectWallet, isLoadingWallet } = useWallet();
  const userReputation = 85;

  const maskedAddress = useMemo(() => {
    if (!walletAddress) return '';
    if (walletAddress.length <= 10) return walletAddress;
    return `${walletAddress.substring(0, 6)}…${walletAddress.substring(walletAddress.length - 4)}`;
  }, [walletAddress]);

  if (userReputation < requiredReputation) {
    return (
      <div className="rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-700">
        Bạn cần tối thiểu {requiredReputation} điểm uy tín để liên kết ví HScoin.
      </div>
    );
  }

  if (isLoadingWallet) {
    return (
      <Button variant="secondary" className="w-full" disabled>
        Đang kiểm tra ví…
      </Button>
    );
  }

  if (isConnected) {
    return (
      <div className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50/60 p-4 text-sm text-emerald-900">
        <p className="font-semibold flex items-center gap-2">
          <Wallet size={16} /> Ví đã liên kết
        </p>
        <p className="font-mono text-xs text-emerald-700">{maskedAddress}</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="secondary" onClick={connectWallet} className="flex-1">
            Đổi ví
          </Button>
          <Button variant="ghost" onClick={disconnectWallet} className="flex-1">
            Hủy liên kết
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button variant="secondary" onClick={connectWallet} className="w-full">
      <Wallet size={18} className="mr-2" />
      Liên kết ví điện tử
    </Button>
  );
}
