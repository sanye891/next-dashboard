'use client'
import { useState } from 'react'
import { supabase } from '../../../supabaseClient'
import * as XLSX from 'xlsx'

// 导入的行数据类型
interface ImportRow {
  name: string;
  value: number;
  [key: string]: any; // 允许其他字段
}

/**
 * DataImporter 组件: 支持 CSV/XLSX 文件导入销售数据
 * 功能：
 * 1. 上传 CSV/XLSX 文件
 * 2. 预览数据
 * 3. 确认导入到数据库
 */
export default function DataImporter({ onImportSuccess }: { onImportSuccess: () => void }) {
  // 状态管理
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [previewData, setPreviewData] = useState<ImportRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [step, setStep] = useState(1) // 1: 选择文件, 2: 预览数据, 3: 导入结果

  // 处理文件选择
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    setError(null)
    setSuccess(false)
    
    if (!selectedFile) return
    
    // 验证文件类型
    const fileType = selectedFile.name.split('.').pop()?.toLowerCase()
    if (fileType !== 'csv' && fileType !== 'xlsx') {
      setError('请上传 .csv 或 .xlsx 格式的文件')
      return
    }
    
    setFile(selectedFile)
    parseFile(selectedFile)
  }

  // 解析文件内容
  const parseFile = (file: File) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        if (!data) {
          setError('无法读取文件内容')
          return
        }
        
        let parsedData: ImportRow[] = []
        
        // 解析 Excel/CSV
        const workbook = XLSX.read(data, { type: 'binary' })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json(firstSheet)
        
        // 验证数据格式
        if (jsonData.length === 0) {
          setError('文件中没有数据')
          return
        }
        
        // 检查是否有必要的列（至少有name和value）
        const firstRow = jsonData[0] as any
        if (!firstRow.name || firstRow.value === undefined) {
          setError('数据格式错误: 必须包含 name 和 value 列')
          return
        }
        
        // 格式化数据以符合销售数据格式
        parsedData = jsonData.map((row: any) => ({
          name: String(row.name),
          value: Number(row.value),
        }))
        
        setPreviewData(parsedData)
        setStep(2) // 前进到预览步骤
      } catch (err) {
        setError('文件解析失败，请确保文件格式正确')
      }
    }
    
    reader.onerror = () => {
      setError('读取文件时发生错误')
    }
    
    // 以二进制方式读取文件
    reader.readAsBinaryString(file)
  }

  // 导入数据到 Supabase
  const importData = async () => {
    if (previewData.length === 0) return
    
    setImporting(true)
    setError(null)
    
    try {
      // 批量插入数据到 sales 表
      const { error } = await supabase
        .from('sales')
        .insert(previewData)
      
      if (error) {
        throw error
      }
      
      setSuccess(true)
      setStep(3) // 前进到结果步骤
      onImportSuccess() // 通知父组件导入成功，刷新数据
    } catch (err: any) {
      setError(`导入数据失败: ${err.message || '未知错误'}`)
    } finally {
      setImporting(false)
    }
  }

  // 重置组件状态
  const resetImport = () => {
    setFile(null)
    setPreviewData([])
    setError(null)
    setSuccess(false)
    setStep(1)
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
      <h3 className="text-xl font-semibold mb-4 text-gray-800">导入销售数据</h3>
      
      {/* 步骤指示器 */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>1</div>
            <span className="text-xs mt-1">选择文件</span>
          </div>
          <div className={`h-1 flex-1 mx-2 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>2</div>
            <span className="text-xs mt-1">预览数据</span>
          </div>
          <div className={`h-1 flex-1 mx-2 ${step >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>3</div>
            <span className="text-xs mt-1">完成导入</span>
          </div>
        </div>
      </div>
      
      {/* 错误提示 */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg border border-red-100">
          <p className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        </div>
      )}
      
      {/* 步骤 1: 文件选择 */}
      {step === 1 && (
        <div>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="mt-2 text-sm text-gray-600">点击选择或拖拽 CSV/XLSX 文件到此处</p>
            <p className="text-xs text-gray-500 mt-1">文件必须包含 name 和 value 列</p>
            <input
              type="file"
              accept=".csv,.xlsx"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer">
              选择文件
            </label>
          </div>
          
          <div className="mt-4 text-gray-600">
            <h4 className="font-medium">支持的格式:</h4>
            <ul className="list-disc list-inside text-sm mt-2">
              <li>CSV 文件 (.csv)</li>
              <li>Excel 文件 (.xlsx)</li>
            </ul>
            <h4 className="font-medium mt-3">数据要求:</h4>
            <ul className="list-disc list-inside text-sm mt-2">
              <li>必须包含 <code className="bg-gray-100 px-1 rounded">name</code> 列 - 销售项目名称</li>
              <li>必须包含 <code className="bg-gray-100 px-1 rounded">value</code> 列 - 销售金额</li>
            </ul>
          </div>
        </div>
      )}
      
      {/* 步骤 2: 数据预览 */}
      {step === 2 && (
        <div>
          <p className="mb-2 font-medium">已选择文件: <span className="text-blue-600">{file?.name}</span></p>
          <p className="mb-4 text-sm text-gray-600">预览前 {Math.min(10, previewData.length)} 条数据（总计 {previewData.length} 条）</p>
          
          <div className="border rounded-lg overflow-hidden mb-4">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">名称</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">金额</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {previewData.slice(0, 10).map((row, index) => (
                  <tr key={index}>
                    <td className="px-6 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{row.name}</td>
                    <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500">{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="flex justify-between">
            <button
              onClick={resetImport}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              返回
            </button>
            <button
              onClick={importData}
              disabled={importing}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {importing ? '导入中...' : '确认导入'}
            </button>
          </div>
        </div>
      )}
      
      {/* 步骤 3: 导入结果 */}
      {step === 3 && success && (
        <div className="text-center py-8">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
            <svg className="h-6 w-6 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="mt-3 text-lg font-medium text-gray-900">导入成功</h3>
          <p className="mt-2 text-sm text-gray-500">
            成功导入 {previewData.length} 条数据！
          </p>
          <div className="mt-6">
            <button
              onClick={resetImport}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              导入更多数据
            </button>
          </div>
        </div>
      )}
    </div>
  )
} 