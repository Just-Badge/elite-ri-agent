import { describe, it, expect, beforeEach, vi } from "vitest";

const REQUIRED_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ENCRYPTION_KEY",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
] as const;

const VALID_ENV: Record<string, string> = {
  NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
  ENCRYPTION_KEY: "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
  GOOGLE_CLIENT_ID: "test-client-id",
  GOOGLE_CLIENT_SECRET: "test-client-secret",
};

describe("env validation module", () => {
  beforeEach(() => {
    vi.resetModules();
    // Clear all required env vars before each test
    for (const key of REQUIRED_VARS) {
      delete process.env[key];
    }
  });

  it("exports env with all values when all required vars are set", async () => {
    // Set all vars
    for (const [key, value] of Object.entries(VALID_ENV)) {
      process.env[key] = value;
    }

    const { env } = await import("@/lib/env");

    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe("https://test.supabase.co");
    expect(env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe("test-anon-key");
    expect(env.SUPABASE_SERVICE_ROLE_KEY).toBe("test-service-role-key");
    expect(env.ENCRYPTION_KEY).toBe(
      "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
    );
    expect(env.GOOGLE_CLIENT_ID).toBe("test-client-id");
    expect(env.GOOGLE_CLIENT_SECRET).toBe("test-client-secret");
  });

  it("throws when a single var is missing with its name in the message", async () => {
    // Set all except ENCRYPTION_KEY
    for (const [key, value] of Object.entries(VALID_ENV)) {
      if (key !== "ENCRYPTION_KEY") {
        process.env[key] = value;
      }
    }

    await expect(import("@/lib/env")).rejects.toThrow("ENCRYPTION_KEY");
  });

  it("throws listing all missing vars when multiple are missing", async () => {
    // Set only NEXT_PUBLIC_SUPABASE_URL
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";

    try {
      await import("@/lib/env");
      expect.fail("Should have thrown");
    } catch (err) {
      const message = (err as Error).message;
      // All missing vars should appear in the error message
      expect(message).toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY");
      expect(message).toContain("SUPABASE_SERVICE_ROLE_KEY");
      expect(message).toContain("ENCRYPTION_KEY");
      expect(message).toContain("GOOGLE_CLIENT_ID");
      expect(message).toContain("GOOGLE_CLIENT_SECRET");
      // The one that IS set should NOT appear
      expect(message).not.toContain("NEXT_PUBLIC_SUPABASE_URL");
    }
  });

  it("validates all 6 required vars", async () => {
    // None set -- all should appear in error
    try {
      await import("@/lib/env");
      expect.fail("Should have thrown");
    } catch (err) {
      const message = (err as Error).message;
      for (const varName of REQUIRED_VARS) {
        expect(message).toContain(varName);
      }
    }
  });
});
