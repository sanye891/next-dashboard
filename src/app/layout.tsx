import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'SaaS 仪表板 | 现代化企业数据解决方案',
  description: '基于 Next.js 15、Supabase、Tailwind CSS 的现代化SaaS仪表板，支持用户认证、数据可视化、实时刷新、文件管理',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
