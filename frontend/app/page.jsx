'use client';
import { useState } from 'react';
import AuthForm from '../components/auth/AuthForm'; // Kiểm tra lại đường dẫn
import { useAuth } from '../context/AuthContext'; // Kiểm tra lại đường dẫn
import toast from 'react-hot-toast';

export default function LoginPage() {
    const { login } = useAuth(); 
    const [isLoading, setIsLoading] = useState(false);

    const handleLoginSubmit = async (formData) => { 
        console.log('🔄 [page.jsx] Nhận formData:', formData);
        
        if (!formData || !formData.email || !formData.password) {
            toast.error('Dữ liệu form không hợp lệ');
            return;
        }

        setIsLoading(true);
        try {
            console.log('📤 [page.jsx] Gọi login() với formData:', formData);
            await login(formData); // <-- Truyền 1 đối tượng formData
        } catch (error) {
            console.error('❌ [page.jsx] Login failed:', error);
            setIsLoading(false);
            // Lỗi đã được toast trong AuthContext
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <AuthForm
                    formType="login"
                    onSubmit={handleLoginSubmit}
                    isLoading={isLoading}
                />
            </div>
        </div>
    );
}