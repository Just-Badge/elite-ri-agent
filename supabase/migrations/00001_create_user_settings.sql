-- Migration: create_user_settings
-- Requirements: AUTH-04, AUTH-05, AUTH-06, TNNT-01, TNNT-02, TNNT-03

CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  -- AUTH-05: Profile
  personality_profile TEXT,
  business_objectives TEXT,
  projects TEXT,
  -- AUTH-04: API keys (encrypted at app level with AES-256-GCM)
  zai_api_key_encrypted TEXT,
  granola_api_key_encrypted TEXT,
  -- AUTH-06 + TNNT-03: Processing schedule (per-user, isolated)
  processing_schedule JSONB DEFAULT '{"interval_hours": 2, "start_hour": 8, "end_hour": 18, "timezone": "America/Los_Angeles"}'::jsonb,
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- MANDATORY: Enable RLS (TNNT-01)
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- MANDATORY: CRUD policies scoped to authenticated user
CREATE POLICY "user_settings_select" ON user_settings
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "user_settings_insert" ON user_settings
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "user_settings_update" ON user_settings
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "user_settings_delete" ON user_settings
  FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

-- MANDATORY: Index user_id for RLS performance
CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);
