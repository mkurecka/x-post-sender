-- Migration: Add webhook_events table for logging
-- Date: 2025-11-24

-- Create webhook_events table for event logging (separate from webhook config)
CREATE TABLE IF NOT EXISTS webhook_events (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  event TEXT NOT NULL,
  data_json TEXT,
  created_at INTEGER NOT NULL
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_webhook_events_user_id ON webhook_events(user_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_event ON webhook_events(event);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON webhook_events(created_at);
