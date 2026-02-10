-- 在Supabase后台执行：创建匿名用户Letter迁移函数
-- 这个函数将匿名用户的Letters迁移到认证用户账户

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
  
  -- 记录迁移操作
  INSERT INTO anonymous_sessions (anonymous_id, user_agent, linked_user_id)
  VALUES (p_anonymous_id, 'Migration Operation', p_user_id)
  ON CONFLICT (anonymous_id) DO UPDATE SET
    linked_user_id = p_user_id,
    user_agent = 'Migration Operation';
  
  RETURN migrated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建一个查询函数来检查可迁移的Letters数量
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