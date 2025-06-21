'use client'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../supabaseClient'
import { useState } from 'react'

// UserMenu 组件：显示用户信息、角色、登出按钮
export default function UserMenu({ user, role }: { user: { email: string }, role?: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // 退出登录
  const handleLogout = async () => {
    setLoading(true)
    await supabase.auth.signOut()
    setLoading(false)
    router.push('/') // 登出后跳转到首页或登录页
  }

  return (
    <div className="flex items-center gap-4">
      <span className="text-gray-500">用户：{user.email}</span>
      {role && <span className="text-blue-500">角色：{role}</span>}
      <button
        className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
        onClick={handleLogout}
        disabled={loading}
      >
        {loading ? '正在退出...' : '退出登录'}
      </button>
    </div>
  )
}