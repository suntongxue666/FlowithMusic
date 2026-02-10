-- 1. 查看数据库中的所有Letters（包括时间戳详细信息）
SELECT 
    id,
    link_id, 
    recipient_name,
    LEFT(message, 50) as message_preview,
    song_title,
    song_artist,
    created_at AT TIME ZONE 'UTC' as utc_time,
    created_at AT TIME ZONE 'Asia/Shanghai' as china_time,
    is_public,
    anonymous_id,
    user_id
FROM letters 
ORDER BY created_at DESC;

-- 2. 检查今天（UTC时间）创建的所有Letters
SELECT 
    id,
    link_id, 
    recipient_name,
    song_title,
    created_at,
    EXTRACT(EPOCH FROM created_at) as timestamp_epoch
FROM letters 
WHERE created_at >= CURRENT_DATE AT TIME ZONE 'UTC'
ORDER BY created_at DESC;

-- 3. 检查最近2小时内的Letters
SELECT 
    id,
    link_id, 
    recipient_name,
    song_title,
    created_at,
    AGE(NOW(), created_at) as time_ago
FROM letters 
WHERE created_at >= NOW() - INTERVAL '2 hours'
ORDER BY created_at DESC;

-- 4. 查找linkId包含'202507260934'的Letters
SELECT 
    id,
    link_id, 
    recipient_name,
    song_title,
    created_at
FROM letters 
WHERE link_id LIKE '%202507260934%';

-- 5. 统计信息
SELECT 
    COUNT(*) as total_count,
    MAX(created_at) as latest_creation,
    MIN(created_at) as earliest_creation,
    COUNT(CASE WHEN anonymous_id IS NOT NULL THEN 1 END) as anonymous_count,
    COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as user_count
FROM letters;

-- 6. 检查数据库连接和权限
SELECT 
    current_user as db_user,
    session_user as session_user,
    current_database() as database_name,
    version() as postgres_version;