-- Migration: create_contacts
-- Requirements: DATA-07, CONT-01, CONT-02, CONT-03, CONT-04, CONT-05, CONT-07

CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  company TEXT,
  role TEXT,
  location TEXT,
  connected_via TEXT,
  category TEXT CHECK (category IN (
    'accelerators', 'advisors', 'clients', 'investors',
    'networking', 'partners', 'potential-team', 'team'
  )),
  background TEXT,
  relationship_context JSONB DEFAULT '{}',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'not_pursuing', 'dormant')),
  outreach_frequency_days INTEGER DEFAULT 30,
  last_interaction_at TIMESTAMPTZ,
  notes TEXT,
  ai_confidence TEXT CHECK (ai_confidence IN ('high', 'medium', 'low', 'manual')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, email)
);

-- MANDATORY: Enable RLS
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- MANDATORY: CRUD policies scoped to authenticated user
CREATE POLICY "contacts_select" ON contacts
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "contacts_insert" ON contacts
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "contacts_update" ON contacts
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "contacts_delete" ON contacts
  FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

-- MANDATORY: Indexes for RLS performance and query patterns
CREATE INDEX idx_contacts_user_id ON contacts(user_id);
CREATE INDEX idx_contacts_user_email ON contacts(user_id, email);
CREATE INDEX idx_contacts_user_category ON contacts(user_id, category);
