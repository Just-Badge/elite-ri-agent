# Pitfalls Research

**Domain:** Relationship Intelligence / AI Outreach Automation Platform
**Researched:** 2026-03-18
**Confidence:** HIGH (verified across official docs, community discussions, and domain-specific sources)

## Critical Pitfalls

### Pitfall 1: Gmail API Restricted Scope Verification Blocks Production Launch

**What goes wrong:**
Creating Gmail drafts requires `gmail.compose`, which Google classifies as a **restricted scope**. Restricted scopes require both Google OAuth verification AND an independent third-party security assessment before the app can leave testing mode. In testing mode, refresh tokens expire after 7 days and you are limited to 100 manually-added test users. Developers often discover this weeks before planned launch, causing multi-week delays.

**Why it happens:**
Teams assume Gmail API integration is a straightforward OAuth flow. They build the feature in testing mode (where everything works), then discover at launch time that `gmail.compose` is restricted -- not just sensitive. The security assessment alone can take 2-8 weeks, costs money, and requires demonstrating how user data is stored and protected. There is no narrower scope that allows draft creation; `gmail.compose` is the minimum required scope for `users.drafts.create`.

**How to avoid:**
- Start the Google OAuth verification process in Phase 1, not at launch. Submit for brand verification immediately (2-3 business days).
- Use `gmail.send` (sensitive, not restricted) if you can switch to sending emails directly instead of creating drafts. Sensitive scopes require verification but NOT a security assessment -- dramatically simpler.
- If drafts are required, budget 4-8 weeks for the restricted scope verification pipeline. Prepare: privacy policy, terms of service, video demo of scope usage, and security assessment documentation.
- Consider the "personal use" or "<100 users" exceptions for early phases, but plan the full verification for production.

**Warning signs:**
- Building Gmail draft features without checking scope classification
- No privacy policy URL or terms of service URL configured in Google Cloud Console
- OAuth consent screen still in "Testing" publishing status as feature development completes
- Users reporting "token expired" errors after 7 days (testing mode symptom)

**Phase to address:**
Phase 1 (Foundation). Submit for verification before any Gmail feature development begins. The verification timeline is external and cannot be compressed.

---

### Pitfall 2: Refresh Token Revocation Breaks Background Scheduled Jobs Silently

**What goes wrong:**
Trigger.dev scheduled jobs (meeting processing, draft generation) run without user interaction using stored OAuth refresh tokens. Google revokes refresh tokens in multiple scenarios: testing mode (7-day expiry), user password reset, user revokes access, token unused for 6 months, or exceeding 100 tokens per user per client. When a token is revoked, the scheduled job fails silently -- no meeting processing, no drafts generated, and the user has no idea until they check the dashboard days later.

**Why it happens:**
Developers test with fresh tokens and never encounter revocation during development. The 7-day testing mode expiry is well-known but the other revocation scenarios (password reset, token limits) are not. Background jobs that fail don't have a user session to trigger re-authentication, so the failure just... continues.

**How to avoid:**
- Implement a `token_status` field on each user record: `active`, `expired`, `revoked`. Update on every API call.
- Build a token health check that runs before each scheduled job. If the token is invalid, mark the user's processing as `paused` and send a notification (in-app banner, not email -- their Gmail access is broken).
- Store the exact error code from Google's token refresh response. `invalid_grant` means revoked; distinguish from transient 5xx errors.
- When re-authentication is needed, queue it for the next user login rather than silently skipping work.
- Move to production publishing status as early as possible to avoid the 7-day testing mode expiry.

**Warning signs:**
- No error handling on token refresh in background jobs
- No user notification mechanism for broken OAuth connections
- Scheduled jobs that "succeed" (exit code 0) even when API calls fail
- No monitoring on per-user job success rates

**Phase to address:**
Phase 2 (Gmail Integration). Build token health monitoring from day one of Gmail integration, not as an afterthought.

---

### Pitfall 3: Contact Deduplication Creates Phantom Merges or Missed Duplicates

