'use client'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '../../../supabaseClient'

// AuthComponent 组件：美化后的登录界面，支持邮箱、Google、GitHub 登录
export default function AuthComponent() {
  return (
    <div className="w-full max-w-xl">
      <h2 className="text-3xl font-bold text-center text-blue-600 mb-6 tracking-wide drop-shadow">欢迎登录SaaS仪表板</h2>
      <Auth
        supabaseClient={supabase}
        appearance={{
          theme: ThemeSupa,
          style: {
            container: {
              width: '100%',
              maxWidth: '100%'
            },
            button: {
              background: 'linear-gradient(90deg, #6366f1 0%, #ec4899 100%)',
              color: 'white',
              borderRadius: '0.5rem',
              fontWeight: 'bold',
              marginTop: '0.5rem',
              marginBottom: '0.5rem',
              padding: '0.75rem',
              width: '100%',
              fontSize: '1rem'
            },
            input: {
              borderRadius: '0.5rem',
              border: '1px solid #e5e7eb',
              padding: '0.75rem',
              marginBottom: '0.75rem',
              width: '100%',
              fontSize: '1rem'
            },
            anchor: {
              color: '#6366f1',
              fontWeight: 'bold',
            },
            label: {
              fontWeight: 'bold',
              color: '#6366f1',
              marginBottom: '0.25rem',
              fontSize: '1rem'
            },
            message: {
              fontSize: '0.9rem',
              marginTop: '0.5rem',
              marginBottom: '0.5rem'
            }
          },
        }}
        providers={['github']}
        localization={{
          variables: {
            sign_in: { email_label: '邮箱', password_label: '密码', button_label: '登录' },
            sign_up: { email_label: '邮箱', password_label: '密码', button_label: '注册' },
          }
        }}
      />
    </div>
  )
}