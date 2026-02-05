/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { fetchPendingProductAudits, reviewProductAudit } from '../../../lib/api';
import { ClipboardCheck, Loader2, ExternalLink } from 'lucide-react';

const currency = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });

export default function AuditCenterPage() {
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchPendingProductAudits();
        setAudits(data || []);
      } catch (err) {
        setError(err.message || 'Không thể tải danh sách kiểm duyệt.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleReview = async (productId, auditId, status) => {
    try {
      setPendingId(auditId);
      const updated = await reviewProductAudit(productId, auditId, {
        status,
        note: `Review qua dashboard (${status})`,
      });
      setAudits((prev) => prev.filter((item) => item.auditId !== auditId));
      toast.success(status === 'APPROVED' ? 'Đã phê duyệt sản phẩm.' : 'Đã từ chối sản phẩm.');
    } catch (err) {
      toast.error(err.message || 'Không thể cập nhật kiểm duyệt.');
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-sm text-rose-600 font-semibold">Flow kiểm duyệt</p>
        <h1 className="text-2xl font-bold">Trung tâm Audit sản phẩm</h1>
        <p className="text-sm text-gray-600">
          Mô phỏng bảng điều khiển của HScoin: xem các yêu cầu kiểm duyệt từ seller, xem tài liệu kèm theo và quyết định
          APPROVE/REJECT trước khi đẩy sản phẩm lên blockchain.
        </p>
      </header>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <Card>
          <CardContent className="p-6 text-sm text-gray-500 flex items-center gap-2">
            <Loader2 className="animate-spin" size={16} /> Đang tải danh sách yêu cầu…
          </CardContent>
        </Card>
      ) : audits.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-gray-500">Không có yêu cầu kiểm duyệt nào.</CardContent>
        </Card>
      ) : (
        audits.map((audit) => (
          <Card key={audit.auditId}>
            <CardHeader className="flex flex-col gap-1">
              <CardTitle className="text-lg">{audit.productName}</CardTitle>
              <p className="text-sm text-gray-500">
                Seller: {audit.sellerName} · {audit.sellerEmail}
              </p>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-600">
              <p>Giá niêm yết: <strong>{currency.format(audit.unitPrice || 0)}</strong></p>
              {audit.note && (
                <p>Ghi chú từ seller: {audit.note}</p>
              )}
              {audit.attachments?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {audit.attachments.map((link) => (
                    <a
                      key={link}
                      href={link}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary font-semibold"
                    >
                      <ExternalLink size={12} /> Tài liệu
                    </a>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={pendingId === audit.auditId}
                  onClick={() => handleReview(audit.productId, audit.auditId, 'APPROVED')}
                >
                  {pendingId === audit.auditId ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="animate-spin" size={14} /> Đang xử lý…
                    </span>
                  ) : (
                    <>
                      <ClipboardCheck size={14} className="mr-1" /> Approve
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pendingId === audit.auditId}
                  onClick={() => handleReview(audit.productId, audit.auditId, 'REJECTED')}
                >
                  Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
