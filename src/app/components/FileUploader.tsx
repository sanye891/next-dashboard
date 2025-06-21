'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../../supabaseClient'

// FileUploader 组件：支持文件上传、列表、下载
export default function FileUploader() {
  // 文件列表状态
  const [files, setFiles] = useState<any[]>([])
  // 上传状态
  const [uploading, setUploading] = useState(false)
  // 错误信息
  const [error, setError] = useState<string | null>(null)
  // 存储桶名称
  const bucket = 'user-files' // 请确保在 Supabase 控制台已创建该 bucket

  // 获取文件列表
  const fetchFiles = async () => {
    setError(null)
    const { data, error } = await supabase.storage.from(bucket).list('', { limit: 100, offset: 0 })
    if (error) {
      setError('获取文件列表失败: ' + error.message)
      setFiles([])
    } else {
      setFiles(data ?? [])
    }
  }

  // 组件挂载时获取文件列表
  useEffect(() => {
    fetchFiles()
  }, [])

  // 上传文件
  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    const file = event.target.files?.[0]
    if (!file) return
    setUploading(true)
    // 以时间戳+文件名防止重名
    const filePath = `${Date.now()}_${file.name}`
    const { error } = await supabase.storage.from(bucket).upload(filePath, file)
    setUploading(false)
    if (error) {
      setError('上传失败: ' + error.message)
    } else {
      fetchFiles()
    }
  }

  // 下载文件
  const handleDownload = async (fileName: string) => {
    setError(null)
    const { data, error } = await supabase.storage.from(bucket).download(fileName)
    if (error) {
      setError('下载失败: ' + error.message)
    } else if (data) {
      // 创建下载链接
      const url = window.URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    }
  }

  return (
    <div className="p-4 border rounded mb-6">
      <h2 className="text-lg font-bold mb-2">文件管理</h2>
      <input type="file" onChange={handleUpload} disabled={uploading} />
      {uploading && <div className="text-blue-500 mt-2">正在上传...</div>}
      {error && <div className="text-red-500 mt-2">{error}</div>}
      <ul className="mt-4 space-y-2">
        {files.length === 0 && <li className="text-gray-500">暂无文件</li>}
        {files.map((file) => (
          <li key={file.name} className="flex items-center justify-between">
            <span>{file.name}</span>
            <button
              className="ml-4 px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600"
              onClick={() => handleDownload(file.name)}
            >
              下载
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
} 