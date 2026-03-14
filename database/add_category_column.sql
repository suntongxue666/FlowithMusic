-- Add category column to letters table if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='letters' AND column_name='category') THEN 
        ALTER TABLE letters ADD COLUMN category TEXT;
    END IF;
END $$;

-- Create indexes for performance on category filtering
CREATE INDEX IF NOT EXISTS idx_letters_category ON letters(category);

-- Update RLS policies to allow reading and filtering by category
-- Assuming basic SELECT is already public, this column will be included automatically.
-- If there are specific policies restricted to certain columns, they would need update.
