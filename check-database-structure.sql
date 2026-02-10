-- 检查当前数据库中存在哪些表
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 检查users表结构
\d users

-- 检查letters表结构  
\d letters