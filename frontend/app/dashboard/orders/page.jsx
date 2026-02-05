/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { resolveProductImage } from '../../../lib/image';
import { Card, CardHeader, CardContent } from '../../../components/ui/Card';
import {
  fetchMyOrders,
  fetchSellerOrders,
  confirmOrderAsBuyer,
  confirmOrderAsSeller,
} from '../../../lib/api';
import { Package, Truck, ExternalLink, Loader2, Shield, AlertTriangle } from 'lucide-react';

const currency = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
const HSCOIN_EXPLORER =
  process.env.NEXT_PUBLIC_HSCOIN_EXPLORER || 'https://hsc-w3oq.onrender.com/auth/contract.html';
const ESCROW_BLOCKED_STATUSES = ['FAILED', 'QUEUED', 'PROCESSING', 'PENDING', 'LOCKED'];
const escrowBlockedMessage =
  'Escrow HScoin chưa sẵn sàng. Hãy Thử lại/Hủy đơn hoặc Kiểm tra TxHash trước khi xác nhận.';

const statusBadge = {
  Pending: 'bg-amber-100 text-amber-700',
  SellerConfirmed: 'bg-sky-100 text-sky-700',
  BuyerConfirmed: 'bg-indigo-100 text-indigo-700',
  Completed: 'bg-emerald-100 text-emerald-700',
  Cancelled: 'bg-gray-100 text-gray-600',
};

const statusLabels = {
  Pending: 'Chờ xác nhận',
  SellerConfirmed: 'Người bán đã xác nhận',
  BuyerConfirmed: 'Người mua đã xác nhận',
  Completed: 'Hoàn tất',
  Cancelled: 'Đã hủy',
};

const getEscrowStatus = (order) =>
  String(order?.hscoinCall?.status || order?.escrow?.status || '').toUpperCase();

