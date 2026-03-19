# Phase 4: Dashboard Intelligence - Research

**Researched:** 2026-03-19
**Domain:** Dashboard UI, data aggregation, search/filter, analytics visualization
**Confidence:** HIGH

## Summary

Phase 4 builds intelligence layers on top of existing infrastructure. The contacts list page already has search and category filter functionality (DASH-01/02/03 are partially implemented). The core work is: (1) enhancing the existing contacts page with risk and triage indicators, (2) transforming the placeholder dashboard page into an actionable intelligence hub with at-risk contacts, triage queue, and pending action items, and (3) adding outreach analytics with charting.

All required data already exists in the database -- contacts have `outreach_frequency_days` and `last_interaction_at` for risk calculation, `ai_confidence` and `status` for triage detection, action_items have `completed` flags, and outreach_drafts have `status` and timestamp fields for analytics. No new database tables are needed; this is primarily a frontend + API query phase.

**Primary recommendation:** Compute risk/triage/analytics server-side in dedicated API endpoints (not client-side) to keep the dashboard page fast and avoid sending all raw data to the browser. Use recharts for the analytics charts (DASH-07) -- it is the standard React charting library and pairs well with shadcn/ui.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DASH-01 | Contact list view (browse, search, filter) | Existing contacts page already implements this -- needs polish and integration with risk/triage indicators |
| DASH-02 | Search contacts by name, email, category, notes | Already implemented in GET /api/contacts with `.or()` ilike query -- needs to also search `category` field explicitly |
| DASH-03 | Filter contacts by category | Already implemented with category Select dropdown on contacts page |
| DASH-04 | Risk indicators -- contacts overdue for outreach | Compute from `outreach_frequency_days` and `last_interaction_at` -- add server-side risk scoring API + visual indicators on contact cards and dashboard widget |
| DASH-05 | Triage indicators -- new/unreviewed contacts | Contacts with `ai_confidence != 'manual'` and no user edits; or contacts missing critical fields -- surface on dashboard |
| DASH-06 | Pending action items across all contacts | Query `action_items` table where `completed = false` grouped by contact -- dashboard widget |
| DASH-07 | Outreach analytics (drafts sent, response tracking, health trends) | Aggregate `outreach_drafts` by status and time period -- recharts visualization |
</phase_requirements>

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15.5.13 | App Router, API routes | Already in project |
| @supabase/supabase-js | ^2.99.2 | Database queries with RLS | Already in project |
| shadcn/ui (base-ui variant) | v4 | UI components (Card, Badge, Tabs, etc.) | Already in project |
| date-fns | ^4.1.0 | Date calculations (overdue detection) | Already in project |
| lucide-react | ^0.577.0 | Icons | Already in project |
| zustand | ^5.0.12 | Client state (if needed for filter state) | Already in project |

### New Dependencies
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| recharts | 3.8.0 | Bar/line/area charts for DASH-07 analytics | Outreach analytics visualization |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| recharts | shadcn/ui charts | shadcn charts ARE recharts wrappers -- use recharts directly for more control |
| recharts | chart.js | recharts is React-native (JSX components); chart.js requires ref-based imperative API |
| Server-side aggregation | Client-side computation | Client-side would require fetching all data; server-side is faster and more scalable |

**Installation:**
```bash
npm install recharts@^3.8.0
```

**Version verification:** recharts 3.8.0 confirmed current via `npm view recharts version` on 2026-03-19.

## Architecture Patterns

### Recommended Project Structure
```
src/
  app/
    (dashboard)/
      dashboard/
        page.tsx              # ENHANCED: Intelligence hub (risk, triage, action items, analytics)
      contacts/
        page.tsx              # ENHANCED: Add risk/triage visual indicators to existing page
  components/
    dashboard/
      risk-contacts.tsx       # At-risk contacts widget (DASH-04)
      triage-contacts.tsx     # Needs-triage widget (DASH-05)
      pending-actions.tsx     # Pending action items widget (DASH-06)
      outreach-analytics.tsx  # Charts and stats (DASH-07)
      stat-card.tsx           # Reusable stat display card
  app/
    api/
      dashboard/
        stats/route.ts        # Aggregated dashboard stats endpoint
        analytics/route.ts    # Outreach analytics time-series endpoint
```

