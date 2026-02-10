-- 验证迁移系统的测试脚本

-- 1. 检查所有必要的表是否存在
SELECT 
  'Table Check' as test_type,
  table_name,
  CASE WHEN table_name IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('users', 'letters', 'anonymous_sessions')
ORDER BY table_name;

-- 2. 检查关键字段是否存在
SELECT 
  'Column Check' as test_type,
  table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name IN ('users', 'letters', 'anonymous_sessions')
  AND column_name IN ('user_id', 'anonymous_id', 'google_id', 'email', 'display_name')
ORDER BY table_name, column_name;

-- 3. 测试迁移函数
SELECT 
  'Function Test' as test_type,
  'count_migratable_letters' as function_name,
  count_migratable_letters('test_id_12345') as result;

-- 4. 检查现有Letters的用户绑定情况
SELECT 
  'Letters Analysis' as test_type,
  COUNT(*) as total_letters,
  COUNT(user_id) as letters_with_user_id,
  COUNT(anonymous_id) as letters_with_anonymous_id,
  COUNT(CASE WHEN user_id IS NOT NULL AND anonymous_id IS NOT NULL THEN 1 END) as letters_with_both,
  COUNT(CASE WHEN user_id IS NULL AND anonymous_id IS NULL THEN 1 END) as letters_orphaned
FROM letters;

-- 5. 检查用户表状态
SELECT 
  'Users Analysis' as test_type,
  COUNT(*) as total_users,
  COUNT(google_id) as users_with_google_id,
  COUNT(anonymous_id) as users_with_anonymous_id,
  COUNT(email) as users_with_email
FROM users;

-- 6. 显示示例数据
SELECT 
  'Sample Data' as info,
  'Recent Letters' as type,
  id,
  recipient_name,
  CASE 
    WHEN user_id IS NOT NULL THEN 'Authenticated User'
    WHEN anonymous_id IS NOT NULL THEN 'Anonymous User'
    ELSE 'Orphaned'
  END as user_type,
  created_at
FROM letters 
ORDER BY created_at DESC 
LIMIT 5;