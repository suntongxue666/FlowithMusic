-- Add effect_type and animation_config to letters table
ALTER TABLE letters 
ADD COLUMN IF NOT EXISTS effect_type TEXT,
ADD COLUMN IF NOT EXISTS animation_config JSONB DEFAULT '{}'::jsonb;

-- Comment on columns
COMMENT ON COLUMN letters.effect_type IS 'Type of the unlocked effect, e.g., "flowing_emoji". NULL if unpaid/inactive.';
COMMENT ON COLUMN letters.animation_config IS 'Configuration for the effect, e.g., selected emojis ["🐶", "🐱", "🐭"].';
