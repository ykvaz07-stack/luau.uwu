-- Migration: Add obfuscation support to scripts table
-- Run this in your Supabase SQL Editor

ALTER TABLE scripts ADD COLUMN IF NOT EXISTS obfuscated_content TEXT;
ALTER TABLE scripts ADD COLUMN IF NOT EXISTS obfuscation_level TEXT DEFAULT 'none';

-- Add index for faster script lookups during delivery
CREATE INDEX IF NOT EXISTS idx_scripts_id ON scripts(id);
