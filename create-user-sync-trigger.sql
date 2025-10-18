-- 创建用户数据同步触发器
-- 将Supabase auth.users的数据自动同步到自建users表

-- ============================================
-- 1. 创建触发器函数
-- ============================================

CREATE OR REPLACE FUNCTION sync_user_to_custom_table()
RETURNS TRIGGER AS $$$
DECLARE
  user_anonymous_id TEXT;
BEGIN
  -- 生成匿名ID（如果需要）
  user_anonymous_id := 'anon_' || extract(epoch from now()) || '_' || substr(md5(random()::text), 0, 9);
  
  -- 当用户在auth.users中创建时，同步到我们的users表
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.users (
      id,
      email,
      google_id,
      anonymous_id,
      display_name,
      avatar_url,
      user_agent,
      social_media_info,
      coins,
      is_premium,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      NEW.email,
      NEW.id::text,  -- 使用auth用户的ID作为google_id
      user_anonymous_id,
      COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name', 
        split_part(NEW.email, '@', 1)
      ),
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'user_agent',
      COALESCE(NEW.raw_user_meta_data, '{}'::jsonb),
      100,  -- 默认金币
      FALSE,  -- 默认非premium
      NEW.created_at,
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      display_name = EXCLUDED.display_name,
      avatar_url = EXCLUDED.avatar_url,
      social_media_info = EXCLUDED.social_media_info,
      updated_at = NOW();
      
    RETURN NEW;
  END IF;
  
  -- 当用户信息更新时，同步更新
  IF TG_OP = 'UPDATE' THEN
    UPDATE public.users SET
      email = NEW.email,
      display_name = COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name', 
        split_part(NEW.email, '@', 1)
      ),
      avatar_url = NEW.raw_user_meta_data->>'avatar_url',
      social_media_info = COALESCE(NEW.raw_user_meta_data, '{}'::jsonb),
      updated_at = NOW()
    WHERE id = NEW.id;
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. 创建触发器
-- ============================================

-- 删除可能存在的旧触发器
DROP TRIGGER IF EXISTS sync_auth_user_trigger ON auth.users;

-- 创建新触发器
CREATE TRIGGER sync_auth_user_trigger
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_to_custom_table();

-- ============================================
-- 3. 确保users表结构完整
-- ============================================

-- 修改id列为UUID类型，与auth.users保持一致
DO $$
BEGIN
  -- 检查并确保所有必要列存在
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'google_id') THEN
    ALTER TABLE users ADD COLUMN google_id TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'anonymous_id') THEN
    ALTER TABLE users ADD COLUMN anonymous_id TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'display_name') THEN
    ALTER TABLE users ADD COLUMN display_name TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'avatar_url') THEN
    ALTER TABLE users ADD COLUMN avatar_url TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'user_agent') THEN
    ALTER TABLE users ADD COLUMN user_agent TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'social_media_info') THEN
    ALTER TABLE users ADD COLUMN social_media_info JSONB DEFAULT '{}'::jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'coins') THEN
    ALTER TABLE users ADD COLUMN coins INTEGER DEFAULT 100;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_premium') THEN
    ALTER TABLE users ADD COLUMN is_premium BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- ============================================
-- 4. 创建索引
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_anonymous_id ON users(anonymous_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL;

-- ============================================
-- 5. 更新RLS策略
-- ============================================

-- 确保RLS策略允许触发器写入
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 删除旧策略
DROP POLICY IF EXISTS "users_allow_insert" ON users;
DROP POLICY IF EXISTS "users_allow_select" ON users;
DROP POLICY IF EXISTS "users_allow_update" ON users;

-- 创建新策略
CREATE POLICY "users_insert_policy" ON users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "users_select_policy" ON users
  FOR SELECT USING (
    auth.uid() = id OR  -- 用户可以查看自己的信息
    auth.uid() IS NULL  -- 允许匿名访问（用于兼容性）
  );

CREATE POLICY "users_update_policy" ON users
  FOR UPDATE USING (auth.uid() = id);

-- ============================================
-- 6. 创建Letter归属关联功能
-- ============================================

-- 更新迁移函数，支持通过用户ID迁移
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
  
  -- 更新anonymous_sessions表中的关联
  UPDATE anonymous_sessions 
  SET linked_user_id = p_user_id
  WHERE anonymous_id = p_anonymous_id;
  
  -- 迁移letter_interactions中的匿名记录
  UPDATE letter_interactions
  SET 
    user_id = p_user_id,
    user_display_name = COALESCE(
      (SELECT display_name FROM users WHERE id = p_user_id),
      user_display_name
    ),
    user_avatar_url = COALESCE(
      (SELECT avatar_url FROM users WHERE id = p_user_id),
      user_avatar_url
    )
  WHERE anonymous_id = p_anonymous_id;
  
  RETURN migrated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. 测试触发器
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ 用户数据同步触发器创建完成！';
  RAISE NOTICE '📋 触发器功能：';
  RAISE NOTICE '   - Google OAuth登录时自动创建用户记录';
  RAISE NOTICE '   - 自动同步用户资料更新';
  RAISE NOTICE '   - 自动分配匿名ID和默认设置';
  RAISE NOTICE '   - 支持Letter数据迁移';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 下一步测试：';
  RAISE NOTICE '   1. 进行Google OAuth登录';
  RAISE NOTICE '   2. 检查users表是否自动创建了用户记录';
  RAISE NOTICE '   3. 验证用户的Letters是否正确关联';
END $$;