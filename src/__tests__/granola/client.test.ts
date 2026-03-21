import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/crypto/encryption", () => ({
  encrypt: vi.fn((val: string) => `encrypted_${val}`),
  decrypt: vi.fn((val: string) => val.replace("encrypted_", "")),
}));

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import {
  refreshGranolaToken,
  getOrRefreshAccessToken,
} from "@/lib/granola/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { encrypt, decrypt } from "@/lib/crypto/encryption";

describe("Granola Client", () => {
  const mockUpdate = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ error: null }),
  });

  const mockSelect = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: {
          granola_refresh_token_encrypted: "encrypted_old-refresh-token",
          granola_client_id: "test-client-id",
          granola_token_expiry: new Date(
            Date.now() - 60 * 60 * 1000
          ).toISOString(), // expired
        },
        error: null,
      }),
    }),
  });

  const mockSupabase = {
    from: vi.fn().mockReturnValue({
      update: mockUpdate,
      select: mockSelect,
    }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      mockSupabase
    );
    mockFetch.mockReset();
  });

  describe("refreshGranolaToken", () => {
    it("calls WorkOS endpoint with correct body (client_id, grant_type, refresh_token)", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: "new-access-token",
          refresh_token: "new-refresh-token",
          expires_in: 3600,
        }),
      });

      await refreshGranolaToken("user-1", "old-refresh-token", "client-123");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.workos.com/user_management/authenticate",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id: "client-123",
            grant_type: "refresh_token",
            refresh_token: "old-refresh-token",
          }),
        }
      );
    });

    it("persists new encrypted refresh token to user_settings via admin client BEFORE returning", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: "new-access-token",
          refresh_token: "new-refresh-token",
          expires_in: 3600,
        }),
      });

      const result = await refreshGranolaToken(
        "user-1",
        "old-refresh-token",
        "client-123"
      );

      // Verify encrypt was called with the new refresh token
      expect(encrypt).toHaveBeenCalledWith("new-refresh-token");

      // Verify the admin client persisted the new token
      expect(mockSupabase.from).toHaveBeenCalledWith("user_settings");
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          granola_refresh_token_encrypted: "encrypted_new-refresh-token",
          granola_token_status: "active",
        })
      );

      // Verify the result contains the new tokens
      expect(result.access_token).toBe("new-access-token");
      expect(result.refresh_token).toBe("new-refresh-token");
      expect(result.expires_at).toBeGreaterThan(Date.now());
    });

    it("throws on non-OK response from WorkOS", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      await expect(
        refreshGranolaToken("user-1", "old-refresh-token", "client-123")
      ).rejects.toThrow("WorkOS token refresh failed: 401");
    });
  });

  describe("getOrRefreshAccessToken", () => {
    it("always refreshes since access tokens are not cached (v1)", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: "fresh-access-token",
          refresh_token: "new-refresh-token",
          expires_in: 3600,
        }),
      });

      const accessToken = await getOrRefreshAccessToken("user-1");

      expect(accessToken).toBe("fresh-access-token");
      expect(decrypt).toHaveBeenCalledWith("encrypted_old-refresh-token");
      expect(mockFetch).toHaveBeenCalled();
    });
  });
});
