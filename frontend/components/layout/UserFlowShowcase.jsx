import Link from 'next/link';

const flows = [
  {
    id: 'auth',
    title: '1. Xác thực & đăng nhập',
    summary: 'Quy trình nhiều lớp đảm bảo chỉ tài khoản hợp lệ mới vào được hệ sinh thái P-Market.',
    steps: [
      {
        title: 'Nhập thông tin tài khoản',
        desc: 'Thu thập email/số điện thoại và mật khẩu theo chuẩn bảo mật.',
      },
      {
        title: 'Xác thực OTP/Email',
        desc: 'Gửi mã một lần và yêu cầu xác thực trước khi tạo phiên đăng nhập.',
      },
      {
        title: 'Truy cập dashboard',
        desc: 'Sinh JWT, lưu session và dẫn người dùng vào trung tâm điều khiển.',
      },
    ],
    cta: { label: 'Vào dashboard', href: '/dashboard' },
  },
  {
    id: 'listing',
    title: '2. Đăng bán',
    summary: 'Người bán khai báo sản phẩm, kiểm duyệt chất lượng rồi mới xuất hiện trên chợ.',
    steps: [
      {
        title: 'Tạo hồ sơ sản phẩm',
        desc: 'Nhập nội dung, hình ảnh, chứng từ xanh nếu có.',
      },
      {
        title: 'Kiểm duyệt',
        desc: 'Thuật toán + đội kiểm duyệt đánh giá độ tin cậy.',
      },
      {
        title: 'Niêm yết',
        desc: 'Item đạt chuẩn sẽ hiển thị tại trang chủ, sẵn sàng bán.',
      },
    ],
    cta: { label: 'Quản lý sản phẩm', href: '/dashboard/my-products' },
  },
  {
    id: 'commerce',
    title: '3. Mua bán an toàn',
    summary: 'Luồng giỏ hàng → thanh toán → bàn giao minh bạch, chuẩn bị cho escrow on-chain.',
    steps: [
      {
        title: 'Chọn & đặt hàng',
        desc: 'Giỏ hàng kiểm tra tồn kho và phí vận chuyển.',
      },
      {
        title: 'Thanh toán bảo đảm',
        desc: 'Tạo giao dịch và giữ tiền ở chế độ chờ xác nhận.',
      },
      {
        title: 'Theo dõi & xác nhận',
        desc: 'Tự động thông báo trạng thái, mở khóa khi đơn hoàn tất.',
      },
    ],
    cta: { label: 'Xem đơn escrow', href: '/dashboard/orders' },
  },
  {
    id: 'green-credit',
    title: '4. Green Credit',
    summary: 'Điểm xanh dành cho nhà bán/nhà mua tuân thủ tiêu chí bền vững.',
    steps: [
      {
        title: 'Thu thập dữ liệu xanh',
        desc: 'Nguồn gốc sản phẩm, chứng nhận, hành vi vận chuyển.',
      },
      {
        title: 'Chấm điểm & lưu',
        desc: 'Hệ thống đánh giá và lưu chứng nhận trước khi đẩy on-chain.',
      },
      {
        title: 'Cấp đặc quyền',
        desc: 'Giảm phí, ưu tiên hiển thị và chuẩn bị mapping sang smart contract.',
      },
    ],
    cta: { label: 'Theo dõi điểm xanh', href: '/dashboard/green-credit' },
  },
  {
    id: 'referral',
    title: '5. Thưởng mời bạn bè',
    summary: 'Chương trình referral rõ ràng để nuôi cộng đồng trước khi token hóa.',
    steps: [
      {
        title: 'Chia sẻ mã giới thiệu',
        desc: 'Mã được phát tại dashboard và theo dõi được lượt sử dụng.',
      },
      {
        title: 'Bạn mới hoàn tất bán/mua đầu tiên',
        desc: 'Điều kiện để đảm bảo referral chất lượng.',
      },
      {
        title: 'Thưởng điểm đôi bên',
        desc: 'Điểm thưởng hiện ở ví P-Market và sẽ đồng bộ sang HScoin.',
      },
    ],
    cta: { label: 'Vào trang thưởng', href: '/dashboard/rewards' },
  },
];

export default function UserFlowShowcase() {
  return (
    <section className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-emerald-600">Blueprint trước khi tích hợp blockchain</p>
            <h2 className="text-2xl font-semibold text-gray-900 mt-1">Userflow cốt lõi của P-Market</h2>
            <p className="text-sm text-gray-600 mt-2">
              Các bước bên dưới được chuẩn hóa để dễ dàng đưa lên HScoin (escrow, smart contract, quota API) mà không phải thiết kế lại luồng nghiệp vụ.
            </p>
          </div>
          <Link href="/dashboard" className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700">
            Trải nghiệm dashboard
          </Link>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {flows.map((flow) => (
            <article key={flow.id} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">{flow.title}</h3>
                  <p className="mt-1 text-sm text-gray-600">{flow.summary}</p>
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">
                  Ready
                </span>
              </div>
              <ol className="mt-4 space-y-3">
                {flow.steps.map((step, index) => (
                  <li key={step.title} className="flex items-start gap-3">
                    <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50 text-xs font-bold text-emerald-700">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{step.title}</p>
                      <p className="text-xs text-gray-500">{step.desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
              {flow.cta && (
                <div className="mt-4">
                  <Link
                    href={flow.cta.href}
                    className="inline-flex items-center text-xs font-semibold text-primary hover:underline"
                  >
                    {flow.cta.label}
                  </Link>
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
