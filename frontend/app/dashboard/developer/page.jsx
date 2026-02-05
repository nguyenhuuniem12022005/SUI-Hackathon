'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { GitBranch, Globe, Key, BarChart2, ShieldCheck, Loader2, Copy } from 'lucide-react';
import { fetchDeveloperApps, registerDeveloperApp, fetchDeveloperMetrics } from '../../../lib/api';

const formatNumber = (value) => new Intl.NumberFormat('vi-VN').format(value);

export default function DeveloperPortalPage() {
  const [apps, setApps] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formValues, setFormValues] = useState({
    name: '',
    origins: '',
    quota: 1000,
  });
  const [submitting, setSubmitting] = useState(false);
  const [formFeedback, setFormFeedback] = useState('');
  const [copiedKey, setCopiedKey] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [appsData, metricsData] = await Promise.all([
          fetchDeveloperApps(),
          fetchDeveloperMetrics(),
        ]);
        setApps(appsData || []);
        setMetrics(metricsData || null);
      } catch (err) {
        setError(err.message || 'Không thể tải dữ liệu developer.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleCopyKey = async (apiKey) => {
    if (!apiKey || typeof navigator === 'undefined') return;
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopiedKey(apiKey);
      setTimeout(() => setCopiedKey(''), 2000);
    } catch {
      setCopiedKey('');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormFeedback('');
    const originsArray = formValues.origins
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    if (originsArray.length === 0) {
      setFormFeedback('Vui lòng nhập ít nhất một origin hợp lệ.');
      return;
    }

    try {
      setSubmitting(true);
      const newApp = await registerDeveloperApp({
        name: formValues.name,
        quota: Number(formValues.quota) || 1000,
        origins: originsArray,
      });
      setApps((prev) => [newApp, ...prev]);
      setFormValues({ name: '', origins: '', quota: 1000 });
      setFormFeedback('Đăng ký ứng dụng thành công!');
    } catch (err) {
      setFormFeedback(err.message || 'Không thể đăng ký ứng dụng.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm text-indigo-600 font-semibold">HScoin Developer Center</p>
        <h1 className="text-2xl font-bold">Quản lý ứng dụng &amp; API key</h1>
        <p className="text-sm text-gray-600">
          Trước khi kết nối trực tiếp blockchain, hãy chuẩn hóa origin, quota và quy trình cấp khoá để đội dev và đối tác kiểm soát được lưu lượng.
        </p>
      </header>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <Card>
        <CardHeader className="flex items-center gap-2 text-indigo-600">
          <GitBranch size={18} />
          <span className="font-semibold text-sm uppercase">Ứng dụng đã đăng ký</span>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-sm text-gray-500">Đang tải danh sách ứng dụng…</p>
          ) : (
            apps.map((app) => (
              <div key={app.id} className="border border-gray-100 rounded-lg p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{app.name}</p>
                    <p className="text-xs text-gray-500">ID: {app.id}</p>
                  </div>
                  <span
                    className={`text-xs font-semibold px-3 py-1 rounded-full ${
                      app.status === 'ACTIVE'
                        ? 'bg-emerald-100 text-emerald-700'
                        : app.status === 'TESTING'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {app.status}
                  </span>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-gray-600">
                  <p className="flex items-center gap-2">
                    <Globe size={14} /> Origins:{' '}
                    {app.origins?.length ? app.origins.join(', ') : 'Chưa cấu hình'}
                  </p>
                  <p className="flex items-center gap-2">
                    <ShieldCheck size={14} /> Quota: {formatNumber(app.quota ?? 0)} request/ngày
                  </p>
                </div>
                <div className="mt-3 text-xs text-gray-600">
                  <p className="text-gray-500 uppercase font-semibold">API Key</p>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="rounded bg-gray-100 px-2 py-1 text-gray-800">
                      {app.apiKey || 'Đang tạo...'}
                    </code>
                    {app.apiKey && (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                        onClick={() => handleCopyKey(app.apiKey)}
                      >
                        <Copy size={12} /> Sao chép
                      </button>
                    )}
                    {copiedKey === app.apiKey && <span className="text-emerald-600">✓ Đã sao chép</span>}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary">
                    Xem logs
                  </Button>
                  <Button size="sm" variant="outline">
                    Tạo khóa phụ
                  </Button>
                </div>
              </div>
            ))
          )}

          <form
            onSubmit={handleSubmit}
            className="border-dashed border-2 border-gray-200 rounded-lg p-6 space-y-4"
          >
            <div>
              <p className="font-semibold text-gray-800">Thêm ứng dụng mới</p>
              <p className="text-sm text-gray-500">
                Điền tên app, origin được phép và quota mong muốn. Team P-Market sẽ sync dữ liệu sang HScoin.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                name="name"
                value={formValues.name}
                onChange={handleChange}
                placeholder="Tên ứng dụng"
                required
              />
              <Input
                name="quota"
                type="number"
                min={100}
                value={formValues.quota}
                onChange={handleChange}
                placeholder="Quota / ngày"
              />
            </div>
            <Input
              name="origins"
              value={formValues.origins}
              onChange={handleChange}
              placeholder="https://example.com, https://app.example.com"
              required
            />
            <Button type="submit" disabled={submitting} className="w-full md:w-auto">
              {submitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="animate-spin" size={16} /> Đang gửi…
                </span>
              ) : (
                'Đăng ký ứng dụng'
              )}
            </Button>
            {formFeedback && (
              <p className="text-xs text-indigo-600">{formFeedback}</p>
            )}
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {['escrowTransactions', 'walletRpcCalls', 'smartContractEvents'].map((key) => (
          <Card key={key}>
            <CardHeader className="text-sm font-semibold text-gray-600 flex items-center gap-2">
              <BarChart2 size={16} />
              {key === 'escrowTransactions'
                ? 'Giao dịch escrow'
                : key === 'walletRpcCalls'
                ? 'Gọi API ví'
                : 'Smart contract event'}
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900">
                {metrics ? formatNumber(metrics[key]) : '…'}
              </p>
              {key === 'smartContractEvents' && metrics?.lastDeploymentAt && (
                <p className="text-xs text-gray-500">
                  Lần deploy gần nhất: {new Date(metrics.lastDeploymentAt).toLocaleTimeString('vi-VN')}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex items-center gap-2 text-indigo-600">
          <Key size={18} />
          <span className="font-semibold text-sm uppercase">Kết nối userflow</span>
        </CardHeader>
        <CardContent className="text-sm text-gray-600 space-y-2">
          <p>• Liên kết với luồng <strong>Xác thực &amp; Đăng nhập</strong>: sau khi login thành công, người dùng cấp quyền cho app nội bộ.</p>
          <p>• Liên kết với luồng <strong>Mua bán</strong>: các webhook thông báo trạng thái escrow để app khác theo dõi.</p>
          <p>• Liên kết với luồng <strong>Green Credit</strong>: API giúp truy vấn dữ liệu điểm xanh đã ghi on-chain.</p>
        </CardContent>
      </Card>
    </div>
  );
}
