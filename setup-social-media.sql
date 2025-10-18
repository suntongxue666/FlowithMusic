-- 创建社交媒体账号表
CREATE TABLE IF NOT EXISTS user_social_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('instagram', 'twitter', 'tiktok', 'youtube', 'spotify')),
    username TEXT NOT NULL,
    url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, platform)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_user_social_media_user_id ON user_social_media(user_id);
CREATE INDEX IF NOT EXISTS idx_user_social_media_platform ON user_social_media(platform);

-- 启用RLS
ALTER TABLE user_social_media ENABLE ROW LEVEL SECURITY;

-- RLS策略
DROP POLICY IF EXISTS "用户可以查看自己的社交媒体账号" ON user_social_media;
CREATE POLICY "用户可以查看自己的社交媒体账号" ON user_social_media
    FOR SELECT USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "用户可以插入自己的社交媒体账号" ON user_social_media;
CREATE POLICY "用户可以插入自己的社交媒体账号" ON user_social_media
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "用户可以更新自己的社交媒体账号" ON user_social_media;
CREATE POLICY "用户可以更新自己的社交媒体账号" ON user_social_media
    FOR UPDATE USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "用户可以删除自己的社交媒体账号" ON user_social_media;
CREATE POLICY "用户可以删除自己的社交媒体账号" ON user_social_media
    FOR DELETE USING (auth.uid()::text = user_id::text);

-- 添加更新时间戳触发器
DROP TRIGGER IF EXISTS update_user_social_media_updated_at ON user_social_media;
CREATE TRIGGER update_user_social_media_updated_at 
    BEFORE UPDATE ON user_social_media 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 验证表创建成功
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_social_media'
ORDER BY ordinal_position;