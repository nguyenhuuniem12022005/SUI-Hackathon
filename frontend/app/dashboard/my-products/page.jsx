/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import {
  ClipboardList,
  MoveRight,
  PackageCheck,
  ShieldCheck,
  Clock,
  Loader2,
  Pencil,
  Trash2,
  Link2,
} from 'lucide-react';
import {
  fetchMyProducts,
  requestProductAudit,
  deleteProduct,
  fetchSimpleTokenHistory,
  fetchSimpleTokenAlerts,
} from '../../../lib/api';
import { resolveProductImage } from '../../../lib/image';
import { useRouter } from 'next/navigation';
import { useWallet } from '../../../context/WalletContext';
import ProductCardSkeleton from '../../../components/dashboard/ProductCardSkeleton';

const MAX_PRODUCT_EDITS = 3;

const statusConfig = {
  Draft: { label: 'Nháp', className: 'bg-gray-100 text-gray-700' },
  Pending: { label: 'Chờ duyệt', className: 'bg-amber-100 text-amber-700' },
  Active: { label: 'Đang bán', className: 'bg-emerald-100 text-emerald-700' },
  Sold: { label: 'Đã bán hết', className: 'bg-primary/10 text-primary' },
};
const currency = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
const numberFormat = new Intl.NumberFormat('vi-VN');


