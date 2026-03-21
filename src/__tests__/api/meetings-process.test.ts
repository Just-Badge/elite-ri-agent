import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase server client
const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: () => mockGetUser(),
    },
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}));

// Mock Trigger.dev SDK tasks
const mockTrigger = vi.fn();
vi.mock("@trigger.dev/sdk", () => ({
  tasks: {
    trigger: (...args: unknown[]) => mockTrigger(...args),
  },
}));

// Mock crypto encryption
vi.mock("@/lib/crypto/encryption", () => ({
  encrypt: vi.fn((val: string) => `encrypted_${val}`),
}));

describe("POST /api/meetings/process", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
    });

    const { POST } = await import("@/app/api/meetings/process/route");

    const response = await POST();

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("triggers processUserMeetings task and returns runId with status triggered", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });

    mockTrigger.mockResolvedValue({ id: "run-abc-456" });

    const { POST } = await import("@/app/api/meetings/process/route");

    const response = await POST();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.runId).toBe("run-abc-456");
    expect(body.status).toBe("triggered");

    expect(mockTrigger).toHaveBeenCalledWith(
      "process-user-meetings",
      { userId: "user-123" }
    );
  });
});

describe("POST /api/granola/token", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
    });

    const { POST } = await import("@/app/api/granola/token/route");

    const response = await POST(new Request("http://localhost/api/granola/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: "test", client_id: "test" }),
    }));

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("encrypts and stores the Granola refresh token with client_id", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });

    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ update: mockUpdate });

    const { POST } = await import("@/app/api/granola/token/route");

    const response = await POST(new Request("http://localhost/api/granola/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        refresh_token: "my-granola-refresh-token",
        client_id: "granola-client-123",
      }),
    }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);

    // Verify encryption was called
    const { encrypt } = await import("@/lib/crypto/encryption");
    expect(encrypt).toHaveBeenCalledWith("my-granola-refresh-token");

    // Verify database update
    expect(mockFrom).toHaveBeenCalledWith("user_settings");
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        granola_refresh_token_encrypted: "encrypted_my-granola-refresh-token",
        granola_client_id: "granola-client-123",
        granola_token_status: "active",
      })
    );
    expect(mockEq).toHaveBeenCalledWith("user_id", "user-123");
  });
});
