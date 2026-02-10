-- 完整的数据库设置脚本（简化版）
-- 只创建必要的表和策略

-- 1. 确保users表存在并有正确的结构
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE,
  google_id TEXT UNIQUE,
  anonymous_id TEXT NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_agent TEXT,
  social_media_info JSONB DEFAULT '{}',
  coins INTEGER DEFAULT 100,
  is_premium BOOLEAN DEFAULT FALSE
);

-- 2. 创建简化的匿名会话表（如果需要的话）
CREATE TABLE IF NOT EXISTS anonymous_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  anonymous_id TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  linked_user_id UUID REFERENCES users(id) ON DELETE SET NULL
);

-- 3. 确保letters表存在（应该已经存在）
-- 这个表应该已经存在，因为我们能够查询到数据

-- 4. 创建必要的索引
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_anonymous_id ON users(anonymous_id);
CREATE INDEX IF NOT EXISTS idx_anonymous_sessions_anonymous_id ON anonymous_sessions(anonymous_id);

-- 5. 启用RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE anonymous_sessions ENABLE ROW LEVEL SECURITY;

-- 6. 删除可能存在的旧策略
DROP POLICY IF EXISTS "用户只能查看自己的信息" ON users;
DROP POLICY IF EXISTS "用户只能更新自己的信息" ON users;
DROP POLICY IF EXISTS "允许OAuth用户注册" ON users;
DROP POLICY IF EXISTS "users_insert_policy" ON users;
DROP POLICY IF EXISTS "users_select_policy" ON users;

-- 7. 创建users表的新策略
-- 允许插入用户记录（OAuth或匿名）
CREATE POLICY "users_insert_policy" ON users
  FOR INSERT WITH CHECK (
    -- OAuth用户：必须有google_id且与认证用户匹配
    (auth.uid() IS NOT NULL AND google_id = auth.uid()::text) OR
    -- 匿名用户：没有认证，只有anonymous_id
    (auth.uid() IS NULL AND google_id IS NULL AND anonymous_id IS NOT NULL)
  );

-- 允许查看用户信息
CREATE POLICY "users_select_policy" ON users
  FOR SELECT USING (
    -- 认证用户查看自己的记录
    (auth.uid() IS NOT NULL AND google_id = auth.uid()::text) OR
    -- 允许查看匿名用户的公开信息（用于Letter显示）
    (google_id IS NULL)
  );

-- 允许更新自己的用户信息
CREATE POLICY "users_update_policy" ON users
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND google_id = auth.uid()::text
  );

-- 8. 创建anonymous_sessions表的策略
CREATE POLICY "anonymous_sessions_insert_policy" ON anonymous_sessions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "anonymous_sessions_select_policy" ON anonymous_sessions
  FOR SELECT USING (true);

CREATE POLICY "anonymous_sessions_update_policy" ON anonymous_sessions
  FOR UPDATE USING (true);

-- 9. 更新letters表的策略（如果需要）
DROP POLICY IF EXISTS "认证用户可以创建Letters" ON letters;
DROP POLICY IF EXISTS "letters_insert_policy" ON letters;

CREATE POLICY "letters_insert_policy" ON letters
  FOR INSERT WITH CHECK (
    -- 认证用户：必须有user_id
    (auth.uid() IS NOT NULL AND user_id IS NOT NULL AND anonymous_id IS NULL) OR
    -- 匿名用户：必须有anonymous_id
    (auth.uid() IS NULL AND anonymous_id IS NOT NULL AND user_id IS NULL)
  );

-- 10. 创建自动更新updated_at的函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 11. 为users表添加自动更新触发器
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- 12. 创建测试函数
CREATE OR REPLACE FUNCTION test_database_setup()
RETURNS TEXT AS $$
DECLARE
  test_anonymous_id TEXT;
  test_session_id UUID;
  test_user_id UUID;
  result TEXT := '';
BEGIN
  -- 生成测试ID
  test_anonymous_id := 'test_setup_' || extract(epoch from now())::text;
  
  -- 测试匿名会话创建
  BEGIN
    INSERT INTO anonymous_sessions (anonymous_id, user_agent)
    VALUES (test_anonymous_id, 'Setup Test Agent')
    RETURNING id INTO test_session_id;
    
    result := result || 'SUCCESS: Anonymous session created' || E'\n';
    
    -- 测试匿名用户创建
    INSERT INTO users (anonymous_id, display_name, coins, is_premium)
    VALUES (test_anonymous_id, 'Test Setup User', 100, false)
    RETURNING id INTO test_user_id;
    
    result := result || 'SUCCESS: Anonymous user created' || E'\n';
    
    -- 清理测试数据
    DELETE FROM users WHERE id = test_user_id;
    DELETE FROM anonymous_sessions WHERE id = test_session_id;
    
    result := result || 'SUCCESS: Test data cleaned up' || E'\n';
    
  EXCEPTION WHEN OTHERS THEN
    result := result || 'ERROR: ' || SQLERRM || E'\n';
  END;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. 运行测试
SELECT test_database_setup();