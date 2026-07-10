-- Migration: Add keyless support, version tracking, file upload
-- Run this in Supabase SQL Editor

ALTER TABLE scripts ADD COLUMN IF NOT EXISTS requires_key BOOLEAN DEFAULT false;
ALTER TABLE scripts ADD COLUMN IF NOT EXISTS file_name TEXT;

-- Update version default to track edits
ALTER TABLE scripts ALTER COLUMN version SET DEFAULT 1;
