'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../supabaseClient'
import { FileIcon, defaultStyles } from 'react-file-icon'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'

// 文件类型定义
interface FileItem {
  id: string
  name: string
  size: number
  type: string
  url: string
  created_at: string
  category: string
}

// 文件分类选项
const FILE_CATEGORIES = [
  '全部',
  '销售报告',
  '客户数据',
  '财务文件',
  '产品资料',
  '其他'
]

/**
 * FileRepository 组件：实现文件的上传、预览、下载、分类等功能
 * 提供企业级文件管理功能，支持多类型文件存储与访问
 */
export default function FileRepository() {
  // 文件状态管理
  const [files, setFiles] = useState<FileItem[]>([])
  const [filteredFiles, setFilteredFiles] = useState<FileItem[]>([])
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('全部')
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  
  // 使用 Supabase Storage
  const STORAGE_BUCKET = 'uploads'

  // 检查并确保存储桶存在
  const ensureStorageBucketExists = useCallback(async () => {
    try {
      setError(null);

      // 获取当前用户身份
      const { data: { user } } = await supabase.auth.getUser();
      
      // 尝试直接使用存储桶
      try {
        const { data, error } = await supabase.storage
          .from(STORAGE_BUCKET)
          .list();
        
        if (!error) {
          return true;
        }
      } catch (err) {
        // 继续执行，允许其他功能正常运行
      }
      
      return true;
    } catch (err) {
      setError(`存储服务访问受限，但您仍可以查看现有文件`);
      return true; // 返回true让应用继续运行
    }
  }, []);

  // 获取文件列表
  const fetchFiles = useCallback(async () => {
    try {
      // 获取当前用户
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      // 如果未登录，显示提示
      if (!currentUser) {
        setError('请先登录以查看和管理您的文件。');
        setFiles([]);
        return;
      }
      
      // 获取文件列表
      const { data: filesData, error } = await supabase
        .from('files')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        // 检查特定错误类型
        if (error.code === '42501' || error.message.includes('permission denied')) {
          throw new Error('权限不足：您可能无法访问文件记录。如果您刚登录，可能需要刷新页面或联系管理员。');
        } else {
          throw error;
        }
      }
      
      setFiles(filesData || []);
    } catch (error: any) {
      setError(`获取文件列表失败: ${error.message}`);
      setFiles([]); 
    }
  }, []);

  // 初始加载时获取文件和检查存储桶
  useEffect(() => {
    // 先确保存储桶存在
    ensureStorageBucketExists().then(success => {
      if (success) {
        // 存储桶检查成功后再获取文件
        fetchFiles();
      }
    });
    
    // 设置数据变化监听
    const channel = supabase.channel('files_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'files' },
        () => {
          fetchFiles();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchFiles, ensureStorageBucketExists]);

  // 根据搜索条件和分类过滤文件
  useEffect(() => {
    let filtered = [...files]
    
    // 应用分类过滤
    if (selectedCategory !== '全部') {
      filtered = filtered.filter(file => file.category === selectedCategory)
    }
    
    // 应用搜索过滤
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(file => 
        file.name.toLowerCase().includes(term)
      )
    }
    
    setFilteredFiles(filtered)
  }, [files, searchTerm, selectedCategory])

  // 处理文件上传
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileInput = e.target
    if (!fileInput.files || fileInput.files.length === 0) return
    
    const file = fileInput.files[0]
    
    // 限制最大文件大小为 50MB
    const MAX_SIZE = 50 * 1024 * 1024 // 50MB
    if (file.size > MAX_SIZE) {
      setError(`文件大小不能超过 50MB (当前文件: ${(file.size / 1024 / 1024).toFixed(2)}MB)`)
      return
    }
    
    setIsUploading(true)
    setUploadProgress(0)
    setError(null)
    
    try {
      // 获取当前用户身份，确保有用户登录
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('未登录或会话已过期，请重新登录')
      }
      
      // 生成唯一文件名防止覆盖
      const fileExtension = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.round(Math.random() * 1000)}.${fileExtension}`
      
      // 上传到 Supabase Storage
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        })
      
      if (error) {
        if (error.message.includes('security policy')) {
          throw new Error('权限不足：您可能没有上传文件的权限，请联系管理员');
        }
        throw error;
      }
      
      // 获取文件访问URL
      const { data: { publicUrl } } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(fileName)
      
      // 准备文件记录
      const fileRecord = {
        name: file.name,
        size: file.size,
        type: file.type,
        url: publicUrl,
        category: selectedCategory === '全部' ? '其他' : selectedCategory,
        user_id: user.id
      }
      
      // 保存文件记录到数据库
      const { error: dbError } = await supabase
        .from('files')
        .insert(fileRecord)
        .select()
      
      if (dbError) {
        // 如果是RLS策略问题，给出明确提示
        if (dbError.code === '42501' || dbError.message.includes('security policy')) {
          // 尝试回滚 - 删除已上传的文件
          try {
            await supabase.storage.from(STORAGE_BUCKET).remove([fileName]);
          } catch (e) {
            // 忽略回滚错误
          }
          
          throw new Error('权限不足：无法保存文件记录，请确保您有权限访问此表。如果您刚登录，可能需要刷新页面。');
        }
        
        throw dbError;
      }
      
      // 重新获取文件列表
      await fetchFiles()
      
    } catch (err: any) {
      setError(`文件上传失败: ${err.message}`)
    } finally {
      setIsUploading(false)
      // 清理 input
      if (fileInput) fileInput.value = ''
    }
  }

  // 删除文件
  const handleDeleteFile = async (file: FileItem) => {
    if (!window.confirm(`确定要删除文件 "${file.name}"?`)) {
      return
    }
    
    try {
      // 从数据库删除记录
      const { error: dbError } = await supabase
        .from('files')
        .delete()
        .eq('id', file.id)
      
      if (dbError) throw dbError
      
      // 从 Storage 删除文件
      const fileName = file.url.split('/').pop()
      if (fileName) {
        const { error: storageError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .remove([fileName])
        
        if (storageError) throw storageError
      }
      
      // 如果是预览中的文件，关闭预览
      if (selectedFile?.id === file.id) {
        setSelectedFile(null)
        setIsPreviewOpen(false)
      }
      
      // 重新获取文件列表
      await fetchFiles()
      
    } catch (err: any) {
      setError(`删除文件失败: ${err.message}`)
    }
  }

  // 预览文件
  const handlePreviewFile = (file: FileItem) => {
    setSelectedFile(file)
    setIsPreviewOpen(true)
  }

  // 更新文件分类
  const handleUpdateCategory = async (file: FileItem, newCategory: string) => {
    try {
      const { error } = await supabase
        .from('files')
        .update({ category: newCategory })
        .eq('id', file.id)
      
      if (error) throw error
      
      // 重新获取文件列表
      await fetchFiles()
      
    } catch (err: any) {
      setError(`更新分类失败: ${err.message}`)
    }
  }

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    else return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  // 修复RLS权限帮助
  const showFixHelpModal = () => {
    const sqlHelpText = `
