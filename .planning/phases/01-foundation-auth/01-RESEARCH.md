# Phase 1: Foundation + Auth - Research

**Researched:** 2026-03-18
**Domain:** Next.js scaffolding, Supabase Auth (Google OAuth), multi-tenant RLS, encrypted credential storage, settings UI
**Confidence:** HIGH

## Summary

Phase 1 establishes the entire infrastructure foundation: a Next.js 15.5 application deployed on Coolify, Supabase Cloud for auth and database with RLS-enforced multi-tenant isolation, Google OAuth that captures Gmail refresh tokens for later API access, encrypted credential storage for per-user API keys, and a settings UI where users configure their profile, API keys, and processing schedule. Every subsequent phase depends on this foundation being solid.

The critical technical challenges are: (1) capturing Google `provider_refresh_token` during the OAuth callback -- Supabase Auth does NOT persist provider tokens, so the app must intercept them in the callback route and encrypt them into a custom `oauth_tokens` table; (2) establishing RLS policies on every table from day one, since Supabase tables default to RLS disabled; (3) encrypting API keys at rest using AES-256-GCM with a separate encryption key; and (4) beginning the Google OAuth verification process for restricted Gmail scopes, which has a 4-8 week external timeline that cannot be compressed.

**Primary recommendation:** Build in strict order -- project scaffold, database schema with RLS, auth flow with provider token capture, encryption utilities, settings pages. Every migration must include RLS enablement. Test auth flow end-to-end before building settings UI.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-01 | User can sign in with Google OAuth | Supabase Auth Google provider with PKCE flow; `signInWithOAuth` with `provider: 'google'`; callback route exchanges code for session |
| AUTH-02 | Google OAuth captures and persists Gmail refresh token for API access | Must pass `access_type: 'offline'` and `prompt: 'consent'` in queryParams; capture `provider_refresh_token` from session in callback; encrypt and store in `oauth_tokens` table |
| AUTH-03 | User session persists across browser refresh | Supabase SSR with `@supabase/ssr` cookie-based sessions; middleware refreshes tokens on every request |
| AUTH-04 | User can store and manage API keys (z.ai) via encrypted settings panel | AES-256-GCM encryption with Node.js crypto; encrypted column in `user_settings`; validate key on save with test API call |
| AUTH-05 | User can fill out profile form (tone, style, personality, projects, business objectives) | React Hook Form + Zod schema; `user_settings` table with `personality_profile`, `business_objectives`, `projects` columns |
| AUTH-06 | User can configure meeting processing schedule (interval, start/end time, timezone) | JSONB `processing_schedule` column in `user_settings`; timezone list from `Intl.supportedValuesOf('timeZone')` |
| TNNT-01 | Each user's data is fully isolated via Supabase RLS | Every table gets `user_id` column + RLS policies using `(select auth.uid()) = user_id`; indexed `user_id` columns |
| TNNT-02 | Each user has independent Granola connection, Gmail auth, and API keys | `user_settings` table with per-user encrypted credentials; `oauth_tokens` table with per-user Google tokens |
| TNNT-03 | Processing schedules are per-user and isolated | `processing_schedule` JSONB in `user_settings`; Trigger.dev dispatcher reads per-user settings (Phase 2 execution, schema prepared here) |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15.5.13 | App framework, SSR, API routes | Latest 15.x stable. 16.x exists but has breaking changes (removed sync APIs). 15.5 has full ecosystem support. |
| React | 19.x | UI rendering | Ships with Next.js 15.5. Server Components, Suspense, Actions. |
| TypeScript | 5.7+ | Type safety | Non-negotiable for complex data models and API integrations. |
| @supabase/supabase-js | 2.99.2 | Supabase client | Official JS client for auth, database, and RLS-scoped queries. |
| @supabase/ssr | 0.9.0 | Server-side auth | Cookie-based session management for Next.js. Replaces deprecated auth-helpers. |
| Tailwind CSS | 4.2.2 | Styling | CSS-first config (no tailwind.config.ts needed). Required by shadcn/ui v4. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn/ui | v4 (CLI) | Component library | Copied-in components. Use Card, Form, Input, Select, Tabs, Sheet, Sidebar, Button, Label, Textarea, Badge, Separator, Dialog, Avatar, Command, Popover. |
| Lucide React | 0.577.0 | Icons | Default icon set for shadcn/ui. Tree-shakable. |
| Sonner | latest | Toast notifications | shadcn/ui official toast. Success/error feedback on settings save, auth events. |
| Zod | 4.3.6 | Schema validation | Unified validation for forms, API routes, and Trigger.dev schemaTask. |
| React Hook Form | 7.71.2 | Form state management | shadcn/ui's official form integration. Used with @hookform/resolvers for Zod. |
| @hookform/resolvers | 5.2.2 | Zod adapter for RHF | Bridges Zod schemas to React Hook Form. |
| Zustand | 5.0.12 | Client-side state | Minimal store for UI state (sidebar open, form dirty). Most state in Supabase. |
| date-fns | 4.1.0 | Date manipulation | Timezone-aware schedule display, "last synced" timestamps. |
| clsx + tailwind-merge | latest | Class merging | shadcn/ui standard `cn()` utility. |
| @trigger.dev/sdk | 4.4.3 | Background job SDK | Installed in Phase 1 but tasks created in Phase 2. Needed for trigger.config.ts setup. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Supabase Auth | NextAuth (Auth.js) | NextAuth's Supabase adapter is community-maintained, creates separate schema, doesn't integrate with RLS. Supabase Auth keeps auth + RLS + data unified. |
| @supabase/ssr | Manual cookie handling | @supabase/ssr handles the PKCE flow, cookie serialization, and session refresh. Manual approach is error-prone. |
| AES-256-GCM (Node crypto) | libsodium, iron-session | Node.js built-in crypto is sufficient, zero dependencies, widely understood. No need for external encryption libraries. |
| shadcn/ui | Mantine, Radix primitives | shadcn copies source into project (no dependency risk), best Tailwind integration, extensive component set for CRM dashboards. |

