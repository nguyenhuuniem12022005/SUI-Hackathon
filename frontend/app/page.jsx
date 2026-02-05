'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

/**
 * Root page - Redirects to appropriate page based on auth state
 * Web3 Pure Mode: Wallet-based authentication only
 */
export default function RootPage() {
  const router = useRouter();
  const { isAuthenticated, isLoadingInitial } = useAuth();

  useEffect(() => {
    if (!isLoadingInitial) {
      if (isAuthenticated) {
        router.replace('/home');
      } else {
        router.replace('/auth/login');
      }
    }
  }, [isAuthenticated, isLoadingInitial, router]);

  // Loading state while checking auth
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 text-sm">Đang tải...</p>
      </div>
    </div>
  );
}