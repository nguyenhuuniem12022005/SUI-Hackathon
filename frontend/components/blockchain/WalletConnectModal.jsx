'use client';

import { useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Wallet, X, Eye, EyeOff } from 'lucide-react';

export default function WalletConnectModal({
  open,
  onClose,
  onSubmit,
  isSubmitting,
  isConnected,
  walletAddress,
  onDisconnect,
}) {
  const [form, setForm] = useState({ walletAddress: '', privateKey: '' });
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (!open) {
      setForm({ walletAddress: '', privateKey: '' });
      setShowKey(false);
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({
      walletAddress: form.walletAddress.trim(),
      privateKey: form.privateKey.trim(),
    });
  };

  const canSubmit = form.walletAddress.trim().length > 0 && form.privateKey.trim().length > 0;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-primary/10 p-2 text-primary">
              <Wallet size={18} />
            </div>
            <div>
              <p className="text-base font-semibold text-gray-900">Liên kết ví SUI</p>
              <p className="text-xs text-gray-500">
                Kết nối ví SUI của bạn để giao dịch trên blockchain.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-gray-500 hover:bg-gray-100"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {isConnected && walletAddress && (
            <div className="rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              <p className="font-semibold">Ví hiện tại</p>
              <p className="font-mono break-all text-sm">{walletAddress}</p>
              <p className="mt-1 text-[11px]">
                Bạn có thể nhập ví mới để thay đổi hoặc nhấn <strong>Hủy liên kết</strong> để gỡ.
              </p>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Địa chỉ ví</label>
            <Input
              value={form.walletAddress}
              onChange={(e) => setForm((prev) => ({ ...prev, walletAddress: e.target.value }))}
              placeholder="0x..."
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Private key</label>
            <div className="relative">
              <Input
                type={showKey ? 'text' : 'password'}
                value={form.privateKey}
                onChange={(e) => setForm((prev) => ({ ...prev, privateKey: e.target.value }))}
                placeholder="Nhập private key của bạn"
                required
                className="pr-10"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500"
                onClick={() => setShowKey((prev) => !prev)}
                aria-label={showKey ? 'Ẩn private key' : 'Hiện private key'}
              >
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Private key chỉ được mã hóa và lưu để ký giao dịch thay bạn. Không chia sẻ cho người khác.
            </p>
          </div>

          <div className="flex flex-col gap-2 pt-2 sm:flex-row">
            {isConnected && (
              <Button type="button" variant="ghost" onClick={onDisconnect} className="flex-1">
                Hủy liên kết
              </Button>
            )}
            <Button type="submit" className="flex-1" disabled={!canSubmit || isSubmitting}>
              {isSubmitting ? 'Đang kết nối…' : 'Liên kết ví'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
