-- Migration: Visual Content System
-- Created: 2025-01-20
-- Description: Support for visual content generation with carousel mode (multiple images)

-- Visual content table
CREATE TABLE visual_content (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  content_text TEXT NOT NULL,
  content_type TEXT NOT NULL,
  images_json TEXT NOT NULL,
  carousel_mode INTEGER DEFAULT 0,
  caption TEXT,
  metadata_json TEXT,
  status TEXT DEFAULT 'generated',
  created_at INTEGER NOT NULL,
  updated_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_visual_content_user_id ON visual_content(user_id);
CREATE INDEX idx_visual_content_type ON visual_content(content_type);
CREATE INDEX idx_visual_content_status ON visual_content(status);
CREATE INDEX idx_visual_content_created_at ON visual_content(created_at);
CREATE INDEX idx_visual_content_carousel ON visual_content(carousel_mode);
