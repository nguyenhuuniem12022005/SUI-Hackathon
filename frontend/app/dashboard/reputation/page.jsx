'use client';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Shield, Info, Sparkles } from 'lucide-react';
import { getUserDashboard, fetchReputationLedger } from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';

export default function ReputationPage() {
  const { token } = useAuth();
  const [reputation, setReputation] = useState(0);
  const [ledger, setLedger] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    (async () => {
      try {
        const data = await getUserDashboard(token);
        setReputation(data?.reputation ?? 0);
        const history = await fetchReputationLedger();
        setLedger(history || []);
      } catch (err) {
        toast.error('Không tải được điểm uy tín.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [token]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Điểm uy tín</h1>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-4 justify-center">
            <Shield size={40} className="text-blue-600" />
            <div>
              <p className="text-sm text-gray-600">Điểm uy tín hiện tại</p>
              <p className="text-3xl font-bold">{isLoading ? '...' : reputation}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Info size={20}/> Cách tính điểm uy tín</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-700">
          <p>✅ <strong>+5 điểm:</strong> Mỗi giao dịch escrow hoàn tất (cả người mua và người bán).</p>
          <p>❌ <strong>-5 điểm:</strong> Người bán nhận review &le; 2 sao.</p>
          <p>❌ <strong>-10 điểm:</strong> Người mua review sai sự thật / không thuộc đơn.</p>
          <p className="mt-4 font-semibold">⚠️ Cần tối thiểu 65 điểm để mua/bán sản phẩm.</p>
        </CardContent>
      </Card>

      {ledger.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Sparkles size={18}/> Lịch sử cộng/trừ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-700">
            {ledger.map((item) => (
              <div key={item.logId} className="flex items-center justify-between border-b border-gray-100 py-2 last:border-b-0">
                <div>
                  <p className="font-semibold">{item.type}</p>
                  {item.reason && <p className="text-xs text-gray-500">{item.reason}</p>}
                  <p className="text-xs text-gray-500">
                    {item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className={item.deltaReputation >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                    {item.deltaReputation >= 0 ? '+' : ''}{item.deltaReputation} điểm
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
