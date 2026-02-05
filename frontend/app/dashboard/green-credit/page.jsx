'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardHeader, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Sprout, Award, ShieldCheck, TrendingUp, Loader2, Sparkles } from 'lucide-react';
import { fetchGreenCreditSummary, requestGreenCreditSync, convertGreenCredit, redeemGreenBadge } from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';

const formatNumber = (value) => new Intl.NumberFormat('vi-VN').format(value);
const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
      })
    : 'Chưa có dữ liệu';

export default function GreenCreditPage() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncState, setSyncState] = useState({ status: 'idle', message: '' });
  const [error, setError] = useState('');
  const [convertAmount, setConvertAmount] = useState('5');
  const [actionState, setActionState] = useState({ status: 'idle', message: '' });
  const { user, setUser } = useAuth();
  const [hasBadge, setHasBadge] = useState(Boolean(user?.greenBadgeLevel > 0));

  const updateUserFromSummary = useCallback((data) => {
    if (!data || !setUser) return;
    const incomingBadge = Number(data.greenBadgeLevel ?? data.hasGreenBadge ?? 0);
    const badgeLevel = incomingBadge > 0 ? incomingBadge : (hasBadge ? 1 : Number(user?.greenBadgeLevel || 0));
    const greenCredit = Number(data.score ?? user?.greenCredit ?? 0);
    if (badgeLevel > 0) setHasBadge(true);
    const merged = {
      ...(user || {}),
      greenBadgeLevel: badgeLevel,
      greenCredit,
    };
    setUser(merged);
    if (typeof window !== 'undefined') {
      localStorage.setItem('pmarket_user', JSON.stringify(merged));
    }
  }, [setUser, user, hasBadge]);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchGreenCreditSummary();
        const incomingBadge = Number(data?.greenBadgeLevel ?? data?.hasGreenBadge ?? 0);
        const patched =
          incomingBadge > 0 || !(hasBadge || user?.greenBadgeLevel > 0)
            ? data
            : { ...(data || {}), greenBadgeLevel: user?.greenBadgeLevel || 1, hasGreenBadge: true };
        if (patched?.greenBadgeLevel > 0 || patched?.hasGreenBadge) setHasBadge(true);
        setSummary(patched);
        updateUserFromSummary(patched);
      } catch (err) {
        setError(err.message || 'Không thể tải dữ liệu green credit.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [updateUserFromSummary, user?.greenBadgeLevel, hasBadge]);

  const handleSync = async () => {
    try {
      setSyncState({ status: 'loading', message: '' });
      const response = await requestGreenCreditSync('Manual sync from dashboard');
      setSyncState({
        status: 'success',
        message: `Đã xếp lịch ghi on-chain vào ${formatDateTime(response?.scheduledFor)}`,
      });
    } catch (err) {
      setSyncState({ status: 'error', message: err.message || 'Không thể gửi yêu cầu.' });
    }
  };

  const handleConvert = async () => {
    const amount = Number(convertAmount || 0);
    if (!amount || amount <= 0) {
      setActionState({ status: 'error', message: 'Số điểm phải lớn hơn 0' });
      return;
    }
    try {
      setActionState({ status: 'loading', message: '' });
      await convertGreenCredit(amount);
      setActionState({ status: 'success', message: `Đã đổi ${amount} Green Credit sang uy tín.` });
      const data = await fetchGreenCreditSummary();
      setSummary(data);
      updateUserFromSummary(data);
    } catch (err) {
      setActionState({ status: 'error', message: err.message || 'Không thể đổi điểm.' });
    }
  };

  const handleRedeemBadge = async () => {
    try {
      setActionState({ status: 'loading', message: '' });
      await redeemGreenBadge();
      setActionState({ status: 'success', message: 'Đã đổi huy hiệu xanh (tốn 20 Green Credit).' });
      const data = await fetchGreenCreditSummary();
      // fallback: nếu API chưa trả field badge, set thủ công
      const patched = { ...(data || {}), greenBadgeLevel: data?.greenBadgeLevel ?? 1, hasGreenBadge: true };
      setSummary(patched);
      setHasBadge(true);
      updateUserFromSummary(patched);
    } catch (err) {
      setActionState({ status: 'error', message: err.message || 'Không thể đổi huy hiệu.' });
    }
  };

  const perks = summary?.perks || [];
  const audits = summary?.audits || [];
  const contributions = summary?.contributions || [];
  const showBadge =
    hasBadge ||
    Number(summary?.greenBadgeLevel ?? summary?.hasGreenBadge ?? user?.greenBadgeLevel ?? 0) > 0;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm text-emerald-600 font-semibold">P-Market → Blockchain readiness</p>
        <h1 className="text-2xl font-bold">Green Credit &amp; Bền vững</h1>
        <p className="text-sm text-gray-600">
          Điểm xanh của bạn sẽ được đồng bộ sang HScoin để làm bằng chứng minh bạch khi tham gia escrow, staking hay nhận ưu đãi.
        </p>
      </header>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="col-span-1">
          <CardHeader className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-emerald-600">
              <Sprout size={18} />
              <span className="text-sm font-semibold uppercase">Điểm hiện tại</span>
            </div>
            <div>
              <p className="text-4xl font-bold text-gray-900">
                {loading ? '…' : formatNumber(summary?.score ?? 0)}
              </p>
              <p className="text-sm text-gray-600">Hạng: {summary?.tier || 'Đang tải...'}</p>
              <p className="text-xs text-gray-500 mt-1">
                Đồng bộ gần nhất: {formatDateTime(summary?.lastSyncedAt)}
              </p>
              <p className="text-xs text-gray-500">
                Cửa sổ tiếp theo: {formatDateTime(summary?.nextWindow)}
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              onClick={handleSync}
              disabled={syncState.status === 'loading'}
            >
              {syncState.status === 'loading' ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="animate-spin" size={16} /> Đang gửi yêu cầu…
                </span>
              ) : (
                'Đề nghị ghi on-chain'
              )}
            </Button>
            {syncState.message && (
              <p className={`text-xs ${syncState.status === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>
                {syncState.message}
              </p>
            )}
            <div>
              <p className="text-sm font-semibold text-gray-800 mb-2">Ưu đãi sắp mở khóa</p>
              {loading ? (
                <p className="text-sm text-gray-500">Đang tải…</p>
              ) : (
                <ul className="text-sm text-gray-600 space-y-1 list-disc pl-5">
                  {perks.map((perk) => (
                    <li key={perk}>{perk}</li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center gap-2 text-emerald-600">
              <Sparkles size={18} />
              <span className="text-sm font-semibold uppercase">Đổi điểm / Huy hiệu</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-800">Đổi Green Credit → uy tín</p>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  value={convertAmount}
                  onChange={(e) => setConvertAmount(e.target.value)}
                  className="w-24 rounded-md border px-2 py-1 text-sm"
                />
                <Button onClick={handleConvert} disabled={actionState.status === 'loading'}>
                  Đổi sang uy tín
                </Button>
              </div>
              <p className="text-xs text-gray-500">1 Green Credit = 1 điểm uy tín.</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-800">Đổi huy hiệu xanh</p>
              <Button
                variant="secondary"
                onClick={handleRedeemBadge}
                disabled={actionState.status === 'loading'}
              >
                Nhận huy hiệu (tốn 20 Green Credit)
              </Button>
              <p className="text-xs text-gray-500">Huy hiệu sẽ hiển thị cạnh avatar/tên khi bán hàng.</p>
              <div className={`p-3 rounded-md text-sm ${showBadge ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                <span className="font-semibold flex items-center gap-2">
                  <Sparkles size={14} /> Huy hiệu xanh: {showBadge ? 'Đã có' : 'Chưa có'}
                </span>
                {!showBadge && <p className="text-xs mt-1">Đổi 20 Green Credit để kích hoạt.</p>}
              </div>
            </div>
            {actionState.message && (
              <p className={`text-xs ${actionState.status === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>
                {actionState.message}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex items-center gap-2 text-emerald-600">
            <ShieldCheck size={18} />
            <span className="font-semibold text-sm uppercase">Lộ trình kiểm định</span>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <p className="text-sm text-gray-500">Đang tải audit events…</p>
            ) : (
              audits.map((event) => (
                <div key={event.id} className="border border-emerald-100 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{event.title}</p>
                      <p className="text-sm text-gray-600">{event.detail}</p>
                    </div>
                    <span
                      className={`text-xs font-semibold px-3 py-1 rounded-full ${
                        event.status === 'Approved'
                          ? 'bg-emerald-100 text-emerald-700'
                          : event.status === 'In-progress'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {event.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex items-center gap-2 text-emerald-600">
          <TrendingUp size={18} />
          <span className="font-semibold text-sm uppercase">Hoạt động gần đây</span>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-gray-500">Đang tải log hoạt động…</p>
          ) : (
            contributions.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 border-b border-gray-100 pb-3"
              >
                <div>
                  <p className="font-semibold text-gray-900">{entry.type}</p>
                  <p className="text-xs text-gray-500">Mã theo dõi: {entry.id}</p>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-emerald-600 font-semibold">
                    {entry.carbon > 0 ? `+${entry.carbon}` : `${entry.carbon}`}kg CO₂
                  </span>
                  <span className="text-primary font-semibold">
                    {entry.tokens > 0 ? `+${entry.tokens}` : `${entry.tokens}`} HSC
                  </span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center gap-2 text-emerald-600">
          <Award size={18} />
          <span className="font-semibold text-sm uppercase">Kết nối userflow</span>
        </CardHeader>
        <CardContent className="text-sm text-gray-600 space-y-2">
          <p>• Liên kết với luồng <strong>Đăng bán</strong>: người bán đính kèm chứng nhận ngay khi tạo sản phẩm.</p>
          <p>• Liên kết với luồng <strong>Mua bán</strong>: điểm được cộng sau mỗi đơn escrow hoàn tất.</p>
          <p>• Liên kết với luồng <strong>Green Credit</strong>: dữ liệu ở đây sẽ được đưa lên smart contract HScoin.</p>
        </CardContent>
      </Card>
    </div>
  );
}
