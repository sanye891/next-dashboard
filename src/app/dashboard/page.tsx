"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from '../../../supabaseClient';
import UserMenu from '../components/UserMenu';
import SalesManager from '../components/SalesManager';
import FileRepository from '../components/FileRepository';
import UserProfile from '../components/UserProfile';
import SalesChart from '../components/SalesChart';

interface User {
  id: string;
  email: string;
  role?: string;
}

// 仪表板选项卡类型
type DashboardTab = 'overview' | 'sales' | 'files' | 'settings'

/**
 * Dashboard页面：销售数据分析平台主页面
 * 集成数据管理、文件库、用户设置等核心功能
 */
export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');

  // 仅已登录用户可访问
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        setUser({ id: user.id, email: user.email ?? "", role: profile?.role });
      } else {
        setUser(null);
        router.push('/login');
      }
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setUser(null);
        router.push('/login');
      }
    });
    return () => {
      listener.subscription.unsubscribe();
    };
  }, [router]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-200 via-purple-100 to-pink-100"><span className="text-xl text-blue-500 animate-pulse">加载中...</span></div>;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">销售数据分析平台</h1>
            </div>
            <div>
              <UserMenu user={{ email: user.email }} role={user.role} />
            </div>
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 导航选项卡 */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              数据总览
            </button>
            <button
              onClick={() => setActiveTab('sales')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'sales'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              销售管理
            </button>
            <button
              onClick={() => setActiveTab('files')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'files'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              销售报告库
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'settings'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              个人设置
            </button>
          </nav>
        </div>

        {/* 总览面板 */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold mb-4">数据总览</h2>
            {/* 只保留销售数据图表，去除导入和最近文件卡片 */}
            <div className="max-w-3xl mx-auto">
              <SalesChart />
            </div>
          </div>
        )}

        {/* 销售管理面板 */}
        {activeTab === 'sales' && (
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-4">销售数据管理</h2>
            <SalesManager />
          </div>
        )}

        {/* 文件库面板 */}
        {activeTab === 'files' && (
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-4">销售报告库</h2>
            <FileRepository />
          </div>
        )}

        {/* 设置面板 */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">系统设置</h2>
            <UserProfile />
          </div>
        )}
      </div>
    </div>
  );
}