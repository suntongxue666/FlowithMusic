-- 修复匿名会话表的RLS策略
-- 这个脚本应该在Supabase后台的SQL编辑器中执行

-- 1. 先删除可能存在的有问题的策略
DROP POLICY IF EXISTS "允许插入匿名会话" ON anonymous_sessions;
DROP POLICY IF EXISTS "允许查看匿名会话" ON anonymous_sessions;
DROP POLICY IF EXISTS "允许更新匿名会话关联" ON anonymous_sessions;

-- 2. 重新创建匿名会话表的策略
-- 允许所有人插入匿名会话（不需要认证）
CREATE POLICY "anonymous_sessions_insert_policy" ON anonymous_sessions
  FOR INSERT WITH CHECK (true);

-- 允许所有人查看匿名会话（用于迁移和关联）
CREATE POLICY "anonymous_sessions_select_policy" ON anonymous_sessions
  FOR SELECT USING (true);

-- 允许更新匿名会话（用于用户关联）
CREATE POLICY "anonymous_sessions_update_policy" ON anonymous_sessions
  FOR UPDATE USING (true);

-- 3. 同时修复用户表的策略，允许匿名用户注册
DROP POLICY IF EXISTS "允许OAuth用户注册" ON users;

-- 允许创建用户记录（OAuth用户或匿名用户）
CREATE POLICY "users_insert_policy" ON users
  FOR INSERT WITH CHECK (
    -- 允许OAuth认证用户创建自己的记录
    (auth.uid() IS NOT NULL AND google_id = auth.uid()::text) OR
    -- 允许匿名用户创建记录（不需要认证）
    (auth.uid() IS NULL AND anonymous_id IS NOT NULL AND google_id IS NULL)
  );

-- 4. 更新用户查看策略
DROP POLICY IF EXISTS "用户只能查看自己的信息" ON users;

CREATE POLICY "users_select_policy" ON users
  FOR SELECT USING (
    -- 认证用户可以查看自己的记录
    (auth.uid() IS NOT NULL AND google_id = auth.uid()::text) OR
    -- 允许查看匿名用户的公开信息（用于Letter显示）
    (google_id IS NULL AND anonymous_id IS NOT NULL)
  );

-- 5. 修复letters表的插入策略
DROP POLICY IF EXISTS "认证用户可以创建Letters" ON letters;

CREATE POLICY "letters_insert_policy" ON letters
  FOR INSERT WITH CHECK (
    -- 认证用户必须提供user_id
    (auth.uid() IS NOT NULL AND user_id IS NOT NULL AND anonymous_id IS NULL) OR
    -- 匿名用户必须提供anonymous_id
    (auth.uid() IS NULL AND anonymous_id IS NOT NULL AND user_id IS NULL)
  );

-- 6. 创建一个测试函数来验证策略
CREATE OR REPLACE FUNCTION test_rls_policies()
RETURNS TEXT AS $$
DECLARE
  test_anonymous_id TEXT;
  test_session_id UUID;
  result TEXT := '';
BEGIN
  -- 生成测试ID
  test_anonymous_id := 'test_' || extract(epoch from now())::text;
  
  -- 测试匿名会话创建
  BEGIN
    INSERT INTO anonymous_sessions (anonymous_id, user_agent)
    VALUES (test_anonymous_id, 'Test User Agent')
    RETURNING id INTO test_session_id;
    
    result := result || 'SUCCESS: Anonymous session created with ID ' || test_session_id || E'\n';
    
    -- 清理测试数据
    DELETE FROM anonymous_sessions WHERE id = test_session_id;
    result := result || 'SUCCESS: Test data cleaned up' || E'\n';
    
  EXCEPTION WHEN OTHERS THEN
    result := result || 'ERROR: Failed to create anonymous session - ' || SQLERRM || E'\n';
  END;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. 运行测试
SELECT test_rls_policies();