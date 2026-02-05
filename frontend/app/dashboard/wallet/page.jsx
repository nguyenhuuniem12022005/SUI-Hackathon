/* eslint-disable @next/next/no-img-element */
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import {
  fetchEscrowEvents,
  mintSelfToken,
  fetchTokenBalance,
  fetchUserContracts,
  saveUserContract,
  autoDeployDefaultContract,
} from '../../../lib/api';
import { fetchUserBalance } from '../../../lib/api';
import { ShieldCheck, TrendingUp, History, Loader2, Copy, Wallet as WalletIcon } from 'lucide-react';
import { useWallet } from '../../../context/WalletContext';

const currency = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });

export default function WalletPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { isConnected, walletAddress, connectWallet, disconnectWallet, isLoadingWallet } = useWallet();
  const defaultContractEnv =
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_HSCOIN_SIMPLE_TOKEN_ADDRESS) || '';
  const [contractAddress, setContractAddress] = useState('');
  const [savingContract, setSavingContract] = useState(false);
  const [mintAmount, setMintAmount] = useState('1000');
  const [tokenBalance, setTokenBalance] = useState(null);
  const [loadingTokenBalance, setLoadingTokenBalance] = useState(false);
  const [balance, setBalance] = useState({ availableBalance: 0, lockedBalance: 0 });
  const [autoDeploying, setAutoDeploying] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchEscrowEvents();
        setEvents(data || []);
        // Lấy contract mặc định từ backend (nếu có)
        try {
          const cons = await fetchUserContracts();
          const def = (cons || []).find((c) => c.isDefault);
          if (def?.address) {
            setContractAddress(def.address || '');
          } else if (defaultContractEnv) {
            setContractAddress(defaultContractEnv.toLowerCase());
          }
        } catch {
          if (defaultContractEnv) {
            setContractAddress(defaultContractEnv.toLowerCase());
          }
        }
        // Load off-chain balance
        try {
          const bal = await fetchUserBalance();
          if (bal) setBalance(bal);
        } catch (e) {
          // ignore lấy số dư thất bại
        }
      } catch (err) {
        setError(err.message || 'Không thể tải dữ liệu ví HScoin.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const loadTokenBalance = useCallback(async () => {
    if (!walletAddress) {
      setTokenBalance(null);
      setLoadingTokenBalance(false);
      return;
    }
    if (!contractAddress) {
      toast.error('Vui lòng nhập hoặc lưu contract HScoin trước khi xem số dư.');
      setLoadingTokenBalance(false);
      return;
    }
    setLoadingTokenBalance(true);
    try {
      const tokenBal = await fetchTokenBalance({
        contractAddress: contractAddress || undefined,
        walletAddress,
      });
      if (tokenBal !== null && tokenBal !== undefined) {
        setTokenBalance(tokenBal);
        toast.success('Đã tải số dư token thành công!');
      } else {
        setTokenBalance(null);
        toast.error('Không thể lấy số dư token. Vui lòng kiểm tra contract address.');
      }
    } catch (err) {
      setTokenBalance(null);
      toast.error(err.message || 'Không thể tải số dư token.');
    } finally {
      setLoadingTokenBalance(false);
    }
  }, [walletAddress, contractAddress]);

  // Không tự động load số dư nữa, chỉ load khi user bấm nút
  // useEffect(() => {
  //   loadTokenBalance();
  // }, [loadTokenBalance]);

  const handleSaveContract = async () => {
    if (!contractAddress.trim()) {
      toast.error('Vui lòng nhập contract address');
      return;
    }
    setSavingContract(true);
    try {
      await saveUserContract({
        address: contractAddress,
        name: 'PMarket',
        isDefault: true,
      });
      toast.success('Đã lưu contract mặc định');
    } catch (err) {
      toast.error(err.message || 'Không thể lưu contract');
    } finally {
      setSavingContract(false);
    }
  };

  const handleAutoDeploy = async () => {
    if (!walletAddress) {
      toast.error('Vui lòng liên kết ví HScoin trước khi deploy contract');
      connectWallet();
      return;
    }
    setAutoDeploying(true);
    try {
      const result = await autoDeployDefaultContract();
      if (result?.contractAddress) {
        setContractAddress(result.contractAddress);
        toast.success(
          result.existing
            ? 'Bạn đã có contract mặc định rồi!'
            : `Đã tự động compile và deploy contract thành công! Địa chỉ: ${result.contractAddress.substring(0, 10)}...`
        );
      } else {
        toast.error('Deploy thành công nhưng không nhận được địa chỉ contract');
      }
    } catch (err) {
      toast.error(err.message || 'Không thể tự động deploy contract');
    } finally {
      setAutoDeploying(false);
    }
  };

  const toWei = (amount) => {
    const val = Number(amount);
    if (!Number.isFinite(val) || val <= 0) return null;
    try {
      // tránh lỗi float: val * 1e18 = (val * 1e6) * 1e12
      return (BigInt(Math.round(val * 1e6)) * 10n ** 12n).toString();
    } catch {
      return null;
    }
  };

  const handleMintSelf = async () => {
    if (!walletAddress) {
      toast.error('Vui lòng kết nối ví HScoin trước khi mint.');
      connectWallet();
      return;
    }
    if (!contractAddress) {
      toast.error('Vui lòng nhập hoặc lưu contract HScoin trước khi mint.');
      return;
    }
    const wei = toWei(mintAmount);
    if (!wei) {
      toast.error('Số lượng mint không hợp lệ.');
      return;
    }
    try {
      await mintSelfToken({
        amountWei: wei,
        caller: walletAddress,
        contractAddress,
      });
      toast.success(`Đã mint ${mintAmount} PMK vào ví.`);
      await loadTokenBalance();
    } catch (err) {
      toast.error(err.message || 'Mint thất bại.');
    }
  };

  const stats = useMemo(() => {
    const base = { locked: 0, released: 0, refunded: 0 };
    events.forEach((event) => {
      if (event.escrow?.status === 'RELEASED') base.released += Number(event.totalAmount || 0);
      else if (event.escrow?.status === 'REFUNDED') base.refunded += Number(event.totalAmount || 0);
      else base.locked += Number(event.totalAmount || 0);
    });
    return base;
  }, [events]);


  const copyHash = async (hash) => {
    if (!hash) return;
    try {
      await navigator.clipboard.writeText(hash);
      toast.success('Đã sao chép TxHash');
    } catch {
      toast.error('Không thể sao chép');
    }
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-sm text-emerald-600 font-semibold">Ví HScoin giả lập</p>
        <h1 className="text-2xl font-bold">Dòng tiền escrow của bạn</h1>
        <p className="text-sm text-gray-600">
          Toàn bộ giao dịch mua bán trên P-Market đều đi qua hợp đồng escrow HScoin. Trang này giúp bạn theo dõi trạng thái
          lock/release trước khi đồng bộ lên mạng blockchain thật.
        </p>
      </header>

      <Card>
        <CardContent className="flex flex-col gap-4 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase text-emerald-600 font-semibold">Trạng thái ví HScoin</p>
            {isConnected && walletAddress ? (
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Địa chỉ đã liên kết:</p>
                  <p className="font-mono text-sm text-gray-900 break-all">{walletAddress}</p>
                </div>
                
                {/* Nút hiện số dư */}
                <div className="mt-3">
                  <Button 
                    onClick={loadTokenBalance} 
                    disabled={loadingTokenBalance || !contractAddress}
                    variant="secondary"
                    size="sm"
                  >
                    {loadingTokenBalance ? (
                      <>
                        <Loader2 className="animate-spin mr-2" size={16} />
                        Đang tải...
                      </>
                    ) : (
                      <>
                        <TrendingUp size={16} className="mr-2" />
                        Hiện số dư
                      </>
                    )}
                  </Button>
                  {!contractAddress && (
                    <p className="text-xs text-amber-600 mt-1">
                      ⚠️ Vui lòng nhập contract address trước khi xem số dư.
                    </p>
                  )}
                </div>
                
                {/* Hiển thị số dư token sau khi bấm nút */}
                {loadingTokenBalance ? (
                  <div className="mt-3 p-3 bg-gray-50 rounded-md">
                    <p className="text-xs text-gray-500 mb-1">Đang tải số dư token...</p>
                    <div className="flex items-center gap-2">
                      <Loader2 className="animate-spin" size={16} />
                      <span className="text-xs text-gray-400">Đang gọi getBalance từ blockchain...</span>
                    </div>
                  </div>
                ) : tokenBalance !== null ? (
                  <div className="mt-3 p-4 bg-emerald-50 border border-emerald-200 rounded-md">
                    <p className="text-xs text-emerald-600 font-semibold uppercase mb-2">Số dư token (STK)</p>
                    <div className="space-y-1">
                      <p className="text-lg font-bold text-gray-900">
                        {((Number(tokenBalance) || 0) / 1e18).toLocaleString('vi-VN', {
                          maximumFractionDigits: 6,
                        })}{' '}
                        <span className="text-sm font-normal text-gray-600">STK</span>
                      </p>
                      <p className="text-xs text-gray-500">
                        Ước tính giá trị:{' '}
                        <span className="font-semibold text-gray-700">
                          {tokenBalance
                            ? `${((Number(tokenBalance) / 1e18) * 2170).toLocaleString('vi-VN')} đ`
                            : '—'}
                        </span>
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Số dư gốc: {Number(tokenBalance || 0).toLocaleString('vi-VN')} wei
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                Bạn chưa liên kết ví HScoin. Liên kết ví để thực hiện ký quỹ escrow và xem số dư blockchain.
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {isConnected ? (
              <>
                <Button variant="secondary" onClick={connectWallet}>
                  Thay đổi ví
                </Button>
                <Button variant="ghost" onClick={disconnectWallet}>
                  Hủy liên kết
                </Button>
              </>
            ) : (
              <Button onClick={connectWallet} disabled={isLoadingWallet}>
                <WalletIcon size={16} className="mr-2" />
                {isLoadingWallet ? 'Đang kiểm tra…' : 'Liên kết ví HScoin'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="h-12 w-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck size={18} />
            </div>
            <div>
              <p className="text-xs uppercase text-gray-500">Đang khóa</p>
              <p className="text-2xl font-bold text-gray-900">{currency.format(stats.locked || 0)}</p>
              <p className="text-xs text-gray-500 mt-1">Off-chain: {currency.format(balance.lockedBalance || 0)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="h-12 w-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp size={18} />
            </div>
            <div>
              <p className="text-xs uppercase text-gray-500">Đã giải phóng</p>
              <p className="text-2xl font-bold text-gray-900">{currency.format(stats.released || 0)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="h-12 w-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
              <History size={18} />
            </div>
            <div>
              <p className="text-xs uppercase text-gray-500">Hoàn trả</p>
              <p className="text-2xl font-bold text-gray-900">{currency.format(stats.refunded || 0)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lịch sử escrow</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-gray-500 flex items-center gap-2">
              <Loader2 className="animate-spin" size={16} /> Đang tải lịch sử giao dịch…
            </p>
          ) : events.length === 0 ? (
            <p className="text-sm text-gray-500">Chưa có giao dịch nào.</p>
          ) : (
            events.map((event) => (
              <div
                key={event.orderId}
                className="border border-gray-100 rounded-lg p-4 grid gap-2 md:grid-cols-4 md:items-center"
              >
                <div>
                  <p className="text-xs text-gray-500 uppercase">Mã đơn</p>
                  <p className="font-semibold text-gray-900">#{event.orderId}</p>
                  <p className="text-xs text-gray-500">
                    {event.orderDate ? new Date(event.orderDate).toLocaleString('vi-VN') : ''}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Giá trị</p>
                  <p className="font-semibold text-primary">{currency.format(event.totalAmount || 0)}</p>
                  <p className="text-xs text-gray-500">Trạng thái: {event.escrow?.status || 'LOCKED'}</p>
                </div>
                <div className="font-mono text-xs text-gray-700 break-all">
                  <p className="text-gray-500 uppercase">TxHash</p>
                  <button
                    type="button"
                    onClick={() => copyHash(event.escrow?.txHash)}
                    className="inline-flex items-center gap-1 text-primary font-semibold"
                  >
                    {event.escrow?.txHash}
                    <Copy size={12} />
                  </button>
                </div>
                <div className="text-xs text-gray-500">
                  <p>Block #{event.escrow?.blockNumber}</p>
                  <p>Gas: {event.escrow?.gasUsed}</p>
                  <p>Mạng: {event.escrow?.network}</p>
                  {event.escrow?.timestamp && (
                    <p>
                      Thời gian:{' '}
                      {new Date(event.escrow.timestamp).toLocaleString('vi-VN')}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contract HScoin &amp; Mint</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-800">Địa chỉ contract</label>
            <input
              type="text"
              value={contractAddress}
              onChange={(e) => setContractAddress(e.target.value)}
              className="w-full rounded-md border px-3 py-2 font-mono text-xs"
              placeholder="0x..."
            />
            <p className="text-xs text-gray-500">
              Nhập contract đã deploy trên HScoin; lưu mặc định để các giao dịch escrow/mint dùng contract này.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button onClick={handleSaveContract} disabled={savingContract} variant="secondary">
                {savingContract ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
                Lưu contract mặc định
              </Button>
              <Button 
                onClick={handleAutoDeploy} 
                disabled={autoDeploying || !walletAddress}
                variant="default"
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {autoDeploying ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={16} />
                    Đang deploy...
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} className="mr-2" />
                    Tự động deploy contract
                  </>
                )}
              </Button>
            </div>
            {!walletAddress && (
              <p className="text-xs text-amber-600">
                ⚠️ Vui lòng liên kết ví HScoin trước khi sử dụng tính năng tự động deploy.
              </p>
            )}
          </div>

          <div className="pt-2 border-t space-y-2">
            <h3 className="text-sm font-semibold text-gray-800">Mint PMK (devnet test)</h3>
            <p className="text-xs text-gray-600">
              Mint token nội bộ vào ví hiện tại để thử escrow bằng PMK (dùng contract mặc định đã lưu).
            </p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                value={mintAmount}
                onChange={(e) => setMintAmount(e.target.value)}
                className="w-32 rounded border px-3 py-2 text-sm"
              />
              <Button size="sm" onClick={handleMintSelf} disabled={!walletAddress}>
                Mint vào ví
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {contractAddress ? (
              <p className="text-xs text-gray-500 font-mono break-all">Contract đang dùng: {contractAddress}</p>
            ) : (
              <p className="text-xs text-red-600">Chưa có contract. Nhập và lưu contract trước khi mint/mua escrow.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