**What goes wrong:**
Meeting transcripts mention people by first name, nickname, or role ("the CTO"). The same person appears as "John Smith", "John", "JS", and "john.smith@company.com" across different meetings. Naive exact-match deduplication misses all of these. Aggressive fuzzy matching merges "John Smith at Acme" with "John Smith at Beta Corp" (different people). Both failure modes corrupt the contact database -- phantom merges lose relationship context, missed duplicates fragment it.

**Why it happens:**
Deduplication feels like a solved problem until you hit real data. Meeting transcripts lack structured identifiers. People change companies (same name, different entity). Role-based emails (info@company.com) appear on multiple contacts legitimately. Name variations across cultures add further complexity. HubSpot found 18% of their own CRM was duplicates despite having enterprise deduplication.

**How to avoid:**
- Use a multi-signal matching approach: email (highest confidence), then name + company combination, then name + meeting co-occurrence.
- Never auto-merge contacts. Flag potential duplicates for user review with a confidence score. Let the user confirm.
- Implement a `canonical_contact_id` + `alias` model. One canonical contact, multiple aliases that point to it. If a merge is wrong, you can unlink aliases without data loss.
- Extract email addresses from transcript content as the primary dedup key (most reliable identifier).
- Store the raw extracted name alongside the normalized version so merges can be audited and reversed.

**Warning signs:**
- Contact count diverges wildly from expected (too few = over-merging, too many = under-merging)
- Users report contacts they don't recognize (phantom merges)
- Same person shows up multiple times in dashboard with slightly different names
- No merge audit log or undo capability

**Phase to address:**
Phase 3 (Contact Intelligence). Design the data model to support dedup from the start (Phase 2), but implement matching logic in Phase 3.

---

### Pitfall 4: Granola MCP Integration Cannot Run Server-Side in Background Jobs

**What goes wrong:**
The Granola MCP server uses browser-based OAuth for authentication -- it literally opens a browser window for the user to sign in. This works perfectly in desktop tools (Claude Desktop, Cursor) but cannot work inside a Trigger.dev scheduled task running on a VPS. There is no API key, no service account, no headless authentication path documented. The architecture assumes an interactive user session.

**Why it happens:**
MCP (Model Context Protocol) was designed for AI assistant integrations where a human is present. The Granola MCP server follows this pattern -- it is meant for tools like Claude Desktop, not for server-side background processing. Additionally, Granola's API is private and undocumented; all known endpoints were discovered through reverse engineering.

**How to avoid:**
- Accept that MCP cannot be used directly in Trigger.dev jobs. Instead, bridge the gap:
  - Option A: Have the user's browser/desktop MCP client push meeting data to your API during interactive sessions (user-initiated sync).
  - Option B: Reverse-engineer Granola's API and use the bearer token obtained during the MCP OAuth flow, stored and refreshed server-side. This is fragile and may break without notice.
  - Option C: Use a local MCP client that runs on the user's machine and pushes data to your server on a schedule.
- Store the Granola bearer token after the initial interactive OAuth, then use it directly for API calls in background jobs (bypassing MCP entirely).
- Build a fallback: manual transcript upload via the dashboard for when automated ingestion fails.
- Design the transcript processing pipeline to be source-agnostic -- it should accept transcripts from any source, not just Granola MCP.

**Warning signs:**
- Assuming MCP works like a REST API that can be called from any environment
- No plan for how Granola auth tokens reach the server-side scheduled job
- No fallback for when Granola's private API changes
- Architecture diagrams showing "Trigger.dev -> MCP -> Granola" as a direct path

**Phase to address:**
Phase 1 (Foundation). This is an architectural constraint that must be resolved before any meeting processing work begins. Prototype the Granola data flow first.

---

### Pitfall 5: Multi-Tenant Data Isolation Failures via Missing or Misconfigured RLS

**What goes wrong:**
A user sees another user's contacts, meeting transcripts, or draft emails. In Supabase, every new table has RLS **disabled** by default. If you create tables via SQL migrations and forget to enable RLS, the Supabase API exposes all rows to all authenticated users. Conversely, enabling RLS without policies returns empty results for everyone -- which looks like "no data" bugs rather than security issues.

