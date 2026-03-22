/**
 * Environment variable validation module.
 *
 * Validates all required environment variables on first import.
 * If any are missing, throws a descriptive error listing ALL missing vars
 * so the developer can fix them all at once.
 *
 * Usage: import { env } from "@/lib/env";
 *
 * NOTE: Do not wire this into existing supabase/gmail/crypto modules yet --
 * this module is created as a utility; wiring happens in a future plan.
 */

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ENCRYPTION_KEY",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "REDIS_URL",
] as const;

type RequiredVar = (typeof required)[number];

function validateEnv(): Record<RequiredVar, string> {
  const missing = required.filter((name) => !process.env[name]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.map((n) => `  - ${n}`).join("\n")}`
    );
  }

  return Object.fromEntries(
    required.map((name) => [name, process.env[name]!])
  ) as Record<RequiredVar, string>;
}

export const env = validateEnv();
