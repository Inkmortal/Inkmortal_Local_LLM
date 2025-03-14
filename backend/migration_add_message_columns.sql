-- Migration to add status and model columns to messages table
-- Run with: psql -U postgres -d seadragon -f migration_add_message_columns.sql

-- Check if the columns exist before trying to add them
DO $$ 
BEGIN
    -- Add status column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'messages' AND column_name = 'status'
    ) THEN
        ALTER TABLE messages ADD COLUMN status VARCHAR(50);
        RAISE NOTICE 'Added status column to messages table';
    ELSE
        RAISE NOTICE 'status column already exists in messages table';
    END IF;

    -- Add model column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'messages' AND column_name = 'model'
    ) THEN
        ALTER TABLE messages ADD COLUMN model VARCHAR(255);
        RAISE NOTICE 'Added model column to messages table';
    ELSE
        RAISE NOTICE 'model column already exists in messages table';
    END IF;
END $$;

-- Update existing messages to have default values
UPDATE messages SET status = 'complete' WHERE status IS NULL;
UPDATE messages SET model = 'unknown' WHERE model IS NULL;

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'messages' AND column_name IN ('status', 'model');