export default function MyProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [hscoinHistory, setHscoinHistory] = useState([]);
  const [hscoinAlerts, setHscoinAlerts] = useState([]);
  const [hscoinLoading, setHscoinLoading] = useState(false);
  const [hscoinError, setHscoinError] = useState('');
  const { walletAddress, isConnected, connectWallet } = useWallet();
  const router = useRouter();

  useEffect(() => {
    async function loadProducts() {
      try {
        const data = await fetchMyProducts();
        setProducts(data || []);
      } catch (err) {
        setError(err.message || 'Không thể tải danh sách sản phẩm.');
      } finally {
        setLoading(false);
      }
    }
    loadProducts();
  }, []);

  useEffect(() => {
    let ignore = false;
    async function loadAlerts() {
      try {
        const data = await fetchSimpleTokenAlerts({ severity: 'warning', limit: 10 });
        if (!ignore) {
          setHscoinAlerts(data || []);
        }
      } catch (err) {
        console.warn('Không thể tải cảnh báo HScoin:', err.message);
      }
    }
    loadAlerts();
    const timer = setInterval(loadAlerts, 60 * 1000);
    return () => {
      ignore = true;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    if (!walletAddress) {
      setHscoinHistory([]);
      return () => {};
    }

    async function loadHistory() {
      setHscoinLoading(true);
      setHscoinError('');
      try {
        const data = await fetchSimpleTokenHistory(walletAddress, 10);
        if (!ignore) {
          setHscoinHistory(data || []);
        }
      } catch (err) {
        if (!ignore) {
          setHscoinError(err.message || 'Không thể tải lịch sử HScoin.');
        }
      } finally {
        if (!ignore) {
          setHscoinLoading(false);
        }
      }
    }
    loadHistory();
    return () => {
      ignore = true;
    };
  }, [walletAddress]);

  const stats = useMemo(() => {
    const result = { total: products.length, Draft: 0, Pending: 0, Active: 0 };
    products.forEach((item) => {
      result[item.status] = (result[item.status] || 0) + 1;
    });
    return result;
  }, [products]);

  const hscoinStatusChips = hscoinHistory.slice(0, 4).map((item) => {
    const colorMap = {
      SUCCESS: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      PROCESSING: 'text-blue-600 bg-blue-50 border-blue-200',
      QUEUED: 'text-amber-600 bg-amber-50 border-amber-200',
      FAILED: 'text-rose-600 bg-rose-50 border-rose-200',
      PENDING: 'text-gray-600 bg-gray-50 border-gray-200',
    };
    const cls = colorMap[item.status] || colorMap.PENDING;
    return (
      <div key={item.callId} className={`rounded-lg border px-3 py-2 text-xs flex flex-col gap-1 ${cls}`}>
        <div className="flex items-center justify-between">
          <span className="font-semibold uppercase">{item.status}</span>
          <span>{item.createdAt ? new Date(item.createdAt).toLocaleTimeString('vi-VN') : ''}</span>
        </div>
        {item.lastError && <p>Lỗi: {item.lastError}</p>}
        {item.nextRunAt && <p>Lần thử tiếp: {new Date(item.nextRunAt).toLocaleString('vi-VN')}</p>}
      </div>
    );
  });

  const handleSubmitForReview = async (productId) => {
    try {
      setUpdatingId(productId);
      await requestProductAudit(productId, {
        note: 'Yêu cầu kiểm duyệt từ dashboard P-Market.',
        attachments: [],
      });
      toast.success('Đã gửi yêu cầu kiểm duyệt. Đội HScoin sẽ phản hồi sớm.');
      setProducts((prev) =>
        prev.map((item) =>
          item.productId === productId
            ? {
                ...item,
                status: 'Pending',
                latestAuditStatus: 'PENDING',
                latestAuditNote: 'Đang chờ kiểm duyệt',
                latestAuditCreatedAt: new Date().toISOString(),
              }
            : item
        )
      );
    } catch (err) {
      toast.error(err.message || 'Không thể cập nhật trạng thái.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleEditProduct = (productId) => {
    router.push(`/products/new?productId=${productId}`);
  };

  const handleDeleteProduct = async (product) => {
    if (!window.confirm('Bạn chắc chắn muốn xóa bài đăng này? Hành động không thể hoàn tác.')) {
      return;
    }
    try {
      setDeletingId(product.productId);
      await deleteProduct(product.productId);
      toast.success('Đã xóa sản phẩm khỏi marketplace.');
      setProducts((prev) => prev.filter((item) => item.productId !== product.productId));
    } catch (err) {
      toast.error(err.message || 'Không thể xóa sản phẩm.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-sm text-primary font-semibold">Flow #2 · Đăng bán sản phẩm</p>
        <h1 className="text-2xl font-bold">Quản lý sản phẩm của bạn</h1>
        <p className="text-sm text-gray-600">
          Hoàn thiện mô tả, gửi kiểm duyệt rồi kích hoạt trên HScoin escrow marketplace. Danh sách bên dưới thể
          hiện rõ trạng thái từng bước để chuẩn bị đưa dữ liệu lên blockchain.
        </p>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
      )}

      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck size={18} /> Trạng thái HScoin
          </CardTitle>
          <div className="text-sm text-gray-600 flex items-center gap-2">
            <span>
              Ví HScoin:{' '}
              {walletAddress ? (
                <code className="font-semibold">
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </code>
              ) : (
                'Chưa kết nối'
              )}
            </span>
            <Button size="sm" variant="outline" onClick={connectWallet}>
              <Link2 size={14} className="mr-1" /> {isConnected ? 'Kết nối lại' : 'Kết nối ví'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {hscoinError && (
            <div className="border border-red-200 bg-red-50 px-3 py-2 rounded text-sm text-red-600">{hscoinError}</div>
          )}
          {hscoinLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Loader2 className="animate-spin" size={16} /> Đang tải lịch sử burn token...
            </div>
          ) : hscoinHistory.length === 0 ? (
            <p className="text-sm text-gray-600">
              Chưa có giao dịch HScoin nào gần đây. Khi đăng bài, hệ thống sẽ burn phí và hiển thị trạng thái tại đây.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">{hscoinStatusChips}</div>
          )}
          <div className="rounded-md border border-dashed border-gray-200 p-4 text-sm text-gray-600 space-y-2">
            <p className="font-semibold text-gray-800">Gợi ý xử lý nhanh:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Yêu cầu burn sẽ tự động thử lại tối đa 5 lần nếu HScoin quá tải.</li>
              <li>Trạng thái QUEUED quá 10 phút? Kiểm tra ví được phép và kết nối lại.</li>
              <li>Mọi lỗi chi tiết được ghi lại để đội kỹ thuật hỗ trợ khi cần.</li>
            </ul>
            {hscoinAlerts.length > 0 && (
              <div className="mt-3 space-y-1">
                <p className="font-semibold text-gray-800">Cảnh báo mới nhất:</p>
                {hscoinAlerts.slice(0, 3).map((alert) => (
                  <div key={alert.alertId} className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded px-2 py-1">
                    {alert.createdAt ? new Date(alert.createdAt).toLocaleTimeString('vi-VN') : ''} · {alert.message}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <ClipboardList size={18} />
            </div>
            <div>
              <p className="text-xs uppercase text-gray-500">Tổng sản phẩm</p>
              <p className="text-2xl font-bold text-gray-900">{loading ? '…' : stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="h-12 w-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock size={18} />
            </div>
            <div>
              <p className="text-xs uppercase text-gray-500">Chờ duyệt</p>
              <p className="text-2xl font-bold text-gray-900">{loading ? '…' : stats.Pending || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="h-12 w-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck size={18} />
            </div>
            <div>
              <p className="text-xs uppercase text-gray-500">Đang bán</p>
              <p className="text-2xl font-bold text-gray-900">{loading ? '…' : stats.Active || 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="space-y-4">
          <ProductCardSkeleton count={2} />
        </div>
      ) : products.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-gray-500">Bạn chưa đăng sản phẩm nào.</CardContent>
        </Card>
      ) : (
        products.map((product) => {
          const badge = statusConfig[product.status] || statusConfig.Draft;
          return (
            <Card key={product.productId}>
              <CardHeader className="flex flex-col gap-2 border-b border-gray-100 pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{product.productName}</CardTitle>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badge.className}`}>
                    {badge.label}
                  </span>
                </div>
                <p className="text-sm text-gray-500">{product.categoryName || 'Chưa phân loại'}</p>
              </CardHeader>
              <CardContent className="p-4 flex flex-col gap-4 md:flex-row md:items-center">
                <img
                  src={resolveProductImage(product)}
                  alt={product.productName}
                  className="h-24 w-24 rounded-lg object-cover border border-gray-100"
                />
                <div className="flex-1 space-y-2">
                <div className="text-sm text-gray-600">
                  <p>Giá niêm yết: <span className="font-semibold text-gray-900">{currency.format(product.unitPrice || 0)}</span></p>
                  <p>Kho hiện có: <span className="font-semibold">{numberFormat.format(product.totalQuantity || 0)} đơn vị</span></p>
                  <p>Đã bán: <span className="font-semibold">{numberFormat.format(product.totalSold || 0)} sản phẩm</span></p>
                  <p>Doanh thu ước tính: <span className="font-semibold text-primary">{currency.format(product.totalRevenue || 0)}</span></p>
                  <p>
                    Đã chỉnh sửa: <span className="font-semibold">{product.editCount || 0}/{MAX_PRODUCT_EDITS}</span> ·
                    Đơn hàng: <span className="font-semibold">{numberFormat.format(product.totalOrders || 0)}</span> ·
                    Đánh giá: <span className="font-semibold">{numberFormat.format(product.reviewCount || 0)}</span>
                  </p>
                </div>
                  {product.latestAuditStatus && (
                    <div className="text-xs rounded-md border border-dashed border-gray-200 p-3 text-gray-600 bg-gray-50">
                      <p className="font-semibold text-gray-800">
                        Kiểm duyệt gần nhất:{' '}
                        <span
                          className={
                            product.latestAuditStatus === 'APPROVED'
                              ? 'text-emerald-600'
                              : product.latestAuditStatus === 'REJECTED'
                              ? 'text-rose-600'
                              : 'text-amber-600'
                          }
                        >
                          {product.latestAuditStatus}
                        </span>
                      </p>
                      {product.latestAuditNote && <p>Ghi chú: {product.latestAuditNote}</p>}
                      {product.latestAuditCreatedAt && (
                        <p>
                          Ngày gửi:{' '}
                          {new Date(product.latestAuditCreatedAt).toLocaleDateString('vi-VN')}
                        </p>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-gray-500">
                    Mã sản phẩm #{product.productId} · Cập nhật {new Date(product.updatedAt || product.createdAt).toLocaleDateString('vi-VN')}
                  </p>
                </div>
                <div className="flex flex-col gap-2 w-full md:w-auto">
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditProduct(product.productId)}
                      disabled={!product.canEdit || deletingId === product.productId}
                    >
                      <Pencil size={14} className="mr-2" />{' '}
                      {product.canEdit
                        ? `Chỉnh sửa (còn ${Math.max(0, MAX_PRODUCT_EDITS - Number(product.editCount || 0))}/3)`
                        : 'Không thể chỉnh sửa'}
                    </Button>
                    {!product.canEdit && (
                      <p className="text-xs text-gray-500">
                        Đã hết lượt chỉnh sửa hoặc sản phẩm đã phát sinh giao dịch.
                      </p>
                    )}
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDeleteProduct(product)}
                      disabled={!product.canDelete || deletingId === product.productId}
                    >
                      {deletingId === product.productId ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="animate-spin" size={14} /> Đang xóa...
                        </span>
                      ) : (
                        <>
                          <Trash2 size={14} className="mr-1" /> Xóa bài đăng
                        </>
                      )}
                    </Button>
                    {!product.canDelete && (
                      <p className="text-xs text-gray-500">
                        Sản phẩm đã có đơn hàng/đánh giá nên không thể xóa.
                      </p>
                    )}
                  </div>
                  {product.status === 'Draft' && (
                    <Button
                      size="sm"
                      onClick={() => handleSubmitForReview(product.productId)}
                      disabled={updatingId === product.productId}
                    >
                      {updatingId === product.productId ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="animate-spin" size={14} /> Đang gửi…
                        </span>
                      ) : (
                        <>
                          <MoveRight size={14} className="mr-1" /> Gửi kiểm duyệt
                        </>
                      )}
                    </Button>
                  )}
                  {product.status === 'Pending' && (
                    <div className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-md px-3 py-2">
                      Đội HScoin đang kiểm duyệt giấy tờ của bạn. Hãy chuẩn bị sẵn chứng nhận để đẩy on-chain.
                    </div>
                  )}
                  {product.status === 'Active' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSubmitForReview(product.productId, 'Draft')}
                      disabled={updatingId === product.productId}
                    >
                      {updatingId === product.productId ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="animate-spin" size={14} /> Đang xử lý…
                        </span>
                      ) : (
                        <>
                          <PackageCheck size={14} className="mr-1" /> Tạm ngưng bán
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
