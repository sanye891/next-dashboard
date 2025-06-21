// supabaseClient.ts
// 初始化 Supabase 客户端，供全局调用
import { createClient } from '@supabase/supabase-js'

// Supabase 项目的 URL 和 匿名公钥（在 Supabase 控制台获取）
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// 创建并导出 Supabase 客户端实例，增加非空断言，确保类型为 string
export const supabase = createClient(supabaseUrl!, supabaseAnonKey!)
