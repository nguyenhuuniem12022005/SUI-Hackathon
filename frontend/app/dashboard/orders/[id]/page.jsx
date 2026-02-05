'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';
import {
  fetchOrderDetail,
  confirmOrderAsBuyer,
  confirmOrderAsSeller,
  retryHscoinCall,
  verifyHscoinCallTxHash,
  cancelOrder,
} from '../../../../lib/api';
import { resolveProductImage } from '../../../../lib/image';
import { Card, CardHeader, CardContent } from '../../../../components/ui/Card';
import {
  Loader2,
  Package,
  Truck,
  Shield,
  MapPin,
  User,
  Mail,
  Phone,
  ArrowLeft,
  AlertTriangle,
} from 'lucide-react';

const currency = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });

const statusStyles = {
  Pending: {
    label: 'Chờ xác nhận',
    badge: 'bg-amber-100 text-amber-700',
    icon: Truck,
  },
  SellerConfirmed: {
    label: 'Người bán đã xác nhận',
    badge: 'bg-sky-100 text-sky-700',
    icon: Truck,
  },
  BuyerConfirmed: {
    label: 'Người mua đã xác nhận',
    badge: 'bg-indigo-100 text-indigo-700',
    icon: Truck,
  },
  Completed: {
    label: 'Hoàn tất',
    badge: 'bg-emerald-100 text-emerald-700',
    icon: Package,
  },
  Cancelled: {
    label: 'Đã hủy',
    badge: 'bg-gray-100 text-gray-600',
    icon: Package,
  },
};

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.id;

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [greenApproved, setGreenApproved] = useState(false);
  const [polling, setPolling] = useState(false);
  const [retryLoading, setRetryLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  const load = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const data = await fetchOrderDetail(orderId);
      setOrder(data);
      setGreenApproved(Boolean(data?.isGreenConfirmed));
      setError('');
    } catch (err) {
      setError(err.message || 'Không thể tải chi tiết đơn hàng.');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  // Polling escrow status khi đang QUEUED/PROCESSING
  useEffect(() => {
    const status = order?.hscoinCall?.status || order?.escrow?.status;
    const shouldPoll =
      !order?.status || order.status === 'Pending'
        ? status === 'QUEUED' || status === 'PROCESSING' || status === 'LOCKED'
        : false;
    if (!shouldPoll) return;
    setPolling(true);
    const timer = setInterval(() => {
      load();
    }, 8000);
    return () => {
      clearInterval(timer);
      setPolling(false);
    };
  }, [order?.hscoinCall?.status, order?.escrow?.status, order?.status, load, order]);

  const handleConfirm = async (type) => {
    if (!orderId) return;
    if (isFinalized) {
      toast.error('Đơn hàng đã hoàn tất/hủy. Không thể xác nhận.');
      return;
    }
    const currentEscrowStatus = String(
      order?.hscoinCall?.status || order?.escrow?.status || order?.meta?.actions?.escrowStatus || ''
    ).toUpperCase();
    const blockedStatuses = ['FAILED', 'QUEUED', 'PROCESSING', 'PENDING', 'LOCKED'];
    if (blockedStatuses.includes(currentEscrowStatus)) {
      toast.error(
        'Escrow SUI chưa sẵn sàng. Hãy Thử lại/Hủy đơn hoặc Kiểm tra TxHash trước khi xác nhận.',
        { id: 'escrow-blocked' }
      );
      return;
    }
    setActionLoading(true);
    try {
      if (type === 'buyer') {
        const response = await confirmOrderAsBuyer(orderId, {
          isGreenApproved: order?.isGreen ? greenApproved || order?.isGreenConfirmed : undefined,
        });
        toast.success(response?.message || 'Đã xác nhận.');
      } else {
        const response = await confirmOrderAsSeller(orderId);
        toast.success(response?.message || 'Đã xác nhận.');
      }
      await load();
    } catch (err) {
      toast.error(err.message || 'Không thể xác nhận đơn hàng.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetryEscrow = async () => {
    if (!order?.hscoinCall?.callId) return;
    if (isFinalized) {
      toast.error('Đơn hàng đã hoàn tất/hủy. Không thể retry escrow.');
      return;
    }
    setRetryLoading(true);
    try {
      const res = await retryHscoinCall(order.hscoinCall.callId);
      toast.success(res?.message || 'Đã gửi yêu cầu retry');
      await load();
    } catch (err) {
      toast.error(err.message || 'Retry thất bại');
    } finally {
      setRetryLoading(false);
    }
  };

  const handleVerifyTx = async () => {
    if (!order?.hscoinCall?.callId) return;
    if (isFinalized) {
      toast.error('Đơn hàng đã hoàn tất/hủy. Không cần kiểm tra lại.');
      return;
    }
    setVerifyLoading(true);
    try {
      const res = await verifyHscoinCallTxHash(order.hscoinCall.callId);
      setVerifyResult(res);
      toast.success(res?.verified ? 'Tx đã được xác nhận' : 'Tx chưa xuất hiện trên chain');
    } catch (err) {
      toast.error(err.message || 'Không thể kiểm tra txHash');
    } finally {
      setVerifyLoading(false);
    }
  };
  const handleCancelOrder = async () => {
    if (!orderId) return;
    if (isFinalized) {
      toast.error('Đơn hàng đã hoàn tất/hủy. Không thể hủy lại.');
      return;
    }
    const confirmed = window.confirm(
      'Bạn có chắc muốn hủy đơn hàng này? Bạn có thể tạo đơn hàng mới sau khi hủy.'
    );
    if (!confirmed) return;
    
    setCancelLoading(true);
    try {
      const res = await cancelOrder(orderId);
      toast.success(res?.message || 'Đã hủy đơn hàng');
      await load();
    } catch (err) {
      toast.error(err.message || 'Không thể hủy đơn hàng');
    } finally {
      setCancelLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-10 text-center text-gray-600 flex flex-col items-center gap-2">
        <Loader2 className="animate-spin" />
        Đang tải chi tiết đơn hàng...
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="py-10 text-center space-y-4">
        <p className="text-lg font-semibold text-gray-700">{error || 'Không tìm thấy đơn hàng.'}</p>
        <button
          type="button"
          className="inline-flex items-center gap-2 text-primary font-semibold"
          onClick={() => router.push('/dashboard/orders')}
        >
          <ArrowLeft size={16} /> Quay lại danh sách đơn hàng
        </button>
      </div>
    );
  }

  const statusMeta = statusStyles[order.status] || statusStyles.Pending;
  const StatusIcon = statusMeta.icon || Truck;
  const actions = order.meta?.actions || {};
  const role = order.meta?.role || {};
  const escrowStatus = String(
    order?.hscoinCall?.status || order?.escrow?.status || actions?.escrowStatus || ''
  ).toUpperCase();
  const escrowBlocked = ['FAILED', 'QUEUED', 'PROCESSING', 'PENDING', 'LOCKED'].includes(
    escrowStatus
  );
  const isFinalized = order.status === 'Cancelled' || order.status === 'Completed';
  const explorerBase =
    process.env.NEXT_PUBLIC_HSCOIN_EXPLORER || 'https://hsc-w3oq.onrender.com/admin/contract.html';
  const txLink = order.escrow?.txHash ? `${explorerBase}?tx=${order.escrow.txHash}` : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push('/dashboard/orders')}
          className="text-sm text-primary hover:underline flex items-center gap-1"
        >
          <ArrowLeft size={16} /> Đơn hàng của tôi
        </button>
        <span className="text-sm text-gray-400">/</span>
        <p className="text-sm text-gray-600">Chi tiết đơn #{order.orderId}</p>
      </div>

      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-primary font-semibold">Escrow SUI</p>
          <h1 className="text-2xl font-bold">Đơn #{order.orderId}</h1>
          <p className="text-sm text-gray-600">
            Ngày đặt:{' '}
            {order.orderDate ? new Date(order.orderDate).toLocaleString('vi-VN') : 'Không xác định'}
          </p>
          {polling && (
            <p className="text-xs text-amber-600">Đang đồng bộ trạng thái escrow...</p>
          )}
          {isFinalized && order.status === 'Cancelled' && (
            <p className="text-xs text-rose-600">Đơn hàng đã bị hủy.</p>
          )}
        </div>
        <div
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${statusMeta.badge}`}
        >
          <StatusIcon size={18} />
          {statusMeta.label}
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
      <CardHeader>
        <div className="flex items-center gap-2 text-gray-700">
          <Shield size={18} /> Thông tin giao dịch
        </div>
      </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div className="space-y-1">
                <p className="uppercase text-xs text-gray-400">Người bán</p>
                <p className="font-semibold">{order.seller?.name || '—'}</p>
                <p className="flex items-center gap-1 text-xs">
                  <Mail size={14} /> {order.seller?.email || 'Chưa có email'}
                </p>
                <p className="flex items-center gap-1 text-xs">
                  <Phone size={14} /> {order.seller?.phone || 'Chưa có số'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="uppercase text-xs text-gray-400">Người mua</p>
                <p className="font-semibold">{order.customer?.name || '—'}</p>
                <p className="flex items-center gap-1 text-xs">
                  <Mail size={14} /> {order.customer?.email || 'Chưa có email'}
                </p>
                <p className="flex items-center gap-1 text-xs">
                  <Phone size={14} /> {order.customer?.phone || 'Chưa có số'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="uppercase text-xs text-gray-400">Địa chỉ giao</p>
                <p className="flex items-center gap-2">
                  <MapPin size={14} /> {order.shippingAddress || 'Chưa cập nhật'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="uppercase text-xs text-gray-400">Tổng thanh toán</p>
                <p className="text-lg font-semibold">{currency.format(order.totalAmount || 0)}</p>
              </div>
            </div>

            {!isFinalized &&
              renderActions({
                actions,
                role,
                onConfirm: handleConfirm,
                loading: actionLoading,
                isGreen: Boolean(order.isGreen),
                isGreenConfirmed: Boolean(order.isGreenConfirmed),
                greenApproved,
                onToggleGreen: setGreenApproved,
                escrowStatus,
                escrowBlocked,
                orderStatus: order.status,
              })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-gray-700">
              <Package size={18} /> Escrow &amp; Blockchain
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-600">
            {order.escrow?.txHash ? (
              <>
                <p>
                  Tx Hash:{' '}
                  <a
                    href={txLink || '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-xs text-primary hover:underline"
                    title="Mở trên SUI explorer"
                  >
                    {order.escrow.txHash}
                  </a>
                </p>
                <p>
                  Block #{order.escrow.blockNumber || '—'} · {order.escrow.network || 'SUI'}
                </p>
                <p>Gas used: {order.escrow.gasUsed || '—'}</p>
                {order.hscoinCall?.callId && (
                  <p className="text-xs text-gray-500">
                    SUI transaction ID: {order.hscoinCall.callId}
                  </p>
                )}
              </>
            ) : (
              <p className="flex items-center gap-2 text-amber-600">
                <AlertTriangle size={14} /> Chưa có hash on-chain. Hệ thống sẽ cập nhật sau.
              </p>
            )}
            {order.hscoinCall?.status === 'FAILED' && (
              <>
                <p className="text-xs text-rose-600">
                   Escrow SUI thất bại: {order.hscoinCall?.lastError || 'Không xác định'}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                   Bạn có 3 lựa chọn: <strong>Thử lại</strong> để giữ đơn,{' '}
                   <strong>Hủy đơn + hoàn tiền</strong> nếu muốn tạo đơn mới, hoặc{' '}
                   <strong>Kiểm tra TxHash</strong> trên chain trước khi quyết định.
                </p>
              </>
            )}
            {order.hscoinCall?.status === 'QUEUED' && (
              <>
                <p className="text-xs text-amber-600">
                   Escrow đang chờ xử lý. Lần thử tiếp: {order.hscoinCall.nextRunAt || 'Đang xếp hàng'}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                   Hệ thống sẽ tự động retry; bạn có thể bấm <strong>Thử lại</strong>,{' '}
                   <strong>Hủy đơn</strong>, hoặc <strong>Kiểm tra TxHash</strong> ngay bây giờ.
                </p>
              </>
            )}

            {/* Retry / Verify / Cancel actions */}
            {order.hscoinCall?.callId && !isFinalized && (
              <div className="pt-2 flex flex-wrap gap-2">
                {['FAILED','QUEUED'].includes(String(order.hscoinCall.status).toUpperCase()) && (
                  <>
                    <button
                      type="button"
                      onClick={handleRetryEscrow}
                      disabled={retryLoading || cancelLoading}
                      className="px-3 py-1.5 rounded-md bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 disabled:opacity-60"
                    >
                      {retryLoading ? 'Đang retry...' : 'Thử lại'}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelOrder}
                      disabled={cancelLoading || retryLoading}
                      className="px-3 py-1.5 rounded-md bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 disabled:opacity-60"
                    >
                      {cancelLoading ? 'Đang hủy...' : 'Hủy đơn'}
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={handleVerifyTx}
                  disabled={verifyLoading}
                  className="px-3 py-1.5 rounded-md bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-60"
                >
                  {verifyLoading ? 'Đang kiểm tra...' : 'Kiểm tra TxHash'}
                </button>
              </div>
            )}
            {verifyResult && (
              <div className="mt-2 text-xs">
                <p className={verifyResult.verified ? 'text-emerald-600' : 'text-gray-500'}>
                  {verifyResult.message}
                </p>
                {verifyResult.txHash && (
                  <p className="font-mono truncate">{verifyResult.txHash}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 text-gray-700">
            <Package size={18} /> Sản phẩm
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {order.items?.map((item) => (
            <div key={item.orderDetailId} className="flex items-center gap-4">
              <Image
                src={resolveProductImage(item)}
                alt={item.productName}
                width={80}
                height={80}
                className="rounded-md border object-cover"
              />
              <div className="flex-1">
                <Link
                  href={`/products/${item.productId}`}
                  className="font-semibold text-gray-900 hover:text-primary"
                >
                  {item.productName}
                </Link>
                <p className="text-sm text-gray-500">Số lượng: {item.quantity}</p>
                {item.review ? (
                  <p className="text-xs text-emerald-600">
                    Đã đánh giá {item.review.rating}/5 ★
                  </p>
                ) : (
                  role.isBuyer &&
                  order.status === 'Completed' && (
                    <Link
                      href={`/dashboard/orders/${order.orderId}/review?itemId=${item.orderDetailId}`}
                      className="text-xs text-primary font-semibold"
                    >
                      Viết đánh giá
                    </Link>
                  )
                )}
              </div>
              <p className="font-semibold text-primary">
                {currency.format((item.unitPrice || 0) * (item.quantity || 0))}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 text-gray-700">
            <Shield size={18} /> Lịch sử escrow
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-600">
          {order.ledgerHistory?.length ? (
            order.ledgerHistory.map((entry, idx) => (
              <div key={`${entry.txHash || 'entry'}-${idx}`} className="flex justify-between">
                <span className="font-semibold">{entry.status}</span>
                <span className="text-xs text-gray-500">
                  {entry.createdAt ? new Date(entry.createdAt).toLocaleString('vi-VN') : '—'}
                </span>
              </div>
            ))
          ) : (
            <p className="text-gray-500">Chưa có bản ghi escrow.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function renderActions({
  actions,
  role,
  onConfirm,
  loading,
  isGreen,
  greenApproved,
  onToggleGreen,
  isGreenConfirmed,
  escrowStatus,
  escrowBlocked,
  orderStatus,
}) {
  const hasAction = actions.canConfirmAsBuyer || actions.canConfirmAsSeller;
  const escrowStatusLabel =
    {
      FAILED: 'thất bại',
      QUEUED: 'đang xếp hàng',
      PROCESSING: 'đang xử lý',
      PENDING: 'đang khởi tạo',
      LOCKED: 'đang khóa',
    }[escrowStatus] || 'chưa sẵn sàng';
  const waitingMessage = actions.waitingForBuyer
    ? 'Đang chờ người mua xác nhận.'
    : actions.waitingForSeller
    ? 'Đang chờ người bán xác nhận.'
    : null;

  if (orderStatus === 'Cancelled' || orderStatus === 'Completed') {
    return null;
  }

  if (!hasAction && !waitingMessage) {
    return null;
  }

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <p className="text-sm font-semibold text-gray-800">Xác nhận giao dịch</p>
      {actions.canConfirmAsBuyer && role.isBuyer && (
        <>
          {isGreen && (
            <div className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3">
              <input
                id="greenApproved"
                type="checkbox"
                checked={greenApproved || isGreenConfirmed}
                onChange={(e) => onToggleGreen?.(e.target.checked)}
                className="mt-1 h-4 w-4"
                disabled={isGreenConfirmed}
              />
              <label htmlFor="greenApproved" className="text-sm text-gray-800">
                Tôi xác nhận đây là hành động xanh. Người bán sẽ được cộng Green Credit.
                {isGreenConfirmed && (
                  <span className="block text-xs text-emerald-700">
                    Đã xác nhận xanh trước đó.
                  </span>
                )}
              </label>
            </div>
          )}
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-70"
          onClick={() => onConfirm('buyer')}
          disabled={
            loading ||
            (isGreen && !isGreenConfirmed && !greenApproved) ||
            escrowBlocked
          }
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <User size={16} />}
          Tôi đã nhận hàng
        </button>
        </>
      )}
      {actions.canConfirmAsSeller && role.isSeller && (
        <button
          type="button"
        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-70"
        onClick={() => onConfirm('seller')}
        disabled={
          loading || escrowBlocked
        }
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Truck size={16} />}
        Tôi đã giao hàng
      </button>
    )}
      {escrowBlocked && (
        <p className="text-xs text-rose-600">
          Escrow SUI {escrowStatusLabel}. Vui lòng Thử lại/Hủy đơn hoặc Kiểm tra TxHash trước khi
          xác nhận.
        </p>
      )}
      {waitingMessage && <p className="text-xs text-amber-600">{waitingMessage}</p>}
    </div>
  );
}
