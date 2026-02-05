'use client';

import React, { createContext, useState, useContext, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  loginUser,
  registerUser,
  logoutUser,
  removeAuthToken,
  buildAvatarUrl,
} from '../lib/api';

const AuthContext = createContext();

const getInitialAuth = () => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('pmarket_token');
    const userJson = localStorage.getItem('pmarket_user');
    try {
      const user = userJson ? JSON.parse(userJson) : null;
      if (user && user.avatar) {
        user.avatar = buildAvatarUrl(user.avatar);
      }
      return { token, user };
    } catch {
      return { token: null, user: null };
    }
  }
  return { token: null, user: null };
};

export function AuthProvider({ children }) {
  const initialAuth = getInitialAuth();
  const [user, setUser] = useState(initialAuth.user);
  const [token, setToken] = useState(initialAuth.token);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const router = useRouter();

  useEffect(() => {
    setIsLoadingInitial(false);
  }, []);

  const login = async (formData) => {
    const { email, password } = formData;
    try {
      const data = await loginUser(email, password);
      const apiUser = data.user || {};

      const reputationSource =
        apiUser.reputation ??
        apiUser.reputationScore ??
        apiUser.reputation_score ??
        0;
      const greenCreditSource = apiUser.greenCredit ?? apiUser.green_credit ?? 0;
      const badgeSource = apiUser.greenBadgeLevel ?? apiUser.green_badge_level ?? 0;

      const userData = {
        userId: apiUser.userId,
        firstName: apiUser.firstName || '',
        lastName: apiUser.lastName || '',
        fullName:
          apiUser.fullName ||
          `${apiUser.lastName || ''} ${apiUser.firstName || ''}`.trim() ||
          'Người dùng',
        userName: apiUser.userName || '',
        email,
        phone: apiUser.phone || '',
        address: apiUser.address || '',
        avatar: buildAvatarUrl(apiUser.avatar),
        dateOfBirth: apiUser.dateOfBirth || '',
        reputation: Number(reputationSource) || 0,
        greenCredit: Number(greenCreditSource) || 0,
        greenBadgeLevel: Number(badgeSource) || 0,
      };

      setUser(userData);
      setToken(data.token.access_token);

      localStorage.setItem('pmarket_user', JSON.stringify(userData));
      localStorage.setItem('pmarket_token', data.token.access_token);

      toast.success('Đăng nhập thành công!');
      router.push('/home');
    } catch (error) {
      console.error('[AuthContext] Login Error:', error);
      toast.error(error.message || 'Đăng nhập thất bại.');
      throw error;
    }
  };

  const register = async (formData) => {
    try {
      const data = await registerUser(formData);
      const apiUser = data.user || {};
      const reputationSource =
        apiUser.reputation ??
        apiUser.reputationScore ??
        apiUser.reputation_score ??
        0;
      const greenCreditSource = apiUser.greenCredit ?? apiUser.green_credit ?? 0;
      const badgeSource = apiUser.greenBadgeLevel ?? apiUser.green_badge_level ?? 0;

      const userData = {
        userId: apiUser.userId,
        firstName: apiUser.firstName || '',
        lastName: apiUser.lastName || '',
        fullName:
          apiUser.fullName ||
          `${apiUser.lastName || ''} ${apiUser.firstName || ''}`.trim() ||
          'Người dùng',
        userName: apiUser.userName || '',
        email: formData.email,
        phone: apiUser.phone || '',
        address: apiUser.address || '',
        avatar: buildAvatarUrl(apiUser.avatar),
        reputation: Number(reputationSource) || 0,
        greenCredit: Number(greenCreditSource) || 0,
        greenBadgeLevel: Number(badgeSource) || 0,
      };

      setUser(userData);
      setToken(data.token.access_token);

      localStorage.setItem('pmarket_user', JSON.stringify(userData));
      localStorage.setItem('pmarket_token', data.token.access_token);

      toast.success('Đăng ký thành công!');
      router.push('/home');
    } catch (error) {
      console.error('[AuthContext] Register Error:', error);
      toast.error(error.message || 'Đăng ký thất bại.');
      throw error;
    }
  };

  const logout = async () => {
    if (token) {
      try {
        await logoutUser(token);
      } catch (error) {
        console.warn('⚠️ Lỗi khi gọi API logout:', error);
      }
    }

    setUser(null);
    setToken(null);
    removeAuthToken();
    toast('Đã đăng xuất 👋');
    router.push('/');
  };

  const value = {
    user,
    setUser,
    token,
    isAuthenticated: !!user && !!token,
    login,
    register,
    logout,
    isLoadingInitial,
  };

  if (isLoadingInitial) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Đang tải ứng dụng...</p>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
