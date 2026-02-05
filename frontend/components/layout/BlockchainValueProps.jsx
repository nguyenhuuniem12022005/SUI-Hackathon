import { ShieldCheck, Wallet, Sprout, GitBranch } from 'lucide-react';
import Link from 'next/link';

const highlights = [
  {
    id: 'escrow',
    title: 'Thanh toán escrow on-chain',
    desc: 'Giữ tiền an toàn trên HScoin cho đến khi đơn hàng hoàn tất. Giảm tranh chấp, tăng niềm tin.',
    icon: ShieldCheck,
    action: {
      label: 'Xem quy trình',
      href: '/dashboard/orders',
    },
  },
  {
    id: 'wallet',
    title: 'Ví HScoin gắn liền',
    desc: 'Đăng nhập là có ví. Người dùng có thể staking, nhận thưởng, và trả phí ngay trong P-Market.',
    icon: Wallet,
    action: {
      label: 'Kết nối ví',
      href: '/dashboard',
    },
  },
  {
    id: 'green',
    title: 'Green Credit minh bạch',
    desc: 'Điểm xanh được ghi nhận, chứng thực và chia sẻ on-chain để tạo ưu đãi cho sản phẩm bền vững.',
    icon: Sprout,
    action: {
      label: 'Khám phá ưu đãi',
      href: '/dashboard/green-credit',
    },
  },
  {
    id: 'api',
    title: 'API mở & quota rõ ràng',
    desc: 'Đăng ký ứng dụng HScoin ngay trong dashboard, theo dõi quota/ngày và mở rộng hệ sinh thái.',
    icon: GitBranch,
    action: {
      label: 'Đăng ký app',
      href: '/dashboard/developer',
    },
  },
];

export default function BlockchainValueProps() {
  return (
    <section className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white border border-emerald-100 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col gap-3 mb-6">
          <p className="text-xs uppercase tracking-widest text-emerald-600">P-Market x HScoin</p>
          <h2 className="text-2xl font-semibold text-gray-900">Vì sao blockchain giúp phiên bản mới tốt hơn</h2>
          <p className="text-sm text-gray-600">
            Các ưu điểm dưới đây kết nối trực tiếp với userflow hiện có: mỗi bước đều có điểm chạm on-chain rõ ràng,
            tạo lợi thế cạnh tranh và lý do để người dùng chọn P-Market.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {highlights.map(({ id, title, desc, icon: Icon, action }) => (
            <article key={id} className="border border-gray-100 rounded-xl p-5 flex flex-col gap-4">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Icon size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                  <p className="text-sm text-gray-600">{desc}</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-emerald-700 font-medium">Sẵn sàng tích hợp</span>
                <Link href={action.href} className="text-primary font-semibold hover:underline">
                  {action.label}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
