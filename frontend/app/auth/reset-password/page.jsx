'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardHeader, CardContent, CardFooter } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import toast from 'react-hot-toast';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { confirmPasswordResetAPI } from '../../../lib/api';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      toast.error('Liên kết không hợp lệ hoặc đã hết hạn.');
      setError('Token không hợp lệ');
    }
  }, [token]);

  const validatePassword = (pwd) => pwd.length >= 6;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validatePassword(password)) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.');
      toast.error('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      toast.error('Mật khẩu xác nhận không khớp.');
      return;
    }

    if (!token) {
      setError('Token không hợp lệ.');
      toast.error('Liên kết không hợp lệ.');
      return;
    }

    setIsLoading(true);
    try {
      await confirmPasswordResetAPI(token, password);
      setIsSuccess(true);
      toast.success('Đặt lại mật khẩu thành công!');
      setTimeout(() => {
        router.push('/');
      }, 2000);
    } catch (error) {
      toast.error(error.message || 'Đã có lỗi xảy ra. Vui lòng thử lại.');
      setError(error.message || 'Không thể đặt lại mật khẩu.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-100">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="items-center text-center p-6">
          <Image src="/ptit-logo.png" alt="PTIT Logo" width={80} height={80} />
          <h2 className="text-2xl font-bold mt-4">Đặt lại mật khẩu</h2>
        </CardHeader>

        {isSuccess ? (
          <CardContent className="p-6 text-center space-y-4">
            <CheckCircle size={48} className="mx-auto text-green-500" />
            <p className="font-semibold text-lg">Đặt lại mật khẩu thành công!</p>
            <p className="text-sm text-gray-600">
              Bạn sẽ được chuyển đến trang đăng nhập trong giây lát...
            </p>
          </CardContent>
        ) : error && !token ? (
          <CardContent className="p-6 text-center space-y-4">
            <XCircle size={48} className="mx-auto text-red-500" />
            <p className="font-semibold text-lg">Liên kết không hợp lệ</p>
            <p className="text-sm text-gray-600">
              Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.
            </p>
            <Link href="/forgot-password">
              <Button variant="primary" className="mt-4">
                Yêu cầu link mới
              </Button>
            </Link>
          </CardContent>
        ) : (
          <form onSubmit={handleSubmit}>
            <CardContent className="p-6 space-y-4">
              <p className="text-sm text-gray-600 text-center">
                Nhập mật khẩu mới của bạn bên dưới.
              </p>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Mật khẩu mới
                </label>
                <Input
                  type="password"
                  id="password"
                  name="password"
                  placeholder="Nhập mật khẩu mới (ít nhất 6 ký tự)..."
                  className={`mt-1 ${error ? 'border-red-500' : ''}`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Xác nhận mật khẩu
                </label>
                <Input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  placeholder="Nhập lại mật khẩu mới..."
                  className={`mt-1 ${error ? 'border-red-500' : ''}`}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              {error && <p className="text-xs text-red-600 text-center">{error}</p>}
            </CardContent>

            <CardFooter className="flex flex-col gap-4 px-6 pb-6">
              <Button type="submit" className="w-full" variant="primary" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin mr-2" size={18} /> : null}
                {isLoading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
              </Button>
              <Link href="/">
                <Button type="button" variant="link" className="w-full">
                  Quay lại đăng nhập
                </Button>
              </Link>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}
