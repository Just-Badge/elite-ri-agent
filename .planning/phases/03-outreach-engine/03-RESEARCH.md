# Phase 3: Outreach Engine - Research

**Researched:** 2026-03-19
**Domain:** AI-drafted email outreach with Gmail API integration, human-in-the-loop review, and Open Brain context enrichment
**Confidence:** HIGH

## Summary

Phase 3 implements the Activate layer of the Capture-Enrich-Analyze-Activate lifecycle: scheduled identification of contacts due for outreach, AI-drafted personalized emails via z.ai GLM5, dual-write to both the app dashboard and Gmail drafts, and a human-in-the-loop review workflow (approve / edit+approve / dismiss). Open Brain tables in Supabase provide supplemental context to the AI prompt pipeline.

The core technical challenge is the Gmail draft lifecycle. Creating drafts requires the `gmail.compose` scope, which is classified as **restricted** by Google -- requiring a third-party security assessment ($500-$4,500) for production apps with 100+ users. The scope is already requested during Phase 1 OAuth sign-in (confirmed in `google-sign-in-button.tsx`), and the `<100 user` exemption means the assessment is not a blocker for initial launch. MIME message construction for the Gmail API requires RFC 2822 compliance with base64url encoding -- use the `mimetext` npm package rather than hand-rolling.

The existing codebase provides strong foundations: the Trigger.dev dispatcher/fan-out pattern from Phase 2 (`meeting-dispatcher.ts` + `process-user-meetings.ts`) is directly reusable for outreach scheduling, the z.ai GLM5 integration via OpenAI SDK is proven (`extract-contacts.ts`), encryption utilities are in place for token handling, and the admin Supabase client pattern is established.

**Primary recommendation:** Follow the existing dispatcher pattern. Add an `outreach_drafts` table with RLS. Build a Gmail service module using `@googleapis/gmail` + `google-auth-library` for OAuth2 token refresh from stored encrypted tokens. Use `mimetext` for RFC 2822 MIME construction. The AI prompt must layer five context sources: user personality, contact relationship context, meeting history, action items, and Open Brain knowledge.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| OUTR-01 | Scheduled Trigger.dev job identifies contacts due for outreach based on frequency | Reuse dispatcher/fan-out pattern from Phase 2; query contacts WHERE last_outreach_at + outreach_frequency_days < NOW() |
| OUTR-02 | AI drafts personalized email using contact context + user profile + Open Brain knowledge | z.ai GLM5 via OpenAI SDK (proven pattern); layered prompt with 5 context sources |
| OUTR-03 | Draft uses z.ai GLM5 model via REST API with user's API key | Same OpenAI client pattern as extract-contacts.ts; per-user decrypted API key |
| OUTR-04 | Draft appears in app dashboard for review | New outreach_drafts table + API routes + React UI components |
| OUTR-05 | Draft is simultaneously created as Gmail draft via Gmail API | @googleapis/gmail + google-auth-library OAuth2Client; mimetext for MIME encoding |
| OUTR-06 | User can approve draft and send from dashboard | drafts.send() API call; update outreach_drafts status + contact last_outreach_at |
| OUTR-07 | User can edit draft before approving and sending | In-app textarea edit -> update outreach_drafts body -> replace Gmail draft -> send |
| OUTR-08 | User can dismiss/delete a draft | Update status to dismissed; delete Gmail draft via drafts.delete() |
| OBRN-01 | System reads from user's Open Brain tables in Supabase for supplemental context | Query Open Brain tables via admin client during prompt construction |
| OBRN-02 | Open Brain context enriches AI draft generation with user's knowledge/thoughts | Inject Open Brain content as additional context layer in system prompt |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@googleapis/gmail` | 16.1.1 | Gmail API client (drafts, send) | Lightweight (1.15MB vs 22MB for full googleapis); Google's official per-service package |
| `google-auth-library` | 10.6.2 | OAuth2Client for token refresh | Peer dependency of @googleapis/gmail; handles automatic access token refresh from stored refresh tokens |
| `mimetext` | 3.0.28 | RFC 5322 MIME message construction | Typed, maintained, avoids hand-rolling base64url MIME encoding; `asEncoded()` produces Gmail-ready output |
| `openai` | 6.32.0 | z.ai GLM5 API client | Already in project; same pattern as extract-contacts.ts |
| `@trigger.dev/sdk` | 4.4.3 | Scheduled outreach dispatcher + per-user draft tasks | Already in project; reuse dispatcher/fan-out pattern |

