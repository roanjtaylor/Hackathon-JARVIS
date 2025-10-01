-- Migration script to add conversation_log column if it doesn't exist
-- Run this in the Supabase SQL Editor

-- Add conversation_log column if it doesn't exist
ALTER TABLE public.sessions
ADD COLUMN IF NOT EXISTS conversation_log JSONB DEFAULT '[]'::jsonb;

-- Verify the column was added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'sessions';
