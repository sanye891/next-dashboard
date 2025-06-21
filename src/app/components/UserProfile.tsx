'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../../supabaseClient'
import Image from 'next/image'

// 用户信息类型定义
interface UserInfo {
  id: string
  email: string
  name?: string
  avatar_url?: string
  company?: string
  role?: string
}

// 用户偏好设置类型
interface UserPreferences {
  email_notifications: boolean
  dark_mode: boolean
}

/**
 * UserProfile 组件：用户个人资料管理和设置
 * 支持头像上传、个人信息编辑和系统偏好配置
 */
export default function UserProfile() {
  // 用户信息状态
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [preferences, setPreferences] = useState<UserPreferences>({
    email_notifications: true,
    dark_mode: false
  })
  
  // 头像上传状态
  const [uploading, setUploading] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  
  // 表单状态
  const [formValues, setFormValues] = useState({
    name: '',
    email: '',
    company: ''
  })
  
  // 消息状态
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)

  // 获取当前用户信息
  useEffect(() => {
    const fetchUserProfile = async () => {
      setLoading(true)
      try {
        // 获取当前认证用户
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          // 获取扩展的用户资料 - 使用 maybeSingle 而不是 single
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle()
          
          if (error) throw error
          
          // 如果没有找到用户资料，则创建一个新的
          if (!profile) {
            // 创建默认资料
            const { error: insertError } = await supabase
              .from('profiles')
              .insert([{ id: user.id }])
            
            if (insertError) throw insertError
            
            // 创建默认 UserInfo 对象
            const userData: UserInfo = {
              id: user.id,
              email: user.email || '',
              name: '',
              avatar_url: '',
              company: '',
              role: 'user'
            }
            
            setUserInfo(userData)
            setFormValues({
              name: '',
              email: user.email || '',
              company: ''
            })
          } else {
            // 使用现有资料
            const userData: UserInfo = {
              id: user.id,
              email: user.email || '',
              name: profile.name || '',
              avatar_url: profile.avatar_url || '',
              company: profile.company || '',
              role: profile.role || 'user'
            }
            
            setUserInfo(userData)
            setFormValues({
              name: userData.name || '',
              email: userData.email,
              company: userData.company || ''
            })
            
            // 获取用户偏好设置
            if (profile.preferences) {
              setPreferences(profile.preferences as UserPreferences)
            }
          }
        }
      } catch (error: any) {
        console.error('获取用户资料失败:', error.message)
        setMessage({ type: 'error', text: `获取用户资料失败: ${error.message}` })
      } finally {
        setLoading(false)
      }
    }
    
    fetchUserProfile()
  }, [])

  // 处理表单输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormValues(prev => ({ ...prev, [name]: value }))
  }

  // 处理偏好设置变化
  const handlePreferenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target
    setPreferences(prev => ({ ...prev, [name]: checked }))
  }

  // 处理头像选择
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: '请选择图片文件' })
      return
    }
    
    // 验证文件大小（最大5MB）
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: '图片大小不能超过5MB' })
      return
    }
    
    setAvatarFile(file)
    
    // 创建预览
    const reader = new FileReader()
    reader.onload = (e) => {
      setAvatarPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  // 上传头像
  const uploadAvatar = async () => {
    if (!avatarFile || !userInfo) return
    
    setUploading(true)
    setMessage(null)
    
    try {
      // 生成唯一文件名
      const fileExt = avatarFile.name.split('.').pop()
      const fileName = `${userInfo.id}-${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`
      
      // 上传到 Storage
      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, avatarFile)
      
      if (uploadError) throw uploadError
      
      // 获取公共URL
      const { data: { publicUrl } } = supabase.storage
        .from('profiles')
        .getPublicUrl(filePath)
      
      // 更新用户资料
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userInfo.id)
      
      if (updateError) throw updateError
      
      // 更新本地状态
      setUserInfo(prev => prev ? { ...prev, avatar_url: publicUrl } : null)
      setMessage({ type: 'success', text: '头像更新成功' })
      
    } catch (error: any) {
      console.error('头像上传失败:', error)
      setMessage({ type: 'error', text: `头像上传失败: ${error.message}` })
    } finally {
      setUploading(false)
    }
  }

  // 保存用户资料
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userInfo) return
    
    setLoading(true)
    setMessage(null)
    
    try {
      // 上传头像（如果已选择）
      if (avatarFile) {
        await uploadAvatar()
      }
      
      // 更新用户资料和偏好设置
      const updates = {
        name: formValues.name,
        company: formValues.company,
        preferences
      }
      
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userInfo.id)
      
      if (error) throw error
      
      // 更新本地状态
      setUserInfo(prev => prev ? { ...prev, ...updates } : null)
      setMessage({ type: 'success', text: '个人资料保存成功' })
      
    } catch (error: any) {
      console.error('保存资料失败:', error)
      setMessage({ type: 'error', text: `保存失败: ${error.message}` })
    } finally {
      setLoading(false)
    }
  }

  // 渲染加载状态
  if (loading && !userInfo) {
    return (
      <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden p-6">
        <div className="animate-pulse flex space-x-4">
          <div className="rounded-full bg-gray-200 h-12 w-12"></div>
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden p-6">
        <div className="max-w-xl mx-auto">
          {message && (
            <div className={`mb-4 p-3 rounded-lg ${
              message.type === 'success' 
                ? 'bg-green-50 border border-green-100 text-green-700'
                : 'bg-red-50 border border-red-100 text-red-700'
            }`}>
              {message.text}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* 个人资料部分 */}
            <div>
              <h3 className="text-lg font-medium leading-6 text-gray-900 pb-2 border-b border-gray-200">
                个人资料
              </h3>
              <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                {/* 头像上传 */}
                <div className="sm:col-span-6">
                  <label className="block text-sm font-medium text-gray-700">
                    头像
                  </label>
                  <div className="mt-1 flex items-center">
                    <div className="h-20 w-20 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                      {(avatarPreview || userInfo?.avatar_url) ? (
                        <Image 
                          src={avatarPreview || userInfo?.avatar_url || ''}
                          alt="个人头像"
                          width={80}
                          height={80}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <svg className="h-full w-full text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      )}
                    </div>
                    <div className="ml-4 flex flex-col">
                      <input
                        type="file"
                        id="avatar-input"
                        className="hidden"
                        accept="image/*"
                        onChange={handleAvatarChange}
                      />
                      <label
                        htmlFor="avatar-input"
                        className="cursor-pointer bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50"
                      >
                        更换头像
                      </label>
                      <p className="mt-1 text-xs text-gray-500">支持 JPG, PNG, GIF 格式 (最大 5MB)</p>
                    </div>
                  </div>
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    姓名
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      name="name"
                      id="name"
                      value={formValues.name}
                      onChange={handleInputChange}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                    />
                  </div>
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    邮箱
                  </label>
                  <div className="mt-1">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={formValues.email}
                      onChange={handleInputChange}
                      disabled
                      className="shadow-sm bg-gray-50 cursor-not-allowed block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                    />
                    <p className="mt-1 text-xs text-gray-500">邮箱地址不可修改</p>
                  </div>
                </div>

                <div className="sm:col-span-6">
                  <label htmlFor="company" className="block text-sm font-medium text-gray-700">
                    公司
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      name="company"
                      id="company"
                      value={formValues.company}
                      onChange={handleInputChange}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 系统偏好设置 */}
            <div>
              <h3 className="text-lg font-medium leading-6 text-gray-900 pb-2 border-b border-gray-200">
                系统偏好
              </h3>
              <div className="mt-4 space-y-4">
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="email_notifications"
                      name="email_notifications"
                      type="checkbox"
                      checked={preferences.email_notifications}
                      onChange={handlePreferenceChange}
                      className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="email_notifications" className="font-medium text-gray-700">
                      启用邮件通知
                    </label>
                    <p className="text-gray-500">当有新的数据导入或文件上传时发送通知。</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="dark_mode"
                      name="dark_mode"
                      type="checkbox"
                      checked={preferences.dark_mode}
                      onChange={handlePreferenceChange}
                      className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="dark_mode" className="font-medium text-gray-700">
                      暗黑模式
                    </label>
                    <p className="text-gray-500">使用暗色主题以保护眼睛。</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* 操作按钮 */}
            <div className="flex justify-end space-x-3 border-t border-gray-200 pt-6">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '保存中...' : '保存修改'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
} 