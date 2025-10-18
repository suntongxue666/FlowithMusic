-- 添加设备指纹字段到anonymous_sessions表
ALTER TABLE anonymous_sessions 
ADD COLUMN IF NOT EXISTS device_fingerprint TEXT;

-- 为设备指纹创建索引（用于查找相似设备）
CREATE INDEX IF NOT EXISTS idx_anonymous_sessions_device_fingerprint 
ON anonymous_sessions(device_fingerprint);

-- 添加最后访问时间字段
ALTER TABLE anonymous_sessions 
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 创建函数来更新最后访问时间
CREATE OR REPLACE FUNCTION update_anonymous_session_last_seen()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_seen = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS update_anonymous_session_last_seen_trigger ON anonymous_sessions;
CREATE TRIGGER update_anonymous_session_last_seen_trigger
  BEFORE UPDATE ON anonymous_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_anonymous_session_last_seen();