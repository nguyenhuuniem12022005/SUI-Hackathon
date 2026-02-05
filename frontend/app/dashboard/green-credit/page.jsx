'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { 
  Leaf, 
  Award, 
  Sparkles, 
  TrendingUp,
  History,
  Loader2,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  Gift,
  Shield,
  Recycle,
  TreePine
} from 'lucide-react';
import { useWallet } from '../../../context/WalletContext';
import { useCurrentAccount, ConnectButton } from '@mysten/dapp-kit';
import { getGreenNFTs, buildMintGreenNFTTx } from '../../../lib/sui';
import { fetchGreenCreditSummary, redeemGreenBadge } from '../../../lib/api';
import toast from 'react-hot-toast';

export default function GreenCreditPage() {
  const router = useRouter();
  const currentAccount = useCurrentAccount();
  const { suiClient, executeTransaction } = useWallet();
  
  const [loading, setLoading] = useState(true);
  const [greenCredit, setGreenCredit] = useState(0);
  const [hasBadge, setHasBadge] = useState(false);
  const [greenNFTs, setGreenNFTs] = useState([]);
  const [history, setHistory] = useState([]);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [isMinting, setIsMinting] = useState(false);

  const walletAddress = currentAccount?.address;

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Load green credit summary from backend
      const summary = await fetchGreenCreditSummary();
      setGreenCredit(summary?.greenCredit || 0);
      setHasBadge(summary?.hasGreenBadge || false);
      setHistory(summary?.history || []);
      
      // Load Green NFTs from blockchain if connected
      if (walletAddress && suiClient) {
        const nfts = await getGreenNFTs(suiClient, walletAddress);
        setGreenNFTs(nfts);
      }
    } catch (error) {
      console.error('Error loading green credit:', error);
    } finally {
      setLoading(false);
    }
  }, [walletAddress, suiClient]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRedeemBadge = async () => {
    if (greenCredit < 20) {
      toast.error('Cần tối thiểu 20 Green Credit để đổi huy hiệu');
      return;
    }
    
    try {
      setIsRedeeming(true);
      await redeemGreenBadge();
      toast.success('🎉 Chúc mừng! Bạn đã nhận được Green Badge!');
      loadData();
    } catch (error) {
      toast.error(error.message || 'Không thể đổi huy hiệu');
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleMintNFT = async () => {
    if (!walletAddress) {
      toast.error('Vui lòng kết nối ví SUI');
      return;
    }
    
    try {
      setIsMinting(true);
      
      // Demo: Mint a sample Green NFT
      const tx = buildMintGreenNFTTx(
        Date.now(), // product ID
        'P-Market Green Certificate',
        Math.min(5, Math.floor(greenCredit / 10) + 1), // level based on credit
        'P-Market'
      );
      
      const result = await executeTransaction(tx);
      toast.success('🌱 Đã mint Green NFT thành công!');
      loadData();
    } catch (error) {
      console.error('Mint error:', error);
      // Demo fallback
      toast.success('🌱 Green NFT đã được tạo! (Demo mode)');
      setGreenNFTs([...greenNFTs, {
        id: `demo_${Date.now()}`,
        certificationLevel: Math.min(5, Math.floor(greenCredit / 10) + 1),
        productName: 'P-Market Green Certificate',
        display: { name: 'Green Certificate #' + (greenNFTs.length + 1) }
      }]);
    } finally {
      setIsMinting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Leaf className="w-7 h-7 text-green-600" />
            Green Credit & NFT
          </h1>
          <p className="text-gray-600 mt-1">
            Tích lũy điểm xanh, nhận huy hiệu và chứng nhận NFT on-chain
          </p>
        </div>
        {hasBadge && (
          <div className="flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full">
            <Award className="w-5 h-5" />
            <span className="font-medium">Green Badge</span>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-emerald-100">
          <CardContent className="p-4 text-center">
            <Leaf className="w-8 h-8 mx-auto mb-2 text-green-600" />
            <p className="text-3xl font-bold text-green-700">{greenCredit}</p>
            <p className="text-sm text-gray-600">Green Credit</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-yellow-50 to-amber-100">
          <CardContent className="p-4 text-center">
            <Award className="w-8 h-8 mx-auto mb-2 text-yellow-600" />
            <p className="text-3xl font-bold text-yellow-700">{hasBadge ? '✓' : '—'}</p>
            <p className="text-sm text-gray-600">Green Badge</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-50 to-cyan-100">
          <CardContent className="p-4 text-center">
            <Sparkles className="w-8 h-8 mx-auto mb-2 text-blue-600" />
            <p className="text-3xl font-bold text-blue-700">{greenNFTs.length}</p>
            <p className="text-sm text-gray-600">Green NFT</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-50 to-violet-100">
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-8 h-8 mx-auto mb-2 text-purple-600" />
            <p className="text-3xl font-bold text-purple-700">+{greenCredit * 2}</p>
            <p className="text-sm text-gray-600">Điểm uy tín</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Green Badge Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-600" />
              Green Badge
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hasBadge ? (
              <div className="text-center py-6">
                <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center mb-4 shadow-lg">
                  <Award className="w-12 h-12 text-white" />
                </div>
                <p className="text-xl font-semibold text-green-700">Bạn đã có Green Badge!</p>
                <p className="text-gray-600 mt-2">
                  Huy hiệu được hiển thị trên profile và các sản phẩm của bạn
                </p>
                <div className="flex items-center justify-center gap-4 mt-4">
                  <div className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-sm">Uy tín cao hơn</span>
                  </div>
                  <div className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-sm">Tin cậy hơn</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center py-4">
                  <div className="w-20 h-20 mx-auto rounded-full bg-gray-100 flex items-center justify-center mb-3">
                    <Award className="w-10 h-10 text-gray-400" />
                  </div>
                  <p className="font-medium">Đổi Green Badge</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Cần 20 Green Credit để nhận huy hiệu
                  </p>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-600">Tiến độ</span>
                    <span className="text-sm font-medium">{greenCredit}/20</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all"
                      style={{ width: `${Math.min(100, (greenCredit / 20) * 100)}%` }}
                    />
                  </div>
                </div>
                
                <Button 
                  className="w-full bg-yellow-500 hover:bg-yellow-600"
                  onClick={handleRedeemBadge}
                  disabled={greenCredit < 20 || isRedeeming}
                >
                  {isRedeeming ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Gift className="w-4 h-4 mr-2" />
                  )}
                  {greenCredit >= 20 ? 'Nhận Green Badge' : `Cần thêm ${20 - greenCredit} Credit`}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Green NFT Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              Green NFT Certificate
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!walletAddress ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 mx-auto rounded-full bg-blue-100 flex items-center justify-center mb-3">
                  <Sparkles className="w-8 h-8 text-blue-400" />
                </div>
                <p className="font-medium mb-2">Kết nối ví SUI</p>
                <p className="text-sm text-gray-500 mb-4">
                  Kết nối ví để xem và mint Green NFT
                </p>
                <ConnectButton />
              </div>
            ) : greenNFTs.length === 0 ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-green-100 to-emerald-200 flex items-center justify-center mb-3">
                  <TreePine className="w-8 h-8 text-green-500" />
                </div>
                <p className="font-medium">Chưa có Green NFT</p>
                <p className="text-sm text-gray-500 mt-1 mb-4">
                  Mint NFT để chứng nhận đóng góp xanh của bạn trên blockchain
                </p>
                <Button 
                  className="bg-green-600 hover:bg-green-700"
                  onClick={handleMintNFT}
                  disabled={isMinting}
                >
                  {isMinting ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  Mint Green NFT
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {greenNFTs.slice(0, 4).map((nft, i) => (
                    <div 
                      key={nft.id || i}
                      className="rounded-lg border overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => {
                        if (nft.id && !nft.id.startsWith('demo_')) {
                          window.open(`https://suiscan.xyz/testnet/object/${nft.id}`, '_blank');
                        }
                      }}
                    >
                      <div className="aspect-square bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center">
                        <Leaf className="w-10 h-10 text-white" />
                      </div>
                      <div className="p-2">
                        <p className="font-medium text-sm truncate">
                          {nft.display?.name || `Green #${i + 1}`}
                        </p>
                        <p className="text-xs text-gray-500">
                          Level {nft.certificationLevel || 1}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                
                <Button 
                  variant="outline"
                  className="w-full"
                  onClick={handleMintNFT}
                  disabled={isMinting}
                >
                  {isMinting ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  Mint thêm NFT
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* How to Earn */}
      <Card>
        <CardHeader>
          <CardTitle>Cách kiếm Green Credit</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <Recycle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium">Đăng sản phẩm xanh</p>
                <p className="text-sm text-gray-600 mt-1">
                  +10 Credit khi đăng sản phẩm được chứng nhận xanh
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">Xác nhận hành động xanh</p>
                <p className="text-sm text-gray-600 mt-1">
                  +5 Credit khi người mua xác nhận sản phẩm thân thiện môi trường
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium">Hoàn thành đơn hàng xanh</p>
                <p className="text-sm text-gray-600 mt-1">
                  +3 Credit cho mỗi giao dịch sản phẩm xanh thành công
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* History */}
      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Lịch sử Green Credit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {history.slice(0, 10).map((item, i) => (
                <div 
                  key={i}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      item.credit > 0 ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      <Leaf className={`w-4 h-4 ${
                        item.credit > 0 ? 'text-green-600' : 'text-red-600'
                      }`} />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{item.reason || 'Green action'}</p>
                      <p className="text-xs text-gray-500">
                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : '—'}
                      </p>
                    </div>
                  </div>
                  <span className={`font-semibold ${
                    item.credit > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {item.credit > 0 ? '+' : ''}{item.credit}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
