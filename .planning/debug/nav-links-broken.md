---
status: awaiting_human_verify
trigger: "Navigation issues - clicking links in header/footer doesn't work, pages take forever to load"
created: 2026-03-19T00:00:00Z
updated: 2026-03-19T00:00:00Z
---

## Current Focus

hypothesis: Dashboard sidebar uses raw `<a href>` tags instead of Next.js `<Link>` component, causing full page reloads instead of client-side navigation. This triggers the Supabase auth middleware on every click, making navigation slow or broken.
test: Replace `<a href>` with `<Link>` from next/link in dashboard layout
expecting: Client-side navigation, no full page reloads, fast transitions
next_action: Apply fix to src/app/(dashboard)/layout.tsx

## Symptoms

expected: Clicking sidebar links navigates instantly between pages
actual: Pages take forever to load or show "site can't be reached"; navigation seems broken
errors: Slow/broken navigation across the app
reproduction: Click any sidebar link (Dashboard, Contacts, Drafts, Settings)
started: Unknown

## Eliminated

(none yet)

## Evidence

- timestamp: 2026-03-19T00:00:00Z
  checked: src/app/(dashboard)/layout.tsx line 43
  found: Sidebar navigation uses `<a href={item.href} />` (raw anchor tag) instead of Next.js `<Link>`
  implication: Every sidebar click causes a full page reload. The browser re-fetches the entire page, middleware runs Supabase auth check, all JS re-downloads. This explains slow loads and potential "site can't be reached" if auth check is slow or flaky.

- timestamp: 2026-03-19T00:00:00Z
  checked: Other navigation in the app (settings/page.tsx, contact-card.tsx, contact-detail.tsx)
  found: These all correctly use `<Link>` from next/link
  implication: Only the main sidebar navigation is broken. The rest of the app uses proper Next.js client-side navigation.

- timestamp: 2026-03-19T00:00:00Z
  checked: src/middleware.ts
  found: Middleware runs Supabase getUser() on every request (except static assets, login, auth paths). No issues with redirect logic itself.
  implication: The middleware is correct, but it means every full page reload (from raw `<a>` tags) triggers an auth round-trip. If Supabase is slow or env vars are misconfigured, this compounds the navigation problem.

- timestamp: 2026-03-19T00:00:00Z
  checked: src/app/page.tsx
  found: Root page does `redirect("/dashboard")` which is correct server-side redirect
  implication: Not a factor in the sidebar navigation issue

## Resolution

root_cause: The dashboard sidebar in `src/app/(dashboard)/layout.tsx` uses raw HTML `<a href>` tags via `<SidebarMenuButton render={<a href={item.href} />}>` instead of Next.js `<Link>` components. This causes full page reloads on every navigation click, which triggers the Supabase auth middleware round-trip each time and re-downloads all page JS. This makes navigation slow and potentially broken if auth is slow.
fix: Replace `<a href={item.href} />` with `<Link href={item.href} />` from next/link
verification: TypeScript compiles cleanly. No new errors introduced. Build compilation succeeds ("Compiled successfully in 9.9s"). Pre-existing lint/type errors in test files are unrelated.
files_changed: [src/app/(dashboard)/layout.tsx]