**Why it happens:**
RLS is easy to forget during rapid development. The SQL Editor bypasses RLS entirely, so developers testing there never see the problem. The failure mode is silent: no error messages, just wrong data or empty results. Relationship intelligence data is especially sensitive -- leaked contact notes, relationship context, and email drafts represent severe privacy violations.

**How to avoid:**
- Create a migration template that always includes `ALTER TABLE [table] ENABLE ROW LEVEL SECURITY;` and a default deny policy.
- Add a CI check: query `pg_tables` for tables without RLS enabled, fail the build if any exist.
- Every table must have a `user_id` column that references `auth.users(id)`, and a policy `USING (user_id = auth.uid())`.
- Never test RLS from the SQL Editor or using `service_role` keys. Always test from the client SDK with actual user tokens.
- Index every column used in RLS policies (especially `user_id`). Missing indexes on RLS columns is the number one performance killer in Supabase multi-tenant apps.
- Use the Supabase Security Advisor dashboard tool to audit RLS configuration.

**Warning signs:**
- Tables created without explicit RLS statements in migrations
- Testing only via SQL Editor or Supabase Studio (both bypass RLS)
- No `user_id` column on a data table
- Queries returning unexpectedly large or empty result sets
- Service role key appearing anywhere in client-side code

**Phase to address:**
Phase 1 (Foundation). Establish RLS patterns and migration templates before any data tables are created. Every subsequent phase inherits this pattern.

---

### Pitfall 6: AI-Drafted Emails Sound Generic and Users Stop Using the Feature

**What goes wrong:**
The AI generates emails that are technically correct but sound like every other AI-generated email: bland, overly polite, formulaic. Users approve a few drafts, realize they need to heavily rewrite each one, and abandon the feature. The core value proposition -- "relationship maintenance without manual effort" -- collapses.

**Why it happens:**
Prompt engineering for personal communication style is genuinely hard. A user profile form ("I'm casual and direct") is insufficient context. The AI needs examples of actual emails the user has sent, specific relationship context, shared history from meetings, and the user's actual vocabulary patterns. Most implementations feed the AI a generic persona description and contact metadata, producing generically "personalized" output.

**How to avoid:**
- Build the prompt pipeline in layers: (1) user personality profile, (2) contact-specific relationship context from meetings, (3) recent interaction history, (4) specific action items or talking points from last meeting, (5) optional user-provided example emails for tone calibration.
- Start with a "draft quality" metric: what percentage of drafts are sent without edits vs. edited vs. rejected? Track this per user.
- Allow users to provide feedback on drafts ("too formal", "too long", "wrong topic") and feed this back into prompt refinement.
- Never send emails without explicit user approval in v1. The "approve, edit+approve, send" workflow in the requirements is correct -- do not shortcut this.
- Use temperature and prompt variations to avoid the "same email different name" problem across contacts.

**Warning signs:**
- All drafts for different contacts read similarly
- High edit rate (>70% of drafts are modified before sending)
- Declining draft approval rate over time
- No feedback mechanism on draft quality
- Prompt template has no slot for meeting-specific context

**Phase to address:**
Phase 4 (AI Outreach). But the data model must support rich context storage from Phase 2/3 -- the AI can only draft well if the contact data is rich.

---

### Pitfall 7: Per-User API Key Management Creates Security and UX Nightmares

**What goes wrong:**
The project requires users to provide their own z.ai API key, Granola credentials, and Gmail OAuth tokens. Storing, encrypting, rotating, and validating multiple third-party credentials per user becomes a significant security surface. A single database breach exposes all users' API keys. A single missing or expired key silently breaks the user's entire pipeline.

**Why it happens:**
"Users provide their own API key" sounds simple but creates a credential management system. Each key has different expiry rules, rate limits, and error responses. When one key fails, the system needs to know which user is affected, what is broken, and how to notify them -- all without having a working email connection (which might itself be the broken credential).

**How to avoid:**
- Encrypt all API keys at rest using AES-256 with a key management approach where encryption keys are separate from the database (environment variable at minimum, KMS at best).
- Build a unified credential health dashboard: one page showing the status of each integration (Granola: connected, Gmail: token expired, z.ai: valid).
- Validate API keys on entry. Make a test API call when the user saves a key and show immediate success/failure feedback.
- Implement per-credential error tracking. When a Trigger.dev job fails because of a credential, update the credential status, not just the job status.
- Design the settings page so users can see which credentials are healthy without navigating to each integration separately.