### Pattern 1: Server-Side Risk Computation
**What:** Calculate "at-risk" status server-side in the API, not client-side
**When to use:** For DASH-04 risk indicators
**Example:**
```typescript
// In API route: compute days overdue from DB fields
// contacts.outreach_frequency_days and contacts.last_interaction_at exist
// Risk = NOW() - last_interaction_at > outreach_frequency_days

// Supabase doesn't support computed columns in queries,
// so fetch contacts and compute in the API route:
const contacts = data.map(contact => {
  const lastInteraction = contact.last_interaction_at
    ? new Date(contact.last_interaction_at)
    : contact.created_at ? new Date(contact.created_at) : new Date();
  const daysSince = differenceInDays(new Date(), lastInteraction);
  const frequency = contact.outreach_frequency_days ?? 30;
  const daysOverdue = daysSince - frequency;
  return {
    ...contact,
    days_overdue: Math.max(0, daysOverdue),
    is_at_risk: daysOverdue > 0,
    risk_level: daysOverdue > frequency ? 'critical' : daysOverdue > 0 ? 'warning' : 'healthy',
  };
});
```

### Pattern 2: Dashboard Stats Aggregation Endpoint
**What:** Single API endpoint that returns all dashboard widget data in one request
**When to use:** For the main dashboard page to avoid N+1 fetches
**Example:**
```typescript
// GET /api/dashboard/stats
// Returns: { atRiskContacts: [...], triageContacts: [...], pendingActions: [...], summary: {...} }
// All queries use the same supabase client with user auth (RLS enforced)
```

### Pattern 3: Existing Codebase Patterns (MUST follow)
**What:** The project uses consistent patterns across all pages
**Must follow:**
- Client-side pages with `"use client"` and `useEffect` + `useState` for data fetching
- `fetchX` functions wrapped in `useCallback` with dependency arrays
- API routes with `createClient()` from `@/lib/supabase/server` + `auth.getUser()` guard
- Toast notifications via `sonner` for success/error feedback
- Loading states with `Skeleton` components
- Empty states with centered icon + message
- Grid layouts: `grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3`
- Components in `src/components/{domain}/` folders
- Tests in `src/__tests__/{domain}/` with vitest + vi.hoisted mocking pattern

### Pattern 4: Contact Card Enhancement (not replacement)
**What:** Add risk/triage indicators TO the existing ContactCard, don't rebuild it
**When to use:** DASH-04 and DASH-05 indicators on the contacts list page
**Example:**
```typescript
// Extend ContactCard props to accept risk/triage computed fields
// Add visual indicator (colored border, badge, or icon) to existing card
// The risk computation happens in the API, card just renders it
```

### Anti-Patterns to Avoid
- **Client-side date arithmetic on full contact list:** Compute risk server-side, send results to client
- **Separate API calls per widget:** Use a single dashboard stats endpoint to batch all queries
- **Rebuilding the contacts page:** DASH-01/02/03 already work -- enhance, don't replace
- **Using Supabase RPC/stored procedures for aggregation:** Keep logic in TypeScript API routes for maintainability (consistent with existing codebase)
- **Importing recharts SSR:** Recharts requires client-side rendering -- use `"use client"` directive

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Charts/graphs | Custom SVG/canvas charting | recharts | Complex axis/tooltip/responsive handling |
| Date difference calculations | Manual ms arithmetic | date-fns `differenceInDays`, `isPast`, `addDays` | Already in project, handles edge cases |
| Data table with sorting | Custom sort logic | Keep current card grid (existing pattern) | Contact list already works well as cards |
| Stat display cards | Custom div layouts | Compose from existing shadcn Card + custom StatCard component | Consistent with project UI patterns |

