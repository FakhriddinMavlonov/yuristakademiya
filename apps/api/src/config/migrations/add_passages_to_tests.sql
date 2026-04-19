-- Run this in Supabase SQL editor
ALTER TABLE tests ADD COLUMN IF NOT EXISTS passages JSONB DEFAULT '[]';