export default function OrdersPage() {
  const [purchases, setPurchases] = useState([]);
  const [sales, setSales] = useState([]);
  const [loadingPurchases, setLoadingPurchases] = useState(true);
  const [loadingSales, setLoadingSales] = useState(true);
  const [errorPurchases, setErrorPurchases] = useState('');
  const [errorSales, setErrorSales] = useState('');
  const [activeTab, setActiveTab] = useState('purchases');
  const [actionOrderId, setActionOrderId] = useState(null);
  const [purchasesPage, setPurchasesPage] = useState(1);
  const [salesPage, setSalesPage] = useState(1);
  const pageSize = 10;
  const maxItems = 50;

  const loadPurchases = useCallback(async () => {
    setLoadingPurchases(true);
    try {
      const data = await fetchMyOrders();
      setPurchases(data || []);
      setErrorPurchases('');
      setPurchasesPage(1);
    } catch (err) {
      setErrorPurchases(err.message || 'Không thể tải danh sách đơn mua.');
    } finally {
      setLoadingPurchases(false);
    }
  }, []);

  const loadSales = useCallback(async () => {
    setLoadingSales(true);
    try {
      const data = await fetchSellerOrders();
      setSales(data || []);
      setErrorSales('');
      setSalesPage(1);
    } catch (err) {
      setErrorSales(err.message || 'Không thể tải danh sách đơn bán.');
    } finally {
      setLoadingSales(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadPurchases(), loadSales()]);
  }, [loadPurchases, loadSales]);

  useEffect(() => {
    loadPurchases();
    loadSales();
  }, [loadPurchases, loadSales]);

  const handleBuyerConfirm = async (order) => {
    const orderId = order?.orderId;
    const escrowStatus = getEscrowStatus(order);
    if (ESCROW_BLOCKED_STATUSES.includes(escrowStatus)) {
      toast.error(escrowBlockedMessage, { id: 'escrow-blocked-list' });
      return;
    }
    setActionOrderId(orderId);
    try {
      const response = await confirmOrderAsBuyer(orderId);
      toast.success(response?.message || 'Đã ghi nhận xác nhận của bạn.');
      await refreshAll();
    } catch (err) {
      toast.error(err.message || 'Không thể xác nhận đơn hàng.');
    } finally {
      setActionOrderId(null);
    }
  };

  const handleSellerConfirm = async (order) => {
    const orderId = order?.orderId;
    const escrowStatus = getEscrowStatus(order);
    if (ESCROW_BLOCKED_STATUSES.includes(escrowStatus)) {
      toast.error(escrowBlockedMessage, { id: 'escrow-blocked-list' });
      return;
    }
    setActionOrderId(orderId);
    try {
      const response = await confirmOrderAsSeller(orderId);
      toast.success(response?.message || 'Đã ghi nhận xác nhận của bạn.');
      await refreshAll();
    } catch (err) {
      toast.error(err.message || 'Không thể xác nhận đơn hàng.');
    } finally {
      setActionOrderId(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-sm text-primary font-semibold">Flow #3 · Escrow &amp; giao dịch</p>
        <h1 className="text-2xl font-bold">Quản lý đơn hàng</h1>
        <p className="text-sm text-gray-600">
          Theo dõi cả đơn đã mua và đơn bạn bán ra. Escrow HScoin chỉ được giải phóng khi cả người mua và người bán xác nhận.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('purchases')}
          className={`px-4 py-2 text-sm font-semibold rounded-full transition ${
            activeTab === 'purchases' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'
          }`}
        >
          Đơn đã mua
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('sales')}
          className={`px-4 py-2 text-sm font-semibold rounded-full transition ${
            activeTab === 'sales' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'
          }`}
        >
          Đơn bán ra
        </button>
      </div>

      <TabOrders
        type={activeTab}
        orders={activeTab === 'purchases' ? purchases : sales}
        loading={activeTab === 'purchases' ? loadingPurchases : loadingSales}
        error={activeTab === 'purchases' ? errorPurchases : errorSales}
        onBuyerConfirm={handleBuyerConfirm}
        onSellerConfirm={handleSellerConfirm}
        actionOrderId={actionOrderId}
        page={activeTab === 'purchases' ? purchasesPage : salesPage}
        onPageChange={activeTab === 'purchases' ? setPurchasesPage : setSalesPage}
        pageSize={pageSize}
        maxItems={maxItems}
      />
    </div>
  );
}