**Key insight:** This phase is primarily about connecting existing data to new UI views. All the underlying data is already being collected and stored. The challenge is querying it efficiently and displaying it clearly.

## Common Pitfalls

### Pitfall 1: N+1 Query Problem on Dashboard
**What goes wrong:** Making separate API calls for each dashboard widget (risk contacts, triage contacts, pending actions, analytics) causes slow page loads
**Why it happens:** Natural to build each widget independently with its own data fetch
**How to avoid:** Create a single `/api/dashboard/stats` endpoint that runs all queries in parallel using `Promise.all` on the same supabase client
**Warning signs:** Dashboard page making 4+ API calls on mount

### Pitfall 2: Risk Calculation Inconsistency
**What goes wrong:** Risk/overdue calculation done differently in dashboard stats vs contact card indicators
**Why it happens:** Duplicating date arithmetic in multiple places
**How to avoid:** Create a shared `computeContactRisk(contact)` utility function in `src/lib/contacts/risk.ts` used by both the dashboard stats API and the contacts API
**Warning signs:** Dashboard showing different "at risk" count than contacts page

### Pitfall 3: Recharts SSR Errors
**What goes wrong:** `window is not defined` or hydration mismatch errors
**Why it happens:** Recharts accesses browser APIs during render, Next.js SSR tries to render on server
**How to avoid:** Ensure analytics component uses `"use client"` directive. The chart component should be a leaf-level client component
**Warning signs:** Build errors or hydration warnings mentioning chart components

### Pitfall 4: Triage Definition Ambiguity
**What goes wrong:** DASH-05 "new/unreviewed contacts" has no explicit `reviewed` boolean in the schema
**Why it happens:** The schema was designed for AI extraction, not explicit review tracking
**How to avoid:** Define triage as: contacts where `ai_confidence IN ('high', 'medium', 'low')` AND `status = 'active'` that were created recently (e.g., within last 7 days) or have never been manually edited. A practical approach: contacts with `ai_confidence != 'manual'` that have not been updated since creation (`updated_at = created_at` approximately) are "unreviewed"
**Warning signs:** All AI-extracted contacts permanently showing as "needs triage"

### Pitfall 5: Empty Analytics State
**What goes wrong:** DASH-07 analytics charts look broken or confusing when user has zero or very few drafts
**Why it happens:** Charts with no data points render as empty boxes
**How to avoid:** Always show empty state messaging when there's insufficient data for meaningful charts. Show at minimum the summary stats (total drafts, sent count, etc.) even when charts are sparse
**Warning signs:** Blank chart areas with no explanation

### Pitfall 6: Contacts API Search Already Searches Category Text
**What goes wrong:** Thinking category search needs to be added when it partially exists
**Why it happens:** The current `.or()` clause searches `name, email, company, notes` -- it does NOT search `category`
**How to avoid:** DASH-02 requires searching by category text too. Add `category` to the `.or()` ilike clause in GET /api/contacts. Note: category filtering (DASH-03) is a separate exact-match filter that already works
**Warning signs:** Searching "investors" doesn't find contacts with that category

## Code Examples

Verified patterns from the existing codebase:

### Risk Calculation Utility
```typescript
// src/lib/contacts/risk.ts
import { differenceInDays } from "date-fns";

export type RiskLevel = "critical" | "warning" | "healthy" | "unknown";

export interface ContactRisk {
  days_overdue: number;
  is_at_risk: boolean;
  risk_level: RiskLevel;
}

export function computeContactRisk(contact: {
  outreach_frequency_days?: number | null;
  last_interaction_at?: string | null;
  created_at?: string | null;
}): ContactRisk {
  const frequency = contact.outreach_frequency_days ?? 30;
  const referenceDate = contact.last_interaction_at ?? contact.created_at;

  if (!referenceDate) {
    return { days_overdue: 0, is_at_risk: false, risk_level: "unknown" };
  }

  const daysSince = differenceInDays(new Date(), new Date(referenceDate));
  const daysOverdue = daysSince - frequency;

  return {
    days_overdue: Math.max(0, daysOverdue),
    is_at_risk: daysOverdue > 0,
    risk_level: daysOverdue > frequency ? "critical" : daysOverdue > 0 ? "warning" : "healthy",
  };
}
```

