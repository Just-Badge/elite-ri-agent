/**
 * Get the public app URL for redirects.
 *
 * Behind a reverse proxy (Coolify/Nginx), request.url resolves to
 * the internal container URL (localhost:3000) instead of the public domain.
 * This helper ensures all redirects go to the correct public URL.
 *
 * Priority order:
 * 1. NEXT_PUBLIC_APP_URL - explicit configuration (e.g., Coolify deployments)
 * 2. VERCEL_URL - Vercel's automatic deployment URL
 * 3. localhost:3000 - local development fallback
 */
export function getAppUrl(): string {
  // Priority 1: Explicit configuration takes precedence
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  // Priority 2: Vercel deployment URL
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // Priority 3: Local development fallback
  return "http://localhost:3000";
}

/**
 * Build a redirect URL using the public app URL, not request.url.
 */
export function appUrl(path: string): string {
  const base = getAppUrl();
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