**Installation:**
```bash
# Create Next.js project
npx create-next-app@15.5 elite-ri-agent --typescript --tailwind --eslint --app --src-dir

# Supabase
npm install @supabase/supabase-js @supabase/ssr

# UI
npx shadcn@latest init
npx shadcn@latest add button card form input label select sheet sidebar sonner tabs textarea badge separator dialog avatar command popover dropdown-menu
npm install lucide-react

# Forms & Validation
npm install zod react-hook-form @hookform/resolvers

# State
npm install zustand

# Utilities
npm install date-fns clsx tailwind-merge

# Background jobs (scaffold only in Phase 1)
npm install @trigger.dev/sdk
npm install -D trigger.dev

# Dev
npm install -D @types/node
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx              # Login page with Google OAuth button
│   │   └── auth/
│   │       └── callback/
│   │           └── route.ts          # OAuth callback: code exchange + token capture
│   ├── (dashboard)/
│   │   ├── layout.tsx                # Authenticated layout with sidebar
│   │   ├── page.tsx                  # Dashboard home (placeholder for Phase 4)
│   │   └── settings/
│   │       ├── page.tsx              # Settings overview
│   │       ├── profile/
│   │       │   └── page.tsx          # AUTH-05: Personality/tone profile form
│   │       ├── integrations/
│   │       │   └── page.tsx          # AUTH-04: API keys, Google connection status
│   │       └── schedule/
│   │           └── page.tsx          # AUTH-06: Processing schedule config
│   ├── layout.tsx                    # Root layout
│   └── middleware.ts                 # → src/middleware.ts (session refresh)
├── components/
│   ├── ui/                           # shadcn/ui generated components
│   ├── auth/
│   │   └── google-sign-in-button.tsx
│   └── settings/
│       ├── profile-form.tsx
│       ├── api-key-form.tsx
│       ├── schedule-form.tsx
│       └── integration-status.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 # Browser client (createBrowserClient)
│   │   ├── server.ts                 # Server client (createServerClient)
│   │   └── admin.ts                  # Service role client (server-side only)
│   ├── crypto/
│   │   └── encryption.ts            # AES-256-GCM encrypt/decrypt
│   ├── validations/
│   │   ├── settings.ts              # Zod schemas for settings forms
│   │   └── auth.ts                  # Zod schemas for auth-related data
│   └── utils.ts                      # cn() helper, misc utilities
├── trigger/
│   └── example.ts                    # Placeholder task (scaffold)
├── middleware.ts                      # Supabase session refresh middleware
└── trigger.config.ts                  # Trigger.dev project config
```

