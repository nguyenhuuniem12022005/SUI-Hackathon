'use client';
import { useState } from 'react';
import AuthForm from '../../../components/auth/AuthForm';
import { useAuth } from '../../../context/AuthContext';
// import toast from 'react-hot-toast'; // Không cần toast ở đây
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
    const { register } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
     const router = useRouter(); // Có thể không cần nếu AuthContext xử lý redirect

    const handleRegisterSubmit = async (formData) => {
        setIsLoading(true);
        try {
            await register(formData);
            router.push('/'); // Chuyển hướng đến trang đăng nhập sau khi đăng ký thành công
        } catch (error) {

            console.error('Register failed:', error);

            setIsLoading(false); 
        }
    };

    return (
        <AuthForm
            formType="register"
            onSubmit={handleRegisterSubmit}
            isLoading={isLoading}
        />
    );
}