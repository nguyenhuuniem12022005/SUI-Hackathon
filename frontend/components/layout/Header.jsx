'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Container } from '../ui/Container';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import {
  Search,
  ShoppingCart,
  Bell,
  Wallet,
  PlusSquare,
  LogOut,
  Slash,
} from 'lucide-react';
import { useWallet } from '../../context/WalletContext';
import { useAuth } from '../../context/AuthContext'; // ? import AuthContext
import { useCart } from '../../context/CartContext';
import { buildAvatarUrl } from '../../lib/api';
import { resolveProductImage } from '../../lib/image';
import { fetchNotifications, markNotificationsRead } from '../../lib/api';
import dynamic from 'next/dynamic';

const ChatWidget = dynamic(() => import('../chat/ChatWidget'), { ssr: false });

const FALLBACK_PRODUCT_IMAGE = 'https://placehold.co/80x60?text=P-Market';

export default function Header() {
  const router = useRouter();
  const { isConnected, walletAddress, connectWallet, disconnectWallet, isLoadingWallet } = useWallet();
  const { user, isAuthenticated, logout } = useAuth(); // ✅ lấy user từ context
  const { cartItems = [] } = useCart();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [isNotiLoading, setIsNotiLoading] = useState(false);

  // X? l? t?m ki?m
  const handleSearch = () => {
    if (searchTerm.trim()) {
      router.push("/category/all?q=" + encodeURIComponent(searchTerm));
      setSearchTerm('');
    }
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // ? T�n & Avatar ng�?i d�ng
  const userName = user?.fullName || user?.userName || 'Kh�ch';
  const userAvatarUrl = buildAvatarUrl(user?.avatar);

  // ? S? l�?ng th�ng b�o v� gi? h�ng
  const notificationCount = notifications.filter((n) => !n.read).length;
  const cartCount = cartItems.reduce((sum, item) => sum + (item?.quantity || 1), 0);

  // ? H�m x? l? ��ng xu?t
  const handleLogout = async () => {
    await logout(); // clear user + token
    router.push('/'); // quay l?i trang ��ng nh?p
  };

  // fetch notifications when dropdown opened first time
  useEffect(() => {
    async function loadNotifications() {
      if (!isAuthenticated || isNotiLoading || notifications.length) return;
      setIsNotiLoading(true);
      try {
        const data = await fetchNotifications({ limit: 20 });
        setNotifications(
          (data || []).map((item) => ({
            id: item.notificationId || item.id,
            text: item.content || 'Thông báo',
            time: item.createdAt || '',
            read: Boolean(item.isRead),
            link: item.relatedId ? `/orders/${item.relatedId}` : '#',
          }))
        );
      } finally {
        setIsNotiLoading(false);
      }
    }
    if (isNotificationOpen) {
      loadNotifications();
    }
  }, [isNotificationOpen, isAuthenticated, isNotiLoading, notifications.length]);

  // mark read when open and has unread
  useEffect(() => {
    async function markRead() {
      const unreadIds = notifications.filter((n) => !n.read && n.id).map((n) => n.id);
      if (!unreadIds.length) return;
      await markNotificationsRead(unreadIds).catch(() => {});
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
    if (isNotificationOpen && notifications.some((n) => !n.read)) {
      markRead();
    }
  }, [isNotificationOpen, notifications]);

  return (
    <>
    <header className="bg-primary text-white shadow-md sticky top-0 z-50">
      <Container>
        <div className="flex justify-between items-center h-16 gap-4">
          {/* --- LOGO --- */}
          <div className="flex-shrink-0 flex items-center gap-2">
            <Link href="/home" className="flex items-center gap-2">
              <Image
                src="/logo-home.png"
                alt="P-Market Logo"
                width={150}
                height={50}
                className="rounded-md"
              />
            </Link>
          </div>

          {/* --- � T?M KI?M --- */}
          <div className="flex-grow max-w-2xl hidden md:flex items-center relative">
            <Input
              type="text"
              placeholder="Tìm kiếm tại P-Market theo tên người bán/sản phẩm..."
              className="w-full pr-14 text-black"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
            <Button
              variant="primary"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2" onClick={handleSearch}
            >
              <Search size={20} />
            </Button>
          </div>

          {/* --- ICONS & USER --- */}
          <div className="flex-shrink-0 flex items-center gap-1 md:gap-2">
            {/* --- Ví (Wallet) --- */}
            {isConnected ? (
              <div className="hidden lg:flex items-center gap-2 rounded-full bg-primary-hover pl-3 pr-1 py-1 text-xs font-medium">
                <button
                  type="button"
                  onClick={connectWallet}
                  className="inline-flex items-center gap-1"
                  title="Nhấn để thay đổi ví HScoin"
                >
                  <Wallet size={16} />
                  <span>
                    {walletAddress.substring(0, 6)}…
                    {walletAddress.substring(walletAddress.length - 4)}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={disconnectWallet}
                  className="rounded-full p-1 text-white/80 hover:bg-white/20"
                  aria-label="Hủy liên kết ví"
                >
                  <Slash size={14} />
                </button>
              </div>
            ) : (
              <Button
                onClick={connectWallet}
                variant="outline"
                size="sm"
                disabled={isLoadingWallet}
                className="hidden lg:block bg-white text-primary hover:bg-gray-100 border-white font-semibold"
              >
                {isLoadingWallet ? 'Đang tải ví…' : 'Connect Wallet'}
              </Button>
            )}

            {/* --- ��ng s?n ph?m --- */}
            <Link
              href="/products/new"
              className="relative p-2 rounded-full hover:bg-primary-hover"
              aria-label="Đăng sản phẩm mới"
            >
              <PlusSquare />
            </Link>

            {/* --- THÔNG BÁO --- */}
            <div
              className="relative"
              onMouseEnter={() => setIsNotificationOpen(true)}
              onMouseLeave={() => setIsNotificationOpen(false)}
            >
              <Link
                href="/notifications"
                className="relative p-2 rounded-full hover:bg-primary-hover focus:outline-none"
                aria-label="Thông báo"
              >
                <Bell />
                {notificationCount > 0 && (
                  <span className="absolute top-[13px] right-[1px] block h-4 w-4 rounded-full bg-white text-primary text-[10px] font-bold flex items-center justify-center ring-1 ring-primary">
                    {notificationCount}
                  </span>
                )}
              </Link>

              {isNotificationOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg overflow-hidden z-20 text-gray-800">
                  <div className="py-2 px-4 font-semibold border-b">
                    Thông Báo Mới Nhận
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {isNotiLoading && (
                      <div className="px-4 py-3 text-sm text-gray-500">Đang tải...</div>
                    )}
                    {!isNotiLoading && notifications.length === 0 && (
                      <div className="px-4 py-3 text-sm text-gray-500">Chưa có thông báo.</div>
                    )}
                    {!isNotiLoading &&
                      notifications.map((noti) => (
                        <Link
                          key={noti.id}
                          href={noti.link || '#'}
                          className={`block px-4 py-3 hover:bg-gray-100 border-b last:border-b-0 ${
                            !noti.read ? 'bg-blue-50' : ''
                          }`}
                        >
                          <p
                            className={`text-sm ${
                              !noti.read ? 'font-semibold' : ''
                            }`}
                          >
                            {noti.text}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {noti.time
                              ? new Date(noti.time).toLocaleString('vi-VN')
                              : ''}
                          </p>
                        </Link>
                      ))}
                  </div>
                  <div className="py-2 px-4 border-t text-center">
                    <Link
                      href="/notifications"
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      Xem tất cả
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* --- GI? H�NG --- */}
            <div
              className="relative"
              onMouseEnter={() => setIsCartOpen(true)}
              onMouseLeave={() => setIsCartOpen(false)}
            >
              <Link
                href="/cart"
                className="relative p-2 rounded-full hover:bg-primary-hover"
                aria-label="Giỏ hàng"
              >
                <ShoppingCart />
                {cartCount > 0 && (
                  <span className="absolute top-[13px] right-[1px] block h-4 w-4 rounded-full bg-white text-primary text-[10px] font-bold flex items-center justify-center ring-1 ring-primary">
                    {cartCount}
                  </span>
                )}
              </Link>

              {isCartOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg overflow-hidden z-20 text-gray-800">
                  <div className="py-2 px-4 font-semibold border-b">
                    Giỏ Hàng Của Bạn
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {cartItems.length > 0 ? (
                      cartItems.map((item) => {
                        const productLink = `/products/${item.productId || item.id || ''}`;
                        const productName = item.productName || item.title || 'Sản phẩm';
                        const productPrice = Number(item.unitPrice ?? item.price ?? 0);
                        const productImage = resolveProductImage(item, FALLBACK_PRODUCT_IMAGE);

                        return (
                          <div
                            key={item.id ?? item.productId}
                            className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0 hover:bg-gray-100"
                          >
                            <Link href={productLink} className="flex items-center gap-3 flex-1">
                              <Image
                                src={productImage}
                                alt={productName}
                                width={50}
                                height={50}
                                className="rounded-md object-cover"
                              />
                              <div className="flex-1">
                                <p className="text-sm font-medium">{productName}</p>
                                <p className="text-xs text-gray-500">
                                  {(item.quantity || 1)} x{' '}
                                  {productPrice === 0
                                    ? 'Miễn phí'
                                    : `${productPrice.toLocaleString('vi-VN')} ₫`}
                                </p>
                              </div>
                            </Link>
                          </div>
                        );
                      })
                    ) : (
                      <div className="px-4 py-3 text-sm text-gray-500">
                        Giỏ hàng trống.
                      </div>
                    )}
                  </div>
                  <div className="py-2 px-4 border-t text-center">
                    <Link
                      href="/cart"
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      Xem giỏ hàng
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* --- USER & ��NG XU?T --- */}
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard"
                className="hidden md:flex items-center gap-2 cursor-pointer p-1 rounded-full hover:bg-primary-hover"
              >
                <Avatar src={userAvatarUrl} alt={`Avatar c?a ${userName}`} />
                <span className="text-sm font-medium">{userName}</span>
              </Link>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-white hover:bg-primary-hover p-2 h-auto"
                aria-label="Đăng xuất"
              >
                <LogOut size={28} />
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </header>
    <ChatWidget />
    </>
  );
}










