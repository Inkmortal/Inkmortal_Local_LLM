-- Migration to add conversation summarization support
-- Adds new columns to the conversations table and adds config entries

-- Add summary columns to conversations table
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS conversation_summary TEXT NULL;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_summarized_message_id VARCHAR(36) NULL;

-- Add description column to config table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'config' AND column_name = 'description'
    ) THEN
        ALTER TABLE config ADD COLUMN description TEXT;
        RAISE NOTICE 'Added description column to config table';
    ELSE
        RAISE NOTICE 'description column already exists in config table';
    END IF;
END $$;

-- Add config entries for admin control
INSERT INTO config (key, value, description) 
VALUES ('summarization_model', 'llama3.3:latest', 'Model used for conversation summarization') 
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, description = EXCLUDED.description;

INSERT INTO config (key, value, description) 
VALUES ('max_context_tokens', '120000', 'Maximum context window size in tokens') 
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, description = EXCLUDED.description;

INSERT INTO config (key, value, description) 
VALUES ('summarization_threshold', '70', 'Percentage of max context at which to trigger summarization') 
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, description = EXCLUDED.description;