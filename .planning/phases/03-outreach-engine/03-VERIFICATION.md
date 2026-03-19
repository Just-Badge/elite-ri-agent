---
phase: 03-outreach-engine
verified: 2026-03-19T14:49:07Z
status: gaps_found
score: 3/4 success criteria verified
gaps:
  - truth: "Contacts due for outreach are identified based on their configured outreach_frequency_days"
    status: partial
    reason: "generate-user-drafts.ts queries contacts where last_interaction_at < NOW() instead of last_interaction_at + outreach_frequency_days < NOW(). The frequency value is checked for NOT NULL but never used to compute the due date. A contact set to 90-day frequency touched yesterday would be returned as due."
    artifacts:
      - path: "src/trigger/generate-user-drafts.ts"
        issue: "Line 70-73: .or('last_interaction_at.is.null,last_interaction_at.lt.' + new Date().toISOString()) ignores outreach_frequency_days value in date math. Required: last_interaction_at + outreach_frequency_days days < NOW()"
    missing:
      - "Use Supabase RPC or raw PostgREST filter that computes last_interaction_at + (outreach_frequency_days || ' days')::interval < NOW(), or filter in-application after fetching contacts with their frequency field"
human_verification:
  - test: "Confirm draft appears in /drafts page after background task runs"
    expected: "DraftCard shows contact name, subject, body preview, sync status indicator, and Send/Edit/Dismiss buttons"
    why_human: "Cannot verify rendered UI state programmatically; requires browser"
  - test: "Send a draft from the dashboard"
    expected: "Draft disappears from pending list, appears in Gmail Sent, contact last_interaction_at updates"
    why_human: "Requires live Gmail OAuth tokens and real API call"
  - test: "Edit a draft then send it"
    expected: "Sent email uses the edited subject/body, not the original AI-generated version"
    why_human: "End-to-end flow through PUT then POST send requires live execution"
---

# Phase 3: Outreach Engine Verification Report

**Phase Goal:** Users receive AI-drafted outreach emails informed by meeting context and personal style, review them in-app, and sync to Gmail
**Verified:** 2026-03-19T14:49:07Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Success Criteria (from ROADMAP.md)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Contacts due for outreach (based on configured frequency) automatically receive AI-drafted emails using z.ai GLM5 with the user's API key | PARTIAL | Dispatcher + per-user task exist and wired. GLM-5 with user API key confirmed. BUT due-date query ignores frequency_days value — uses `last_interaction_at < NOW()` instead of `last_interaction_at + frequency_days < NOW()` |
| 2 | Drafts are informed by contact meeting history, relationship context, action items, user personality profile, and Open Brain knowledge base | VERIFIED | `generateOutreachDraft` builds 5-layer DraftContext: userProfile, contact (with relationship_context), recentMeetings, actionItems, openBrainContext. All 10 AI tests pass. |
| 3 | Drafts appear both in the app dashboard and as Gmail drafts simultaneously | VERIFIED | `generate-user-drafts.ts` inserts to `outreach_drafts` first (DB-first), then best-effort creates Gmail draft. `/drafts` page fetches and renders via DraftList/DraftCard. Gmail sync status displayed per card. |
| 4 | User can approve, edit-then-approve, or dismiss each draft from the dashboard, and approved drafts send via Gmail | VERIFIED | PUT `/api/drafts/[id]` for edits, POST `/api/drafts/[id]/send` for sending (always creates fresh Gmail draft from DB content), DELETE `/api/drafts/[id]` for dismiss. All 12 API tests pass. |

**Score:** 3/4 success criteria verified (1 partial)

---

## Required Artifacts