### Supporting (already in project)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zod` | 3.25.76 | Validation for draft schemas, API payloads | All API routes and Trigger.dev task payloads |
| `react-hook-form` + `@hookform/resolvers` | 7.71.2 / 5.2.2 | Draft edit form | Edit-before-send modal |
| `sonner` | 2.0.7 | Toast notifications for draft actions | Approve/dismiss/send feedback |
| `lucide-react` | 0.577.0 | Icons for draft UI | Mail, Send, Trash, Edit icons |
| `date-fns` | 4.1.0 | Date formatting for draft timestamps | "Generated 2 hours ago", relative dates |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@googleapis/gmail` | Full `googleapis` (171.4.0) | 22MB install vs 1.15MB; includes every Google API; overkill |
| `mimetext` | Manual Buffer.from + base64url | Error-prone for HTML emails, headers, encoding edge cases |
| `mimetext` | `nodemailer` for MIME only | Heavier; includes SMTP transport we don't need |

**Installation:**
```bash
npm install @googleapis/gmail google-auth-library mimetext
```

## Architecture Patterns

### Recommended Project Structure (new files for Phase 3)

```
src/
  lib/
    gmail/
      client.ts           # Gmail service: createDraft, sendDraft, deleteDraft, refreshTokens
      mime.ts              # MIME message builder using mimetext
      types.ts             # Gmail-related types
    ai/
      draft-outreach.ts    # AI outreach prompt builder + z.ai call
    open-brain/
      client.ts            # Open Brain table query functions
      types.ts             # Open Brain data types
    validations/
      drafts.ts            # Zod schemas for outreach drafts
  trigger/
    outreach-dispatcher.ts  # Cron: identify users needing draft generation
    generate-user-drafts.ts # Per-user: identify due contacts, generate drafts
  app/
    api/
      drafts/
        route.ts            # GET (list drafts), POST (manual draft generation)
        [id]/
          route.ts          # PUT (update draft), DELETE (dismiss draft)
          send/
            route.ts        # POST (approve + send)
    (dashboard)/
      drafts/
        page.tsx            # Draft review dashboard
  components/
    drafts/
      draft-card.tsx        # Single draft display with actions
      draft-list.tsx        # List of pending drafts
      draft-editor.tsx      # Edit modal/inline editor
supabase/
  migrations/
    00008_create_outreach_drafts.sql
    00009_create_open_brain_context.sql  # Only if OB tables don't exist yet
```

### Pattern 1: Outreach Dispatcher (Trigger.dev Cron -> Fan-Out)

**What:** Mirror the existing meeting-dispatcher pattern. A cron task runs daily, identifies users with active outreach settings, and fans out to per-user draft generation tasks.
**When to use:** Scheduled outreach generation.
**Example:**

```typescript
// src/trigger/outreach-dispatcher.ts
import { schedules, logger } from "@trigger.dev/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateUserDrafts } from "./generate-user-drafts";
import { getHourInTimezone } from "./meeting-dispatcher"; // Reuse existing