### Pattern 1: Supabase SSR Client Setup (THREE files)

**What:** Create per-request Supabase clients that properly handle cookies in Next.js.
**When to use:** Always. Every Supabase operation must go through the correct client type.

```typescript
// src/lib/supabase/client.ts -- Browser client for Client Components
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

```typescript
// src/lib/supabase/server.ts -- Server client for Server Components + Route Handlers
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from Server Component -- middleware will persist
          }
        },
      },
    }
  );
}
```

```typescript
// src/lib/supabase/admin.ts -- Service role client (bypasses RLS, server-side ONLY)
import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
```

### Pattern 2: Middleware Session Refresh

**What:** Refresh Supabase auth tokens on every request via Next.js middleware.
**When to use:** Required for all authenticated routes.

```typescript
// src/middleware.ts
import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: use getUser(), not getSession(), for security
  const { data: { user } } = await supabase.auth.getUser();

  // Redirect unauthenticated users to login
  if (!user && !request.nextUrl.pathname.startsWith("/login") &&
      !request.nextUrl.pathname.startsWith("/auth")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

### Pattern 3: OAuth Callback with Provider Token Capture (AUTH-02 critical path)

**What:** Exchange auth code for session AND capture Google provider tokens.
**When to use:** OAuth callback route. This is the ONLY moment provider tokens are available.

```typescript
// src/app/(auth)/auth/callback/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/crypto/encryption";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // CRITICAL: Get session immediately to capture provider tokens
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.provider_token) {
        const userId = session.user.id;

        // Encrypt and store provider tokens
        // provider_refresh_token is only available on FIRST login with consent
        const encryptedAccessToken = encrypt(session.provider_token);
        const encryptedRefreshToken = session.provider_refresh_token
          ? encrypt(session.provider_refresh_token)
          : null;

        // Upsert into oauth_tokens table (using service role to bypass RLS)
        const { createAdminClient } = await import("@/lib/supabase/admin");
        const adminClient = createAdminClient();

        await adminClient.from("oauth_tokens").upsert({
          user_id: userId,
          google_access_token_encrypted: encryptedAccessToken,
          google_refresh_token_encrypted: encryptedRefreshToken,
          token_expiry: new Date(Date.now() + 3600 * 1000).toISOString(), // ~1 hour
          scopes: ["gmail.compose", "gmail.send"],
        }, { onConflict: "user_id" });
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Auth error -- redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
```

### Pattern 4: AES-256-GCM Encryption for API Keys (AUTH-04)

**What:** Encrypt sensitive credentials at rest using Node.js built-in crypto.
**When to use:** Storing any API key, OAuth token, or sensitive credential.

```typescript
// src/lib/crypto/encryption.ts
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits for GCM
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) throw new Error("ENCRYPTION_KEY environment variable is required");
  // Key must be 32 bytes (256 bits) -- stored as 64-char hex string
  return Buffer.from(key, "hex");
}

export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:ciphertext (all hex)
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

export function decrypt(encryptedString: string): string {
  const key = getEncryptionKey();
  const [ivHex, authTagHex, ciphertext] = encryptedString.split(":");

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
```

### Pattern 5: RLS Migration Template (TNNT-01)

**What:** Standard migration template that ALWAYS enables RLS with CRUD policies.
**When to use:** Every single table creation migration. No exceptions.

```sql
-- Migration: create_[table_name]
-- TEMPLATE: Copy this for every new table

CREATE TABLE [table_name] (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- ... table-specific columns ...
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- MANDATORY: Enable RLS
ALTER TABLE [table_name] ENABLE ROW LEVEL SECURITY;

-- MANDATORY: CRUD policies scoped to authenticated user
CREATE POLICY "[table_name]_select" ON [table_name]
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "[table_name]_insert" ON [table_name]
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "[table_name]_update" ON [table_name]
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "[table_name]_delete" ON [table_name]
  FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

-- MANDATORY: Index user_id for RLS performance
CREATE INDEX idx_[table_name]_user_id ON [table_name](user_id);
```

### Anti-Patterns to Avoid

- **Storing provider tokens in Supabase Auth session:** Supabase does NOT persist `provider_token` or `provider_refresh_token`. They are only available immediately after OAuth callback. Capture them there or lose them forever.
- **Module-level Supabase client:** Creating a single client at module scope leaks sessions between users. Always create inside the request handler.
- **Using `getSession()` in server code for auth checks:** Use `getUser()` instead -- it validates the token with Supabase Auth server. `getSession()` only reads from cookies (can be tampered with).
- **Testing RLS from SQL Editor:** SQL Editor runs as superuser, bypasses all RLS. Always test from client SDK with user tokens.
- **Using `auth.uid()` without subselect wrapper:** Write `(select auth.uid()) = user_id` not `auth.uid() = user_id`. The subselect caches the result instead of evaluating per-row. 100x+ performance improvement on large tables.
- **Forgetting RLS on new tables:** Supabase tables default to RLS DISABLED. Every migration must explicitly enable it.
- **Service role key in client code:** NEVER. Only in server-side environment variables.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OAuth flow | Custom Google OAuth implementation | Supabase Auth Google provider | Handles PKCE, CSRF protection, session management, token refresh |
| Session cookies | Manual cookie management | @supabase/ssr middleware | Handles cookie serialization, HttpOnly flags, SameSite, session refresh |
| Encryption | Custom crypto protocol | Node.js crypto with AES-256-GCM | Battle-tested, authenticated encryption, built-in to Node.js |
| Form validation | Manual validation logic | Zod + React Hook Form + @hookform/resolvers | Type-safe, reusable schemas, automatic error messages |
| UI components | Custom form inputs, dialogs, sheets | shadcn/ui | Accessible, styled, tested, customizable components |
| Timezone handling | Manual UTC offset calculations | Intl API + date-fns | Browser-native timezone support, DST-aware |
| Multi-tenant isolation | Application-level filtering | Supabase RLS | Database-level enforcement, cannot be bypassed by application bugs |

**Key insight:** Phase 1 is infrastructure -- every component should use the established, documented pattern. Custom solutions here create security risks that compound in later phases.

## Common Pitfalls

### Pitfall 1: Missing Provider Refresh Token on Google OAuth
**What goes wrong:** `provider_refresh_token` is null after Google OAuth. Without it, Gmail API access expires in ~1 hour with no way to renew.
**Why it happens:** Google only returns a refresh token when: (a) `access_type: 'offline'` AND `prompt: 'consent'` are both passed, AND (b) it is the user's first consent grant OR they explicitly re-consent. If the user has previously authorized the app, Google may skip the consent screen and not return a refresh token.
**How to avoid:** Always pass both `access_type: 'offline'` and `prompt: 'consent'` in `queryParams` on `signInWithOAuth`. The `prompt: 'consent'` forces re-consent every login, ensuring a refresh token is always returned. Store the refresh token immediately in the callback.
**Warning signs:** `session.provider_refresh_token` is null in the callback; Gmail API calls fail after ~1 hour.

### Pitfall 2: Google OAuth Testing Mode 7-Day Token Expiry
**What goes wrong:** Refresh tokens expire after exactly 7 days. All background jobs fail silently.
**Why it happens:** When the Google Cloud OAuth consent screen is in "Testing" mode (not published), refresh tokens have a hard 7-day lifetime. Also limited to 100 manually-added test users.
**How to avoid:** Publish the OAuth consent screen to "In production" as soon as possible. For restricted scopes (`gmail.compose`), this requires verification -- start the process in Phase 1. For initial development, be aware of the 7-day limit and plan to re-authenticate.
**Warning signs:** Users report "connection broken" exactly 7 days after setup; no error on app side, just silent failures.

### Pitfall 3: RLS Not Enabled on New Tables
**What goes wrong:** All authenticated users can read/write all rows in the table. Data leak.
**Why it happens:** Every new Supabase table has RLS disabled by default. Developers create tables via SQL migrations and forget to add `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`.
**How to avoid:** Use the RLS migration template (Pattern 5 above) for every table. Add a CI check that queries `pg_tables` for tables without RLS. Never create a table without immediately adding policies.
**Warning signs:** Queries returning unexpected amounts of data; no "permission denied" errors when they should occur.

### Pitfall 4: Encryption Key Management
**What goes wrong:** API keys are decryptable by anyone with database access because the encryption key is stored alongside the data.
**Why it happens:** Developers store the ENCRYPTION_KEY in the database or in client-accessible code.
**How to avoid:** Store ENCRYPTION_KEY only as an environment variable on the server. Generate it with `openssl rand -hex 32`. Never commit it to source control. Never expose in client bundles. Use a different key per environment (dev/staging/prod).
**Warning signs:** ENCRYPTION_KEY in `.env.local` committed to git; ENCRYPTION_KEY accessible from client-side code.

### Pitfall 5: No Credential Validation on Save
**What goes wrong:** User enters an invalid z.ai API key. It saves successfully. Background jobs fail silently for days until the user investigates.
**How to avoid:** When the user saves an API key, make a test API call (e.g., a simple completions request with 1 token) to validate it works. Show immediate success/failure feedback with a toast notification.
**Warning signs:** No test call on key save; error handling only in background jobs.

## Code Examples

### Google OAuth Sign-In (AUTH-01)

```typescript
// Source: Supabase Google OAuth docs
// src/components/auth/google-sign-in-button.tsx
"use client";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function GoogleSignInButton() {
  const handleSignIn = async () => {
    const supabase = createClient();

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: [
          "https://www.googleapis.com/auth/gmail.compose",
          "https://www.googleapis.com/auth/gmail.send",
        ].join(" "),
        queryParams: {
          access_type: "offline",  // CRITICAL: gets refresh token
          prompt: "consent",       // CRITICAL: forces consent for refresh token
        },
      },
    });
  };

  return (
    <Button onClick={handleSignIn} variant="outline" size="lg">
      Sign in with Google
    </Button>
  );
}
```

### Settings Form with Validation (AUTH-04, AUTH-05, AUTH-06)

```typescript
// src/lib/validations/settings.ts
import { z } from "zod";

export const profileSchema = z.object({
  personality_profile: z.string().min(1, "Required").max(2000),
  business_objectives: z.string().max(2000).optional(),
  projects: z.string().max(2000).optional(),
});

export const apiKeySchema = z.object({
  zai_api_key: z.string().min(1, "API key is required"),
});

export const scheduleSchema = z.object({
  interval_hours: z.number().min(1).max(24),
  start_hour: z.number().min(0).max(23),
  end_hour: z.number().min(0).max(23),
  timezone: z.string().min(1, "Timezone is required"),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
export type ApiKeyFormValues = z.infer<typeof apiKeySchema>;
export type ScheduleFormValues = z.infer<typeof scheduleSchema>;
```

### Trigger.dev Configuration (scaffold for Phase 2)

```typescript
// trigger.config.ts
import { defineConfig } from "@trigger.dev/sdk";

export default defineConfig({
  project: "<project-ref>", // From Trigger.dev dashboard
  dirs: ["./src/trigger"],
  runtime: "node",
  logLevel: "info",
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
});
```

### Triggering Tasks from Next.js Server Actions

```typescript
// src/app/api/actions.ts
"use server";
import type { helloWorldTask } from "@/trigger/example";
import { tasks } from "@trigger.dev/sdk";

export async function triggerExampleTask() {
  try {
    const handle = await tasks.trigger<typeof helloWorldTask>(
      "hello-world",
      "test-payload"
    );
    return { handle };
  } catch (error) {
    return { error: "Failed to trigger task" };
  }
}
```

## Database Schema (Phase 1 Tables)

Phase 1 creates the foundation tables. Later phases add `contacts`, `meetings`, `contact_meetings`, and `outreach_drafts`.

```sql
-- Table 1: user_settings (AUTH-04, AUTH-05, AUTH-06, TNNT-02, TNNT-03)
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  -- AUTH-05: Profile
  personality_profile TEXT,
  business_objectives TEXT,
  projects TEXT,
  -- AUTH-04: API keys (encrypted)
  zai_api_key_encrypted TEXT,
  granola_api_key_encrypted TEXT,
  -- AUTH-06 + TNNT-03: Processing schedule
  processing_schedule JSONB DEFAULT '{"interval_hours": 2, "start_hour": 8, "end_hour": 18, "timezone": "America/Los_Angeles"}'::jsonb,
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_settings_select" ON user_settings
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "user_settings_insert" ON user_settings
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "user_settings_update" ON user_settings
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "user_settings_delete" ON user_settings
  FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);

-- Table 2: oauth_tokens (AUTH-02, TNNT-02)
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

ALTER TABLE oauth_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "oauth_tokens_select" ON oauth_tokens
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "oauth_tokens_insert" ON oauth_tokens
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "oauth_tokens_update" ON oauth_tokens
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "oauth_tokens_delete" ON oauth_tokens
  FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

CREATE INDEX idx_oauth_tokens_user_id ON oauth_tokens(user_id);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` | 2024 | Deprecated. Must use @supabase/ssr for cookie-based sessions. |
| `getSession()` for auth checks | `getUser()` for auth checks | 2024 | `getSession()` reads unvalidated cookies. `getUser()` validates with Supabase server. Security requirement. |
| Tailwind CSS config file | CSS-first config (Tailwind v4) | 2025 | No `tailwind.config.ts` needed. Use `@theme` in CSS. shadcn/ui v4 requires Tailwind v4. |
| shadcn/ui v3 | shadcn/ui v4 | 2025 | New CLI, Tailwind v4 compatibility, new component patterns. |
| AES-256-CBC | AES-256-GCM | Ongoing | GCM provides authenticated encryption (integrity + confidentiality). CBC only provides confidentiality. |
| `next.config.js` | `next.config.ts` | Next.js 15 | TypeScript config supported natively. |

**Deprecated/outdated:**
- `@supabase/auth-helpers-nextjs`: Replaced by `@supabase/ssr`. Do not use.
- `tailwind.config.ts`: Not needed with Tailwind v4. Config is CSS-first.
- `auth.uid()` without subselect: Use `(select auth.uid())` for performance.

## Open Questions

1. **Gmail scope strategy for development**
   - What we know: `gmail.compose` is restricted (4-8 week verification). `gmail.send` is sensitive (faster verification).
   - What's unclear: Whether to request both or just `gmail.compose`. The app needs draft creation (`gmail.compose`) and sending (`gmail.send`).
   - Recommendation: Request both scopes from day one. Start verification process immediately. For development, use Testing mode (limited to 100 users, 7-day token expiry).

2. **Google Cloud project setup**
   - What we know: Need a Google Cloud project with OAuth 2.0 credentials and configured consent screen.
   - What's unclear: Whether the user already has a Google Cloud project set up.
   - Recommendation: Document the complete Google Cloud Console setup steps in the plan. Include: create project, enable Gmail API, configure OAuth consent screen, create OAuth 2.0 credentials, add test users, configure redirect URI in Supabase.

3. **Supabase project setup**
   - What we know: Using Supabase Cloud (managed).
   - What's unclear: Whether the Supabase project already exists.
   - Recommendation: First plan task should verify/create the Supabase project and configure the Google OAuth provider in the Supabase dashboard.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (latest) + @testing-library/react |
| Config file | None -- Wave 0 creates `vitest.config.ts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | Google OAuth redirects to Supabase, callback exchanges code | integration | `npx vitest run src/__tests__/auth/oauth-flow.test.ts -t "oauth"` | Wave 0 |
| AUTH-02 | Callback captures and encrypts provider_refresh_token | unit | `npx vitest run src/__tests__/auth/token-capture.test.ts` | Wave 0 |
| AUTH-03 | Middleware refreshes session, user persists on refresh | integration | `npx vitest run src/__tests__/auth/session-persistence.test.ts` | Wave 0 |
| AUTH-04 | API key encrypt/decrypt round-trips; validation on save | unit | `npx vitest run src/__tests__/crypto/encryption.test.ts` | Wave 0 |
| AUTH-05 | Profile form validates and saves to user_settings | unit | `npx vitest run src/__tests__/settings/profile-form.test.ts` | Wave 0 |
| AUTH-06 | Schedule form validates timezone, hours, interval | unit | `npx vitest run src/__tests__/settings/schedule-form.test.ts` | Wave 0 |
| TNNT-01 | RLS prevents cross-user data access on all tables | integration | `npx vitest run src/__tests__/rls/isolation.test.ts` | Wave 0 |
| TNNT-02 | Each user has independent credentials in separate rows | unit | `npx vitest run src/__tests__/settings/user-isolation.test.ts` | Wave 0 |
| TNNT-03 | Schedule JSONB stores per-user config independently | unit | `npx vitest run src/__tests__/settings/schedule-isolation.test.ts` | Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `vitest.config.ts` -- Vitest configuration with path aliases matching tsconfig
- [ ] `src/__tests__/crypto/encryption.test.ts` -- AES-256-GCM encrypt/decrypt round-trip, invalid key handling
- [ ] `src/__tests__/auth/token-capture.test.ts` -- Mock exchangeCodeForSession, verify provider token extraction
- [ ] `src/__tests__/auth/oauth-flow.test.ts` -- Mock Supabase OAuth redirect flow
- [ ] `src/__tests__/auth/session-persistence.test.ts` -- Mock middleware session refresh
- [ ] `src/__tests__/settings/profile-form.test.ts` -- Zod schema validation for profile
- [ ] `src/__tests__/settings/schedule-form.test.ts` -- Zod schema validation for schedule
- [ ] `src/__tests__/rls/isolation.test.ts` -- RLS policy verification (requires Supabase test instance)
- [ ] Framework install: `npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom`

## Environment Variables

```bash
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # Server-side ONLY

# Google OAuth (configured in Supabase Dashboard, but needed for token refresh)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Encryption (generate with: openssl rand -hex 32)
ENCRYPTION_KEY=your-64-char-hex-string

# Trigger.dev
TRIGGER_SECRET_KEY=your-trigger-secret
TRIGGER_API_URL=https://your-trigger.coolify.domain  # Self-hosted

# App
NEXT_PUBLIC_APP_URL=https://your-app.domain
```

## Deployment Notes (Coolify)

```javascript
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone", // Required for Docker/Coolify deployment
};

