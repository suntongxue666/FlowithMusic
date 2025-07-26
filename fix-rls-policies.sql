-- 修复Supabase RLS策略以支持匿名访问
-- 在Supabase SQL编辑器中运行此脚本

-- 1. 删除现有的有问题的RLS策略
DROP POLICY IF EXISTS "所有人都可以查看公开的Letters" ON letters;
DROP POLICY IF EXISTS "认证用户可以创建Letters" ON letters;

-- 2. 创建新的RLS策略，允许匿名访问公开Letters
CREATE POLICY "允许匿名和认证用户查看公开Letters" ON letters
  FOR SELECT USING (is_public = true);

-- 3. 允许匿名用户创建Letters（重要修复）
CREATE POLICY "允许匿名和认证用户创建Letters" ON letters
  FOR INSERT WITH CHECK (
    -- 认证用户：user_id必须匹配
    (auth.uid() IS NOT NULL AND user_id IN (
      SELECT id FROM users WHERE google_id = auth.uid()::text
    )) OR
    -- 匿名用户：user_id为空且提供anonymous_id
    (auth.uid() IS NULL AND user_id IS NULL AND anonymous_id IS NOT NULL)
  );

-- 4. 确保匿名用户可以通过link_id访问Letters
CREATE POLICY "允许任何人通过link_id访问Letters" ON letters
  FOR SELECT USING (link_id IS NOT NULL);

-- 5. 修复公开Letters视图的权限
DROP VIEW IF EXISTS public_letters_view;
CREATE VIEW public_letters_view AS
SELECT 
  l.*,
  u.display_name as user_display_name,
  u.avatar_url as user_avatar_url
FROM letters l
LEFT JOIN users u ON l.user_id = u.id
WHERE l.is_public = true;

-- 6. 为匿名会话表添加更宽松的策略
DROP POLICY IF EXISTS "允许插入匿名会话" ON anonymous_sessions;
DROP POLICY IF EXISTS "允许更新匿名会话关联" ON anonymous_sessions;

CREATE POLICY "允许任何人插入和查询匿名会话" ON anonymous_sessions
  FOR ALL USING (true) WITH CHECK (true);

-- 7. 确保increment_view_count函数可以被匿名用户调用
-- 创建一个安全的视图计数函数
CREATE OR REPLACE FUNCTION public_increment_view_count(letter_link_id TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE letters 
  SET view_count = view_count + 1 
  WHERE link_id = letter_link_id AND is_public = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. 授予匿名用户执行权限
GRANT EXECUTE ON FUNCTION public_increment_view_count(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public_increment_view_count(TEXT) TO authenticated;

-- 9. 创建一个测试匿名Letter的函数（用于调试）
CREATE OR REPLACE FUNCTION create_test_anonymous_letter()
RETURNS TEXT AS $$
DECLARE
  test_link_id TEXT;
  test_anonymous_id TEXT;
BEGIN
  -- 生成测试ID
  test_link_id := 'test_' || extract(epoch from now())::text || '_' || substr(md5(random()::text), 1, 6);
  test_anonymous_id := 'anon_test_' || extract(epoch from now())::text;
  
  -- 插入测试Letter
  INSERT INTO letters (
    anonymous_id,
    link_id,
    recipient_name,
    message,
    song_id,
    song_title,
    song_artist,
    song_album_cover,
    song_spotify_url,
    is_public
  ) VALUES (
    test_anonymous_id,
    test_link_id,
    'Test Recipient',
    'This is a test message created by anonymous user for debugging purposes.',
    'test_song_id',
    'Test Song',
    'Test Artist', 
    'https://via.placeholder.com/300',
    'https://open.spotify.com/track/test',
    true
  );
  
  RETURN test_link_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_test_anonymous_letter() TO anon;
GRANT EXECUTE ON FUNCTION create_test_anonymous_letter() TO authenticated;

-- 10. 验证策略是否正确设置的查询
-- 运行以下查询来验证策略：

-- 检查是否可以查询公开Letters（应该返回数据）
-- SELECT COUNT(*) as public_letters_count FROM letters WHERE is_public = true;

-- 检查RLS策略是否正确设置
-- SELECT * FROM pg_policies WHERE tablename = 'letters';

COMMENT ON FUNCTION create_test_anonymous_letter() IS '创建测试匿名Letter用于调试 - 返回link_id';
COMMENT ON FUNCTION public_increment_view_count(TEXT) IS '安全的公开Letter浏览计数增加函数';

-- 完成提示
SELECT 'RLS策略修复完成! 现在匿名用户应该可以：
1. 查看公开Letters
2. 创建匿名Letters  
3. 通过link_id访问Letters
4. 增加浏览计数' as status;