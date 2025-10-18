-- 检查特定Letter是否存在于数据库中
-- linkId: 202507260855J3mUeV

-- 1. 直接通过link_id查询Letter
SELECT 
    id,
    title,
    link_id,
    is_public,
    created_at,
    user_id,
    anonymous_id,
    LEFT(content, 100) as content_preview,
    CASE 
        WHEN music_data IS NOT NULL THEN 'Yes' 
        ELSE 'No' 
    END as has_music_data
FROM letters 
WHERE link_id = '202507260855J3mUeV';

-- 2. 检查最近1小时内创建的所有Letters
SELECT 
    id,
    title,
    link_id,
    is_public,
    created_at,
    user_id,
    anonymous_id
FROM letters 
WHERE created_at >= NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- 3. 检查类似linkId的Letters (以202507260855开头)
SELECT 
    id,
    title,
    link_id,
    is_public,
    created_at,
    user_id,
    anonymous_id
FROM letters 
WHERE link_id LIKE '202507260855%'
ORDER BY created_at DESC;

-- 4. 检查数据库表的基本统计
SELECT 
    COUNT(*) as total_letters,
    COUNT(CASE WHEN is_public = true THEN 1 END) as public_letters,
    COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as user_letters,
    COUNT(CASE WHEN anonymous_id IS NOT NULL THEN 1 END) as anonymous_letters,
    MAX(created_at) as latest_letter,
    MIN(created_at) as earliest_letter
FROM letters;

-- 5. 检查RLS策略是否正确配置（如果有权限的话）
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'letters';

-- 6. 检查表结构
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'letters' 
ORDER BY ordinal_position;