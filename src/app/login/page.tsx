"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from '../../../supabaseClient';
import AuthComponent from '../components/Auth';

export default function LoginPage() {
  const router = useRouter();
  // 登录后自动跳转 dashboard
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        router.push('/dashboard');
      }
    });
    return () => {
      listener.subscription.unsubscribe();
    };
  }, [router]);
  return (
    <main className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-200 via-purple-100 to-pink-100 overflow-hidden">
      <div className="flex flex-col items-center justify-center w-full z-10">
        <div className="backdrop-blur-md bg-white/80 rounded-3xl shadow-2xl px-10 py-8 max-w-xl w-full flex flex-col items-center border border-white/40">
          <AuthComponent />
        </div>
      </div>
      {/* 底部波浪SVG装饰 */}
      <div className="absolute bottom-0 left-0 w-full z-0 pointer-events-none">
        <svg viewBox="0 0 1440 320" className="w-full h-32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path fill="#a5b4fc" fillOpacity="0.3" d="M0,224L48,197.3C96,171,192,117,288,117.3C384,117,480,171,576,197.3C672,224,768,224,864,197.3C960,171,1056,117,1152,122.7C1248,128,1344,192,1392,224L1440,256L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" />
        </svg>
      </div>
    </main>
  );
}