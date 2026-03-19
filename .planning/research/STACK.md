# Technology Stack

**Project:** ELITE Relationship Intelligence Agent
**Researched:** 2026-03-18
**Overall Confidence:** HIGH

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Next.js | 15.5.x | App framework, SSR, API routes | Stable, battle-tested, excellent Coolify/Docker support. Next.js 16 is out but 15.5 is safer for greenfield -- 16 removed sync APIs (breaking change) and ecosystem libraries are still catching up. Upgrade to 16 after v1 ships. | HIGH |
| React | 19.x | UI rendering | Ships with Next.js 15.5. Stable, supports Server Components and Actions. | HIGH |
| TypeScript | 5.7+ | Type safety | Non-negotiable for a project with complex contact data models and API integrations. | HIGH |

### UI Layer

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Tailwind CSS | 4.2.x | Styling | 5x faster builds, CSS-first config. shadcn/ui v4 requires Tailwind v4. | HIGH |
| shadcn/ui | v4 (CLI v4) | Component library | Not a dependency -- copies components into your codebase. No version lock-in, full customization. Has DataTable, Card, Sheet, Tabs, Form, Sidebar -- everything a CRM dashboard needs. | HIGH |
| Lucide React | 0.577.x | Icons | Default icon set for shadcn/ui. Tree-shakable, 1600+ icons. | HIGH |
| Sonner | latest | Toast notifications | shadcn/ui's official toast component. Zero-config, works with Server Actions. | HIGH |
| Recharts | 2.x | Charts/visualizations | Simple SVG charts for relationship health dashboards. shadcn/ui has built-in Recharts chart components. Nivo is more powerful but overkill for status indicators and cadence timelines. | HIGH |

### Database & Auth

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Supabase Cloud | - | PostgreSQL database, auth, storage | Already decided. Managed hosting eliminates DB ops. RLS provides multi-tenant isolation at the database level. | HIGH |
| @supabase/supabase-js | 2.99.x | Supabase client | Official JS client. Used in both server and client contexts. | HIGH |
| @supabase/ssr | 0.9.x | Server-side auth | Replaces deprecated auth-helpers. Handles cookie-based sessions in Next.js middleware, Server Components, and Route Handlers. | HIGH |
| Supabase RLS | - | Multi-tenant data isolation | Every table gets a `user_id` column + RLS policy matching `auth.uid()`. Data isolation enforced at DB level, not application level. Index `user_id` columns for performance. | HIGH |

### Auth Flow (Google OAuth + Gmail)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Supabase Auth (Google provider) | - | Authentication + Gmail authorization | Single OAuth flow handles both login AND Gmail API access. Pass `access_type: 'offline'` and `prompt: 'consent'` to get `provider_refresh_token` for long-lived Gmail access. | HIGH |

**Critical detail:** Supabase Auth does NOT manage refreshing the Google provider token. Your app must store `provider_refresh_token` securely (encrypted in Supabase) and use it to obtain fresh access tokens via Google's token endpoint before Gmail API calls. This is a custom responsibility.

**Required Google OAuth scopes:**
- `openid` (login)
- `email` (login)
- `profile` (login)
- `https://www.googleapis.com/auth/gmail.compose` (create drafts)
- `https://www.googleapis.com/auth/gmail.send` (send emails)
- `https://www.googleapis.com/auth/gmail.modify` (manage drafts)

**Warning:** Gmail scopes are "restricted" -- Google verification can take weeks/months. Start the verification process in Phase 1.

### Gmail Integration

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| googleapis | 171.x | Gmail API client | Official Google API Node.js client. Use `@googleapis/gmail` (16.x) for a smaller install if you only need Gmail. Both work. The full `googleapis` package is large but convenient if you ever need Calendar or other Google APIs. | HIGH |

**Recommendation:** Use `@googleapis/gmail` (16.1.x) -- smaller footprint, focused on what you need. Create drafts via `gmail.users.drafts.create()`, send via `gmail.users.messages.send()`.

### AI Model Integration

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| z.ai GLM-5 API | v4 | Contact extraction, email drafting | OpenAI-compatible REST API at `https://api.z.ai/api/paas/v4/chat/completions`. Supports streaming, tool/function calling, and thinking mode. 205K context window handles long transcripts. | HIGH |
| openai (npm) | 4.x | API client for GLM-5 | Use the OpenAI Node.js SDK pointed at z.ai's base URL. Avoids writing raw fetch calls. Fully compatible since GLM-5 uses OpenAI-compatible format. | MEDIUM |

