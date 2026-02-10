-- 创建Letter浏览记录表
CREATE TABLE IF NOT EXISTS letter_views (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    letter_link_id VARCHAR(255) NOT NULL,
    viewer_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    viewer_anonymous_id VARCHAR(255),
    viewer_display_name VARCHAR(255) NOT NULL DEFAULT 'Anonymous',
    viewer_avatar_url TEXT,
    user_agent TEXT,
    ip_address VARCHAR(45),
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建Letter互动记录表
CREATE TABLE IF NOT EXISTS letter_interactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    letter_link_id VARCHAR(255) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    anonymous_id VARCHAR(255),
    user_display_name VARCHAR(255) NOT NULL DEFAULT 'Anonymous',
    user_avatar_url TEXT,
    emoji VARCHAR(10) NOT NULL,
    emoji_label VARCHAR(50) NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_letter_views_link_id ON letter_views(letter_link_id);
CREATE INDEX IF NOT EXISTS idx_letter_views_user_id ON letter_views(viewer_user_id);
CREATE INDEX IF NOT EXISTS idx_letter_views_anonymous_id ON letter_views(viewer_anonymous_id);
CREATE INDEX IF NOT EXISTS idx_letter_views_viewed_at ON letter_views(viewed_at);

CREATE INDEX IF NOT EXISTS idx_letter_interactions_link_id ON letter_interactions(letter_link_id);
CREATE INDEX IF NOT EXISTS idx_letter_interactions_user_id ON letter_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_letter_interactions_anonymous_id ON letter_interactions(anonymous_id);
CREATE INDEX IF NOT EXISTS idx_letter_interactions_emoji ON letter_interactions(emoji);
CREATE INDEX IF NOT EXISTS idx_letter_interactions_created_at ON letter_interactions(created_at);

-- 创建复合索引
CREATE INDEX IF NOT EXISTS idx_letter_interactions_link_emoji ON letter_interactions(letter_link_id, emoji);

-- 设置RLS (Row Level Security) 策略
ALTER TABLE letter_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE letter_interactions ENABLE ROW LEVEL SECURITY;

-- 允许所有用户插入浏览记录（匿名用户也可以）
CREATE POLICY "Allow insert letter views" ON letter_views
    FOR INSERT WITH CHECK (true);

-- 允许所有用户查看浏览记录
CREATE POLICY "Allow select letter views" ON letter_views
    FOR SELECT USING (true);

-- 允许所有用户插入互动记录（匿名用户也可以）
CREATE POLICY "Allow insert letter interactions" ON letter_interactions
    FOR INSERT WITH CHECK (true);

-- 允许所有用户查看互动记录
CREATE POLICY "Allow select letter interactions" ON letter_interactions
    FOR SELECT USING (true);

-- 创建视图来获取Letter的统计信息
CREATE OR REPLACE VIEW letter_analytics AS
SELECT 
    l.link_id,
    l.recipient_name,
    l.created_at as letter_created_at,
    COALESCE(v.view_count, 0) as total_views,
    COALESCE(i.interaction_count, 0) as total_interactions,
    COALESCE(v.unique_viewers, 0) as unique_viewers
FROM letters l
LEFT JOIN (
    SELECT 
        letter_link_id,
        COUNT(*) as view_count,
        COUNT(DISTINCT COALESCE(viewer_user_id::text, viewer_anonymous_id)) as unique_viewers
    FROM letter_views 
    GROUP BY letter_link_id
) v ON l.link_id = v.letter_link_id
LEFT JOIN (
    SELECT 
        letter_link_id,
        COUNT(*) as interaction_count
    FROM letter_interactions 
    GROUP BY letter_link_id
) i ON l.link_id = i.letter_link_id;

-- 创建函数来获取Letter的详细互动统计
CREATE OR REPLACE FUNCTION get_letter_interaction_stats(link_id_param VARCHAR)
RETURNS TABLE (
    emoji VARCHAR,
    emoji_label VARCHAR,
    count BIGINT,
    recent_users JSON
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        li.emoji,
        li.emoji_label,
        COUNT(*) as count,
        JSON_AGG(
            JSON_BUILD_OBJECT(
                'displayName', li.user_display_name,
                'avatarUrl', li.user_avatar_url,
                'createdAt', li.created_at
            ) ORDER BY li.created_at DESC
        ) FILTER (WHERE rn <= 5) as recent_users
    FROM (
        SELECT *,
               ROW_NUMBER() OVER (PARTITION BY emoji ORDER BY created_at DESC) as rn
        FROM letter_interactions 
        WHERE letter_link_id = link_id_param
    ) li
    GROUP BY li.emoji, li.emoji_label
    ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;

-- 创建函数来增加Letter浏览计数
CREATE OR REPLACE FUNCTION increment_view_count(letter_link_id VARCHAR)
RETURNS void AS $$
BEGIN
    UPDATE letters 
    SET 
        view_count = view_count + 1,
        updated_at = NOW()
    WHERE link_id = letter_link_id;
END;
$$ LANGUAGE plpgsql;