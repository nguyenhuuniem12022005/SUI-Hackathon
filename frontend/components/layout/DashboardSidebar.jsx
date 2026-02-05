'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingBag, UserCircle, ClipboardList, Wallet, Leaf, History } from 'lucide-react'; 

// Simplified nav items for SUI Web3 Marketplace
const navItems = [
  { href: '/dashboard', icon: UserCircle, label: 'Tổng quan' },
  { href: '/dashboard/orders', icon: ShoppingBag, label: 'Đơn hàng Escrow' },
  { href: '/dashboard/my-products', icon: ClipboardList, label: 'Sản phẩm của tôi' },
  { href: '/dashboard/wallet', icon: Wallet, label: 'Ví SUI' },
  { href: '/dashboard/green-credit', icon: Leaf, label: 'Green Credit & NFT' },
];

const cn = (...classes) => classes.filter(Boolean).join(' ');

export default function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full md:w-64 bg-white p-4 rounded-lg shadow-sm flex-shrink-0">
      <nav>
        <ul className="space-y-2">
          {navItems.map((item) => {
            // Logic kiểm tra active dựa trên href chính xác hoặc bắt đầu bằng href
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-md transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-gray-700 hover:bg-gray-100'
                  )}
                >
                  <item.icon size={20} />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
