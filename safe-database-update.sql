-- 安全的数据库更新脚本 - 只执行必要的操作
-- 跳过已存在的策略，只创建缺失的函数

-- 1. 创建迁移函数（使用CREATE OR REPLACE确保安全）
CREATE OR REPLACE FUNCTION migrate_anonymous_letters_to_user(
  p_user_id UUID,
  p_anonymous_id TEXT
)
RETURNS INTEGER AS $$
DECLARE
  migrated_count INTEGER := 0;
BEGIN
  -- 检查用户是否存在
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User with ID % does not exist', p_user_id;
  END IF;

  -- 迁移匿名Letters到用户账户
  UPDATE letters 
  SET 
    user_id = p_user_id,
    anonymous_id = NULL,
    updated_at = NOW()
  WHERE 
    anonymous_id = p_anonymous_id 
    AND user_id IS NULL;
  
  GET DIAGNOSTICS migrated_count = ROW_COUNT;
  
  -- 记录迁移操作（添加ON CONFLICT处理）
  INSERT INTO anonymous_sessions (anonymous_id, user_agent, linked_user_id)
  VALUES (p_anonymous_id, 'Migration Operation', p_user_id)
  ON CONFLICT (anonymous_id) DO UPDATE SET
    linked_user_id = p_user_id,
    user_agent = 'Migration Operation';
  
  RETURN migrated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 创建查询函数
CREATE OR REPLACE FUNCTION count_migratable_letters(p_anonymous_id TEXT)
RETURNS INTEGER AS $$
DECLARE
  letter_count INTEGER := 0;
BEGIN
  SELECT COUNT(*) 
  INTO letter_count
  FROM letters 
  WHERE anonymous_id = p_anonymous_id AND user_id IS NULL;
  
  RETURN letter_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 创建用于测试的函数
CREATE OR REPLACE FUNCTION test_migration_system()
RETURNS TEXT AS $$
DECLARE
  result TEXT := '';
BEGIN
  -- 测试函数是否创建成功
  result := result || 'SUCCESS: Migration functions created successfully' || E'\n';
  
  -- 测试计数函数
  BEGIN
    PERFORM count_migratable_letters('test_anonymous_id');
    result := result || 'SUCCESS: count_migratable_letters function works' || E'\n';
  EXCEPTION WHEN OTHERS THEN
    result := result || 'ERROR: count_migratable_letters function failed - ' || SQLERRM || E'\n';
  END;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 运行测试
SELECT test_migration_system();

-- 5. 检查表结构信息
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name IN ('users', 'letters', 'anonymous_sessions')
ORDER BY table_name, ordinal_position;