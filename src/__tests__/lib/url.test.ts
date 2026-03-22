import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getAppUrl, appUrl } from "@/lib/url";

describe("URL utilities", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset process.env for each test
    vi.resetModules();
    process.env = { ...originalEnv };
    // Clear the URL env vars
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.VERCEL_URL;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("getAppUrl", () => {
    it("returns NEXT_PUBLIC_APP_URL when set (Coolify scenario)", async () => {
      process.env.NEXT_PUBLIC_APP_URL = "https://ri.elite.community";

      // Re-import to pick up new env
      vi.resetModules();
      const { getAppUrl: getAppUrlFresh } = await import("@/lib/url");

      expect(getAppUrlFresh()).toBe("https://ri.elite.community");
    });

    it("returns NEXT_PUBLIC_APP_URL even when VERCEL_URL is also set (priority)", async () => {
      process.env.NEXT_PUBLIC_APP_URL = "https://ri.elite.community";
      process.env.VERCEL_URL = "myapp.vercel.app";

      vi.resetModules();
      const { getAppUrl: getAppUrlFresh } = await import("@/lib/url");

      // NEXT_PUBLIC_APP_URL should take precedence
      expect(getAppUrlFresh()).toBe("https://ri.elite.community");
    });

    it("returns https://VERCEL_URL when VERCEL_URL is set but NEXT_PUBLIC_APP_URL is not (Vercel scenario)", async () => {
      process.env.VERCEL_URL = "myapp-abc123.vercel.app";

      vi.resetModules();
      const { getAppUrl: getAppUrlFresh } = await import("@/lib/url");

      expect(getAppUrlFresh()).toBe("https://myapp-abc123.vercel.app");
    });

    it("returns localhost:3000 when no URL env vars are set (local development)", async () => {
      // No URL env vars set
      vi.resetModules();
      const { getAppUrl: getAppUrlFresh } = await import("@/lib/url");

      expect(getAppUrlFresh()).toBe("http://localhost:3000");
    });

    it("handles NEXT_PUBLIC_APP_URL with trailing slash", async () => {
      process.env.NEXT_PUBLIC_APP_URL = "https://ri.elite.community/";

      vi.resetModules();
      const { getAppUrl: getAppUrlFresh } = await import("@/lib/url");

      expect(getAppUrlFresh()).toBe("https://ri.elite.community/");
    });

    it("handles VERCEL_URL with custom domain", async () => {
      process.env.VERCEL_URL = "custom-domain.com";

      vi.resetModules();
      const { getAppUrl: getAppUrlFresh } = await import("@/lib/url");

      expect(getAppUrlFresh()).toBe("https://custom-domain.com");
    });
  });

  describe("appUrl", () => {
    it("builds URL with leading slash path", async () => {
      process.env.NEXT_PUBLIC_APP_URL = "https://ri.elite.community";

      vi.resetModules();
      const { appUrl: appUrlFresh } = await import("@/lib/url");

      expect(appUrlFresh("/auth/callback")).toBe("https://ri.elite.community/auth/callback");
    });

    it("builds URL without leading slash path (adds slash)", async () => {
      process.env.NEXT_PUBLIC_APP_URL = "https://ri.elite.community";

      vi.resetModules();
      const { appUrl: appUrlFresh } = await import("@/lib/url");

      expect(appUrlFresh("auth/callback")).toBe("https://ri.elite.community/auth/callback");
    });

    it("handles root path", async () => {
      process.env.NEXT_PUBLIC_APP_URL = "https://ri.elite.community";

      vi.resetModules();
      const { appUrl: appUrlFresh } = await import("@/lib/url");

      expect(appUrlFresh("/")).toBe("https://ri.elite.community/");
    });

    it("handles base URL with trailing slash and path with leading slash", async () => {
      process.env.NEXT_PUBLIC_APP_URL = "https://ri.elite.community/";

      vi.resetModules();
      const { appUrl: appUrlFresh } = await import("@/lib/url");

      // This will result in double slash, which is valid but not ideal
      expect(appUrlFresh("/auth/callback")).toBe("https://ri.elite.community//auth/callback");
    });

    it("works with localhost for local development", async () => {
      // No env vars set
      vi.resetModules();
      const { appUrl: appUrlFresh } = await import("@/lib/url");

      expect(appUrlFresh("/auth/callback")).toBe("http://localhost:3000/auth/callback");
    });
  });
});
