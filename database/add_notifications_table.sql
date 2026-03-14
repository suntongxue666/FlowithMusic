-- 创建通知表
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id varchar NOT NULL,
  actor_id varchar NOT NULL,
  actor_name varchar,
  actor_avatar varchar,
  type varchar NOT NULL, -- 'interaction', 'profile_visit'
  letter_id varchar,
  metadata jsonb,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 为查询加速创建索引
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
