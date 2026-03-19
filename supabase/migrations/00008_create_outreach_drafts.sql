-- Migration: create_outreach_drafts
-- Requirements: OUTR-04, OUTR-05, OUTR-08

CREATE TABLE outreach_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'sent', 'dismissed')),
  gmail_draft_id TEXT,
  gmail_sync_status TEXT DEFAULT 'pending' CHECK (gmail_sync_status IN ('pending', 'synced', 'failed', 'not_applicable')),
  ai_rationale TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- MANDATORY: Enable RLS
ALTER TABLE outreach_drafts ENABLE ROW LEVEL SECURITY;

-- MANDATORY: CRUD policies scoped to authenticated user
CREATE POLICY "outreach_drafts_select" ON outreach_drafts
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "outreach_drafts_insert" ON outreach_drafts
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "outreach_drafts_update" ON outreach_drafts
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "outreach_drafts_delete" ON outreach_drafts
  FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

-- MANDATORY: Indexes for RLS performance and query patterns
CREATE INDEX idx_outreach_drafts_user ON outreach_drafts(user_id);
CREATE INDEX idx_outreach_drafts_status ON outreach_drafts(user_id, status);
CREATE INDEX idx_outreach_drafts_contact ON outreach_drafts(contact_id);
CREATE INDEX idx_outreach_drafts_gmail ON outreach_drafts(gmail_draft_id);
