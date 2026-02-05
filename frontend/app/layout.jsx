import './globals.css';
import React from 'react';
import { AuthProvider } from '../context/AuthContext';
import { Toaster } from 'react-hot-toast';
import { SuiProviders } from '../components/blockchain/SuiProviders';

export const metadata = {
  title: 'P-Market',
  description: 'Sàn trao đổi sinh viên PTIT - Web3 DApp on SUI',
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body>
        <SuiProviders>
          <AuthProvider>
            {children}
            <Toaster position="top-center" reverseOrder={false} />
          </AuthProvider>
        </SuiProviders>
      </body>
    </html>
  );
}