```typescript
// Usage pattern
import OpenAI from 'openai';

const glm = new OpenAI({
  apiKey: userApiKey, // Per-user API key from settings
  baseURL: 'https://api.z.ai/api/paas/v4/',
});

const completion = await glm.chat.completions.create({
  model: 'glm-5',
  messages: [...],
});
```

**Per-user API key pattern:** Store encrypted in Supabase. Decrypt server-side before API calls. Never expose in client bundles.

### Meeting Data (Granola)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| @modelcontextprotocol/sdk | 1.27.x | MCP client for Granola | Official TypeScript MCP SDK. Use as an MCP client to call Granola MCP server tools from Trigger.dev background jobs. | MEDIUM |
| Granola API (REST) | v1 | Direct transcript access | REST API at `https://api.granola.ai/v1/get-document-transcript`. Bearer token auth. Enterprise plan required for official API. Alternative: GranolaMCP reads from local cache files. | LOW |

**Architecture decision:** The MCP server approach (using `@modelcontextprotocol/sdk` as a client) works for local/development use where Granola desktop app runs. For production multi-tenant, you'll likely need Granola's REST API with per-user auth tokens, OR have users export/sync their data. This needs Phase 1 spike research.

**Alternative approach:** GranolaMCP (community project) reads directly from Granola's local cache files -- works without API access but only from the machine running Granola. Not viable for multi-tenant cloud deployment.

### Background Jobs

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| @trigger.dev/sdk | 4.3.x | Scheduled jobs, background processing | Already deployed on Coolify. Handles cron-based meeting processing, draft generation, and outreach scheduling. V4 is GA and stable. V3 shuts down July 2026. | HIGH |
| trigger.dev (CLI) | 4.4.x | Dev server, deployment | CLI for local dev and deploying to self-hosted Trigger.dev on Coolify. | HIGH |

### Forms & Validation

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Zod | 3.x | Schema validation | Runtime + compile-time validation. Used by shadcn/ui forms, Trigger.dev schemaTask, and API route validation. Single validation library everywhere. | HIGH |
| React Hook Form | 7.x | Form state management | shadcn/ui's official form integration. Works with Zod via `@hookform/resolvers`. | HIGH |
| @hookform/resolvers | 3.x | Zod adapter for RHF | Bridges Zod schemas to React Hook Form validation. | HIGH |

### State Management

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Zustand | 5.x | Client-side state | 3KB, no Provider wrapper, hook-based. Use for: draft review queue state, filter/sort preferences, UI state. Most server state lives in Supabase -- Zustand handles the thin client-side layer. | HIGH |
| nuqs | 2.x | URL state management | Type-safe search params. Use for dashboard filters, search queries, pagination -- makes filtered views shareable/bookmarkable. Used by Supabase and Vercel. | MEDIUM |

### Email Templating

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| React Email | 5.x | Email template rendering | Render email bodies as React components, output to HTML/plain text for Gmail draft creation. NOT for sending (Gmail API handles that). Use for consistent email formatting. | MEDIUM |

**Note:** You're creating Gmail drafts, not sending via Resend/SendGrid. React Email is useful for rendering the draft body HTML, but it's optional -- you could also use plain text/template strings. Include if email formatting matters.

### Utilities

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| date-fns | 4.x | Date manipulation | Tree-shakable, functional API. Calculate outreach cadences, "days since last contact", schedule windows. Lighter than dayjs when tree-shaken. | HIGH |
| clsx + tailwind-merge | latest | Class merging | shadcn/ui standard. `cn()` utility for conditional classes. | HIGH |

### Deployment & Infrastructure

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Coolify | latest | PaaS on VPS | Already set up. Handles Docker deployment, SSL, domains. | HIGH |
| Docker (standalone) | - | Container build | Next.js standalone output mode + multi-stage Dockerfile. Minimal image size. | HIGH |