export const outreachDispatcher = schedules.task({
  id: "outreach-draft-dispatcher",
  cron: "0 */1 * * *", // Hourly, check user timezone windows
  run: async () => {
    const supabase = createAdminClient();

    // Users with: z.ai key + Google OAuth tokens + active contacts
    const { data: users } = await supabase
      .from("user_settings")
      .select("user_id, processing_schedule")
      .not("zai_api_key_encrypted", "is", null);

    if (!users?.length) return { dispatched: 0 };

    let dispatched = 0;
    const now = new Date();

    for (const user of users) {
      // Check if within user's configured window
      const schedule = user.processing_schedule as { timezone: string; start_hour: number; end_hour: number } | null;
      const tz = schedule?.timezone ?? "UTC";
      const userHour = getHourInTimezone(now, tz);
      const startHour = schedule?.start_hour ?? 8;

      // Generate drafts once per day at start of user's window
      if (userHour !== startHour) continue;

      await generateUserDrafts.trigger(
        { userId: user.user_id },
        {
          queue: {
            name: `user-${user.user_id}-outreach`,
            concurrencyLimit: 1,
          },
        }
      );
      dispatched++;
    }

    return { dispatched };
  },
});
```

### Pattern 2: Gmail Service Module

**What:** Encapsulate all Gmail API operations behind a service module that handles OAuth2 token refresh from encrypted stored tokens.
**When to use:** Any Gmail API call (create draft, send draft, delete draft).
**Example:**

```typescript
// src/lib/gmail/client.ts
import { gmail_v1, auth } from "@googleapis/gmail";
import { decrypt, encrypt } from "@/lib/crypto/encryption";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildMimeMessage } from "./mime";

export async function getGmailClient(userId: string): Promise<gmail_v1.Gmail> {
  const supabase = createAdminClient();

  const { data: tokens } = await supabase
    .from("oauth_tokens")
    .select("google_access_token_encrypted, google_refresh_token_encrypted, token_expiry")
    .eq("user_id", userId)
    .single();

  if (!tokens?.google_refresh_token_encrypted) {
    throw new Error("No Google refresh token found. User must reconnect Google.");
  }

  const oauth2Client = new auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    refresh_token: decrypt(tokens.google_refresh_token_encrypted),
  });

  // Handle token refresh and persist new tokens
  oauth2Client.on("tokens", async (newTokens) => {
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (newTokens.access_token) {
      updates.google_access_token_encrypted = encrypt(newTokens.access_token);
    }
    if (newTokens.refresh_token) {
      updates.google_refresh_token_encrypted = encrypt(newTokens.refresh_token);
    }
    if (newTokens.expiry_date) {
      updates.token_expiry = new Date(newTokens.expiry_date).toISOString();
    }
    updates.token_status = "active";

    await supabase.from("oauth_tokens").update(updates).eq("user_id", userId);
  });

  return new gmail_v1.Gmail({ auth: oauth2Client });
}

export async function createGmailDraft(
  userId: string,
  to: string,
  subject: string,
  htmlBody: string
): Promise<string> {
  const gmail = await getGmailClient(userId);
  const raw = buildMimeMessage(to, subject, htmlBody);

  const response = await gmail.users.drafts.create({
    userId: "me",
    requestBody: {
      message: { raw },
    },
  });

  return response.data.id!;
}

export async function sendGmailDraft(
  userId: string,
  gmailDraftId: string
): Promise<void> {
  const gmail = await getGmailClient(userId);
  await gmail.users.drafts.send({
    userId: "me",
    requestBody: { id: gmailDraftId },
  });
}

export async function deleteGmailDraft(
  userId: string,
  gmailDraftId: string
): Promise<void> {
  const gmail = await getGmailClient(userId);
  await gmail.users.drafts.delete({
    userId: "me",
    id: gmailDraftId,
  });
}
```

### Pattern 3: MIME Message Builder

**What:** Use `mimetext` to construct RFC 5322 compliant MIME messages with proper base64url encoding for the Gmail API.
**When to use:** Every Gmail draft creation or update.
**Example:**

```typescript
// src/lib/gmail/mime.ts
import { createMimeMessage } from "mimetext";