### Plan 01 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/00008_create_outreach_drafts.sql` | outreach_drafts table with RLS and status CHECK | VERIFIED | CREATE TABLE, ENABLE ROW LEVEL SECURITY, 4 CRUD policies, 4 indexes, CHECK constraints on status and gmail_sync_status |
| `src/lib/validations/drafts.ts` | Zod schemas for draft CRUD | VERIFIED | Exports outreachDraftSchema, draftUpdateSchema, DRAFT_STATUSES, DraftStatus |
| `src/lib/gmail/client.ts` | Gmail service with OAuth2 token refresh | VERIFIED | Exports getGmailClient, createGmailDraft, sendGmailDraft, deleteGmailDraft. Token refresh handler persists encrypted tokens. |
| `src/lib/gmail/mime.ts` | MIME message builder | VERIFIED | Exports buildMimeMessage. Uses mimetext. Returns msg.asEncoded() (base64url). |
| `src/lib/open-brain/client.ts` | Open Brain context fetcher with graceful fallback | VERIFIED | Exports fetchOpenBrainContext. Full try/catch returning "" on any error. |

### Plan 02 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/ai/draft-outreach.ts` | AI draft generation with layered context prompt | VERIFIED | Exports generateOutreachDraft and DraftContext. GLM-5 via z.ai baseURL, 5-layer prompt, json_object format, temperature 0.7. |
| `src/trigger/outreach-dispatcher.ts` | Hourly cron dispatcher | VERIFIED | id "outreach-draft-dispatcher", cron "0 */1 * * *", queries users with zai_api_key_encrypted, checks timezone window at start_hour |
| `src/trigger/generate-user-drafts.ts` | Per-user draft generation task | PARTIAL | id "generate-user-drafts", retry configured, DB-first pattern, best-effort Gmail. Due-contact query has frequency gap (see Gaps). |

### Plan 03 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/app/api/drafts/route.ts` | GET list and POST stub endpoints | VERIFIED | GET with contact join, optional status filter, auth check. POST returns 501. |
| `src/app/api/drafts/[id]/route.ts` | PUT update and DELETE dismiss endpoints | VERIFIED | PUT validates with draftUpdateSchema, updates DB only. DELETE best-effort Gmail cleanup then status='dismissed'. |
| `src/app/api/drafts/[id]/send/route.ts` | POST approve-and-send endpoint | VERIFIED | Always deletes old Gmail draft, creates fresh from current DB content, sends, updates status='sent', updates contact last_interaction_at. |
| `src/app/(dashboard)/drafts/page.tsx` | Draft review dashboard page | VERIFIED | "use client", fetches on mount, status filter Select, handleSend/handleDismiss/handleEdit/handleSaveEdit all wired to API. |
| `src/components/drafts/draft-card.tsx` | Individual draft display with action buttons | VERIFIED | Renders contact name/email, subject, body preview, Gmail sync status dot, Send/Edit/Dismiss buttons for pending_review; Badge for other statuses. |
| `src/components/drafts/draft-editor.tsx` | Edit modal for draft subject and body | VERIFIED | Sheet with React Hook Form + zodResolver(draftUpdateSchema), Input for subject, Textarea for body, Save/Cancel buttons. |

---

## Key Link Verification

### Plan 01 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/lib/gmail/client.ts` | `src/lib/gmail/mime.ts` | buildMimeMessage import | WIRED | `import { buildMimeMessage } from "./mime"` — called in createGmailDraft |
| `src/lib/gmail/client.ts` | `src/lib/crypto/encryption.ts` | decrypt/encrypt for OAuth tokens | WIRED | `import { decrypt, encrypt }` — decrypt used for refresh token, encrypt used in token refresh handler |
| `src/lib/gmail/client.ts` | `src/lib/supabase/admin.ts` | createAdminClient for token fetch | WIRED | `import { createAdminClient }` — used in getGmailClient and token refresh handler |