export default nextConfig;
```

Coolify deploys Next.js via Docker with standalone output mode. The Dockerfile uses multi-stage build to minimize image size. Coolify can auto-detect Next.js projects or use a custom Dockerfile.

## Sources

### Primary (HIGH confidence)
- [Supabase Google OAuth](https://supabase.com/docs/guides/auth/social-login/auth-google) -- Provider token handling, scopes, queryParams
- [Supabase SSR for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs) -- Middleware, client setup, session refresh
- [Supabase SSR Client Creation](https://supabase.com/docs/guides/auth/server-side/creating-a-client) -- createBrowserClient, createServerClient patterns
- [Supabase RLS Docs](https://supabase.com/docs/guides/database/postgres/row-level-security) -- Policy syntax, performance optimization
- [Supabase RLS Performance](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv) -- Subselect caching, index requirements
- [Gmail API Scope Classification](https://developers.google.com/workspace/gmail/api/auth/scopes) -- Restricted scope confirmation
- [Google OAuth Restricted Scope Verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification) -- Security assessment timeline
- [Trigger.dev Next.js Guide](https://trigger.dev/docs/guides/frameworks/nextjs) -- trigger.config.ts, task triggering from API routes
- [shadcn/ui Next.js Installation](https://ui.shadcn.com/docs/installation/next) -- v4 setup with Tailwind v4
- [Node.js crypto API](https://nodejs.org/api/crypto.html) -- AES-256-GCM implementation
- [Coolify Next.js Deployment](https://coolify.io/docs/applications/nextjs) -- Docker standalone deployment

### Secondary (MEDIUM confidence)
- [Supabase Discussion #22653](https://github.com/orgs/supabase/discussions/22653) -- provider_refresh_token capture pattern in callback
- [Supabase Advanced Auth Guide](https://supabase.com/docs/guides/auth/server-side/advanced-guide) -- PKCE flow details, cache headers
- [Ryan Katayi Blog](https://www.ryankatayi.com/blog/server-side-auth-in-next-js-with-supabase-my-setup) -- Complete SSR setup file examples
- [Teknasyon Engineering](https://engineering.teknasyon.com/next-js-with-supabase-google-login-step-by-step-guide-088ef06e0501) -- Google OAuth step-by-step

### Tertiary (LOW confidence)
- [Supabase auth issue #1450](https://github.com/supabase/auth/issues/1450) -- PKCE flow provider token refresh concerns (may affect token refresh pattern)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- All packages verified against npm registry. Versions confirmed current as of 2026-03-18.
- Architecture: HIGH -- Supabase SSR + RLS + Google OAuth is thoroughly documented. Patterns verified across official docs and community implementations.
- Pitfalls: HIGH -- Gmail restricted scope, RLS defaults, provider token persistence all confirmed against official documentation.
- Encryption: HIGH -- AES-256-GCM with Node.js crypto is well-established pattern. No external dependencies needed.

**Research date:** 2026-03-18
**Valid until:** 2026-04-18 (stable stack, 30-day validity)
