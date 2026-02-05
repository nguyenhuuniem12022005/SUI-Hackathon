"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { 
  useCurrentAccount, 
  useSignPersonalMessage, 
  ConnectButton,
  useDisconnectWallet 
} from "@mysten/dapp-kit";
import { Card, CardHeader, CardContent } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { useAuth } from "../../../context/AuthContext";
import { Wallet, Loader2, Shield, Zap, Globe } from "lucide-react";
import toast from "react-hot-toast";

export default function LoginPage() {
  const router = useRouter();
  const { loginWithWallet, isAuthenticated } = useAuth();
  const currentAccount = useCurrentAccount();
  const { mutateAsync: signMessage } = useSignPersonalMessage();
  const { mutate: disconnect } = useDisconnectWallet();
  
  const [isLoading, setIsLoading] = useState(false);
  const [hasAttemptedLogin, setHasAttemptedLogin] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/home");
    }
  }, [isAuthenticated, router]);

  // Auto-login when wallet connects
  useEffect(() => {
    if (currentAccount && !hasAttemptedLogin && !isAuthenticated) {
      handleWalletLogin();
    }
  }, [currentAccount]);

  const handleWalletLogin = async () => {
    if (!currentAccount) {
      return;
    }

    setIsLoading(true);
    setHasAttemptedLogin(true);
    
    try {
      // Create a message to sign for authentication
      const timestamp = Date.now();
      const message = `Sign in to P-Market\nWallet: ${currentAccount.address}\nTimestamp: ${timestamp}`;
      
      // Sign the message with wallet
      const { signature } = await signMessage({
        message: new TextEncoder().encode(message),
      });

      // Login with wallet
      await loginWithWallet({
        walletAddress: currentAccount.address,
        signature: signature,
        message: message,
        timestamp: timestamp,
      });
      
      toast.success("Đăng nhập thành công!");
      router.push("/home");
    } catch (error) {
      console.error("Wallet login error:", error);
      toast.error(error.message || "Không thể đăng nhập. Vui lòng thử lại.");
      // Reset state so user can try again
      setHasAttemptedLogin(false);
      disconnect();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -left-20 w-60 h-60 bg-purple-500/20 rounded-full blur-3xl animate-[pulse_4s_ease-in-out_infinite]" />
        <div className="absolute bottom-20 right-1/4 w-40 h-40 bg-cyan-500/20 rounded-full blur-2xl animate-[pulse_6s_ease-in-out_infinite]" />
      </div>

      {/* Main Card */}
      <Card className="relative w-full max-w-md bg-gray-900/80 backdrop-blur-xl shadow-2xl rounded-3xl border border-gray-700/50">
        <CardHeader className="flex flex-col items-center justify-center text-center p-8">
          {/* Logo with glow effect */}
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full blur-xl opacity-50 animate-pulse" />
            <div className="relative p-4 bg-gray-800 rounded-2xl shadow-xl border border-gray-700">
              <Image
                src="/logomain.png"
                alt="P-Market Logo"
                width={80}
                height={80}
                className="drop-shadow-lg"
              />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-white tracking-tight">
            P-Market
          </h1>
          <p className="text-gray-400 text-sm mt-2">
            Chợ sinh viên phi tập trung trên SUI Blockchain
          </p>
        </CardHeader>

        <CardContent className="p-8 pt-0">
          {/* Features */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-2">
                <Shield className="w-6 h-6 text-blue-400" />
              </div>
              <span className="text-xs text-gray-400">An toàn</span>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-2">
                <Zap className="w-6 h-6 text-purple-400" />
              </div>
              <span className="text-xs text-gray-400">Nhanh chóng</span>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center mb-2">
                <Globe className="w-6 h-6 text-cyan-400" />
              </div>
              <span className="text-xs text-gray-400">Phi tập trung</span>
            </div>
          </div>

          {/* Connect Wallet Section */}
          <div className="space-y-4">
            {!currentAccount ? (
              <>
                <div className="text-center mb-4">
                  <p className="text-gray-300 text-sm mb-1">
                    Kết nối ví SUI để bắt đầu
                  </p>
                  <p className="text-gray-500 text-xs">
                    Hỗ trợ Sui Wallet, Suiet, Martian và nhiều ví khác
                  </p>
                </div>
                
                {/* SUI Connect Button */}
                <div className="flex justify-center">
                  <ConnectButton 
                    className="!bg-gradient-to-r !from-blue-600 !to-cyan-500 !text-white !font-semibold !py-4 !px-8 !rounded-xl !text-base hover:!scale-105 !transition-transform !shadow-lg !shadow-blue-500/25"
                  />
                </div>
              </>
            ) : (
              <>
                {/* Connected State */}
                <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center">
                      <Wallet className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-400">Ví đã kết nối</p>
                      <p className="text-white font-mono text-sm truncate">
                        {currentAccount.address.slice(0, 10)}...{currentAccount.address.slice(-8)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Sign In Button */}
                <Button
                  onClick={handleWalletLogin}
                  disabled={isLoading}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.02] disabled:opacity-70 disabled:hover:scale-100"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      <span>Đang xác thực...</span>
                    </>
                  ) : (
                    <>
                      <Shield size={20} />
                      <span>Xác thực & Đăng nhập</span>
                    </>
                  )}
                </Button>

                {/* Disconnect option */}
                <button
                  onClick={() => {
                    disconnect();
                    setHasAttemptedLogin(false);
                  }}
                  className="w-full text-center text-gray-500 text-sm hover:text-gray-300 transition-colors"
                >
                  Ngắt kết nối ví
                </button>
              </>
            )}
          </div>

          {/* Info Footer */}
          <div className="mt-8 pt-6 border-t border-gray-700/50">
            <p className="text-center text-gray-500 text-xs">
              Bằng việc kết nối ví, bạn đồng ý với{" "}
              <a href="#" className="text-blue-400 hover:underline">Điều khoản sử dụng</a>
              {" "}và{" "}
              <a href="#" className="text-blue-400 hover:underline">Chính sách bảo mật</a>
            </p>
          </div>

          {/* Network indicator */}
          <div className="mt-4 flex items-center justify-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-gray-500">SUI Testnet</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
