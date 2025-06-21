'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../supabaseClient'
import DataImporter from './DataImporter'

// 销售数据类型
interface Sale {
  id: number
  name: string
  value: number
  created_at?: string
}

/**
 * SalesManager 组件：销售数据管理界面
 * 提供数据表格、添加/编辑/删除功能和数据统计
 */
export default function SalesManager() {
  // 销售数据及UI状态
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 表单状态
  const [form, setForm] = useState<{ id?: number; name: string; value: number }>({ name: '', value: 0 })
  const [editing, setEditing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  
  // 统计摘要
  const [stats, setStats] = useState({
    total: 0,
    average: 0,
    count: 0
  })

  // 获取销售数据
  const fetchSales = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .order('id', { ascending: false })
      
      if (error) {
        throw error
      }
      
      const salesData = data as Sale[]
      setSales(salesData)
      
      // 计算统计摘要
      if (salesData.length > 0) {
        const values = salesData.map(item => item.value)
        const total = values.reduce((sum, val) => sum + val, 0)
        const average = Math.round((total / values.length) * 100) / 100
        
        setStats({
          total,
          average,
          count: salesData.length
        })
      } else {
        setStats({ total: 0, average: 0, count: 0 })
      }
      
    } catch (err: any) {
      console.error('获取数据失败:', err)
      setError('获取数据失败: ' + err.message)
      setSales([])
    } finally {
      setLoading(false)
    }
  }

  // 组件挂载时获取数据
  useEffect(() => {
    fetchSales()
  }, [])

  // 处理表单输入变化
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: name === 'value' ? Number(value) : value }))
  }

  // 新增或更新销售数据
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    try {
      if (editing && form.id) {
        // 更新
        const { error } = await supabase
          .from('sales')
          .update({ name: form.name, value: form.value })
          .eq('id', form.id)
        
        if (error) throw error
      } else {
        // 新增
        const { error } = await supabase
          .from('sales')
          .insert({ name: form.name, value: form.value })
        
        if (error) throw error
      }
      
      // 重置表单并刷新数据
      setForm({ name: '', value: 0 })
      setEditing(false)
      fetchSales()
      
    } catch (err: any) {
      console.error('保存数据失败:', err)
      setError(`${editing ? '更新' : '新增'}失败: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // 编辑项目
  const handleEdit = (sale: Sale) => {
    setForm({ id: sale.id, name: sale.name, value: sale.value })
    setEditing(true)
  }

  // 删除项目
  const handleDelete = async (id: number) => {
    if (!window.confirm('确定要删除此记录吗？')) {
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      const { error } = await supabase
        .from('sales')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      fetchSales()
      
    } catch (err: any) {
      console.error('删除数据失败:', err)
      setError('删除失败: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // 过滤显示数据
  const getFilteredSales = () => {
    if (!searchTerm) return sales
    
    const term = searchTerm.toLowerCase()
    return sales.filter(sale => 
      sale.name.toLowerCase().includes(term) || 
      sale.value.toString().includes(term)
    )
  }

  return (
    <div>
      {/* 导入数据组件 */}
      <DataImporter onImportSuccess={fetchSales} />
      
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
          <p className="text-sm text-blue-600 font-medium">总销售额</p>
          <p className="text-2xl font-bold">¥{stats.total.toLocaleString()}</p>
          <p className="text-xs text-blue-500 mt-1">{stats.count} 条销售记录</p>
        </div>
        <div className="bg-green-50 p-4 rounded-xl border border-green-100">
          <p className="text-sm text-green-600 font-medium">平均销售额</p>
          <p className="text-2xl font-bold">¥{stats.average.toLocaleString()}</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
          <p className="text-sm text-purple-600 font-medium">导入功能</p>
          <p className="text-md font-medium">支持CSV与Excel导入</p>
        </div>
      </div>
      
      {/* 错误提示 */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg border border-red-100">
          {error}
        </div>
      )}
      
      {/* 新增/编辑表单 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-medium mb-4 text-gray-700">
          {editing ? '编辑销售数据' : '新增销售数据'}
        </h3>
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">名称</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="产品或服务名称"
              className="w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div className="w-40">
            <label className="block text-sm font-medium text-gray-700 mb-1">金额</label>
            <input
              name="value"
              type="number"
              value={form.value}
              onChange={handleChange}
              placeholder="金额"
              className="w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div className="flex items-end space-x-2">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {loading ? '处理中...' : editing ? '更新' : '添加'}
            </button>
            {editing && (
              <button
                type="button"
                onClick={() => { setForm({ name: '', value: 0 }); setEditing(false); }}
                className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50"
              >
                取消
              </button>
            )}
          </div>
        </form>
      </div>
      
      {/* 数据表格 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* 表格工具栏 */}
        <div className="px-6 py-4 border-b border-gray-200 flex flex-wrap justify-between items-center gap-4">
          <h3 className="text-lg font-medium text-gray-700">销售数据列表</h3>
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索..."
              className="border border-gray-300 pl-10 pr-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
        
        {/* 表格内容 */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">名称</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">金额</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading && (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center">
                    <div className="flex justify-center items-center">
                      <svg className="animate-spin h-5 w-5 text-blue-500 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      加载中...
                    </div>
                  </td>
                </tr>
              )}
              
              {!loading && getFilteredSales().length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                    {searchTerm ? '没有找到匹配的数据' : '暂无销售数据'}
                  </td>
                </tr>
              )}
              
              {!loading && getFilteredSales().map((sale) => (
                <tr key={sale.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {sale.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {sale.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ¥{sale.value.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(sale)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDelete(sale.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
} 