### Plan 02 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/trigger/generate-user-drafts.ts` | `src/lib/ai/draft-outreach.ts` | generateOutreachDraft call | WIRED | `import { generateOutreachDraft }` — called with apiKey and draftContext per contact |
| `src/trigger/generate-user-drafts.ts` | `src/lib/gmail/client.ts` | createGmailDraft (best-effort) | WIRED | `import { createGmailDraft }` — called inside try/catch after DB insert |
| `src/trigger/generate-user-drafts.ts` | `src/lib/open-brain/client.ts` | fetchOpenBrainContext | WIRED | `import { fetchOpenBrainContext }` — called per contact with userId, name, email |
| `src/trigger/outreach-dispatcher.ts` | `src/trigger/generate-user-drafts.ts` | generateUserDrafts.trigger | WIRED | `import { generateUserDrafts }` — triggered with userId and per-user queue |

### Plan 03 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/app/api/drafts/[id]/send/route.ts` | `src/lib/gmail/client.ts` | sendGmailDraft, createGmailDraft, deleteGmailDraft | WIRED | All three imported and called in correct sequence |
| `src/app/api/drafts/[id]/route.ts` | `src/lib/gmail/client.ts` | deleteGmailDraft on dismiss | WIRED | `import { deleteGmailDraft }` — called best-effort in DELETE handler |
| `src/app/(dashboard)/drafts/page.tsx` | `src/components/drafts/draft-list.tsx` | DraftList render | WIRED | `import { DraftList }` — rendered with all callbacks wired |
| `src/components/drafts/draft-list.tsx` | `src/components/drafts/draft-card.tsx` | maps drafts to DraftCard | WIRED | `import { DraftCard }` — mapped in grid render |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| OUTR-01 | 03-01, 03-02 | Scheduled job identifies contacts due for outreach based on frequency | PARTIAL | Scheduler and per-user task exist. Due-contact query checks `outreach_frequency_days IS NOT NULL` but does not use the value to compute `last_interaction_at + frequency_days < NOW()`. All contacts with any past interaction are returned as "due". |
| OUTR-02 | 03-02 | AI drafts personalized email using contact context + user profile + Open Brain | SATISFIED | generateOutreachDraft builds 5-layer prompt. 10 tests verify each layer. |
| OUTR-03 | 03-02 | Draft uses z.ai GLM5 model via REST API with user's API key | SATISFIED | `new OpenAI({ apiKey, baseURL: "https://api.z.ai/api/paas/v4" })`, model: "glm-5". Decrypted API key passed per user. |
| OUTR-04 | 03-01, 03-02, 03-03 | Draft appears in app dashboard for review | SATISFIED | outreach_drafts table, GET /api/drafts, /drafts page with DraftList/DraftCard. |
| OUTR-05 | 03-01, 03-02, 03-03 | Draft is simultaneously created as Gmail draft via Gmail API | SATISFIED | generate-user-drafts best-effort Gmail sync. Send route creates fresh Gmail draft. gmail_sync_status tracks state. |
| OUTR-06 | 03-03 | User can approve draft and send from dashboard | SATISFIED | POST /api/drafts/[id]/send, handleSend in page, DraftCard Send button. |
| OUTR-07 | 03-03 | User can edit draft before approving and sending | SATISFIED | PUT /api/drafts/[id] for DB edit, DraftEditor Sheet. Send always uses current DB content — fresh Gmail draft created from DB at send time. |
| OUTR-08 | 03-01, 03-03 | User can dismiss/delete a draft | SATISFIED | DELETE /api/drafts/[id] best-effort deletes Gmail draft, sets status='dismissed'. |
| OBRN-01 | 03-01 | System reads from user's Open Brain tables in Supabase | SATISFIED | fetchOpenBrainContext queries open_brain_notes table, graceful fallback to "" when table absent. |
| OBRN-02 | 03-02 | Open Brain context enriches AI draft generation | SATISFIED | openBrainContext passed in DraftContext layer 4, included in AI user prompt as SUPPLEMENTAL KNOWLEDGE section. |

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/app/api/drafts/route.ts` | 35-39 | POST returns 501 Not Implemented | Info | Intentional stub for manual draft creation — per plan design, not blocking |
| `src/lib/gmail/mime.ts` | 14-16 | "me@gmail.com" placeholder as From | Info | Documented design decision — Gmail API replaces From with authenticated user address |
| `src/trigger/generate-user-drafts.ts` | 70-73 | `last_interaction_at.lt.NOW()` ignores frequency_days value | Warning | Contacts marked as due regardless of configured frequency period — OUTR-01 partial |

---

## Test Suite Results

All 158 tests pass across 27 test files (verified by running `npx vitest run`):

| Test File | Tests | Status |
|-----------|-------|--------|
| `src/__tests__/gmail/mime.test.ts` | 5 | All pass |
| `src/__tests__/gmail/client.test.ts` | 6 | All pass |
| `src/__tests__/open-brain/client.test.ts` | 4 | All pass |
| `src/__tests__/ai/draft-outreach.test.ts` | 10 | All pass |
| `src/__tests__/trigger/outreach-dispatcher.test.ts` | 6 | All pass |
| `src/__tests__/trigger/generate-user-drafts.test.ts` | 8 | All pass |
| `src/__tests__/api/drafts.test.ts` | 7 | All pass |
| `src/__tests__/api/drafts-send.test.ts` | 5 | All pass |
| `src/__tests__/components/draft-card.test.tsx` | 5 | All pass |
| `src/__tests__/components/draft-editor.test.tsx` | 5 | All pass |

---

## Human Verification Required

### 1. Draft Review Dashboard Rendering

**Test:** Navigate to `/drafts` in browser after a draft has been generated
**Expected:** DraftCard shows contact name, subject, body preview (first 200 chars stripped of HTML), Gmail sync status dot (green/yellow/red), and Send/Edit/Dismiss action buttons for pending_review status
**Why human:** Cannot verify rendered React UI state programmatically

### 2. Send Workflow End-to-End

**Test:** Click "Send" on a pending draft
**Expected:** Toast "Email sent" appears, draft disappears from pending list, Gmail Sent folder shows the email, contact's last_interaction_at updates in the database
**Why human:** Requires live Gmail OAuth tokens and real Gmail API call

### 3. Edit-Then-Send Workflow

**Test:** Click "Edit" on a draft, change the subject and body, click Save, then click Send
**Expected:** Sent email uses the edited content (not original AI content). Gmail Drafts folder shows no stale draft.
**Why human:** End-to-end flow through PUT (edit) then POST (send) requires live execution with real tokens

---

## Gaps Summary

**One gap found blocking full OUTR-01 satisfaction:**

The due-contact query in `src/trigger/generate-user-drafts.ts` (lines 70-73) checks whether `last_interaction_at` is null or less than the current timestamp. This is always true for any contact that has ever been interacted with. The `outreach_frequency_days` field is verified to be NOT NULL (ensuring the field is set) but its actual value is never used to compute the due date.

The intended logic per the plan spec was:
```
last_interaction_at + interval(outreach_frequency_days || ' days') < NOW()
```

The actual implementation:
```
last_interaction_at.lt.NOW()  (always true for any past date)
```

**Practical impact:** Contacts with any configured outreach frequency get drafted on every dispatcher run regardless of when they were last contacted. A contact set to 90-day frequency touched yesterday would appear in today's draft batch. The `pending_review` deduplication check (existing pending draft = skip) provides a partial safeguard against repeated drafting, but does not enforce the frequency period semantics.

**Fix options:**
1. Fetch contacts with `outreach_frequency_days` included, then filter in-application: `last_interaction_at + frequency_days < NOW()`
2. Use a Supabase RPC (raw SQL function) to do the interval arithmetic server-side
3. Add a computed column or DB view that pre-calculates `next_outreach_due_at`

---

_Verified: 2026-03-19T14:49:07Z_
_Verifier: Claude (gsd-verifier)_
