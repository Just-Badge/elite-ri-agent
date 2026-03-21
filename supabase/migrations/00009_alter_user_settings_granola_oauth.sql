-- Add OAuth-specific columns for Granola MCP integration
-- Replaces the old WorkOS token rotation approach with standard OAuth 2.0

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS granola_access_token_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS granola_oauth_client_id TEXT,
  ADD COLUMN IF NOT EXISTS granola_oauth_client_secret TEXT;
