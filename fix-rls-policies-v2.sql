-- 修复Supabase用户表的RLS策略
-- 添加缺失的INSERT和其他必要策略

-- 1. 为users表添加INSERT策略（允许通过OAuth创建用户）
CREATE POLICY "允许OAuth用户注册" ON users
  FOR INSERT WITH CHECK (
    -- 允许通过Supabase Auth认证的用户创建自己的记录
    auth.uid()::text = google_id OR
    -- 允许匿名用户创建记录（用于匿名会话）
    (auth.uid() IS NULL AND anonymous_id IS NOT NULL)
  );

-- 2. 更新用户查看策略，允许查看匿名用户记录
DROP POLICY IF EXISTS "用户只能查看自己的信息" ON users;
CREATE POLICY "用户只能查看自己的信息" ON users
  FOR SELECT USING (
    -- 认证用户可以查看自己的记录
    auth.uid()::text = google_id OR 
    id = auth.uid() OR
    -- 允许查看匿名用户的基本信息（用于Letter关联显示）
    (google_id IS NULL AND anonymous_id IS NOT NULL)
  );

-- 3. 更新letters表的INSERT策略，简化逻辑
DROP POLICY IF EXISTS "认证用户可以创建Letters" ON letters;
CREATE POLICY "认证用户可以创建Letters" ON letters
  FOR INSERT WITH CHECK (
    -- 认证用户创建Letter时必须指定user_id
    (auth.uid() IS NOT NULL AND user_id IS NOT NULL) OR
    -- 匿名用户创建Letter时必须指定anonymous_id
    (auth.uid() IS NULL AND anonymous_id IS NOT NULL AND user_id IS NULL)
  );

-- 4. 添加允许匿名用户创建匿名会话的策略
DROP POLICY IF EXISTS "允许插入匿名会话" ON anonymous_sessions;
CREATE POLICY "允许插入匿名会话" ON anonymous_sessions
  FOR INSERT WITH CHECK (true);

-- 5. 允许查看匿名会话（用于用户迁移）
CREATE POLICY "允许查看匿名会话" ON anonymous_sessions
  FOR SELECT USING (true);

-- 6. 创建一个用于增加Letter浏览数的公开函数（绕过RLS）
CREATE OR REPLACE FUNCTION public_increment_view_count(letter_link_id TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE letters 
  SET view_count = view_count + 1 
  WHERE link_id = letter_link_id AND is_public = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. 创建一个用于获取公开Letter的视图函数
CREATE OR REPLACE FUNCTION get_public_letter(letter_link_id TEXT)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  anonymous_id TEXT,
  link_id TEXT,
  recipient_name TEXT,
  message TEXT,
  song_id TEXT,
  song_title TEXT,
  song_artist TEXT,
  song_album_cover TEXT,
  song_preview_url TEXT,
  song_spotify_url TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  view_count INTEGER,
  is_public BOOLEAN,
  user_display_name TEXT,
  user_avatar_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.user_id,
    l.anonymous_id,
    l.link_id,
    l.recipient_name,
    l.message,
    l.song_id,
    l.song_title,
    l.song_artist,
    l.song_album_cover,
    l.song_preview_url,
    l.song_spotify_url,
    l.created_at,
    l.updated_at,
    l.view_count,
    l.is_public,
    u.display_name as user_display_name,
    u.avatar_url as user_avatar_url
  FROM letters l
  LEFT JOIN users u ON l.user_id = u.id
  WHERE l.link_id = letter_link_id 
    AND l.is_public = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;