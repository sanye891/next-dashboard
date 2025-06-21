-- 初始数据库架构
-- 作者: sanye891
-- 日期: 2025-6-22
-- 描述: 销售数据分析平台的初始数据库架构设置

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-----------------------------------------
-- 表结构定义
-----------------------------------------

-- 用户资料表
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  updated_at TIMESTAMPTZ DEFAULT now(),
  name TEXT,
  avatar_url TEXT,
  company TEXT,
  preferences JSONB DEFAULT '{}',
  role TEXT DEFAULT 'user'::TEXT
);

-- 销售数据表
CREATE TABLE IF NOT EXISTS public.sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  category TEXT,
  description TEXT
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_sales_user_id ON public.sales (user_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON public.sales (created_at);

-- 文件记录表
CREATE TABLE IF NOT EXISTS public.files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT now(),
  name TEXT NOT NULL,
  size INTEGER NOT NULL,
  type TEXT NOT NULL,
  url TEXT NOT NULL,
  category TEXT DEFAULT '其他',
  user_id UUID NOT NULL REFERENCES auth.users(id)
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_files_user_id ON public.files (user_id);
CREATE INDEX IF NOT EXISTS idx_files_created_at ON public.files (created_at);

-----------------------------------------
-- 触发器函数
-----------------------------------------

-- 自动创建用户资料的触发器函数
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, avatar_url)
  VALUES (NEW.id, NEW.email, '');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 更新时间戳触发器函数
CREATE OR REPLACE FUNCTION public.update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-----------------------------------------
-- 触发器
-----------------------------------------

-- 当新用户注册时自动创建profile记录
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 当sales记录更新时自动更新时间戳
DROP TRIGGER IF EXISTS update_sales_timestamp ON public.sales;
CREATE TRIGGER update_sales_timestamp
BEFORE UPDATE ON public.sales
FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();

-- 当profiles记录更新时自动更新时间戳
DROP TRIGGER IF EXISTS update_profiles_timestamp ON public.profiles;
CREATE TRIGGER update_profiles_timestamp
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();

-----------------------------------------
-- 行级安全策略 (RLS)
-----------------------------------------

-- 启用所有表的RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- profiles表策略
CREATE POLICY "用户可以查看自己的资料" 
ON public.profiles FOR SELECT USING (
  auth.uid() = id
);

CREATE POLICY "用户可以更新自己的资料" 
ON public.profiles FOR UPDATE USING (
  auth.uid() = id
);

-- sales表策略
CREATE POLICY "用户可以查看自己的销售数据" 
ON public.sales FOR SELECT USING (
  auth.uid() = user_id
);

CREATE POLICY "用户可以添加自己的销售数据" 
ON public.sales FOR INSERT WITH CHECK (
  auth.uid() = user_id
);

CREATE POLICY "用户可以更新自己的销售数据" 
ON public.sales FOR UPDATE USING (
  auth.uid() = user_id
);

CREATE POLICY "用户可以删除自己的销售数据" 
ON public.sales FOR DELETE USING (
  auth.uid() = user_id
);

-- files表策略
CREATE POLICY "用户可以查看自己的文件" 
ON public.files FOR SELECT USING (
  auth.uid() = user_id
);

CREATE POLICY "用户可以添加自己的文件" 
ON public.files FOR INSERT WITH CHECK (
  auth.uid() = user_id
);

CREATE POLICY "用户可以更新自己的文件" 
ON public.files FOR UPDATE USING (
  auth.uid() = user_id
);

CREATE POLICY "用户可以删除自己的文件" 
ON public.files FOR DELETE USING (
  auth.uid() = user_id
);

-----------------------------------------
-- 存储桶设置
-----------------------------------------

-- 创建存储桶
INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('profiles', 'profiles', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 存储桶RLS策略
-- uploads 存储桶策略
CREATE POLICY "允许所有人读取文件" 
ON storage.objects FOR SELECT USING (
  (bucket_id = 'uploads')
);

CREATE POLICY "允许已登录用户添加文件" 
ON storage.objects FOR INSERT WITH CHECK (
  (bucket_id = 'uploads') AND (auth.role() = 'authenticated')
);

CREATE POLICY "允许用户删除自己的文件" 
ON storage.objects FOR DELETE USING (
  (bucket_id = 'uploads') AND (owner = auth.uid())
);

-- profiles 存储桶策略
CREATE POLICY "允许所有人查看头像" 
ON storage.objects FOR SELECT USING (
  bucket_id = 'profiles'
);

CREATE POLICY "允许用户上传自己的头像" 
ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'profiles' AND 
  auth.role() = 'authenticated' AND 
  (storage.filename(name) = auth.uid()::text || '.jpg' OR 
   storage.filename(name) = auth.uid()::text || '.png' OR
   storage.filename(name) = auth.uid()::text || '.gif')
);

CREATE POLICY "允许用户更新自己的头像" 
ON storage.objects FOR UPDATE USING (
  bucket_id = 'profiles' AND 
  owner = auth.uid() AND 
  (storage.filename(name) = auth.uid()::text || '.jpg' OR 
   storage.filename(name) = auth.uid()::text || '.png' OR
   storage.filename(name) = auth.uid()::text || '.gif')
);

CREATE POLICY "允许用户删除自己的头像" 
ON storage.objects FOR DELETE USING (
  bucket_id = 'profiles' AND 
  owner = auth.uid() AND 
  (storage.filename(name) = auth.uid()::text || '.jpg' OR 
   storage.filename(name) = auth.uid()::text || '.png' OR
   storage.filename(name) = auth.uid()::text || '.gif')
);

-- 创建视图以便于查询
CREATE OR REPLACE VIEW public.user_sales_summary AS
SELECT 
  user_id,
  COUNT(*) as total_transactions,
  SUM(value) as total_value,
  MIN(created_at) as first_sale_date,
  MAX(created_at) as last_sale_date
FROM public.sales
GROUP BY user_id;

-- 插入测试数据 (可选 - 在生产环境中移除)
/*
INSERT INTO public.sales (name, value, user_id, category)
VALUES 
  ('测试销售 1', 1000.00, 'YOUR_TEST_USER_ID_HERE', '产品'),
  ('测试销售 2', 500.50, 'YOUR_TEST_USER_ID_HERE', '服务');
*/ 