'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '../../../components/ui/Button';
import { Card, CardContent } from '../../../components/ui/Card';
import { Avatar } from '../../../components/ui/Avatar';
import ReviewCard from '../../../components/product/ReviewCard';
import { ShoppingCart, Star, ShieldCheck, Handshake, MessageCircle, Loader2, Sparkles } from 'lucide-react';
import { useCart } from '../../../context/CartContext';
import { useWallet } from '../../../context/WalletContext';
import { useAuth } from '../../../context/AuthContext';
import { getProductById, getReviewsByProductId, buildAvatarUrl, createEscrowOrder } from '../../../lib/api';
import { resolveProductImage } from '../../../lib/image';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import toast from 'react-hot-toast';

const FALLBACK_IMAGE = 'https://placehold.co/600x400/eee/31343C?text=P-Market';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { addToCart } = useCart();
  const { isConnected, connectWallet, walletAddress } = useWallet();
  const { user } = useAuth();
  const [isEscrowProcessing, setIsEscrowProcessing] = useState(false);
  const [purchaseQty, setPurchaseQty] = useState(1);

  // --- Fetch dữ liệu ---
  useEffect(() => {
    let isMounted = true;
    async function fetchData() {
      if (params.id) {
        setIsLoading(true);
        try {
          const productData = await getProductById(params.id);
          const reviewsData = await getReviewsByProductId(params.id);
          if (isMounted) {
            setProduct(productData);
            setReviews(reviewsData);
          }
        } catch (error) {
          console.error("Lỗi khi tải chi tiết sản phẩm:", error);
          if (isMounted) setProduct(null);
        } finally {
          if (isMounted) setIsLoading(false);
        }
      }
    }
    fetchData();
    return () => { isMounted = false; };
  }, [params.id]);

  const title = product?.productName || product?.title || 'Sản phẩm';
  const description = product?.description || 'Không có mô tả';
  const priceValue = product?.unitPrice ?? product?.price ?? 0;
  const totalQuantity = product?.totalQuantity ?? 0;
  const sellerName = product?.seller?.userName || product?.seller?.shopName || product?.userName || product?.shopName || 'Người bán ẩn danh';
  const sellerReputation = product?.seller?.reputationScore ?? product?.reputationScore ?? 'Chưa có';
  const sellerBadge = Number(product?.seller?.greenBadgeLevel || 0) > 0;
  const sellerAvatar = buildAvatarUrl(product?.seller?.avatar);
  const productImage = resolveProductImage(product, FALLBACK_IMAGE);
  const reviewCount = reviews.length;
  const averageRating =
    reviewCount > 0
      ? (
          reviews.reduce(
            (sum, r) => sum + (Number(r.rating ?? r.starNumber ?? 0) || 0),
            0
          ) / reviewCount
        ).toFixed(1)
      : null;
  const bucketData = [1, 2, 3, 4, 5].map((star) => ({
    star,
    count: reviews.filter((r) => Number(r.rating ?? r.starNumber ?? 0) === star).length,
  }));

  // --- Các handler ---
  const handleWriteReview = () => router.push('/dashboard/orders');
  const handleAddToCart = () => { 
    if (!product) return;

    const cartProduct = {
      id: product.productId || product.id,
      productId: product.productId || product.id,
      productName: product.productName || product.title,
      title: product.productName || product.title,
      unitPrice: Number(product.unitPrice ?? product.price ?? 0),
      imageURL: product.imageURL,
      thumbnail: product.thumbnail
    };

    addToCart(cartProduct);
    alert(`Đã thêm "${cartProduct.productName || cartProduct.title}" vào giỏ hàng!`);
  };
  
  const handleContactSeller = () => {
    // Chuyển đến trang chat với người bán
    router.push(`/chat?product=${params.id}`);
  };
  
  const handleDirectPurchase = () => {
    // Mua trực tiếp = liên hệ với người bán
    handleContactSeller();
  };
  
  const handleEscrowPurchase = async () => {
    if (!isConnected || !walletAddress) {
      toast.error('Vui lòng kết nối ví HScoin trước khi mua!');
      connectWallet();
      return;
    }
    if (!user?.address) {
      toast.error('Vui lòng cập nhật địa chỉ giao hàng trong dashboard trước khi mua.');
      router.push('/dashboard');
      return;
    }
    const maxQty = Number(totalQuantity || 0);
    const desiredQty = Math.max(1, Number(purchaseQty) || 1);
    if (maxQty <= 0) {
      toast.error('Sản phẩm đã hết hàng.');
      return;
    }
    if (desiredQty > maxQty) {
      toast.error(`Chỉ còn ${maxQty} sản phẩm trong kho.`);
      return;
    }
    setIsEscrowProcessing(true);
    try {
      const payload = {
        productId: product?.productId || product?.id,
        quantity: desiredQty,
        walletAddress,
        shippingAddress: user.address,
      };
      const response = await createEscrowOrder(payload);
      toast.success(response?.message || 'Đã tạo đơn hàng escrow thành công!');
      router.push('/dashboard/orders');
    } catch (error) {
      console.error('Escrow order error:', error);
      toast.error(error.message || 'Không thể thực hiện giao dịch HScoin.');
    } finally {
      setIsEscrowProcessing(false);
    }
  };

  // --- Loading Skeleton ---
  if (isLoading) {
    return (
      <div className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {/* Cột trái */}
          <div className="lg:col-span-2 space-y-8">
            <Card><CardContent className="p-0"><Skeleton height={400} /></CardContent></Card>
            <Card><CardContent className="p-6"><Skeleton count={4} /></CardContent></Card>
            <Card><CardContent className="p-6"><Skeleton height={30} width="60%" style={{ marginBottom: '1rem' }}/><Skeleton count={2} height={80}/></CardContent></Card>
            <Card><CardContent className="p-4"><Skeleton circle height={40} width={40} inline style={{ marginRight: '1rem' }}/><Skeleton width="150px"/></CardContent></Card>
          </div>
          {/* Cột phải */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="sticky top-24"><CardContent className="p-6 space-y-4">
              <Skeleton height={30} width="70%" />
              <Skeleton height={40} width="40%" />
              <Skeleton height={48} />
              <Skeleton height={48} />
              <Skeleton height={48} />
              <Skeleton height={48} />
            </CardContent></Card>
          </div>
        </div>
      </div>
    );
  }

  // --- Không tìm thấy sản phẩm ---
  if (!product) {
    return (
      <div className="py-8 px-4 text-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8">
            <p className="text-lg text-gray-600 mb-4">Không tìm thấy sản phẩm.</p>
            <Button onClick={() => router.push('/home')}>Quay lại trang chủ</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- Nội dung chính ---
  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
        {/* === Cột Trái === */}
        <div className="lg:col-span-2 space-y-8">
          {/* Ảnh sản phẩm */}
          <Card>
            <CardContent className="p-0 overflow-hidden rounded-lg">
              <div className="relative w-full">
                <Image
                  src={productImage}
                  alt={title}
                  width={1200}
                  height={675}
                  className="w-full h-auto object-cover aspect-video md:aspect-[16/9]"
                  sizes="(max-width: 1024px) 100vw, 66vw"
                  priority
                />
              </div>
            </CardContent>
          </Card>

          {/* Mô tả từ người bán */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold mb-4">Mô tả sản phẩm</h2>
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                {description}
              </p>
            </CardContent>
          </Card>

          {/* Đánh giá & Bình luận */}
          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Đánh giá & Bình luận</h2>
                <Button variant="outline" size="sm" onClick={handleWriteReview}>
                  <Star size={16} className="mr-2" /> Viết đánh giá
                </Button>
              </div>
              
              {/* Hiển thị số sao trung bình */}
              {reviewCount > 0 && (
                <div className="mb-6 pb-6 border-b space-y-3">
                  <div className="flex items-center gap-4">
                    <div className="text-4xl font-bold">{averageRating}</div>
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            size={20}
                            className={
                              i < Math.round(Number(averageRating))
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300'
                            }
                          />
                        ))}
                      </div>
                      <p className="text-sm text-gray-600">{reviewCount} đánh giá</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      {bucketData
                        .slice()
                        .reverse()
                        .map((bucket) => {
                          const pct = reviewCount
                            ? Math.round((bucket.count / reviewCount) * 100)
                            : 0;
                          return (
                            <div key={bucket.star} className="flex items-center gap-2 text-sm">
                              <span className="w-14 text-right">{bucket.star} ★</span>
                              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary/70"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="w-8 text-right text-gray-500">{pct}%</span>
                            </div>
                          );
                        })}
                    </div>
                    <div className="p-3 border rounded-lg bg-gray-50 text-sm text-gray-700">
                      <p className="font-semibold text-gray-900 mb-1">Quy tắc đánh giá</p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Chỉ đánh giá sau khi đã mua hàng.</li>
                        <li>Đánh giá sai sản phẩm có thể bị trừ uy tín.</li>
                        <li>Ảnh minh họa giúp đánh giá đáng tin cậy hơn.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Danh sách đánh giá */}
              <div className="space-y-4">
                {reviews.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600 mb-2">Chưa có đánh giá nào cho sản phẩm này.</p>
                    <p className="text-sm text-gray-500">Hãy là người đầu tiên đánh giá sau khi mua hàng!</p>
                  </div>
                ) : (
                  reviews.map((review) => (<ReviewCard key={review.id} review={review} />))
                )}
              </div>
            </CardContent>
          </Card>

          {/* --- Thông tin người bán --- */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Thông tin người bán</h3>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Avatar src={sellerAvatar} size="lg" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-lg">{sellerName}</h4>
                      {sellerBadge && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">
                          <Sparkles size={12} /> Green Badge
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      Điểm uy tín: <span className="font-medium text-primary">{sellerReputation}</span>
                    </p>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  onClick={handleContactSeller}
                  className="flex items-center gap-2"
                >
                  <MessageCircle size={18} />
                  Liên hệ 
                </Button>
              </div>
            </CardContent>
          </Card>

          {product?.stores?.length > 0 && (
            <Card>
              <CardContent className="p-6 space-y-2">
                <h3 className="text-lg font-semibold">Kho hàng</h3>
                <p className="text-sm text-gray-600">
                  Sản phẩm đang có tại {product.stores.length} kho:
                </p>
                <ul className="text-sm text-gray-700 list-disc pl-5 space-y-1">
                  {product.stores.map((store) => (
                    <li key={`${store.warehouseId}-${store.productId}`}>
                      {store.warehouseName}: <span className="font-semibold">{store.quantity}</span> sản phẩm
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        {/* === Cột Phải (Phần mua hàng) === */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="sticky top-24 shadow-lg">
            <CardContent className="p-6 space-y-4">
              <h1 className="text-2xl font-bold leading-tight">{title}</h1>
              <p className="text-3xl text-primary font-semibold">
                {Number(priceValue) === 0
                  ? 'Miễn phí'
                  : `${Number(priceValue).toLocaleString('vi-VN')} ₫`}
              </p>
              <p className="text-sm text-gray-600">
                Số lượng còn lại:{' '}
                <span className="font-semibold">
                  {totalQuantity > 0 ? totalQuantity : 'Đang cập nhật'}
                </span>
              </p>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <label className="font-semibold" htmlFor="purchaseQty">
                  Chọn số lượng:
                </label>
                <input
                  id="purchaseQty"
                  type="number"
                  min="1"
                  max={totalQuantity || 1}
                  value={purchaseQty}
                  onChange={(e) => setPurchaseQty(e.target.value)}
                  className="w-24 rounded border px-2 py-1 text-sm"
                />
              </div>

              {/* Nút Mua an toàn với Escrow */}
              <Button
                size="lg"
                className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 focus:ring-green-500"
                onClick={handleEscrowPurchase}
                disabled={isEscrowProcessing}
              >
                {isEscrowProcessing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> Đang ký quỹ...
                  </>
                ) : (
                  <>
                    <ShieldCheck size={20} /> Mua an toàn (Escrow)
                  </>
                )}
              </Button>

              {/* Nút Mua trực tiếp = Liên hệ người bán */}
              <Button
                size="lg"
                variant="secondary"
                className="w-full flex items-center justify-center gap-2"
                onClick={handleDirectPurchase}
              >
                <Handshake size={20} /> Mua trực tiếp
              </Button>

              {/* Nút Thêm vào giỏ hàng */}
              <Button
                size="lg"
                variant="outline"
                className="w-full flex items-center justify-center gap-2"
                onClick={handleAddToCart}
              >
                <ShoppingCart size={20} /> Thêm vào giỏ hàng
              </Button>

              {/* Nút Liên hệ người bán */}
              <div className="pt-4 border-t">
                <Button
                  variant="ghost"
                  className="w-full flex items-center justify-center gap-2 text-primary hover:bg-primary/10"
                  onClick={handleContactSeller}
                >
                  <MessageCircle size={20} /> Chat 
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
