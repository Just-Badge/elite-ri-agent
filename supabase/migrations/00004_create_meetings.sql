-- Migration: create_meetings
-- Requirements: DATA-08, CONT-02

CREATE TABLE meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  granola_document_id TEXT,
  title TEXT,
  meeting_date TIMESTAMPTZ,
  summary TEXT,
  transcript TEXT,
  granola_url TEXT,
  raw_data JSONB,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, granola_document_id)
);

-- MANDATORY: Enable RLS
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

-- MANDATORY: CRUD policies scoped to authenticated user
CREATE POLICY "meetings_select" ON meetings
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "meetings_insert" ON meetings
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "meetings_update" ON meetings
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "meetings_delete" ON meetings
  FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

-- MANDATORY: Indexes for RLS performance and query patterns
CREATE INDEX idx_meetings_user_id ON meetings(user_id);
CREATE INDEX idx_meetings_granola_doc ON meetings(user_id, granola_document_id);
