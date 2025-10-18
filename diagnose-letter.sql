-- 1. 查看数据库中现有的所有Letters
SELECT 
    id,
    link_id, 
    recipient_name,
    LEFT(message, 50) as message_preview,
    song_title,
    song_artist,
    created_at,
    is_public,
    anonymous_id,
    user_id
FROM letters 
ORDER BY created_at DESC;

-- 2. 查找今天创建的所有Letters
SELECT 
    id,
    link_id, 
    recipient_name,
    song_title,
    song_artist,
    created_at,
    is_public
FROM letters 
WHERE DATE(created_at) = CURRENT_DATE
ORDER BY created_at DESC;

-- 3. 查找linkId包含'202507260855'的Letters
SELECT 
    id,
    link_id, 
    recipient_name,
    song_title,
    song_artist,
    created_at,
    is_public
FROM letters 
WHERE link_id LIKE '%202507260855%'
ORDER BY created_at DESC;

-- 4. 查找最近1小时内创建的Letters
SELECT 
    id,
    link_id, 
    recipient_name,
    song_title,
    song_artist,
    created_at,
    is_public
FROM letters 
WHERE created_at >= NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- 5. 查看数据库的时区设置
SELECT name, setting FROM pg_settings WHERE name = 'timezone';