### Dashboard Stats API Pattern (following existing API conventions)
```typescript
// src/app/api/dashboard/stats/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { computeContactRisk } from "@/lib/contacts/risk";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [contactsResult, actionsResult, draftsResult] = await Promise.all([
    supabase.from("contacts").select("*").eq("user_id", user.id),
    supabase.from("action_items").select("*, contacts(name)").eq("user_id", user.id).eq("completed", false),
    supabase.from("outreach_drafts").select("status, sent_at, created_at").eq("user_id", user.id),
  ]);

  // Compute risk for each contact
  const contacts = (contactsResult.data ?? []).map(c => ({
    ...c,
    ...computeContactRisk(c),
  }));

  const atRisk = contacts.filter(c => c.is_at_risk);
  const needsTriage = contacts.filter(c => c.ai_confidence !== "manual");

  return NextResponse.json({
    data: {
      at_risk_contacts: atRisk,
      triage_contacts: needsTriage,
      pending_actions: actionsResult.data ?? [],
      draft_stats: {
        total: (draftsResult.data ?? []).length,
        sent: (draftsResult.data ?? []).filter(d => d.status === "sent").length,
        pending: (draftsResult.data ?? []).filter(d => d.status === "pending_review").length,
        dismissed: (draftsResult.data ?? []).filter(d => d.status === "dismissed").length,
      },
      summary: {
        total_contacts: contacts.length,
        at_risk_count: atRisk.length,
        triage_count: needsTriage.length,
        pending_actions_count: (actionsResult.data ?? []).length,
      },
    },
  });
}
```

### Recharts Bar Chart (Client Component)
```typescript
// "use client" component pattern for recharts
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

// recharts 3.x uses the same JSX API as 2.x
// ResponsiveContainer handles sizing
<ResponsiveContainer width="100%" height={300}>
  <BarChart data={chartData}>
    <XAxis dataKey="month" />
    <YAxis />
    <Tooltip />
    <Bar dataKey="sent" fill="#22c55e" name="Sent" />
    <Bar dataKey="dismissed" fill="#ef4444" name="Dismissed" />
  </BarChart>
</ResponsiveContainer>
```

