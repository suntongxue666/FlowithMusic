-- 创建用户表
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE,
  google_id TEXT UNIQUE,
  anonymous_id TEXT NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_agent TEXT,
  social_media_info JSONB DEFAULT '{}',
  coins INTEGER DEFAULT 100,
  is_premium BOOLEAN DEFAULT FALSE
);

-- 创建匿名会话表
CREATE TABLE anonymous_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  anonymous_id TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  linked_user_id UUID REFERENCES users(id) ON DELETE SET NULL
);

-- 创建Letters表
CREATE TABLE letters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  anonymous_id TEXT,
  link_id TEXT NOT NULL UNIQUE,
  recipient_name TEXT NOT NULL,
  message TEXT NOT NULL,
  song_id TEXT NOT NULL,
  song_title TEXT NOT NULL,
  song_artist TEXT NOT NULL,
  song_album_cover TEXT NOT NULL,
  song_preview_url TEXT,
  song_spotify_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  view_count INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT TRUE,
  
  -- 确保每个Letter要么属于用户要么属于匿名会话
  CONSTRAINT letters_owner_check CHECK (
    (user_id IS NOT NULL AND anonymous_id IS NULL) OR 
    (user_id IS NULL AND anonymous_id IS NOT NULL)
  )
);

-- 创建索引以提高查询性能
CREATE INDEX idx_letters_user_id ON letters(user_id);
CREATE INDEX idx_letters_anonymous_id ON letters(anonymous_id);
CREATE INDEX idx_letters_link_id ON letters(link_id);
CREATE INDEX idx_letters_created_at ON letters(created_at DESC);
CREATE INDEX idx_letters_view_count ON letters(view_count DESC);
CREATE INDEX idx_letters_song_artist ON letters(song_artist);
CREATE INDEX idx_letters_is_public ON letters(is_public);
CREATE INDEX idx_users_google_id ON users(google_id);
CREATE INDEX idx_users_anonymous_id ON users(anonymous_id);
CREATE INDEX idx_anonymous_sessions_anonymous_id ON anonymous_sessions(anonymous_id);

-- 创建自动更新updated_at的函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 为users表添加自动更新触发器
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- 为letters表添加自动更新触发器
CREATE TRIGGER update_letters_updated_at 
  BEFORE UPDATE ON letters 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- 创建增加浏览次数的函数
CREATE OR REPLACE FUNCTION increment_view_count(letter_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE letters 
  SET view_count = view_count + 1 
  WHERE id = letter_id;
END;
$$ LANGUAGE plpgsql;

-- 启用行级安全策略 (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE anonymous_sessions ENABLE ROW LEVEL SECURITY;

-- 用户表的RLS策略
CREATE POLICY "用户只能查看自己的信息" ON users
  FOR SELECT USING (auth.uid()::text = google_id OR id = auth.uid());

CREATE POLICY "用户只能更新自己的信息" ON users
  FOR UPDATE USING (auth.uid()::text = google_id);

-- Letters表的RLS策略
CREATE POLICY "所有人都可以查看公开的Letters" ON letters
  FOR SELECT USING (is_public = true);

CREATE POLICY "用户可以查看自己的所有Letters" ON letters
  FOR SELECT USING (
    (auth.uid() IS NOT NULL AND user_id IN (
      SELECT id FROM users WHERE google_id = auth.uid()::text
    ))
  );

CREATE POLICY "认证用户可以创建Letters" ON letters
  FOR INSERT WITH CHECK (
    (auth.uid() IS NOT NULL AND user_id IN (
      SELECT id FROM users WHERE google_id = auth.uid()::text
    )) OR
    (auth.uid() IS NULL AND anonymous_id IS NOT NULL)
  );

CREATE POLICY "用户只能更新自己的Letters" ON letters
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND user_id IN (
      SELECT id FROM users WHERE google_id = auth.uid()::text
    )
  );

CREATE POLICY "用户只能删除自己的Letters" ON letters
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND user_id IN (
      SELECT id FROM users WHERE google_id = auth.uid()::text
    )
  );

-- 匿名会话表的RLS策略
CREATE POLICY "允许插入匿名会话" ON anonymous_sessions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "允许更新匿名会话关联" ON anonymous_sessions
  FOR UPDATE USING (true);

-- 为公开数据创建视图（便于查询优化）
CREATE VIEW public_letters_view AS
SELECT 
  l.*,
  u.display_name as user_display_name,
  u.avatar_url as user_avatar_url
FROM letters l
LEFT JOIN users u ON l.user_id = u.id
WHERE l.is_public = true;

-- 插入一些示例数据（可选）
-- INSERT INTO users (email, google_id, anonymous_id, display_name) VALUES
-- ('test@example.com', 'google_123', 'anon_test_123', 'Test User');

-- 注释：这个SQL文件需要在Supabase的SQL编辑器中执行