**next.config.js:**
```javascript
const nextConfig = {
  output: 'standalone', // Required for Docker/Coolify deployment
};
```

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Auth | Supabase Auth | NextAuth (Auth.js) | NextAuth's Supabase adapter is community-maintained, creates a separate `next_auth` schema, and doesn't integrate with Supabase RLS. Using Supabase Auth keeps everything in one system -- auth, RLS, and data. |
| UI Components | shadcn/ui | Mantine, Chakra UI | shadcn/ui copies source into your project (no dependency risk), has best-in-class Tailwind integration, and the CRM dashboard component ecosystem is extensive. |
| Charts | Recharts | Nivo | Nivo is more powerful but heavier. Recharts is simpler, integrates directly with shadcn/ui chart components, sufficient for status indicators and timelines. |
| State | Zustand | Redux Toolkit, Jotai | Redux is overkill for this app's client state needs. Jotai's atomic model is powerful but Zustand's simpler store pattern fits better for draft queues and UI state. |
| Date | date-fns | dayjs, Temporal | dayjs is smaller at face value (2KB) but date-fns tree-shakes better. Temporal API is still stage 3 and not universally available. |
| Framework | Next.js 15.5 | Next.js 16 | 16 is production-ready but has breaking changes (removed sync APIs). 15.5 is stable with full ecosystem support. Migrate to 16 after v1 ships. |
| Gmail client | @googleapis/gmail | googleapis (full) | Full googleapis package is 22MB unpacked. @googleapis/gmail is focused and lightweight. Only use full package if you need other Google APIs. |
| AI SDK | openai npm package | Vercel AI SDK, raw fetch | OpenAI npm client works directly with GLM-5's OpenAI-compatible API. Vercel AI SDK adds abstraction we don't need. Raw fetch is more code for no benefit. |
| MCP | @modelcontextprotocol/sdk | Direct Granola API | MCP SDK is the standardized way to interact with MCP servers. But note: multi-tenant production access to Granola data may require their REST API instead. |

## Installation

```bash
# Core framework
npx create-next-app@15.5 elite-ri-agent --typescript --tailwind --eslint --app --src-dir

# Supabase
npm install @supabase/supabase-js @supabase/ssr

# UI
npx shadcn@latest init
npx shadcn@latest add button card data-table form input label select sheet sidebar sonner tabs textarea badge separator dropdown-menu dialog avatar command popover calendar
npm install recharts lucide-react

# Auth & Gmail
npm install @googleapis/gmail

# AI
npm install openai

# MCP (for Granola integration)
npm install @modelcontextprotocol/sdk

# Background jobs
npm install @trigger.dev/sdk
npm install -D trigger.dev

# Forms & Validation
npm install zod react-hook-form @hookform/resolvers

# State
npm install zustand nuqs

# Utilities
npm install date-fns clsx tailwind-merge

# Email templating (optional)
npm install @react-email/components

# Dev
npm install -D @types/node
```

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # Server-side only, never in client

# Google OAuth (configured in Supabase dashboard)
# No env vars needed in Next.js -- Supabase handles OAuth flow

# Trigger.dev
TRIGGER_SECRET_KEY=your-trigger-secret
TRIGGER_API_URL=https://your-trigger.coolify.domain  # Self-hosted

# z.ai GLM-5 (per-user, stored in DB)
# No global env var -- each user provides their own API key

# App
NEXT_PUBLIC_APP_URL=https://your-app.domain
ENCRYPTION_KEY=your-32-byte-hex-key  # For encrypting user API keys at rest
```

## Key Architecture Decisions Driven by Stack

1. **Supabase Auth over NextAuth** -- keeps auth, RLS, and data in one system. Google provider tokens stored encrypted in Supabase for Gmail API access.

2. **OpenAI npm client for GLM-5** -- leverages OpenAI-compatible API format. Per-user API keys decrypted server-side per request.

3. **Next.js 15.5 over 16** -- stability for initial build. Migrate when ecosystem catches up.

4. **@googleapis/gmail over full googleapis** -- 670KB vs 22MB. Only need Gmail.

5. **MCP SDK as client, not server** -- use `@modelcontextprotocol/sdk` to call Granola's MCP tools from Trigger.dev jobs. Production multi-tenant access likely needs Granola REST API (requires research spike).

## Sources

- [Supabase Google OAuth Docs](https://supabase.com/docs/guides/auth/social-login/auth-google) (HIGH confidence)
- [Supabase SSR Setup for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs) (HIGH confidence)
- [z.ai GLM-5 Documentation](https://docs.z.ai/guides/llm/glm-5) (HIGH confidence)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) (HIGH confidence)
- [Trigger.dev v4 GA Announcement](https://trigger.dev/changelog/trigger-v4-ga) (HIGH confidence)
- [shadcn/ui Next.js Installation](https://ui.shadcn.com/docs/installation/next) (HIGH confidence)
- [Granola API Documentation](https://docs.granola.ai/introduction) (MEDIUM confidence -- Enterprise plan gating unclear)
- [Next.js 15 vs 16 Comparison](https://www.descope.com/blog/post/nextjs15-vs-nextjs16) (MEDIUM confidence)
- [Coolify Next.js Deployment Guide](https://coolify.io/docs/applications/nextjs) (HIGH confidence)
- [Gmail API Node.js Quickstart](https://developers.google.com/workspace/gmail/api/quickstart/nodejs) (HIGH confidence)
