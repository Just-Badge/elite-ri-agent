/**
 * Get the public app URL for redirects.
 *
 * Behind a reverse proxy (Coolify/Nginx), request.url resolves to
 * the internal container URL (localhost:3000) instead of the public domain.
 * This helper ensures all redirects go to the correct public URL.
 */
export function getAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000"
  );
}

/**
 * Build a redirect URL using the public app URL, not request.url.
 */
export function appUrl(path: string): string {
  const base = getAppUrl();
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