### Enhanced Contact Card (extending existing component)
```typescript
// Add risk indicator to existing ContactCard without breaking current usage
// The contact card interface already includes last_interaction_at
// Add optional computed risk fields:
interface ContactCardProps {
  contact: {
    // ... existing fields
    days_overdue?: number;
    risk_level?: "critical" | "warning" | "healthy" | "unknown";
    needs_triage?: boolean;
  };
}
// Then render a visual indicator conditionally
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| recharts 2.x | recharts 3.x | 2025 | API is the same JSX-based; internal rewrite for performance |
| Custom chart wrappers | recharts directly | Current | shadcn/ui charts are thin recharts wrappers -- using recharts directly is equivalent |
| date-fns 3.x | date-fns 4.x | 2024 | Tree-shakeable by default, same function signatures |

**Deprecated/outdated:**
- Nothing relevant -- all libraries in use are current versions

## Open Questions

1. **Triage exit criteria**
   - What we know: Contacts with `ai_confidence != 'manual'` are AI-created and haven't been manually verified
   - What's unclear: Should editing a contact automatically set `ai_confidence = 'manual'`? Currently the PUT endpoint does not touch `ai_confidence`
   - Recommendation: When user edits a contact via the form, set `ai_confidence = 'manual'` in the PUT handler to mark it as "reviewed". This is a minimal change to the existing API route.

2. **Analytics time range**
   - What we know: outreach_drafts has `created_at` and `sent_at` timestamps
   - What's unclear: What time range to show in DASH-07 charts (last 30 days? all time?)
   - Recommendation: Default to last 30 days with option for 7d/30d/90d/all toggles. Start with 30 days.

3. **Response tracking in DASH-07**
   - What we know: The requirement says "response tracking" but there's no response detection mechanism in the codebase
   - What's unclear: How to track whether an outreach email received a reply
   - Recommendation: For v1, scope DASH-07 response tracking to what we CAN track: draft creation, approval, sending, and dismissal rates. True response tracking (checking Gmail for replies) is a v2 feature that requires additional Gmail API calls.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.0 with @testing-library/react 16.3.2 |
| Config file | vitest.config.ts |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DASH-01 | Contact list renders with cards, loading, empty states | unit (component) | `npx vitest run src/__tests__/components/contact-card.test.tsx -x` | Existing (enhance) |
| DASH-02 | Search API includes category in .or() clause | unit (API) | `npx vitest run src/__tests__/api/contacts.test.ts -x` | Existing (add test case) |
| DASH-03 | Category filter sends correct param | unit (API) | `npx vitest run src/__tests__/api/contacts.test.ts -x` | Existing |
| DASH-04 | Risk computation returns correct days_overdue and risk_level | unit (utility) | `npx vitest run src/__tests__/contacts/risk.test.ts -x` | Wave 0 |
| DASH-04 | Dashboard stats API returns at_risk_contacts | unit (API) | `npx vitest run src/__tests__/api/dashboard-stats.test.ts -x` | Wave 0 |
| DASH-05 | Triage detection identifies AI-created unreviewed contacts | unit (API) | `npx vitest run src/__tests__/api/dashboard-stats.test.ts -x` | Wave 0 |
| DASH-06 | Pending actions query returns incomplete items with contact names | unit (API) | `npx vitest run src/__tests__/api/dashboard-stats.test.ts -x` | Wave 0 |
| DASH-07 | Draft stats aggregation computes correct counts by status | unit (API) | `npx vitest run src/__tests__/api/dashboard-stats.test.ts -x` | Wave 0 |
| DASH-07 | Analytics chart component renders without errors | unit (component) | `npx vitest run src/__tests__/components/outreach-analytics.test.tsx -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/contacts/risk.test.ts` -- covers DASH-04 (risk computation utility)
- [ ] `src/__tests__/api/dashboard-stats.test.ts` -- covers DASH-04, DASH-05, DASH-06, DASH-07 (dashboard stats API)
- [ ] `src/__tests__/components/outreach-analytics.test.tsx` -- covers DASH-07 (chart rendering)

## Sources

### Primary (HIGH confidence)
- Existing codebase analysis -- contacts page, API routes, database schema, component patterns all read directly
- supabase/migrations/*.sql -- verified exact table schemas and column names
- package.json -- verified exact dependency versions in use

### Secondary (MEDIUM confidence)
- recharts 3.8.0 -- version confirmed via `npm view recharts version`; API verified consistent with 2.x JSX patterns
- date-fns 4.1.0 -- version confirmed via `npm view date-fns version`; `differenceInDays` function verified in existing codebase usage

### Tertiary (LOW confidence)
- None -- all findings are based on direct codebase inspection and npm registry verification

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already in use except recharts (version verified via npm)
- Architecture: HIGH -- following exact patterns established in Phases 1-3; no new architectural decisions needed
- Pitfalls: HIGH -- based on direct analysis of existing code patterns and database schema; risk computation logic is straightforward date arithmetic
- Analytics/Charts: MEDIUM -- recharts API stable but chart design decisions (which charts, what layout) are judgment calls

**Research date:** 2026-03-19
**Valid until:** 2026-04-19 (30 days -- stable libraries, no fast-moving dependencies)
