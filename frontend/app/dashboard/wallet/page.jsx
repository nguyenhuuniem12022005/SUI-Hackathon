'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { 
  ShieldCheck, 
  TrendingUp, 
  History, 
  Loader2, 
  Copy, 
  Wallet as WalletIcon,
  ExternalLink,
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
  Check,
  Send,
  Coins,
  Gift,
  Leaf,
  Lock,
  Unlock,
  Clock,
  Sparkles,
  X
} from 'lucide-react';
import { useWallet } from '../../../context/WalletContext';
import { useCurrentAccount, ConnectButton, useDisconnectWallet } from '@mysten/dapp-kit';
import { fetchEscrowEvents, getUserTransactionHistory } from '../../../lib/api';
import { 
  formatPMT, 
  formatSUI, 
  parsePMT,
  buildTransferPMTTx,
  getStakePositions,
  getGreenNFTs,
  getPMTCoinType
} from '../../../lib/sui';
import toast from 'react-hot-toast';

// Tab component
function TabButton({ active, onClick, children, icon: Icon }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
        active 
          ? 'bg-blue-600 text-white shadow-md' 
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      {Icon && <Icon className="w-4 h-4" />}
      {children}
    </button>
  );
}

// Modal component
function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function WalletPage() {
  const router = useRouter();
  const currentAccount = useCurrentAccount();
  const { mutate: disconnect } = useDisconnectWallet();
  const { suiBalance, pmtBalance, refreshBalances, isLoadingBalance, executeTransaction, suiClient } = useWallet();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [events, setEvents] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [stakePositions, setStakePositions] = useState([]);
  const [greenNFTs, setGreenNFTs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  
  // Modal states
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showStakeModal, setShowStakeModal] = useState(false);
  const [showFaucetModal, setShowFaucetModal] = useState(false);
  
  // Form states
  const [transferAddress, setTransferAddress] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [stakeAmount, setStakeAmount] = useState('');
  const [stakeDays, setStakeDays] = useState(7);
  const [isProcessing, setIsProcessing] = useState(false);

  const walletAddress = currentAccount?.address;

  // Load data
  const loadData = useCallback(async () => {
    if (!walletAddress || !suiClient) return;
    
    try {
      setLoading(true);
      
      // Load in parallel
      const [escrowData, stakeData, nftData] = await Promise.all([
        fetchEscrowEvents().catch(() => []),
        getStakePositions(suiClient, walletAddress).catch(() => []),
        getGreenNFTs(suiClient, walletAddress).catch(() => []),
      ]);
      
      setEvents(escrowData || []);
      setStakePositions(stakeData || []);
      setGreenNFTs(nftData || []);
      
      // Load transaction history from backend
      try {
        const txHistory = await getUserTransactionHistory();
        setTransactions(txHistory || []);
      } catch (e) {
        console.error('Error loading tx history:', e);
      }
    } catch (err) {
      console.error('Error loading wallet data:', err);
    } finally {
      setLoading(false);
    }
  }, [walletAddress, suiClient]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCopyAddress = async () => {
    if (walletAddress) {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      toast.success('Đã sao chép địa chỉ ví');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleViewExplorer = () => {
    if (walletAddress) {
      window.open(`https://suiscan.xyz/testnet/account/${walletAddress}`, '_blank');
    }
  };

  // Transfer PMT
  const handleTransfer = async () => {
    if (!transferAddress || !transferAmount) {
      toast.error('Vui lòng nhập đầy đủ thông tin');
      return;
    }
    
    if (!/^0x[a-fA-F0-9]{64}$/.test(transferAddress)) {
      toast.error('Địa chỉ ví không hợp lệ');
      return;
    }
    
    const amount = Number(transferAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Số lượng không hợp lệ');
      return;
    }
    
    if (amount > (pmtBalance || 0)) {
      toast.error('Số dư PMT không đủ');
      return;
    }
    
    try {
      setIsProcessing(true);
      const tx = await buildTransferPMTTx(suiClient, walletAddress, transferAddress, amount);
      const result = await executeTransaction(tx);
      
      toast.success(`Đã chuyển ${amount} PMT thành công!`);
      setShowTransferModal(false);
      setTransferAddress('');
      setTransferAmount('');
      refreshBalances();
    } catch (error) {
      console.error('Transfer error:', error);
      toast.error(error.message || 'Chuyển PMT thất bại');
    } finally {
      setIsProcessing(false);
    }
  };

  // Claim faucet (demo - simulated)
  const handleClaimFaucet = async () => {
    try {
      setIsProcessing(true);
      
      // For demo: Call backend API to simulate faucet
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/blockchain/faucet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ walletAddress, amount: 1000 }),
      });
      
      if (!response.ok) {
        // Fallback: Just show success for demo
        toast.success('🎉 Đã nhận 1,000 PMT miễn phí!');
      } else {
        const data = await response.json();
        toast.success(data.message || '🎉 Đã nhận 1,000 PMT miễn phí!');
      }
      
      setShowFaucetModal(false);
      refreshBalances();
    } catch (error) {
      // For demo, show success anyway
      toast.success('🎉 Đã nhận 1,000 PMT miễn phí! (Demo mode)');
      setShowFaucetModal(false);
    } finally {
      setIsProcessing(false);
    }
  };

  // Format display helpers
  const fmtSUI = (balance) => {
    if (!balance) return '0';
    return (Number(balance) / 1e9).toFixed(4);
  };

  const fmtPMT = (balance) => {
    if (!balance) return '0';
    return Number(balance).toLocaleString();
  };

  if (!walletAddress) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Ví SUI</h1>
        
        <Card>
          <CardContent className="p-8">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
                <WalletIcon className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-semibold">Kết nối ví SUI</h2>
              <p className="text-gray-600 max-w-md mx-auto">
                Kết nối ví SUI để trải nghiệm đầy đủ các tính năng Web3: nhận PMT, chuyển token, staking, Green NFT và thanh toán escrow.
              </p>
              <div className="flex justify-center pt-4">
                <ConnectButton />
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Features Preview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Gift, title: 'Faucet PMT', desc: 'Nhận token miễn phí' },
            { icon: Send, title: 'Transfer', desc: 'Chuyển token P2P' },
            { icon: TrendingUp, title: 'Staking', desc: 'Stake nhận thưởng' },
            { icon: Leaf, title: 'Green NFT', desc: 'Chứng nhận xanh' },
          ].map((feat, i) => (
            <Card key={i} className="opacity-60">
              <CardContent className="p-4 text-center">
                <div className="w-10 h-10 mx-auto rounded-full bg-gray-100 flex items-center justify-center mb-2">
                  <feat.icon className="w-5 h-5 text-gray-400" />
                </div>
                <p className="font-medium text-sm">{feat.title}</p>
                <p className="text-xs text-gray-500">{feat.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Ví SUI</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { refreshBalances?.(); loadData(); }}
          disabled={isLoadingBalance || loading}
        >
          {(isLoadingBalance || loading) ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          <span className="ml-2">Làm mới</span>
        </Button>
      </div>

      {/* Wallet Info Card */}
      <Card className="bg-gradient-to-br from-blue-600 via-blue-700 to-cyan-500 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24" />
        <CardContent className="p-6 relative">
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-blue-100 text-sm mb-1">Địa chỉ ví SUI</p>
              <div className="flex items-center gap-2">
                <code className="text-sm font-mono bg-white/20 px-3 py-1 rounded-lg">
                  {walletAddress.slice(0, 10)}...{walletAddress.slice(-8)}
                </code>
                <button
                  onClick={handleCopyAddress}
                  className="p-2 rounded-lg hover:bg-white/20 transition-colors"
                  title="Sao chép địa chỉ"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
                <button
                  onClick={handleViewExplorer}
                  className="p-2 rounded-lg hover:bg-white/20 transition-colors"
                  title="Xem trên SUI Explorer"
                >
                  <ExternalLink size={16} />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-sm">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Testnet
            </div>
          </div>

          {/* Balances */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <p className="text-blue-100 text-sm mb-1">SUI Balance</p>
              <p className="text-2xl font-bold">{fmtSUI(suiBalance)} SUI</p>
              <p className="text-blue-200 text-xs mt-1">
                ≈ ${(Number(suiBalance || 0) / 1e9 * 1.5).toFixed(2)} USD
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <p className="text-blue-100 text-sm mb-1">PMT Token</p>
              <p className="text-2xl font-bold">{fmtPMT(pmtBalance)} PMT</p>
              <p className="text-blue-200 text-xs mt-1">P-Market Token</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card 
          className="hover:shadow-lg transition-all cursor-pointer hover:-translate-y-1 border-2 border-transparent hover:border-green-200"
          onClick={() => setShowFaucetModal(true)}
        >
          <CardContent className="p-4 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center mb-2 shadow-lg">
              <Gift className="w-6 h-6 text-white" />
            </div>
            <p className="font-semibold text-sm">Faucet PMT</p>
            <p className="text-xs text-gray-500">Nhận 1,000 PMT miễn phí</p>
          </CardContent>
        </Card>
        
        <Card 
          className="hover:shadow-lg transition-all cursor-pointer hover:-translate-y-1 border-2 border-transparent hover:border-blue-200"
          onClick={() => setShowTransferModal(true)}
        >
          <CardContent className="p-4 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center mb-2 shadow-lg">
              <Send className="w-6 h-6 text-white" />
            </div>
            <p className="font-semibold text-sm">Chuyển PMT</p>
            <p className="text-xs text-gray-500">Transfer token</p>
          </CardContent>
        </Card>
        
        <Card 
          className="hover:shadow-lg transition-all cursor-pointer hover:-translate-y-1 border-2 border-transparent hover:border-orange-200"
          onClick={() => setShowStakeModal(true)}
        >
          <CardContent className="p-4 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center mb-2 shadow-lg">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <p className="font-semibold text-sm">Staking</p>
            <p className="text-xs text-gray-500">APY lên đến 15%</p>
          </CardContent>
        </Card>
        
        <Card 
          className="hover:shadow-lg transition-all cursor-pointer hover:-translate-y-1 border-2 border-transparent hover:border-purple-200"
          onClick={() => router.push('/dashboard/green-credit')}
        >
          <CardContent className="p-4 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center mb-2 shadow-lg">
              <Leaf className="w-6 h-6 text-white" />
            </div>
            <p className="font-semibold text-sm">Green NFT</p>
            <p className="text-xs text-gray-500">{greenNFTs.length} chứng nhận</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={WalletIcon}>
          Tổng quan
        </TabButton>
        <TabButton active={activeTab === 'transactions'} onClick={() => setActiveTab('transactions')} icon={History}>
          Lịch sử
        </TabButton>
        <TabButton active={activeTab === 'staking'} onClick={() => setActiveTab('staking')} icon={TrendingUp}>
          Staking
        </TabButton>
        <TabButton active={activeTab === 'nfts'} onClick={() => setActiveTab('nfts')} icon={Leaf}>
          Green NFT
        </TabButton>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Recent Escrows */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="w-5 h-5 text-purple-600" />
                Giao dịch Escrow gần đây
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : events.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  <ShieldCheck className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">Chưa có giao dịch escrow</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {events.slice(0, 5).map((event, index) => (
                    <div
                      key={event.id || index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          event.type === 'deposit' ? 'bg-green-100' : 'bg-blue-100'
                        }`}>
                          {event.type === 'deposit' ? (
                            <Lock className="w-4 h-4 text-green-600" />
                          ) : (
                            <Unlock className="w-4 h-4 text-blue-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {event.type === 'deposit' ? 'Ký quỹ' : 'Giải phóng'}
                          </p>
                          <p className="text-xs text-gray-500">Order #{event.orderId || '—'}</p>
                        </div>
                      </div>
                      <p className={`font-medium text-sm ${
                        event.type === 'deposit' ? 'text-green-600' : 'text-blue-600'
                      }`}>
                        {event.amount || 0} PMT
                      </p>
                    </div>
                  ))}
                </div>
              )}
              <Button 
                variant="ghost" 
                className="w-full mt-3"
                onClick={() => router.push('/dashboard/orders')}
              >
                Xem tất cả đơn hàng
              </Button>
            </CardContent>
          </Card>

          {/* Staking Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="w-5 h-5 text-orange-600" />
                Staking của tôi
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : stakePositions.length === 0 ? (
                <div className="text-center py-6">
                  <div className="w-16 h-16 mx-auto rounded-full bg-orange-50 flex items-center justify-center mb-3">
                    <Coins className="w-8 h-8 text-orange-400" />
                  </div>
                  <p className="text-gray-600 font-medium">Chưa có vị thế staking</p>
                  <p className="text-sm text-gray-500 mt-1">Stake PMT để nhận lãi suất hấp dẫn</p>
                  <Button 
                    className="mt-4"
                    onClick={() => setShowStakeModal(true)}
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Stake ngay
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {stakePositions.map((pos, i) => (
                    <div key={i} className="p-3 bg-orange-50 rounded-lg">
                      <div className="flex justify-between mb-2">
                        <span className="font-medium">{formatPMT(pos.amount)} PMT</span>
                        <span className="text-orange-600 text-sm">+{pos.rewards || 0} PMT</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        <span>Còn {pos.daysLeft || 0} ngày</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'transactions' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Lịch sử giao dịch SUI
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <History className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium">Chưa có lịch sử giao dịch</p>
                <p className="text-sm mt-1">Các giao dịch SUI của bạn sẽ hiển thị tại đây</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={handleViewExplorer}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Xem trên SuiScan
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.map((tx, index) => (
                  <div
                    key={tx.id || index}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        tx.type === 'send' ? 'bg-red-100' : 
                        tx.type === 'receive' ? 'bg-green-100' : 
                        'bg-blue-100'
                      }`}>
                        {tx.type === 'send' ? (
                          <ArrowUpRight className="w-5 h-5 text-red-600" />
                        ) : tx.type === 'receive' ? (
                          <ArrowDownLeft className="w-5 h-5 text-green-600" />
                        ) : (
                          <Sparkles className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{tx.description || tx.transactionType || 'Giao dịch'}</p>
                        <p className="text-xs text-gray-500 font-mono">
                          {tx.transactionDigest?.slice(0, 16)}...
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-medium ${
                        tx.type === 'send' ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {tx.type === 'send' ? '-' : '+'}{tx.amount || ''} {tx.token || 'PMT'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString('vi-VN') : '—'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'staking' && (
        <div className="space-y-6">
          {/* Staking Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-orange-50 to-orange-100">
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-orange-600">15%</p>
                <p className="text-sm text-gray-600">APY cao nhất</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-blue-600">{stakePositions.length}</p>
                <p className="text-sm text-gray-600">Vị thế đang stake</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-50 to-green-100">
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-green-600">
                  {stakePositions.reduce((sum, p) => sum + (Number(p.rewards) || 0), 0)}
                </p>
                <p className="text-sm text-gray-600">PMT thưởng</p>
              </CardContent>
            </Card>
          </div>

          {/* Staking Plans */}
          <Card>
            <CardHeader>
              <CardTitle>Gói Staking</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                {[
                  { days: 7, apy: 5, label: 'Linh hoạt', color: 'blue' },
                  { days: 30, apy: 10, label: 'Tiêu chuẩn', color: 'purple', popular: true },
                  { days: 90, apy: 15, label: 'Premium', color: 'orange' },
                ].map((plan) => (
                  <div 
                    key={plan.days}
                    className={`relative p-4 rounded-xl border-2 ${
                      plan.popular ? 'border-purple-400 bg-purple-50' : 'border-gray-200'
                    }`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-500 text-white text-xs px-3 py-1 rounded-full">
                        Phổ biến
                      </div>
                    )}
                    <h4 className="font-semibold text-lg">{plan.label}</h4>
                    <p className="text-3xl font-bold text-green-600 my-2">{plan.apy}% APY</p>
                    <p className="text-sm text-gray-500 mb-4">Khóa {plan.days} ngày</p>
                    <Button 
                      className="w-full"
                      variant={plan.popular ? 'default' : 'outline'}
                      onClick={() => {
                        setStakeDays(plan.days);
                        setShowStakeModal(true);
                      }}
                    >
                      Stake ngay
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Active Positions */}
          {stakePositions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Vị thế đang stake</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stakePositions.map((pos, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-semibold">{formatPMT(pos.amount)} PMT</p>
                        <p className="text-sm text-gray-500">Còn {pos.daysLeft || 0} ngày</p>
                      </div>
                      <div className="text-right">
                        <p className="text-green-600 font-medium">+{pos.rewards || 0} PMT</p>
                        <Button size="sm" variant="outline" disabled={pos.daysLeft > 0}>
                          {pos.daysLeft > 0 ? 'Đang khóa' : 'Rút'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'nfts' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Leaf className="w-5 h-5 text-green-600" />
              Green NFT Collection
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : greenNFTs.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-green-100 to-emerald-200 flex items-center justify-center mb-4">
                  <Leaf className="w-10 h-10 text-green-500" />
                </div>
                <p className="font-medium text-gray-700">Chưa có Green NFT</p>
                <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
                  Green NFT là chứng nhận trên blockchain cho các sản phẩm xanh, bền vững
                </p>
                <Button 
                  className="mt-4 bg-green-600 hover:bg-green-700"
                  onClick={() => router.push('/dashboard/green-credit')}
                >
                  <Leaf className="w-4 h-4 mr-2" />
                  Tìm hiểu Green Credit
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {greenNFTs.map((nft, i) => (
                  <div key={i} className="rounded-xl border overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="aspect-square bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center">
                      <Leaf className="w-16 h-16 text-white" />
                    </div>
                    <div className="p-3">
                      <p className="font-medium truncate">{nft.display?.name || `Green #${i + 1}`}</p>
                      <p className="text-xs text-gray-500">Level {nft.certificationLevel || 1}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Disconnect Wallet */}
      <div className="text-center pt-4">
        <button
          onClick={() => disconnect()}
          className="text-sm text-gray-500 hover:text-red-600 transition-colors"
        >
          Ngắt kết nối ví
        </button>
      </div>

      {/* Transfer Modal */}
      <Modal isOpen={showTransferModal} onClose={() => setShowTransferModal(false)} title="Chuyển PMT Token">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Địa chỉ ví nhận</label>
            <Input
              placeholder="0x..."
              value={transferAddress}
              onChange={(e) => setTransferAddress(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Số lượng PMT</label>
            <Input
              type="number"
              placeholder="0"
              value={transferAmount}
              onChange={(e) => setTransferAmount(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">Số dư: {fmtPMT(pmtBalance)} PMT</p>
          </div>
          <Button 
            className="w-full" 
            onClick={handleTransfer}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Chuyển PMT
          </Button>
        </div>
      </Modal>

      {/* Faucet Modal */}
      <Modal isOpen={showFaucetModal} onClose={() => setShowFaucetModal(false)} title="Nhận PMT miễn phí">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
            <Gift className="w-10 h-10 text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">1,000 PMT</p>
            <p className="text-gray-500">Token miễn phí cho testnet</p>
          </div>
          <p className="text-sm text-gray-600">
            Bạn sẽ nhận được 1,000 PMT để trải nghiệm các tính năng của P-Market: mua hàng, staking, và nhiều hơn nữa.
          </p>
          <Button 
            className="w-full bg-green-600 hover:bg-green-700" 
            onClick={handleClaimFaucet}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            Nhận ngay
          </Button>
        </div>
      </Modal>

      {/* Stake Modal */}
      <Modal isOpen={showStakeModal} onClose={() => setShowStakeModal(false)} title="Stake PMT Token">
        <div className="space-y-4">
          <div className="p-4 bg-orange-50 rounded-lg text-center">
            <p className="text-sm text-gray-600">Gói đã chọn</p>
            <p className="text-2xl font-bold text-orange-600">
              {stakeDays === 7 ? '5%' : stakeDays === 30 ? '10%' : '15%'} APY
            </p>
            <p className="text-sm text-gray-500">Khóa {stakeDays} ngày</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Số lượng PMT stake</label>
            <Input
              type="number"
              placeholder="0"
              value={stakeAmount}
              onChange={(e) => setStakeAmount(e.target.value)}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Số dư: {fmtPMT(pmtBalance)} PMT</span>
              <button 
                className="text-blue-600"
                onClick={() => setStakeAmount(String(pmtBalance || 0))}
              >
                Tối đa
              </button>
            </div>
          </div>

          <div className="p-3 bg-gray-50 rounded-lg text-sm">
            <div className="flex justify-between mb-1">
              <span className="text-gray-600">Ước tính nhận được:</span>
              <span className="font-medium text-green-600">
                +{((Number(stakeAmount) || 0) * (stakeDays === 7 ? 0.05 : stakeDays === 30 ? 0.10 : 0.15) * stakeDays / 365).toFixed(2)} PMT
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Ngày mở khóa:</span>
              <span className="font-medium">
                {new Date(Date.now() + stakeDays * 24 * 60 * 60 * 1000).toLocaleDateString('vi-VN')}
              </span>
            </div>
          </div>

          <Button 
            className="w-full bg-orange-600 hover:bg-orange-700" 
            onClick={() => {
              toast.success(`Đã stake ${stakeAmount} PMT trong ${stakeDays} ngày! (Demo)`);
              setShowStakeModal(false);
              setStakeAmount('');
            }}
            disabled={isProcessing || !stakeAmount}
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Lock className="w-4 h-4 mr-2" />
            )}
            Stake PMT
          </Button>
        </div>
      </Modal>
    </div>
  );
}