export function buildMimeMessage(
  to: string,
  subject: string,
  htmlBody: string,
  from?: string
): string {
  const message = createMimeMessage();

  if (from) message.setSender(from);
  message.setTo(to);
  message.setSubject(subject);
  message.addMessage({
    contentType: "text/html",
    data: htmlBody,
  });

  // asEncoded() returns base64url-safe string ready for Gmail API raw field
  return message.asEncoded();
}
```

### Pattern 4: Layered AI Prompt for Outreach Drafting

**What:** Build the outreach email prompt with five distinct context layers to avoid generic output.
**When to use:** Every AI draft generation call.
**Example:**

```typescript
// src/lib/ai/draft-outreach.ts
import OpenAI from "openai";

interface DraftContext {
  userProfile: {
    personality_profile: string;
    business_objectives?: string;
    projects?: string;
  };
  contact: {
    name: string;
    email: string;
    category?: string;
    background?: string;
    relationship_context?: { why?: string; what?: string; mutual_value?: string };
    notes?: string;
  };
  recentMeetings: { title: string; summary?: string; date: string }[];
  actionItems: { text: string; completed: boolean }[];
  openBrainContext?: string; // Pre-fetched, relevant OB snippets
}

export async function generateOutreachDraft(
  apiKey: string,
  context: DraftContext
): Promise<{ subject: string; body: string; rationale: string }> {
  const client = new OpenAI({
    apiKey,
    baseURL: "https://api.z.ai/api/paas/v4",
  });

  const systemPrompt = `You are drafting a personalized outreach email on behalf of the user.

ABOUT THE SENDER (write in their voice):
${context.userProfile.personality_profile}
${context.userProfile.business_objectives ? `Business Objectives: ${context.userProfile.business_objectives}` : ""}
${context.userProfile.projects ? `Current Projects: ${context.userProfile.projects}` : ""}

IMPORTANT GUIDELINES:
- Write naturally in the sender's voice and tone
- Reference specific shared context from meetings
- Keep it concise (3-5 short paragraphs max)
- Include a clear but soft call-to-action
- Do NOT sound like a template or generic AI email
- Do NOT use phrases like "I hope this email finds you well"

Return valid JSON:
{
  "subject": "Email subject line",
  "body": "Full email body in HTML format",
  "rationale": "Brief explanation of why this content was chosen"
}`;

  const meetingContext = context.recentMeetings.length > 0
    ? context.recentMeetings
        .map((m) => `- ${m.title} (${m.date}): ${m.summary || "No summary"}`)
        .join("\n")
    : "No recent meetings";

  const actionContext = context.actionItems.length > 0
    ? context.actionItems
        .map((a) => `- [${a.completed ? "DONE" : "PENDING"}] ${a.text}`)
        .join("\n")
    : "No action items";

  const userPrompt = `CONTACT: ${context.contact.name} (${context.contact.email})
Category: ${context.contact.category || "uncategorized"}
Background: ${context.contact.background || "Unknown"}
Relationship: ${JSON.stringify(context.contact.relationship_context || {})}
Notes: ${context.contact.notes || "None"}

RECENT MEETINGS:
${meetingContext}

ACTION ITEMS:
${actionContext}

${context.openBrainContext ? `SUPPLEMENTAL KNOWLEDGE:\n${context.openBrainContext}` : ""}

Draft a brief, warm outreach email to maintain this relationship.`;

  const response = await client.chat.completions.create({
    model: "glm-5",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7, // Higher than extraction (0.3) for natural variation
    max_tokens: 2048,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No AI response content");
  return JSON.parse(content);
}
```

### Pattern 5: Draft Review Workflow (API Routes)

**What:** RESTful API routes for listing, updating, sending, and dismissing drafts.
**When to use:** Dashboard draft management.

```
GET  /api/drafts              -> List pending drafts for current user
GET  /api/drafts?status=sent  -> Filter by status
PUT  /api/drafts/[id]         -> Update draft body/subject (edit before send)
POST /api/drafts/[id]/send    -> Approve + send via Gmail
DELETE /api/drafts/[id]       -> Dismiss/delete draft + remove Gmail draft
```

### Anti-Patterns to Avoid

- **Hand-rolling MIME encoding:** Use `mimetext`. Manual base64url encoding with headers is fragile and produces malformed messages in edge cases (Unicode subjects, HTML entities, attachments).
- **Creating Gmail client per API call without token caching:** The OAuth2Client handles refresh automatically. Create one per user per request lifecycle, not one per Gmail operation.
- **Sending without human approval:** v1 MUST enforce approve-then-send. No auto-send path. The `outreach_drafts.status` state machine enforces this.
- **Storing draft body only in Gmail:** Always dual-write. The app database is the source of truth; Gmail draft is a convenience copy. If Gmail draft is deleted externally, the app still has the content.
- **Promise.all with Trigger.dev waits:** Sequential awaits only for child tasks per Trigger.dev v4 constraints.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| MIME message construction | Manual string concatenation + base64url | `mimetext` createMimeMessage + asEncoded | RFC 5322 has complex encoding rules for headers, Unicode, HTML content |
| Gmail OAuth token refresh | Custom HTTP calls to Google token endpoint | `google-auth-library` OAuth2Client with `on("tokens")` handler | Handles expiry detection, refresh, and token rotation automatically |
| Email HTML rendering | Raw string templates | HTML template with proper escaping | XSS risk, encoding issues with special characters |
| Outreach scheduling logic | Custom date math for "contact due" | SQL query: `last_outreach_at + interval (outreach_frequency_days || ' days') < NOW()` | Timezone-safe, handles NULL last_outreach (never contacted) |
| Draft status state machine | Freeform string status updates | Postgres CHECK constraint + Zod enum validation | Prevents invalid state transitions (e.g., sending a dismissed draft) |

**Key insight:** The Gmail API surface is deceptively complex -- token lifecycle, MIME encoding, draft ID stability, and quota management all have edge cases. Using battle-tested libraries for each layer reduces the bug surface to business logic only.

## Common Pitfalls

### Pitfall 1: Gmail Draft ID Changes on Update

**What goes wrong:** When you update a Gmail draft, the underlying message ID changes but the draft ID stays the same. Code that cached or referenced the old message ID will break.
**Why it happens:** Gmail treats each draft update as a message replacement, not an in-place edit.
**How to avoid:** Always store and reference the draft ID, never the message ID. When updating, use `drafts.update()` with the draft ID.
**Warning signs:** "Draft not found" errors after editing.

### Pitfall 2: Token Revocation Breaks Draft Generation Silently

**What goes wrong:** Scheduled Trigger.dev tasks try to create Gmail drafts with a revoked refresh token. The task fails, but the AI-generated draft is lost because it was never persisted.
**Why it happens:** Google revokes tokens on password reset, 6-month inactivity, or testing mode (7-day expiry).
**How to avoid:** Always persist the AI draft to the `outreach_drafts` table BEFORE attempting to create the Gmail draft. If Gmail creation fails, mark `gmail_draft_id` as NULL and `gmail_sync_status` as "failed". The user can still review and manually trigger Gmail sync later.
**Warning signs:** Drafts appearing in the app but not in Gmail; `token_status` showing "revoked" in oauth_tokens.

### Pitfall 3: Generic AI Drafts Kill the Core Feature

**What goes wrong:** All drafts sound the same -- bland, overly polite, no specific references to shared context.
**Why it happens:** Insufficient context in the prompt. Just contact name + "maintain the relationship" produces generic output.
**How to avoid:** Layer five context sources in the prompt: (1) user personality profile, (2) contact relationship context, (3) recent meeting summaries with specific topics, (4) pending action items, (5) Open Brain knowledge. Use temperature 0.7 for natural variation.
**Warning signs:** Drafts that could be sent to any contact without modification; users editing >70% of drafts before sending.

### Pitfall 4: Gmail API Quota Exhaustion During Batch Draft Generation

**What goes wrong:** A user with 50+ contacts due for outreach triggers 50 `drafts.create` calls in rapid succession. Gmail API quota is 250 quota units per second; `drafts.create` costs 10 units each.
**Why it happens:** No rate limiting or throttling in the draft generation task.
**How to avoid:** Process contacts sequentially within the per-user task with 200ms delays (matching existing Granola rate-limit pattern). Gmail daily sending limit is 500 emails for regular accounts, so quota is unlikely to be an issue for reasonable outreach volumes.
**Warning signs:** 429 responses from Gmail API; error logs showing "Rate Limit Exceeded".

### Pitfall 5: Dual-Write Inconsistency Between App and Gmail

**What goes wrong:** A draft exists in the app but not in Gmail (creation failed), or a draft was deleted in Gmail but still shows as "pending" in the app.
**Why it happens:** No sync mechanism between the two systems. Gmail draft operations can fail independently.
**How to avoid:** App database is the source of truth. Gmail draft is a "best effort" sync. Track `gmail_draft_id` and `gmail_sync_status` fields. If Gmail creation fails, the draft is still reviewable in-app. Don't try to build bidirectional sync -- one-way (app -> Gmail) is sufficient for v1.
**Warning signs:** Users reporting mismatched draft states between app and Gmail.

### Pitfall 6: Open Brain Tables May Not Exist

**What goes wrong:** The Open Brain integration code tries to query tables that haven't been created for a user, causing SQL errors that block draft generation.
**Why it happens:** Open Brain is a supplemental context source. Not all users will have it configured. The schema may vary.
**How to avoid:** Wrap Open Brain queries in try/catch. If tables don't exist or return empty, proceed without Open Brain context. The AI can draft perfectly fine without it -- it just enhances quality.
**Warning signs:** Draft generation failures with "relation does not exist" errors.

## Code Examples

### Database Migration: outreach_drafts Table

```sql
-- Migration: 00008_create_outreach_drafts.sql
-- Requirements: OUTR-04, OUTR-05, OUTR-06, OUTR-07, OUTR-08

CREATE TABLE outreach_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,          -- HTML content
  status TEXT DEFAULT 'pending_review'
    CHECK (status IN ('pending_review', 'approved', 'sent', 'dismissed')),
  gmail_draft_id TEXT,         -- Gmail draft ID for sync
  gmail_sync_status TEXT DEFAULT 'pending'
    CHECK (gmail_sync_status IN ('pending', 'synced', 'failed', 'not_applicable')),
  ai_rationale TEXT,           -- Why AI chose this content
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

-- Indexes for RLS performance and query patterns
CREATE INDEX idx_outreach_drafts_user ON outreach_drafts(user_id);
CREATE INDEX idx_outreach_drafts_status ON outreach_drafts(user_id, status);
CREATE INDEX idx_outreach_drafts_contact ON outreach_drafts(contact_id);
CREATE INDEX idx_outreach_drafts_gmail ON outreach_drafts(gmail_draft_id);
```

### Contact Due-for-Outreach Query

```sql
-- Contacts that need outreach: never contacted OR overdue
SELECT c.id, c.name, c.email, c.outreach_frequency_days, c.last_interaction_at
FROM contacts c
WHERE c.user_id = $1
  AND c.status = 'active'
  AND c.email IS NOT NULL
  AND c.outreach_frequency_days IS NOT NULL
  AND (
    c.last_interaction_at IS NULL
    OR c.last_interaction_at + (c.outreach_frequency_days || ' days')::INTERVAL < NOW()
  )
  -- Exclude contacts with existing pending drafts
  AND NOT EXISTS (
    SELECT 1 FROM outreach_drafts d
    WHERE d.contact_id = c.id
      AND d.status = 'pending_review'
  )
ORDER BY c.last_interaction_at ASC NULLS FIRST
LIMIT 20;  -- Cap per-user per-run to prevent quota issues
```

### Draft Status State Machine

```
                    +------------------+
                    | pending_review   |
                    +--------+---------+
                             |
            +----------------+----------------+
            |                |                |
    +-------v------+  +-----v------+  +------v-------+
    |   approved   |  |  dismissed |  |  (edit body) |
    +-------+------+  +------------+  |  stays       |
            |                         |  pending     |
    +-------v------+                  +--------------+
    |     sent     |
    +--------------+
```

### Zod Validation Schema for Drafts

```typescript
// src/lib/validations/drafts.ts
import { z } from "zod";

export const outreachDraftSchema = z.object({
  contact_id: z.string().uuid(),
  subject: z.string().min(1).max(500),
  body: z.string().min(1).max(50000),
  ai_rationale: z.string().optional(),
});

export const draftUpdateSchema = z.object({
  subject: z.string().min(1).max(500).optional(),
  body: z.string().min(1).max(50000).optional(),
});

export const DRAFT_STATUSES = ["pending_review", "approved", "sent", "dismissed"] as const;
export type DraftStatus = typeof DRAFT_STATUSES[number];
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Full `googleapis` package | Per-service `@googleapis/gmail` | 2023+ | 95% smaller install; same API surface |
| Manual MIME string building | `mimetext` library | 2022+ | RFC 5322 compliance without manual encoding |
| gmail.modify for drafts | gmail.compose (minimum scope) | Scope classification unchanged | Principle of least privilege |
| Single system prompt for all | Layered context injection | Industry standard 2024+ | Dramatically better personalization |

**Deprecated/outdated:**
- `nodemailer` for Gmail API MIME (nodemailer is for SMTP, not API-based sending)
- `client.defineJob` in Trigger.dev (v2 API, replaced by `task()` in v4)
- Using `gmail.modify` scope when only compose is needed

## Open Questions

1. **Open Brain Table Schema**
   - What we know: Open Brain is described as "user's Supabase knowledge base tables" providing supplemental context
   - What's unclear: The exact table names, columns, and data format of Open Brain tables. The research summary notes "schema is undocumented in research. Needs discovery."
   - Recommendation: During implementation, discover the schema by querying Supabase information_schema for tables matching "open_brain*" or similar patterns. Build the Open Brain client with a graceful fallback -- if tables don't exist, skip context enrichment without blocking draft generation. The AI prompt works without it.

2. **Gmail Scope Verification Status**
   - What we know: `gmail.compose` is restricted; requires security assessment for 100+ users; apps with <100 users are exempt
   - What's unclear: Whether Google verification has been submitted yet; current timeline status
   - Recommendation: For v1 with <100 users, the testing/limited exemption is fine. Track when user count approaches 100 and begin verification process proactively.

3. **Draft Generation Frequency**
   - What we know: Architecture docs suggest "daily at 7am user-local-time"
   - What's unclear: Whether users should be able to configure outreach generation frequency separately from meeting processing frequency
   - Recommendation: Start with generating drafts once per day at the start of the user's processing window (reuse the existing `processing_schedule.start_hour`). Add a separate outreach schedule field in v2 if needed.

4. **Gmail "From" Address**
   - What we know: Gmail API with `userId: "me"` uses the authenticated user's primary email
   - What's unclear: Whether users have custom "From" addresses (aliases, send-as)
   - Recommendation: v1 uses default "me" (authenticated user's email). The MIME message can omit the From header and Gmail will fill it in. Add alias support in v2.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 |
| Config file | vitest.config.ts |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| OUTR-01 | Dispatcher identifies contacts due for outreach | unit | `npx vitest run src/__tests__/trigger/outreach-dispatcher.test.ts -x` | Wave 0 |
| OUTR-02 | AI generates personalized draft with layered context | unit | `npx vitest run src/__tests__/ai/draft-outreach.test.ts -x` | Wave 0 |
| OUTR-03 | Draft uses z.ai GLM5 with user API key | unit | `npx vitest run src/__tests__/ai/draft-outreach.test.ts -x` | Wave 0 |
| OUTR-04 | Draft appears in app dashboard | unit | `npx vitest run src/__tests__/api/drafts.test.ts -x` | Wave 0 |
| OUTR-05 | Draft created as Gmail draft simultaneously | unit | `npx vitest run src/__tests__/gmail/client.test.ts -x` | Wave 0 |
| OUTR-06 | User can approve and send draft | unit | `npx vitest run src/__tests__/api/drafts-send.test.ts -x` | Wave 0 |
| OUTR-07 | User can edit draft before sending | unit | `npx vitest run src/__tests__/components/draft-editor.test.tsx -x` | Wave 0 |
| OUTR-08 | User can dismiss/delete draft | unit | `npx vitest run src/__tests__/api/drafts.test.ts -x` | Wave 0 |
| OBRN-01 | System reads Open Brain tables | unit | `npx vitest run src/__tests__/open-brain/client.test.ts -x` | Wave 0 |
| OBRN-02 | Open Brain context enriches drafts | unit | `npx vitest run src/__tests__/ai/draft-outreach.test.ts -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/trigger/outreach-dispatcher.test.ts` -- covers OUTR-01
- [ ] `src/__tests__/ai/draft-outreach.test.ts` -- covers OUTR-02, OUTR-03, OBRN-02
- [ ] `src/__tests__/gmail/client.test.ts` -- covers OUTR-05 (mocked Gmail API)
- [ ] `src/__tests__/gmail/mime.test.ts` -- covers MIME message construction
- [ ] `src/__tests__/api/drafts.test.ts` -- covers OUTR-04, OUTR-08
- [ ] `src/__tests__/api/drafts-send.test.ts` -- covers OUTR-06
- [ ] `src/__tests__/components/draft-editor.test.tsx` -- covers OUTR-07
- [ ] `src/__tests__/open-brain/client.test.ts` -- covers OBRN-01

## Sources

### Primary (HIGH confidence)
- [Gmail API users.drafts.create](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.drafts/create) -- Required scopes: gmail.compose, gmail.modify, or mail.google.com
- [Gmail API users.drafts.send](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.drafts/send) -- Same scopes as drafts.create
- [Gmail API Drafts Guide](https://developers.google.com/workspace/gmail/api/guides/drafts) -- MIME encoding, draft lifecycle, update-replaces-message behavior
- [Gmail API Sending Guide](https://developers.google.com/workspace/gmail/api/guides/sending) -- RFC 2822 compliance, base64url encoding requirement
- [Gmail API Scope Classification](https://developers.google.com/workspace/gmail/api/auth/scopes) -- gmail.compose is RESTRICTED; gmail.send is SENSITIVE
- [Google OAuth Restricted Scope Verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification) -- Security assessment required for 100+ users; <100 exempt
- [MIMEText GitHub](https://github.com/muratgozel/MIMEText) -- RFC 5322 compliant MIME generator; asEncoded() for Gmail API
- [@googleapis/gmail npm](https://www.npmjs.com/package/@googleapis/gmail) -- v16.1.1, 1.15MB, Google's lightweight Gmail-only package

### Secondary (MEDIUM confidence)
- [google-auth-library GitHub](https://github.com/googleapis/google-auth-library-nodejs) -- OAuth2Client auto-refresh with on("tokens") handler
- [Google OAuth App Verification](https://www.nylas.com/blog/google-oauth-app-verification/) -- Cost estimates $500-$4,500 for security assessment
- [Google OAuth Best Practices](https://developers.google.com/identity/protocols/oauth2/resources/best-practices) -- Token storage, refresh patterns

### Tertiary (LOW confidence)
- [Gmail Gemini AI Deliverability 2026](https://folderly.com/blog/gmail-gemini-ai-email-deliverability-2026) -- New semantic filtering may affect AI-drafted email deliverability; needs monitoring

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All packages verified on npm registry with current versions; Gmail API scopes confirmed against official docs
- Architecture: HIGH - Dispatcher/fan-out pattern proven in Phase 2; Gmail service pattern follows official googleapis examples
- Pitfalls: HIGH - Gmail scope classification verified; token revocation scenarios documented by Google; MIME encoding requirements confirmed
- Open Brain: LOW - Schema undocumented; implementation must be discovery-driven with graceful fallback

**Research date:** 2026-03-19
**Valid until:** 2026-04-19 (30 days; Gmail API and z.ai are stable)
