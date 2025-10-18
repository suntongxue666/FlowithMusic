-- 检查数据库中是否存在相关表
SELECT table_name, table_schema 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 如果没有letters表，创建完整的数据库结构
-- 首先创建users表
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE,
    display_name TEXT,
    avatar_url TEXT,
    google_id TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建letters表
CREATE TABLE IF NOT EXISTS letters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    anonymous_id TEXT, -- 用于匿名用户
    link_id TEXT NOT NULL UNIQUE,
    recipient_name TEXT NOT NULL,
    message TEXT NOT NULL,
    song_id TEXT,
    song_title TEXT NOT NULL,
    song_artist TEXT NOT NULL,
    song_album TEXT,
    song_album_cover TEXT,
    song_preview_url TEXT,
    song_spotify_url TEXT,
    music_data JSONB, -- 存储完整的音乐数据
    view_count INTEGER DEFAULT 0,
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_letters_link_id ON letters(link_id);
CREATE INDEX IF NOT EXISTS idx_letters_user_id ON letters(user_id);
CREATE INDEX IF NOT EXISTS idx_letters_anonymous_id ON letters(anonymous_id);
CREATE INDEX IF NOT EXISTS idx_letters_created_at ON letters(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_letters_is_public ON letters(is_public);

-- 创建RLS策略
ALTER TABLE letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users表的RLS策略
DROP POLICY IF EXISTS "用户可以查看自己的信息" ON users;
CREATE POLICY "用户可以查看自己的信息" ON users
    FOR SELECT USING (auth.uid()::text = id::text);

DROP POLICY IF EXISTS "用户可以更新自己的信息" ON users;
CREATE POLICY "用户可以更新自己的信息" ON users
    FOR UPDATE USING (auth.uid()::text = id::text);

DROP POLICY IF EXISTS "用户可以插入自己的信息" ON users;
CREATE POLICY "用户可以插入自己的信息" ON users
    FOR INSERT WITH CHECK (auth.uid()::text = id::text);

-- Letters表的RLS策略
DROP POLICY IF EXISTS "用户可以查看自己的Letters" ON letters;
CREATE POLICY "用户可以查看自己的Letters" ON letters
    FOR SELECT USING (
        auth.uid()::text = user_id::text OR 
        anonymous_id IS NOT NULL
    );

DROP POLICY IF EXISTS "允许匿名和认证用户查看公开Letters" ON letters;
CREATE POLICY "允许匿名和认证用户查看公开Letters" ON letters
    FOR SELECT USING (is_public = true);

DROP POLICY IF EXISTS "允许任何人通过link_id访问Letters" ON letters;
CREATE POLICY "允许任何人通过link_id访问Letters" ON letters
    FOR SELECT USING (link_id IS NOT NULL);

DROP POLICY IF EXISTS "用户可以创建Letters" ON letters;
CREATE POLICY "用户可以创建Letters" ON letters
    FOR INSERT WITH CHECK (
        auth.uid()::text = user_id::text OR 
        (user_id IS NULL AND anonymous_id IS NOT NULL)
    );

DROP POLICY IF EXISTS "用户可以更新自己的Letters" ON letters;
CREATE POLICY "用户可以更新自己的Letters" ON letters
    FOR UPDATE USING (
        auth.uid()::text = user_id::text OR 
        anonymous_id IS NOT NULL
    );

-- 创建更新时间戳的函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为表添加更新时间戳触发器
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_letters_updated_at ON letters;
CREATE TRIGGER update_letters_updated_at 
    BEFORE UPDATE ON letters 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 插入一些测试数据（可选）
INSERT INTO letters (
    link_id, 
    recipient_name, 
    message, 
    song_title, 
    song_artist, 
    song_album_cover,
    anonymous_id,
    is_public
) VALUES 
(
    'test_letter_001', 
    'Test Recipient', 
    'This is a test message to verify the database structure is working correctly. It contains enough words to meet the filtering criteria used in the application.', 
    'Test Song', 
    'Test Artist', 
    'https://i.scdn.co/image/ab67616d0000b2735f678e62c4b8380aca9bacb5',
    'test_anonymous_id',
    true
) ON CONFLICT (link_id) DO NOTHING;

-- 验证表已创建成功
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('users', 'letters')
ORDER BY table_name, ordinal_position;