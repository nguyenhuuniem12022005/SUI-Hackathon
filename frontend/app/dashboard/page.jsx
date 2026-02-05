'use client';

import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import Image from 'next/image';
import Link from 'next/link';

import {
  Shield, Gift, UserCircle, MapPin, Phone, CalendarDays,
  Save, KeyRound, Loader2, Camera, Sparkles,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../context/AuthContext';
import {
  uploadUserAvatar,
  updateUserProfile,
  resetPasswordAPI,
  getUserDashboard,
  buildAvatarUrl,
  updateUserDateOfBirth,
  fetchReputationLedger,
  fetchNotifications,
} from '../../lib/api';

const normalizeDateForInput = (value) => {
  if (!value) return '';
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? '' : value.toISOString().slice(0, 10);
  }
  if (typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
      const [d, m, y] = trimmed.split('/');
      return `${y}-${m}-${d}`;
    }
    const d = new Date(trimmed);
    return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
  }
  return '';
};

const normalizeDateOnChange = (value) => {
  if (!value) return '';
  const v = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return '';
  const year = Number(v.slice(0, 4));
  if (year < 1900 || year > 2100) return '';
  return v;
};

// ===================== Dashboard =====================
export default function DashboardPage() {
  const { user, token, setUser } = useAuth();

  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    fullName: user?.fullName || '',
    userName: user?.userName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || '',
    dateOfBirth: normalizeDateForInput(user?.dateOfBirth),
    avatar: buildAvatarUrl(user?.avatar),
  });

  // Track which fields user has manually edited to avoid overwriting them with async fetches
  const touchedFieldsRef = useRef({});

  const [reputationLedger, setReputationLedger] = useState([]);
  const [notifications, setNotifications] = useState([]);

  const [passwordFields, setPasswordFields] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState('');

  // ===================== Load Dashboard =====================
  useEffect(() => {
    if (user) {
      setProfileData(prev => ({
        ...prev,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        fullName: user.fullName || '',
        userName: touchedFieldsRef.current.userName ? prev.userName : (user.userName || ''),
        email: user.email || '',
        phone: touchedFieldsRef.current.phone ? prev.phone : (user.phone || ''),
        address: touchedFieldsRef.current.address ? prev.address : (user.address || ''),
        dateOfBirth: touchedFieldsRef.current.dateOfBirth
          ? prev.dateOfBirth
          : normalizeDateForInput(user.dateOfBirth),
        avatar: buildAvatarUrl(user.avatar),
      }));
    }

    if (user && token) {
      (async () => {
        try {
          const apiData = await getUserDashboard(token);
          if (apiData) {
            setDashboardData(apiData);
            setProfileData(prev => ({
              ...prev,
              phone: touchedFieldsRef.current.phone ? prev.phone : (apiData.phone ?? prev.phone),
              address: touchedFieldsRef.current.address ? prev.address : (apiData.address ?? prev.address),
              dateOfBirth: touchedFieldsRef.current.dateOfBirth
                ? prev.dateOfBirth
                : normalizeDateForInput(apiData.dateOfBirth ?? prev.dateOfBirth),
            }));
            // Cập nhật user trong context/localStorage để hiển thị huy hiệu xanh, điểm mới
            const badgeLevel = apiData.greenBadgeLevel;
            const finalBadge =
              badgeLevel && Number(badgeLevel) > 0
                ? Number(badgeLevel)
                : Number(user?.greenBadgeLevel || 0);

            const mergedUser = {
              ...(user || {}),
              reputation: apiData.reputation ?? user?.reputation,
              greenCredit: apiData.greenCredit ?? user?.greenCredit,
              greenBadgeLevel: finalBadge,
              avatar: buildAvatarUrl(apiData.avatar || user?.avatar),
            };
            localStorage.setItem('pmarket_user', JSON.stringify(mergedUser));
            if (setUser) setUser(mergedUser);
          }
          const ledger = await fetchReputationLedger();
          setReputationLedger(ledger);
          try {
            const noti = await fetchNotifications();
            setNotifications(noti || []);
          } catch (err) {
            // ignore
          }
        } catch (error) {
          toast.error('Không thể tải dữ liệu Dashboard.');
        } finally {
          setIsLoading(false);
        }
      })();
    } else setIsLoading(false);
  }, [user, token, setUser]);

  // ===================== Handlers =====================
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    touchedFieldsRef.current[name] = true;
    if (name === 'firstName' || name === 'lastName') {
      const newFirstName = name === 'firstName' ? value : profileData.firstName;
      const newLastName = name === 'lastName' ? value : profileData.lastName;
      setProfileData(prev => ({
        ...prev,
        [name]: value,
        fullName: `${newFirstName} ${newLastName}`.trim(),
      }));
    } else if (name === 'dateOfBirth') {
      setProfileData(prev => ({ ...prev, [name]: normalizeDateOnChange(value) }));
    } else {
      setProfileData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      await updateUserProfile({
        userName: profileData.userName,
        phone: profileData.phone,
        address: profileData.address,
      });

      if (profileData.dateOfBirth) {
        await updateUserDateOfBirth(profileData.dateOfBirth);
      }

      const updatedUser = { ...user, ...profileData };
      localStorage.setItem('pmarket_user', JSON.stringify(updatedUser));
      if (setUser) setUser(updatedUser);

      toast.success('Cập nhật hồ sơ thành công!');
    } catch (error) {
      toast.error(error.message || 'Không thể cập nhật hồ sơ.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const result = await uploadUserAvatar(file, token);
      const rawAvatarPath =
        result?.avatarUrl ||
        result?.imagePath ||
        result?.data?.avatar ||
        result?.avatar ||
        profileData.avatar;

      const cacheBustedPath = `${rawAvatarPath}${rawAvatarPath.includes('?') ? '&' : '?'}ts=${Date.now()}`;
      const freshAvatarUrl = buildAvatarUrl(cacheBustedPath);

      setProfileData(prev => ({ ...prev, avatar: freshAvatarUrl }));

      const updatedUser = { ...user, avatar: cacheBustedPath };
      localStorage.setItem('pmarket_user', JSON.stringify(updatedUser));
      if (setUser) setUser(updatedUser);

      toast.success('Cập nhật ảnh đại diện thành công!');
    } catch (error) {
      toast.error(error.message || 'Tải ảnh thất bại.');
    } finally {
      setIsUploading(false);
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordFields(prev => ({ ...prev, [name]: value }));
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    if (passwordFields.newPassword !== passwordFields.confirmPassword) {
      setPasswordError('Mật khẩu mới không khớp.');
      toast.error('Mật khẩu mới không khớp.');
      return;
    }
    if (passwordFields.newPassword.length < 6) {
      setPasswordError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      toast.error('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await resetPasswordAPI({
        currentPassword: passwordFields.currentPassword,
        newPassword: passwordFields.newPassword,
      });
      toast.success(res.message || 'Đổi mật khẩu thành công!');
      setPasswordFields({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      setPasswordError(error.message || 'Đổi mật khẩu thất bại.');
      toast.error(error.message || 'Đổi mật khẩu thất bại!');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // ===================== Render =====================
  if (isLoading || !user) {
    return (
      <div className="text-center py-10">
        <p>{!user ? 'Vui lòng đăng nhập.' : 'Đang tải hồ sơ...'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Trang cá nhân</h1>

      {/* Hồ sơ cá nhân */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCircle size={24} /> Hồ sơ cá nhân
          </CardTitle>
        </CardHeader>
        <form onSubmit={handleSaveProfile}>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center gap-4 border-b pb-4">
              <div className="relative w-16 h-16">
                <Image
                  src={profileData.avatar}
                  alt="User Avatar"
                  fill
                  className="rounded-full object-cover"
                  sizes="64px"
                />
                {(dashboardData?.greenBadgeLevel > 0 || user?.greenBadgeLevel > 0) && (
                  <span className="absolute -bottom-1 -right-1 flex items-center gap-1 rounded-full bg-emerald-600 text-white text-[10px] px-2 py-0.5">
                    <Sparkles size={12} /> Xanh
                  </span>
                )}
              </div>
              <label className="relative cursor-pointer bg-gray-200 hover:bg-gray-300 transition px-3 py-1 rounded-md text-gray-700 flex items-center gap-1">
                <Camera size={16} /> {isUploading ? 'Đang tải...' : 'Đổi ảnh'}
                <input
                  type="file"
                  className="hidden"
                  accept="image/jpeg,image/png"
                  onChange={handleAvatarUpload}
                  disabled={isUploading}
                />
              </label>
            </div>

            <p><strong>Họ và Tên:</strong> {profileData.fullName}</p>
            <p><strong>Email:</strong> {profileData.email}</p>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Username</label>
              <Input
                type="text"
                name="userName"
                value={profileData.userName}
                onChange={handleProfileChange}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                <Phone size={16} className="inline mr-1" /> Số điện thoại
              </label>
              <Input
                type="tel"
                name="phone"
                value={profileData.phone}
                onChange={handleProfileChange}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                <MapPin size={16} className="inline mr-1" /> Địa chỉ
              </label>
              <Input
                type="text"
                name="address"
                value={profileData.address}
                onChange={handleProfileChange}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                <CalendarDays size={16} /> Ngày sinh
              </label>
              <Input
                type="date"
                name="dateOfBirth"
                value={profileData.dateOfBirth || ''}
                onChange={handleProfileChange}
                min="1900-01-01"
                max={new Date().toISOString().slice(0, 10)}
                autoComplete="bday"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" size="sm" disabled={isSavingProfile}>
              {isSavingProfile ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {isSavingProfile ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Đổi mật khẩu */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound size={24} /> Đổi mật khẩu
          </CardTitle>
        </CardHeader>
        <form onSubmit={handleChangePassword}>
          <CardContent className="space-y-4">
            <Input
              type="password"
              name="currentPassword"
              placeholder="Mật khẩu cũ"
              value={passwordFields.currentPassword}
              onChange={handlePasswordChange}
              required
            />
            <Input
              type="password"
              name="newPassword"
              placeholder="Mật khẩu mới"
              value={passwordFields.newPassword}
              onChange={handlePasswordChange}
              required
            />
            <Input
              type="password"
              name="confirmPassword"
              placeholder="Xác nhận mật khẩu mới"
              value={passwordFields.confirmPassword}
              onChange={handlePasswordChange}
              required
            />
            {passwordError && (
              <p className="text-sm text-red-600 text-center">{passwordError}</p>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" variant="secondary" disabled={isChangingPassword}>
              {isChangingPassword ? <Loader2 size={16} className="animate-spin mr-1" /> : null}
              {isChangingPassword ? 'Đang xử lý...' : 'Đổi mật khẩu'}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Tổng quan + Điều chỉnh điểm */}
      {dashboardData && (
        <Card>
          <CardHeader>
            <CardTitle>Tổng quan</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg flex flex-col gap-3">
              <div className="flex items-center gap-4">
                <Shield size={40} className="text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Điểm uy tín</p>
                  <p className="text-3xl font-bold">{dashboardData.reputation}</p>
                </div>
              </div>
              <p className="text-xs text-gray-600">
                Điểm được cộng khi mua/bán hoàn tất. Cần &ge; 65 để mua/bán.
              </p>
              <Link href="/dashboard/reputation" className="text-blue-600 text-sm hover:underline">
                Xem chi tiết
              </Link>
            </div>

            <div className="p-6 bg-green-50 border border-green-200 rounded-lg flex flex-col gap-3">
              <div className="flex items-center gap-4">
                <Gift size={40} className="text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Green Credit</p>
                  <p className="text-3xl font-bold">{dashboardData.greenCredit}</p>
                </div>
              </div>
              <p className="text-xs text-gray-600">
                Nhận khi bán hành động xanh được xác nhận. Có thể đổi sang uy tín hoặc huy hiệu xanh.
              </p>
              <Link href="/dashboard/green-credit" className="text-green-700 text-sm hover:underline">
                Đổi điểm / nhận huy hiệu
              </Link>
            </div>

            <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <Sparkles size={32} className="text-yellow-600" />
                <div>
                  <p className="text-sm text-gray-700">Huy hiệu xanh</p>
                  <p className="text-xl font-semibold">
                    {dashboardData.greenBadgeLevel > 0 ? 'Đã kích hoạt' : 'Chưa có'}
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-600">
                Huy hiệu hiển thị cạnh avatar/tên cửa hàng sau khi đổi 20 Green Credit.
              </p>
              <Link href="/dashboard/green-credit" className="text-yellow-700 text-sm hover:underline">
                Nhận huy hiệu
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {reputationLedger.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Lịch sử điểm uy tín / Green Credit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-700">
            {reputationLedger.map((entry) => (
              <div
                key={entry.logId}
                className="flex items-center justify-between border-b border-gray-100 py-2 last:border-b-0"
              >
                <div>
                  <p className="font-semibold">{entry.type}</p>
                  <p className="text-xs text-gray-500">
                    {entry.createdAt ? new Date(entry.createdAt).toLocaleString('vi-VN') : ''}
                  </p>
                  {entry.reason && <p className="text-xs text-gray-500">{entry.reason}</p>}
                </div>
                <div className="text-right text-sm">
                  <p className={entry.deltaReputation >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                    Uy tín: {entry.deltaReputation > 0 ? '+' : ''}{entry.deltaReputation}
                  </p>
                  <p className={entry.deltaGreen >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                    Green: {entry.deltaGreen > 0 ? '+' : ''}{entry.deltaGreen}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {notifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Thông báo mới</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-700">
            {notifications.map((n) => (
              <div
                key={n.notificationId || n.createdAt}
                className="flex items-center justify-between border-b border-gray-100 py-2 last:border-b-0"
              >
                <div>
                  <p className="font-semibold">{n.content}</p>
                  <p className="text-xs text-gray-500">
                    {n.createdAt ? new Date(n.createdAt).toLocaleString('vi-VN') : ''}
                  </p>
                </div>
                {!n.isRead && <span className="text-[10px] px-2 py-1 rounded-full bg-primary text-white">Mới</span>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
