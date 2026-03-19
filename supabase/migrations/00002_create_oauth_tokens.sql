-- Migration: create_oauth_tokens
-- Requirements: AUTH-02, TNNT-01, TNNT-02

CREATE TABLE oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  google_access_token_encrypted TEXT,
  google_refresh_token_encrypted TEXT,
  token_expiry TIMESTAMPTZ,
  token_status TEXT DEFAULT 'active' CHECK (token_status IN ('active', 'expired', 'revoked')),
  scopes TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- MANDATORY: Enable RLS (TNNT-01)
ALTER TABLE oauth_tokens ENABLE ROW LEVEL SECURITY;

-- MANDATORY: CRUD policies scoped to authenticated user
CREATE POLICY "oauth_tokens_select" ON oauth_tokens
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "oauth_tokens_insert" ON oauth_tokens
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "oauth_tokens_update" ON oauth_tokens
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "oauth_tokens_delete" ON oauth_tokens
  FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

-- MANDATORY: Index user_id for RLS performance
CREATE INDEX idx_oauth_tokens_user_id ON oauth_tokens(user_id);
