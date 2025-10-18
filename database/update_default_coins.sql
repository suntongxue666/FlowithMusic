-- 更新默认积分从100改为10
-- 1. 更新现有用户的积分（如果他们还是默认的100积分）
UPDATE users 
SET coins = 10 
WHERE coins = 100;

-- 2. 更新表的默认值
ALTER TABLE users 
ALTER COLUMN coins SET DEFAULT 10;

-- 验证更新
SELECT 
  COUNT(*) as total_users,
  AVG(coins) as avg_coins,
  MIN(coins) as min_coins,
  MAX(coins) as max_coins
FROM users;