function TabOrders({
  type,
  orders,
  loading,
  error,
  onBuyerConfirm,
  onSellerConfirm,
  actionOrderId,
  page,
  onPageChange,
  pageSize,
  maxItems,
}) {
  const isSellerView = type === 'sales';
  const visibleOrders = orders.filter((order) => order.status !== 'Cancelled').slice(0, maxItems);
  const totalPages = Math.max(1, Math.ceil(visibleOrders.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  useEffect(() => {
    if (page > totalPages) {
      onPageChange(totalPages);
    }
  }, [page, totalPages, onPageChange]);
  const start = (currentPage - 1) * pageSize;
  const paginatedOrders = visibleOrders.slice(start, start + pageSize);

  const copyHash = async (hash) => {
    if (!hash) return;
    try {
      await navigator.clipboard.writeText(hash);
      toast.success('Đã sao chép mã giao dịch');
    } catch {
      toast.error('Không thể sao chép mã giao dịch');
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <Card>
          <CardContent className="p-6 text-sm text-gray-600 flex items-center gap-2">
            <Loader2 className="animate-spin" size={16} /> Đang tải danh sách đơn {isSellerView ? 'bán' : 'mua'}…
          </CardContent>
        </Card>
      ) : visibleOrders.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-gray-500">
            {isSellerView ? 'Bạn chưa có đơn bán nào.' : 'Bạn chưa có đơn mua nào.'}
            {orders.length > 0 && (
              <span className="block text-xs text-gray-400 mt-1">Đơn đã hủy được ẩn khỏi danh sách.</span>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
        {paginatedOrders.map((order) => {
          const badgeClass = statusBadge[order.status] || statusBadge.Pending;
          const icon =
            order.status === 'Completed' ? (
              <Package size={16} className="inline mr-1" />
            ) : (
              <Truck size={16} className="inline mr-1" />
            );
          const hscoinCall = order.hscoinCall;
          const hscoinStatus = getEscrowStatus(order) || 'LOCKED';
          const nextRunText = hscoinCall?.nextRunAt
            ? new Date(hscoinCall.nextRunAt).toLocaleString('vi-VN')
            : 'Đang chờ HScoin';
          const txLink = order.escrow?.txHash ? `${HSCOIN_EXPLORER}?tx=${order.escrow.txHash}` : null;

          return (
            <Card key={order.orderId}>
              <CardHeader className="flex flex-col gap-2 border-b border-gray-100 pb-4">
                <div className="flex flex-wrap items-center justify-between text-sm text-gray-600 gap-2">
                  <span>
                    Mã đơn: <strong>#{order.orderId}</strong>
                  </span>
                  <span>
                    Ngày đặt:{' '}
                    {order.orderDate ? new Date(order.orderDate).toLocaleString('vi-VN') : 'Không xác định'}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badgeClass}`}>
                    {icon}
                    {statusLabels[order.status] || order.status}
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  {isSellerView ? (
                    <>
                      Người mua: <span className="font-semibold">{order.customer?.name || '—'}</span>
                    </>
                  ) : (
                    <>
                      Người bán: <span className="font-semibold">{order.seller?.name || '—'}</span>
                    </>
                  )}
                </p>
                {isSellerView && order.customer?.email && (
                  <p className="text-xs text-gray-500">Email: {order.customer.email}</p>
                )}
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {order.items?.map((item) => (
                  <div key={item.orderDetailId} className="flex items-center gap-4">
                    <img
                      src={resolveProductImage(item)}
                      alt={item.productName}
                      className="h-20 w-20 rounded-md object-cover border border-gray-100"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{item.productName}</p>
                      <p className="text-sm text-gray-500">
                        SL: {item.quantity} · Đơn giá: {currency.format(item.unitPrice || 0)}
                      </p>
                    </div>
                    <p className="font-semibold text-primary">
                      {currency.format((item.unitPrice || 0) * (item.quantity || 0))}
                    </p>
                  </div>
                ))}

                <div className="border-t border-gray-100 pt-4 grid gap-3 md:grid-cols-2">
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>
                      Tổng thanh toán:{' '}
                      <span className="font-semibold text-gray-900">{currency.format(order.totalAmount || 0)}</span>
                    </p>
                    <p>Địa chỉ giao: {order.shippingAddress || 'Chưa cập nhật'}</p>
                    <Link href={`/dashboard/orders/${order.orderId}`} className="text-primary text-xs font-semibold">
                      Xem chi tiết đơn
                    </Link>
                  </div>
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-gray-700 space-y-1">
                    <div className="flex items-center gap-2 text-primary font-semibold">
                      <Shield size={14} /> Escrow HScoin
                    </div>
                    <p>
                      Trạng thái: <strong>{hscoinStatus}</strong>
                    </p>
                    {hscoinCall?.status === 'QUEUED' && (
                      <p className="text-xs text-amber-600 flex items-center gap-1">
                        <AlertTriangle size={12} /> Lần thử tiếp: {nextRunText}
                      </p>
                    )}
                    {hscoinCall?.status === 'FAILED' && (
                      <p className="text-xs text-rose-600 flex items-center gap-1">
                        <AlertTriangle size={12} /> Lỗi: {hscoinCall.lastError || 'HScoin từ chối giao dịch.'}
                      </p>
                    )}
                    {hscoinCall?.callId && <p className="text-xs">HScoin call ID: #{hscoinCall.callId}</p>}
                    {order.escrow?.txHash ? (
                      <>
                        <p>
                          Tx Hash:{' '}
                          <button
                            type="button"
                            onClick={() => copyHash(order.escrow?.txHash)}
                            className="font-mono text-xs text-primary underline"
                          >
                            {order.escrow?.txHash?.slice(0, 12)}…
                          </button>
                        </p>
                        <p>
                          Block #{order.escrow?.blockNumber || '—'} · {order.escrow?.network || 'HScoin'}
                        </p>
                        {txLink && (
                          <Link
                            href={txLink}
                            target="_blank"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            Xem trên explorer <ExternalLink size={12} />
                          </Link>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-gray-600">
                        Chưa có hash on-chain. Lệnh burn sẽ tự cập nhật khi HScoin xử lý xong.
                      </p>
                    )}
                    <Link
                      href={HSCOIN_EXPLORER}
                      target="_blank"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                    >
                      Mở explorer HScoin <ExternalLink size={12} />
                    </Link>
                    {renderActionRow({
                      order,
                      isSellerView,
                      onBuyerConfirm,
                      onSellerConfirm,
                      actionOrderId,
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        <div className="flex justify-center gap-2 mt-4">
          <button
            type="button"
            className="px-3 py-1 text-xs rounded border"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            ← Trước
          </button>
          <span className="text-xs text-gray-600 self-center">
            Trang {currentPage}/{totalPages} · Tối đa {maxItems} đơn gần nhất
          </span>
          <button
            type="button"
            className="px-3 py-1 text-xs rounded border"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            Sau →
          </button>
        </div>
        </>
      )}
    </div>
  );
}

function renderActionRow({ order, isSellerView, onBuyerConfirm, onSellerConfirm, actionOrderId }) {
  const isCompleted = order.status === 'Completed' || order.status === 'Cancelled';
  if (isCompleted) {
    return null;
  }

  const waitingCounterparty = isSellerView
    ? order.status === 'SellerConfirmed'
    : order.status === 'BuyerConfirmed';

  const canConfirm = isSellerView
    ? order.status === 'Pending' || order.status === 'BuyerConfirmed'
    : order.status === 'Pending' || order.status === 'SellerConfirmed';

  const escrowStatus = getEscrowStatus(order);
  const escrowBlocked = ESCROW_BLOCKED_STATUSES.includes(escrowStatus);
  const escrowStatusLabel =
    {
      FAILED: 'thất bại',
      QUEUED: 'đang xếp hàng',
      PROCESSING: 'đang xử lý',
      PENDING: 'đang khởi tạo',
      LOCKED: 'đang khóa',
    }[escrowStatus] || 'chưa sẵn sàng';

  if (!canConfirm && !waitingCounterparty) {
    return null;
  }

  const actionLabel = isSellerView
    ? order.status === 'BuyerConfirmed'
      ? 'Hoàn tất giao dịch'
      : 'Xác nhận đã giao hàng'
    : order.status === 'SellerConfirmed'
    ? 'Tôi đã nhận hàng'
    : 'Xác nhận đã thanh toán';

  return (
    <div className="pt-2 border-t border-primary/10 mt-3 flex flex-col gap-2">
      {canConfirm && (
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-primary/90 disabled:opacity-70"
          onClick={() =>
            isSellerView ? onSellerConfirm?.(order) : onBuyerConfirm?.(order)
          }
          disabled={actionOrderId === order.orderId || escrowBlocked}
        >
          {actionOrderId === order.orderId ? (
            <span className="flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" /> Đang xử lý...
            </span>
          ) : (
            actionLabel
          )}
        </button>
      )}
      {escrowBlocked && (
        <p className="text-xs text-rose-600">
          Escrow HScoin {escrowStatusLabel}. Vui lòng Thử lại/Hủy đơn hoặc Kiểm tra TxHash trước khi xác nhận.
        </p>
      )}
      {waitingCounterparty && (
        <p className="text-xs text-amber-600">
          {isSellerView
            ? 'Bạn đã xác nhận. Đang chờ người mua hoàn tất.'
            : 'Bạn đã xác nhận. Đang chờ người bán.'}
        </p>
      )}
    </div>
  );
}