**Warning signs:**
- API keys stored in plaintext in the database
- No key validation on save (user typos go undetected until a background job fails)
- No per-user credential status tracking
- Error logs show API failures but don't identify which user or which credential failed
- No notification path when credentials expire (especially if email is the broken credential)

**Phase to address:**
Phase 1 (Foundation). Credential storage and encryption infrastructure must exist before any third-party integration is built.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Storing OAuth tokens unencrypted | Faster development, simpler queries | Any database breach exposes all users' Gmail access | Never |
| Skipping contact dedup in v1 | Ship faster, avoid complex matching logic | Database fills with fragments; merging later requires migration and data cleanup | MVP with single user only |
| Hardcoding Granola API endpoints | Get integration working quickly | Any Granola API change breaks the system with no warning | Early prototype, but abstract behind an interface immediately |
| Using `service_role` key in client code | Bypass RLS during development for speed | Full database access from browser; any user can read/write all data | Never |
| Single prompt template for all emails | Faster to build, easier to debug | All drafts sound identical; users abandon the feature | First iteration only, refine before user testing |
| No rate limiting on Gmail API calls | Simpler code | Google rate-limits hit during batch draft generation; 429 errors cascade | Never -- implement exponential backoff from day one |
| Skipping migration-level RLS enforcement | Faster table creation | Tables without RLS slip through; data leaks discovered in production | Never |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Gmail OAuth | Not requesting `access_type=offline` and `prompt=consent` on first auth | Always include both parameters; without them, Google may not return a refresh token |
| Gmail OAuth | Assuming refresh tokens last forever | Handle `invalid_grant` errors; implement re-auth flow and user notification |
| Gmail Drafts | Using `gmail.modify` (broader than needed) | Use `gmail.compose` (minimum scope for draft creation + sending) |
| Gmail API | Sending batches larger than 50 requests | Keep batch sizes under 50; each request in a batch counts toward rate limits individually |
| Granola MCP | Calling MCP tools from server-side background jobs | Store the bearer token from interactive OAuth; call Granola's HTTP API directly from background jobs |
| Granola MCP | Assuming free plan gives full history access | Free plan limits to 30 days of notes; shared notes are not accessible via MCP |
| Supabase RLS | Testing RLS from SQL Editor | SQL Editor runs as superuser and bypasses all RLS; always test from client SDK with user tokens |
| Supabase RLS | Writing `auth.uid()` in subqueries without caching | Wrap `auth.uid()` calls to enable Postgres query planner caching; avoids per-row function evaluation |
| z.ai GLM5 | No timeout or fallback for AI API calls | Set request timeouts (30s); implement retry with backoff; queue failed drafts for retry |
| Trigger.dev | Running per-user jobs without concurrency limits | Use per-user queue with `concurrencyLimit: 1` to prevent parallel processing of the same user's data |
| Trigger.dev | Not using `externalId` for per-user schedules | Use `externalId: userId` for multi-tenant schedules; enables per-user schedule management |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| RLS policies without indexes on `user_id` | Dashboard queries take 2-5s instead of <100ms | Add btree index on `user_id` for every table with RLS | 10K+ rows per table |
| Loading full meeting transcripts into memory for parsing | Trigger.dev worker OOM errors on long meetings | Stream/chunk transcripts; process paragraphs individually | Transcripts >50KB (common for 1hr+ meetings) |
| N+1 queries loading contacts with all their meetings | Dashboard page load >3s | Use Supabase joins or materialized views for contact cards | 100+ contacts per user |
| Generating all daily drafts synchronously | Trigger.dev job timeout; Gmail rate limits | Fan-out: one parent task triggers individual draft tasks per contact | 20+ contacts needing outreach on same day |
| Storing full transcript text in contacts table | Contact queries slow; database bloats | Store transcripts in separate table; reference by ID; summarize key points into contact record | 500+ meetings processed |
| Unbounded Granola history fetch on first sync | Timeout; massive initial processing load | Paginate and limit initial sync to recent 30-90 days; backfill incrementally | Users with 6+ months of meeting history |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Storing z.ai API keys in plaintext | Database breach exposes all users' AI API keys; attacker can run up API bills | Encrypt at rest with AES-256; use separate encryption key not stored in DB |
| Exposing Supabase `service_role` key to client | Full database access from any authenticated user; complete data breach | Only use `service_role` in server-side code; use `anon` key in client with RLS |
| OAuth state parameter not validated | CSRF attacks during Google OAuth flow; attacker can link victim's account to attacker's Gmail | Generate and validate cryptographic state parameter on every OAuth redirect |
| Storing meeting transcripts without tenant isolation | One user's confidential meeting notes visible to others | RLS on every table; `user_id` column on every row; integration tests verifying isolation |
| Gmail draft content logged in plaintext | Server logs contain sensitive email content; log aggregation services see user emails | Redact email content from logs; log only metadata (recipient, subject length, draft ID) |
| No rate limiting on API key validation endpoint | Attacker can brute-force or enumerate valid API keys | Rate limit the settings/credentials endpoints; use CAPTCHA or token bucket |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No visibility into processing status | User adds Granola key, waits, sees nothing; assumes it is broken | Show processing status: "Last sync: 2 hours ago, 3 meetings processed, next sync: 4pm" |
| Requiring all integrations before any value | User must connect Granola + Gmail + z.ai before seeing anything | Progressive onboarding: connect Granola alone to see contacts; add Gmail later for outreach |
| Showing raw AI confidence scores | User sees "78% match" and has no idea what to do with it | Translate to actions: "Possible duplicate -- review" or "High confidence match -- auto-linked" |
| Email drafts with no context about why | User sees a draft but doesn't know what triggered it or what meeting it relates to | Each draft shows: triggering contact, last meeting date, relevant context snippet, outreach cadence status |
| Settings page with no validation feedback | User enters invalid API key, saves, background jobs fail silently for days | Validate credentials on save with test API call; show green checkmark or red error immediately |
| Contact list with no "relationship health" summary | User has 200 contacts but no way to prioritize | Dashboard landing shows: contacts at risk, overdue outreach, recent meetings needing follow-up |

