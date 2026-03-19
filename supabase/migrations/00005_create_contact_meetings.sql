-- Migration: create_contact_meetings
-- Requirements: CONT-02

CREATE TABLE contact_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contact_id, meeting_id)
);

-- MANDATORY: Enable RLS
ALTER TABLE contact_meetings ENABLE ROW LEVEL SECURITY;

-- MANDATORY: CRUD policies scoped to authenticated user
CREATE POLICY "contact_meetings_select" ON contact_meetings
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "contact_meetings_insert" ON contact_meetings
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "contact_meetings_update" ON contact_meetings
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "contact_meetings_delete" ON contact_meetings
  FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

-- MANDATORY: Indexes for RLS performance and query patterns
CREATE INDEX idx_contact_meetings_user ON contact_meetings(user_id);
CREATE INDEX idx_contact_meetings_contact ON contact_meetings(contact_id);
