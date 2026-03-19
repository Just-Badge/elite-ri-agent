-- Migration: alter_user_settings_granola
-- Requirements: DATA-01, DATA-08

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS granola_refresh_token_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS granola_client_id TEXT,
  ADD COLUMN IF NOT EXISTS granola_token_expiry TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS granola_token_status TEXT DEFAULT 'disconnected'
    CHECK (granola_token_status IN ('active', 'expired', 'disconnected'));