## "Looks Done But Isn't" Checklist

- [ ] **Gmail Integration:** Often missing refresh token rotation handling -- verify that re-auth flow works when a user resets their Google password
- [ ] **Gmail Drafts:** Often missing RFC 2822 message formatting -- verify drafts render correctly in Gmail with proper headers, HTML body, and reply threading
- [ ] **Contact Dedup:** Often missing merge undo -- verify that incorrectly merged contacts can be separated without data loss
- [ ] **Scheduled Jobs:** Often missing per-user error isolation -- verify that one user's failed job doesn't block or delay other users' processing
- [ ] **RLS Policies:** Often missing `DELETE` and `UPDATE` policies -- verify users can only modify their own data, not just read it
- [ ] **AI Drafts:** Often missing context window management -- verify that large contact histories don't exceed the LLM context window and silently truncate important context
- [ ] **Multi-tenant Schedules:** Often missing schedule cleanup on user deletion -- verify that deleting a user also removes their Trigger.dev schedules
- [ ] **OAuth Consent:** Often missing scope justification documentation -- verify that Google verification submission includes video demo and written justification for every requested scope
- [ ] **Granola Sync:** Often missing idempotency -- verify that processing the same meeting twice doesn't create duplicate contacts or duplicate meeting records
- [ ] **Dashboard:** Often missing empty states -- verify that new users with no data see helpful onboarding prompts, not blank pages

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| RLS not enabled on a table | MEDIUM | Enable RLS immediately; audit access logs for unauthorized reads; notify affected users if data was exposed |
| Phantom contact merges | HIGH | Restore from backup if available; otherwise manually separate contacts using merge audit log; rebuild relationship context from original transcripts |
| Refresh token revocation undetected | LOW | Mark user processing as paused; send in-app notification; re-authenticate on next login |
| Gmail rate limit exceeded | LOW | Implement exponential backoff; spread draft generation across wider time windows; reduce batch sizes |
| API keys stored unencrypted | HIGH | Rotate all affected API keys; implement encryption; notify users to regenerate keys; audit access logs |
| AI drafts sent without approval (if auto-send enabled prematurely) | CRITICAL | Cannot unsend emails; damage control only; disable auto-send; review all sent emails; apologize to affected contacts |
| Granola API endpoint changes | MEDIUM | Detect via error monitoring; update endpoints; re-test authentication flow; consider building a Granola adapter layer |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Gmail restricted scope verification | Phase 1 (Foundation) | Google OAuth consent screen submitted for verification; timeline tracked in project management |
| Refresh token revocation | Phase 2 (Gmail Integration) | Integration test: revoke token, verify user notification appears and jobs pause gracefully |
| Contact deduplication errors | Phase 3 (Contact Intelligence) | Test with real-world name variations; verify merge/unmerge flows; check for data loss on undo |
| Granola MCP server-side limitation | Phase 1 (Foundation) | Working prototype of Granola data ingestion running in Trigger.dev without interactive browser session |
| Multi-tenant RLS failures | Phase 1 (Foundation) | CI check for tables without RLS; integration test: User A cannot read User B's data across all tables |
| AI draft quality | Phase 4 (AI Outreach) | Draft quality metrics: approval rate >50%, edit rate <50% before launch; user feedback mechanism live |
| Per-user credential management | Phase 1 (Foundation) | Encrypted storage verified; credential health check endpoint live; validation on save confirmed |
| Gmail rate limits on batch drafts | Phase 4 (AI Outreach) | Load test: generate 50 drafts for one user; verify no 429 errors; verify exponential backoff works |
| RLS performance degradation | Phase 2 (Data Model) | `EXPLAIN ANALYZE` on all dashboard queries with 1000+ rows; verify index usage on `user_id` columns |
| Granola API changes silently | Phase 2 (Transcript Processing) | Health check endpoint that validates Granola API connectivity; alert on unexpected response formats |

