import { describe, it, expect, vi, beforeEach } from "vitest";

// Use vi.hoisted to make mocks available to vi.mock factories (which are hoisted)
const {
  mockUpsert,
  mockFrom,
  mockExchangeCodeForSession,
  mockGetSession,
  mockEncrypt,
} = vi.hoisted(() => ({
  mockUpsert: vi.fn().mockResolvedValue({ error: null }),
  mockFrom: vi.fn(),
  mockExchangeCodeForSession: vi.fn(),
  mockGetSession: vi.fn(),
  mockEncrypt: vi.fn((value: string) => `encrypted_${value}`),
}));

// Wire up mockFrom to return { upsert: mockUpsert }
mockFrom.mockReturnValue({ upsert: mockUpsert });

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      exchangeCodeForSession: mockExchangeCodeForSession,
      getSession: mockGetSession,
    },
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn().mockReturnValue({
    from: mockFrom,
  }),
}));

vi.mock("@/lib/crypto/encryption", () => ({
  encrypt: mockEncrypt,
}));

// Must import after mocks are set up
import { GET } from "@/app/(auth)/auth/callback/route";

describe("OAuth callback token capture", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue({ upsert: mockUpsert });
    mockUpsert.mockResolvedValue({ error: null });
  });

  it("captures and encrypts provider_token from session after code exchange", async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          provider_token: "test-access-token",
          provider_refresh_token: "test-refresh-token",
          user: { id: "user-123" },
        },
      },
    });

    const request = new Request(
      "http://localhost:3000/auth/callback?code=test-code"
    );
    const response = await GET(request);

    // Verify encrypt was called with both tokens
    expect(mockEncrypt).toHaveBeenCalledWith("test-access-token");
    expect(mockEncrypt).toHaveBeenCalledWith("test-refresh-token");

    // Verify upsert was called with encrypted values for oauth_tokens
    expect(mockFrom).toHaveBeenCalledWith("oauth_tokens");
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-123",
        google_access_token_encrypted: "encrypted_test-access-token",
        google_refresh_token_encrypted: "encrypted_test-refresh-token",
        token_status: "active",
        scopes: ["gmail.compose", "gmail.send"],
      }),
      { onConflict: "user_id" }
    );

    // Verify redirect to home
    expect(response.status).toBe(307);
    expect(new URL(response.headers.get("location")!).pathname).toBe("/");
  });

  it("handles null provider_refresh_token gracefully", async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          provider_token: "test-access-token",
          provider_refresh_token: null,
          user: { id: "user-456" },
        },
      },
    });

    const request = new Request(
      "http://localhost:3000/auth/callback?code=test-code"
    );
    await GET(request);

    // Verify encrypt was called only for access token
    expect(mockEncrypt).toHaveBeenCalledWith("test-access-token");
    expect(mockEncrypt).toHaveBeenCalledTimes(1);

    // Verify upsert was called with null for refresh token
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-456",
        google_access_token_encrypted: "encrypted_test-access-token",
        google_refresh_token_encrypted: null,
      }),
      { onConflict: "user_id" }
    );
  });

  it("redirects to login with error on failed code exchange", async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      error: new Error("Invalid code"),
    });

    const request = new Request(
      "http://localhost:3000/auth/callback?code=bad-code"
    );
    const response = await GET(request);

    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("error")).toBe("auth_callback_failed");
  });

  it("redirects to login with error when no code param", async () => {
    const request = new Request("http://localhost:3000/auth/callback");
    const response = await GET(request);

    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("error")).toBe("auth_callback_failed");

    // Verify no Supabase calls were made
    expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("creates user_settings row on successful login", async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          provider_token: "test-access-token",
          provider_refresh_token: "test-refresh-token",
          user: { id: "user-789" },
        },
      },
    });

    const request = new Request(
      "http://localhost:3000/auth/callback?code=test-code"
    );
    await GET(request);

    // Verify user_settings upsert was called
    expect(mockFrom).toHaveBeenCalledWith("user_settings");
    expect(mockUpsert).toHaveBeenCalledWith(
      { user_id: "user-789" },
      { onConflict: "user_id" }
    );
  });
});
