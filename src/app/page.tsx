// 首页：欢迎界面
"use client";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-200 via-purple-100 to-pink-100 overflow-hidden">
      {/* 顶部导航栏 - 固定在右上角 */}
      <nav className="fixed top-0 right-0 z-20 p-6">
        <button
          className="px-6 py-2 bg-gradient-to-r from-blue-500 to-pink-500 text-white font-bold rounded-full shadow-lg hover:scale-105 transition"
          onClick={() => router.push('/login')}
        >
          登录
        </button>
      </nav>

      {/* 欢迎卡片 - 确保垂直水平居中 */}
      <div className="w-full max-w-xl backdrop-blur-md bg-white/70 rounded-3xl shadow-2xl px-8 py-12 border border-white/40 z-10 mx-auto">
        {/* LOGO/图标 */}
        <div className="flex justify-center mb-6">
          <svg width="80" height="80" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="32" fill="url(#paint0_linear_1_2)"/>
            <path d="M20 40L32 24L44 40" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
            <defs>
              <linearGradient id="paint0_linear_1_2" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
                <stop stopColor="#6366f1"/>
                <stop offset="1" stopColor="#ec4899"/>
              </linearGradient>
            </defs>
          </svg>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-blue-600 mb-6 text-center drop-shadow">欢迎来到SaaS仪表板</h1>
        <p className="text-base md:text-lg text-gray-700 mb-8 text-center">
          现代化SaaS仪表板解决方案，基于 Next.js 15、Supabase、Tailwind CSS。<br />
          支持用户认证、数据可视化、实时数据、文件管理、权限控制等企业级功能。
        </p>
        <ul className="text-base md:text-lg text-gray-600 space-y-2 mb-8 max-w-md mx-auto">
          <li className="flex items-center">
            <span className="text-green-500 mr-2">✓</span> 用户注册/登录/第三方登录
          </li>
          <li className="flex items-center">
            <span className="text-green-500 mr-2">✓</span> 数据可视化与实时刷新
          </li>
          <li className="flex items-center">
            <span className="text-green-500 mr-2">✓</span> 文件上传与管理
          </li>
          <li className="flex items-center">
            <span className="text-green-500 mr-2">✓</span> 角色权限与安全控制
          </li>
          <li className="flex items-center">
            <span className="text-green-500 mr-2">✓</span> 响应式设计，移动端友好
          </li>
        </ul>
        <div className="flex justify-center">
          <button
            className="px-8 py-3 bg-gradient-to-r from-blue-500 to-pink-500 text-white font-bold rounded-full shadow-lg hover:scale-105 transition text-lg"
            onClick={() => router.push('/login')}
          >
            立即体验
          </button>
        </div>
      </div>

      {/* 底部波浪SVG装饰 */}
      <div className="absolute bottom-0 left-0 w-full z-0 pointer-events-none">
        <svg viewBox="0 0 1440 320" className="w-full h-32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path fill="#a5b4fc" fillOpacity="0.3" d="M0,224L48,197.3C96,171,192,117,288,117.3C384,117,480,171,576,197.3C672,224,768,224,864,197.3C960,171,1056,117,1152,122.7C1248,128,1344,192,1392,224L1440,256L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" />
        </svg>
      </div>
      
      {/* 底部版权信息 */}
      <footer className="absolute bottom-0 w-full text-center text-gray-400 py-4 text-sm z-10">© 2025 SaaS 仪表板演示</footer>
    </main>
  );
}