## Sources

- [Gmail API Scope Classification](https://developers.google.com/workspace/gmail/api/auth/scopes) -- Official scope docs confirming `gmail.compose` is restricted
- [Gmail API Usage Limits](https://developers.google.com/workspace/gmail/api/reference/quota) -- Rate limits and quota units
- [Gmail API Drafts.create](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.drafts/create) -- Required scopes for draft creation
- [Google OAuth Restricted Scope Verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification) -- Security assessment requirements
- [Google OAuth Sensitive Scope Verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification) -- Sensitive scope process
- [Google OAuth App Audience Management](https://support.google.com/cloud/answer/15549945?hl=en) -- Testing vs production mode, 100-user limit, 7-day token expiry
- [Supabase RLS Performance Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv) -- Official RLS optimization guide
- [Supabase Row Level Security Docs](https://supabase.com/docs/guides/database/postgres/row-level-security) -- RLS fundamentals
- [Granola MCP Documentation](https://docs.granola.ai/help-center/sharing/integrations/mcp) -- Official MCP integration docs, OAuth flow, rate limits
- [Google OAuth Best Practices](https://developers.google.com/identity/protocols/oauth2/resources/best-practices) -- Token storage and refresh patterns
- [Trigger.dev Schedule Management](https://trigger.dev/docs/management/schedules/create) -- Multi-tenant schedule patterns with externalId
- [CRM Deduplication Guide](https://databar.ai/blog/article/crm-deduplication-complete-guide-to-finding-merging-duplicate-records) -- Matching strategies and edge cases
- [Gmail Gemini AI Deliverability Changes 2026](https://folderly.com/blog/gmail-gemini-ai-email-deliverability-2026) -- New semantic filtering layer
- [Supabase Multi-Tenant RLS Patterns](https://dev.to/blackie360/-enforcing-row-level-security-in-supabase-a-deep-dive-into-lockins-multi-tenant-architecture-4hd2) -- Practical multi-tenant implementation
- [Google OAuth Token Revocation Scenarios](https://nango.dev/blog/google-oauth-invalid-grant-token-has-been-expired-or-revoked) -- Comprehensive list of revocation causes

---
*Pitfalls research for: ELITE Relationship Intelligence Agent*
*Researched: 2026-03-18*