--- RLS 权限修复帮助 ---

请按照以下步骤操作：

1. 登录到您的 Supabase 控制台
2. 点击左侧菜单的 "SQL 编辑器"
3. 将项目中的 src/app/components/fix-rls.sql 文件内容复制粘贴到编辑器中
4. 点击 "运行" 按钮执行 SQL 命令
5. 刷新本应用页面

如有问题请联系管理员获取帮助。
`;
    alert(sqlHelpText);
  };

  // 获取文件扩展名（不带点）
  const getFileExtension = (filename: string) => {
    return filename.split('.').pop()?.toLowerCase() || ''
  }

  // 是否可以在浏览器中预览
  const isPreviewable = (file: FileItem) => {
    const type = file.type.toLowerCase()
    return (
      type.startsWith('image/') || 
      type === 'application/pdf' ||
      type === 'text/plain' ||
      type === 'text/html' ||
      type === 'text/css' ||
      type === 'text/javascript'
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium mb-4 text-gray-700">销售报告库</h3>
        
        {/* 显示权限帮助提示 */}
        {error && error.includes('权限不足') && (
          <div className="mb-6 p-4 border border-yellow-300 bg-yellow-50 rounded-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-yellow-800">权限问题</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>{error}</p>
                  <div className="mt-3 space-y-2">
                    <p className="font-medium">解决方法:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>确认您已正确登录</li>
                      <li>刷新浏览器页面</li>
                      <li>检查 Supabase RLS 政策设置</li>
                    </ul>
                    
                    <div className="mt-4 flex gap-2">
                      <button 
                        onClick={showFixHelpModal}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                      >
                        查看修复方案
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* 上传区域 */}
        <div className="mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1">
              <label 
                htmlFor="fileUpload" 
                className={`flex justify-center items-center px-4 py-8 border-2 border-dashed rounded-lg ${
                  isUploading ? 'bg-blue-50 border-blue-300' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                } transition-all cursor-pointer`}
              >
                <div className="text-center">
                  {isUploading ? (
                    <div>
                      <div className="mb-2 text-blue-600 font-medium">上传中... {uploadProgress}%</div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="mt-2 text-gray-600">点击或拖拽文件至此处上传</p>
                      <p className="text-xs text-gray-500">支持 PDF, Word, Excel, 图片等格式 (最大 50MB)</p>
                    </>
                  )}
                </div>
              </label>
              <input id="fileUpload" type="file" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
            </div>
            <div className="w-48">
              <label className="block text-sm font-medium text-gray-700 mb-1">文件分类</label>
              <select 
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-2"
              >
                {FILE_CATEGORIES.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          </div>
          
          {error && !error.includes('权限不足') && (
            <div className="mt-2 p-2 text-sm text-red-600 bg-red-50 rounded border border-red-100">
              {error}
            </div>
          )}
        </div>
        
        {/* 搜索和过滤 */}
        <div className="flex flex-wrap gap-4 mb-4 items-center">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索文件..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md"
            />
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          </div>
          
          <div className="flex gap-2">
            {FILE_CATEGORIES.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1.5 text-sm rounded-md ${
                  selectedCategory === category 
                    ? 'bg-blue-100 text-blue-800 font-medium' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* 文件列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredFiles.length === 0 ? (
          <div className="col-span-3 py-12 text-center">
            {isUploading ? (
              <p className="text-gray-500">正在上传文件...</p>
            ) : error ? (
              <div className="text-red-500">
                <p>获取文件列表出错：</p>
                <p>{error}</p>
                <button 
                  onClick={fetchFiles}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  重试
                </button>
              </div>
            ) : searchTerm || selectedCategory !== '全部' ? (
              <p className="text-gray-500">没有找到匹配的文件</p>
            ) : null}
          </div>
        ) : (
          filteredFiles.map((file) => (
            <div 
              key={file.id} 
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="p-4 flex items-start gap-4">
                <div className="w-12 h-12 flex-shrink-0">
                  <FileIcon 
                    extension={getFileExtension(file.name)} 
                    {...defaultStyles[getFileExtension(file.name) as keyof typeof defaultStyles]}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-gray-900 truncate" title={file.name}>
                    {file.name}
                  </h4>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(file.size)} • 上传于 {formatDistanceToNow(new Date(file.created_at), { 
                      addSuffix: true,
                      locale: zhCN
                    })}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <span className="px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-700">
                      {file.category || '未分类'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="px-4 py-2 bg-gray-50 flex justify-between items-center gap-2 text-xs">
                <select
                  className="text-xs border border-gray-300 rounded px-1 py-0.5 bg-white"
                  value={file.category}
                  onChange={(e) => handleUpdateCategory(file, e.target.value)}
                >
                  {FILE_CATEGORIES.filter(c => c !== '全部').map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                
                <div className="flex items-center gap-2">
                  {isPreviewable(file) && (
                    <button 
                      onClick={() => handlePreviewFile(file)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      预览
                    </button>
                  )}
                  <a 
                    href={file.url} 
                    download={file.name}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-green-600 hover:text-green-800"
                  >
                    下载
                  </a>
                  <button 
                    onClick={() => handleDeleteFile(file)}
                    className="text-red-600 hover:text-red-800"
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* 文件预览弹窗 */}
      {isPreviewOpen && selectedFile && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-medium text-gray-900 truncate" title={selectedFile.name}>
                {selectedFile.name}
              </h3>
              <button 
                onClick={() => setIsPreviewOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {selectedFile.type.startsWith('image/') ? (
                <img 
                  src={selectedFile.url} 
                  alt={selectedFile.name} 
                  className="max-w-full max-h-[70vh] mx-auto"
                />
              ) : selectedFile.type === 'application/pdf' ? (
                <iframe
                  src={selectedFile.url}
                  title={selectedFile.name}
                  className="w-full h-[70vh]"
                ></iframe>
              ) : (
                <div className="h-[70vh] flex items-center justify-center">
                  <p className="text-gray-500">此文件类型无法直接预览，请下载后查看</p>
                </div>
              )}
            </div>
            <div className="p-4 border-t flex justify-end">
              <a
                href={selectedFile.url}
                download={selectedFile.name}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                下载文件
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 