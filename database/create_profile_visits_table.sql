-- 创建用户访问记录表 (用于统计和数据存储)
CREATE TABLE IF NOT EXISTS public.profile_visits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  target_user_id varchar NOT NULL, -- 被访问者的ID
  visitor_id varchar NOT NULL,    -- 访问者的ID (user_id 或 anonymous_id)
  visitor_name varchar,           -- 访问者昵称
  visitor_avatar varchar,         -- 访问者头像
  created_at timestamptz DEFAULT now()
);

-- 为查询加速创建索引
CREATE INDEX IF NOT EXISTS idx_profile_visits_target_user_id ON public.profile_visits(target_user_id);
CREATE INDEX IF NOT EXISTS idx_profile_visits_visitor_id ON public.profile_visits(visitor_id);
CREATE INDEX IF NOT EXISTS idx_profile_visits_created_at ON public.profile_visits(created_at);

-- 设置 RLS 策略 (可选，如果通过 API 访问且 API 使用 service_role 则不强制)
ALTER TABLE public.profile_visits ENABLE ROW LEVEL SECURITY;

-- 允许匿名/登录用户插入访问记录
CREATE POLICY "Allow anyone to insert profile visits" ON public.profile_visits
  FOR INSERT WITH CHECK (true);

-- 允许用户查看自己的被访问记录
CREATE POLICY "Allow users to view their own profile visits" ON public.profile_visits
  FOR SELECT USING (true);
