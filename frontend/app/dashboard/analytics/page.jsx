'use client';

import { useEffect, useState } from 'react';
import { fetchSellerRevenue, fetchSellerTopProducts, fetchSellerCompletion } from '../../../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { useAuth } from '../../../context/AuthContext';

function RevenueChart({ data }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
      {data.map((item) => (
        <div key={item.month} className="p-3 rounded border bg-white">
          <p className="text-xs text-gray-500">Tháng {item.month}</p>
          <p className="text-sm font-semibold">{Number(item.revenue || 0).toLocaleString('vi-VN')} đ</p>
          <p className="text-[11px] text-gray-500">{item.orders || 0} đơn</p>
        </div>
      ))}
    </div>
  );
}

function TopProducts({ items }) {
  return (
    <div className="space-y-3">
      {items.map((p) => (
        <div key={p.productId} className="p-3 rounded border bg-white flex justify-between gap-3">
          <div>
            <p className="font-semibold">{p.productName}</p>
            <p className="text-xs text-gray-500">SL: {p.totalQty}</p>
          </div>
          <div className="text-right">
            <p className="font-semibold text-primary">
              {Number(p.totalRevenue || 0).toLocaleString('vi-VN')} đ
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function CompletionWidget({ data }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="p-3 rounded border bg-white">
        <p className="text-xs text-gray-500">Hoàn thành</p>
        <p className="text-lg font-semibold text-emerald-600">{data.completed}</p>
      </div>
      <div className="p-3 rounded border bg-white">
        <p className="text-xs text-gray-500">Hủy</p>
        <p className="text-lg font-semibold text-red-600">{data.cancelled}</p>
      </div>
      <div className="p-3 rounded border bg-white">
        <p className="text-xs text-gray-500">Đang chờ</p>
        <p className="text-lg font-semibold text-amber-600">{data.pending}</p>
      </div>
      <div className="p-3 rounded border bg-white">
        <p className="text-xs text-gray-500">Tỷ lệ hoàn thành</p>
        <p className="text-lg font-semibold">{data.completionRate}%</p>
      </div>
    </div>
  );
}

export default function SellerAnalyticsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [revenue, setRevenue] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [completion, setCompletion] = useState({ completed: 0, cancelled: 0, pending: 0, completionRate: 0 });
  const [year] = useState(new Date().getFullYear());

  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      try {
        const [rev, top, comp] = await Promise.all([
          fetchSellerRevenue(year),
          fetchSellerTopProducts({ limit: 5 }),
          fetchSellerCompletion({})
        ]);
        if (ignore) return;
        setRevenue(rev || []);
        setTopProducts(top || []);
        setCompletion(comp || { completed: 0, cancelled: 0, pending: 0, completionRate: 0 });
      } catch (err) {
        console.error('load analytics error:', err?.message || err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    if (user) load();
    return () => { ignore = true; };
  }, [user, year]);

  if (!user) {
    return (
      <div className="px-4 py-6 max-w-5xl mx-auto">
        <Card><CardContent className="p-4 text-sm text-gray-600">Bạn cần đăng nhập để xem thống kê.</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Thống kê bán hàng</h1>

      {loading ? (
        <p className="text-sm text-gray-500">Đang tải báo cáo...</p>
      ) : (
        <>
          <Card>
            <CardHeader><CardTitle>Doanh thu theo tháng ({year})</CardTitle></CardHeader>
            <CardContent><RevenueChart data={revenue} /></CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Top sản phẩm</CardTitle></CardHeader>
            <CardContent><TopProducts items={topProducts} /></CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Tỷ lệ hoàn thành đơn</CardTitle></CardHeader>
            <CardContent><CompletionWidget data={completion} /></CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
