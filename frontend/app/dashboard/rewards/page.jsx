'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Gift, Link2, Users, Crown, Loader2, CheckCircle2 } from 'lucide-react';
import { fetchReferralSummary, fetchReferralRewards } from '../../../lib/api';

export default function RewardsPage() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rewardLogs, setRewardLogs] = useState([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [summaryData, rewardData] = await Promise.all([
          fetchReferralSummary(),
          fetchReferralRewards(),
        ]);
        setSummary(summaryData);
        setRewardLogs(rewardData || []);
      } catch (err) {
        setError(err.message || 'Không thể tải dữ liệu referral.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const shareLink = useMemo(() => {
    if (!summary?.referralToken || typeof window === 'undefined') return '';
    return `${window.location.origin}/auth/register?ref=${summary.referralToken}`;
  }, [summary?.referralToken]);

  const referrals = summary?.referrals || [];
  const stats = summary?.stats || { registered: 0, qualified: 0, rewarded: 0 };
  const rewards = summary?.rewards || { reputation: 0, greenCredit: 0, token: 0, total: 0 };

  const handleCopy = async () => {
    if (!shareLink) return;
    await navigator.clipboard.writeText(shareLink);
    toast.success('Đã sao chép link giới thiệu!');
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-sm text-rose-600 font-semibold">Referral &amp; Rewards</p>
        <h1 className="text-2xl font-bold">Thưởng mời bạn bè</h1>
        <p className="text-gray-600 text-sm">
          Chia sẻ mã giới thiệu để bạn bè vào P-Market, hoàn tất giao dịch đầu tiên và nhận thưởng điểm uy tín
          (và token/HScoin khi chương trình on-chain mở). Không tính Green Credit ở luồng referral.
        </p>
      </header>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-lg">Mã giới thiệu của bạn</CardTitle>
            <p className="text-sm text-gray-500">Chia sẻ link bên dưới hoặc nhập mã khi đăng ký.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCopy} disabled={!shareLink || loading}>
              <Link2 size={16} className="mr-2" /> Sao chép link
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="flex items-center gap-2 text-sm text-gray-600">
              <Loader2 className="animate-spin" size={16} /> Đang tải mã giới thiệu...
            </p>
          ) : (
            <>
              <div className="p-4 rounded-lg border border-rose-100 bg-rose-50 flex flex-col gap-1">
                <span className="text-xs uppercase font-semibold text-rose-500">Referral Code</span>
                <p className="text-2xl font-bold tracking-wide text-rose-700">{summary?.referralToken || '---'}</p>
                {shareLink && (
                  <p className="text-sm text-gray-600 break-all">{shareLink}</p>
                )}
              </div>
              {summary?.referredBy && (
                <p className="text-xs text-gray-500">
                  Bạn được giới thiệu bởi{' '}
                  <span className="font-semibold text-gray-700">{summary.referredBy.userName || summary.referredBy.email}</span>
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: 'Đã đăng ký', value: stats.registered, icon: Users, tone: 'text-gray-700' },
          { label: 'Đã đủ điều kiện', value: stats.qualified, icon: CheckCircle2, tone: 'text-green-700' },
          { label: 'Đã nhận thưởng', value: stats.rewarded, icon: Crown, tone: 'text-rose-700' },
        ].map(({ label, value, icon: Icon, tone }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-4 py-5">
              <div className="h-12 w-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
                <Icon size={18} />
              </div>
              <div>
                <p className={`text-2xl font-bold ${tone}`}>{loading ? '…' : value}</p>
                <p className="text-xs uppercase text-gray-500">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lịch sử bạn bè đã tham gia</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-gray-500">Đang tải...</p>
          ) : referrals.length === 0 ? (
            <p className="text-sm text-gray-500">Chưa có referral nào. Hãy chia sẻ mã để bắt đầu!</p>
          ) : (
            referrals.map((item) => (
              <div
                key={item.referralId}
                className="rounded-lg border border-gray-100 p-4 flex flex-col gap-1 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-semibold text-gray-900">{item.userName || 'Người dùng mới'}</p>
                  <p className="text-xs text-gray-500">{item.email}</p>
                </div>
                <div className="text-sm text-gray-600">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      item.status === 'REWARDED'
                        ? 'bg-emerald-100 text-emerald-700'
                        : item.status === 'QUALIFIED'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Điểm thưởng đã ghi nhận</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {[
            { label: 'Điểm uy tín', value: rewards.reputation },
            { label: 'Green Credit (nếu có)', value: rewards.greenCredit },
            { label: 'Token/HScoin', value: rewards.token },
          ].map((reward) => (
            <div key={reward.label} className="rounded-lg border border-gray-100 p-4 text-center">
              <p className="text-sm text-gray-500">{reward.label}</p>
              <p className="text-2xl font-bold text-rose-700">{loading ? '…' : reward.value}</p>
            </div>
          ))}
          <div className="md:col-span-3 text-xs text-gray-500">
            Tổng thưởng: <strong className="text-gray-800">{loading ? '…' : rewards.total}</strong>. 
            Khi hệ thống escrow on-chain sẵn sàng, các log này sẽ được gắn transaction hash từ HScoin.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lịch sử thưởng chi tiết</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-gray-500">Đang tải log thưởng…</p>
          ) : rewardLogs.length === 0 ? (
            <p className="text-sm text-gray-500">Chưa có log thưởng nào.</p>
          ) : (
            rewardLogs.map((log) => (
              <div key={log.rewardId} className="border border-gray-100 rounded-lg p-4 text-sm text-gray-700">
                <p className="font-semibold text-gray-900">
                  {log.rewardType} · +{log.amount}
                </p>
                <p>Referral #{log.referralId}</p>
                {log.note && <p>Ghi chú: {log.note}</p>}
                <p>Thời gian: {new Date(log.createdAt).toLocaleString('vi-VN')}</p>
                {log.txHash && (
                  <p className="font-mono text-xs text-primary">TxHash: {log.txHash}</p>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
