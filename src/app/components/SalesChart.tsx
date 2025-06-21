'use client'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../../supabaseClient'
import { Chart, registerables } from 'chart.js'

// 注册所有Chart.js组件
Chart.register(...registerables)

// 销售数据类型
interface Sale {
  id: number
  name: string
  value: number
  created_at: string
}

/**
 * SalesChart 组件：销售数据可视化图表
 * 提供销售趋势、销售分布等多种图表展示
 */
export default function SalesChart() {
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chartType, setChartType] = useState<'bar' | 'pie' | 'line'>('bar')
  
  // 图表Canvas引用
  const chartRef = useRef<HTMLCanvasElement>(null)
  const chartInstance = useRef<Chart | null>(null)
  
  // 获取销售数据
  const fetchSales = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: true })
      
      if (error) throw error
      
      setSales(data || [])
    } catch (err: any) {
      console.error('获取销售数据失败:', err)
      setError(`获取销售数据失败: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // 初始加载数据
  useEffect(() => {
    fetchSales()
    
    // 设置数据变化监听
    const channel = supabase.channel('sales_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sales' },
        () => {
          fetchSales()
        }
      )
      .subscribe()
    
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // 处理数据格式并渲染图表
  useEffect(() => {
    if (!chartRef.current || sales.length === 0) return
    
    // 销毁旧图表实例
    if (chartInstance.current) {
      chartInstance.current.destroy()
    }
    
    // 按名称分组数据（用于饼图）
    const salesByName = sales.reduce<Record<string, number>>((acc, sale) => {
      acc[sale.name] = (acc[sale.name] || 0) + sale.value
      return acc
    }, {})
    
    // 按日期分组数据（用于折线图/柱状图）
    const salesByDate = sales.reduce<Record<string, number>>((acc, sale) => {
      // 获取日期部分
      const date = new Date(sale.created_at).toISOString().split('T')[0]
      acc[date] = (acc[date] || 0) + sale.value
      return acc
    }, {})
    
    // 图表配置
    let chartConfig = {}
    
    switch (chartType) {
      case 'pie':
        chartConfig = {
          type: 'pie',
          data: {
            labels: Object.keys(salesByName),
            datasets: [{
              label: '销售额',
              data: Object.values(salesByName),
              backgroundColor: [
                '#4F46E5', '#10B981', '#F59E0B', '#EF4444', 
                '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6', 
                '#F97316', '#DC2626', '#A855F7', '#D946EF'
              ],
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            plugins: {
              legend: {
                position: 'right',
              },
              title: {
                display: true,
                text: '销售额分布'
              }
            }
          }
        }
        break
      
      case 'line':
        const dateLabels = Object.keys(salesByDate).sort()
        chartConfig = {
          type: 'line',
          data: {
            labels: dateLabels,
            datasets: [{
              label: '销售额趋势',
              data: dateLabels.map(date => salesByDate[date]),
              fill: false,
              borderColor: '#4F46E5',
              tension: 0.1
            }]
          },
          options: {
            responsive: true,
            plugins: {
              title: {
                display: true,
                text: '销售额趋势'
              }
            }
          }
        }
        break
      
      default: // bar
        chartConfig = {
          type: 'bar',
          data: {
            labels: Object.keys(salesByName),
            datasets: [{
              label: '销售额',
              data: Object.values(salesByName),
              backgroundColor: '#4F46E5',
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            plugins: {
              title: {
                display: true,
                text: '产品销售额'
              }
            }
          }
        }
    }
    
    // 创建新图表实例
    chartInstance.current = new Chart(chartRef.current, chartConfig as any)
    
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy()
      }
    }
  }, [sales, chartType])

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-700">销售数据分析</h3>
        <div className="flex gap-2">
          <button 
            onClick={() => setChartType('bar')} 
            className={`px-3 py-1 rounded-md text-sm ${
              chartType === 'bar' 
              ? 'bg-blue-100 text-blue-700' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            柱状图
          </button>
          <button 
            onClick={() => setChartType('pie')} 
            className={`px-3 py-1 rounded-md text-sm ${
              chartType === 'pie' 
              ? 'bg-blue-100 text-blue-700' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            饼图
          </button>
          <button 
            onClick={() => setChartType('line')} 
            className={`px-3 py-1 rounded-md text-sm ${
              chartType === 'line' 
              ? 'bg-blue-100 text-blue-700' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            趋势图
          </button>
        </div>
      </div>
      
      {loading && (
        <div className="h-80 flex items-center justify-center">
          <div className="flex items-center">
            <svg className="animate-spin h-5 w-5 text-blue-500 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            加载中...
          </div>
        </div>
      )}
      
      {error && (
        <div className="h-80 flex items-center justify-center">
          <div className="text-red-500">{error}</div>
        </div>
      )}
      
      {!loading && !error && sales.length === 0 && (
        <div className="h-80 flex items-center justify-center">
          <div className="text-gray-500">暂无销售数据，请先添加数据</div>
        </div>
      )}
      
      {!loading && !error && sales.length > 0 && (
        <div className="h-80">
          <canvas ref={chartRef}></canvas>
        </div>
      )}
    </div>
  )
} 