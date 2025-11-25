-- Migration: Add embeddings for semantic search
-- Date: 2025-11-24

-- Add embedding column to posts table for semantic search
ALTER TABLE posts ADD COLUMN embedding_vector TEXT;

-- Add embedding column to memory table for semantic search
ALTER TABLE memory ADD COLUMN embedding_vector TEXT;

-- Add embedding metadata columns
ALTER TABLE posts ADD COLUMN embedding_model TEXT;
ALTER TABLE memory ADD COLUMN embedding_model TEXT;

-- Create index for faster text searches (used as fallback)
CREATE INDEX IF NOT EXISTS idx_posts_original_text ON posts(original_text);
CREATE INDEX IF NOT EXISTS idx_memory_text ON memory(text);
CREATE INDEX IF NOT EXISTS idx_posts_type ON posts(type);

-- Add tags support for memory categorization
ALTER TABLE memory ADD COLUMN tags TEXT; -- JSON array of tags

-- Add search metadata
ALTER TABLE posts ADD COLUMN search_keywords TEXT; -- Generated keywords for search
ALTER TABLE memory ADD COLUMN search_keywords TEXT;
