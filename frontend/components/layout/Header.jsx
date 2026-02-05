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
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';
import { useWallet } from '../../context/WalletContext';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { buildAvatarUrl } from '../../lib/api';
import { resolveProductImage } from '../../lib/image';
import { fetchNotifications, markNotificationsRead } from '../../lib/api';
import { useCurrentAccount, useDisconnectWallet } from '@mysten/dapp-kit';
import dynamic from 'next/dynamic';

const ChatWidget = dynamic(() => import('../chat/ChatWidget'), { ssr: false });

const FALLBACK_PRODUCT_IMAGE = 'https://placehold.co/80x60?text=P-Market';

export default function Header() {
  const router = useRouter();
  const { suiBalance, pmtBalance } = useWallet();
  const { user, isAuthenticated, logout } = useAuth();
  const { cartItems = [] } = useCart();
  const currentAccount = useCurrentAccount();
  const { mutate: disconnectSuiWallet } = useDisconnectWallet();
  
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isWalletMenuOpen, setIsWalletMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [isNotiLoading, setIsNotiLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Handle search
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

  // User name & Avatar - prioritize wallet address for Web3
  const walletAddress = currentAccount?.address || user?.walletAddress;
  const shortWallet = walletAddress 
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` 
    : '';
  const userName = user?.fullName || user?.userName || shortWallet || 'User';
  const userAvatarUrl = buildAvatarUrl(user?.avatar);

  // Notification & cart counts
  const notificationCount = notifications.filter((n) => !n.read).length;
  const cartCount = cartItems.reduce((sum, item) => sum + (item?.quantity || 1), 0);

  // Copy wallet address
  const handleCopyAddress = async () => {
    if (walletAddress) {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // View on explorer
  const handleViewExplorer = () => {
    if (walletAddress) {
      window.open(`https://suiscan.xyz/testnet/account/${walletAddress}`, '_blank');
    }
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
            {/* --- SUI Wallet Info --- */}
            {walletAddress && (
              <div 
                className="relative"
                onMouseEnter={() => setIsWalletMenuOpen(true)}
                onMouseLeave={() => setIsWalletMenuOpen(false)}
              >
                <button
                  type="button"
                  className="hidden lg:flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600/80 to-cyan-500/80 pl-3 pr-3 py-1.5 text-xs font-medium hover:from-blue-600 hover:to-cyan-500 transition-all"
                >
                  <Wallet size={16} />
                  <span>{shortWallet}</span>
                </button>

                {/* Wallet Dropdown */}
                {isWalletMenuOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-gray-900 rounded-xl shadow-xl overflow-hidden z-20 border border-gray-700">
                    <div className="p-4 border-b border-gray-700">
                      <p className="text-gray-400 text-xs mb-1">Địa chỉ ví SUI</p>
                      <div className="flex items-center gap-2">
                        <code className="text-white text-xs font-mono flex-1 truncate">
                          {walletAddress}
                        </code>
                        <button
                          onClick={handleCopyAddress}
                          className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors"
                          title="Sao chép địa chỉ"
                        >
                          {copied ? (
                            <Check size={14} className="text-green-400" />
                          ) : (
                            <Copy size={14} className="text-gray-400" />
                          )}
                        </button>
                        <button
                          onClick={handleViewExplorer}
                          className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors"
                          title="Xem trên Explorer"
                        >
                          <ExternalLink size={14} className="text-gray-400" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Balances */}
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-sm">SUI Balance</span>
                        <span className="text-white font-medium">
                          {suiBalance ? `${(Number(suiBalance) / 1e9).toFixed(4)} SUI` : '0 SUI'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-sm">PMT Balance</span>
                        <span className="text-cyan-400 font-medium">
                          {pmtBalance ? `${Number(pmtBalance).toLocaleString()} PMT` : '0 PMT'}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="p-3 border-t border-gray-700 flex gap-2">
                      <Link
                        href="/dashboard/wallet"
                        className="flex-1 text-center py-2 px-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
                      >
                        Quản lý ví
                      </Link>
                      <button
                        onClick={() => {
                          disconnectSuiWallet();
                          logout();
                        }}
                        className="py-2 px-3 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg text-sm font-medium transition-colors"
                      >
                        Ngắt kết nối
                      </button>
                    </div>
                  </div>
                )}
              </div>
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
                href="/dashboard"
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
                      href="/dashboard"
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

            {/* --- USER & LOGOUT --- */}
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard"
                className="hidden md:flex items-center gap-2 cursor-pointer p-1 rounded-full hover:bg-primary-hover"
              >
                <Avatar src={userAvatarUrl} alt={`Avatar của ${userName}`} />
                <span className="text-sm font-medium max-w-[120px] truncate">{userName}</span>
              </Link>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  disconnectSuiWallet();
                  logout();
                }}
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










