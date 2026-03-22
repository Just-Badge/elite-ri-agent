import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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

// Mock Trigger.dev SDK tasks and runs
const mockTrigger = vi.fn();
const mockRetrieve = vi.fn();
vi.mock("@trigger.dev/sdk", () => ({
  tasks: {
    trigger: (...args: unknown[]) => mockTrigger(...args),
  },
  runs: {
    retrieve: (...args: unknown[]) => mockRetrieve(...args),
  },
}));

// Mock crypto encryption
vi.mock("@/lib/crypto/encryption", () => ({
  encrypt: vi.fn((val: string) => `encrypted_${val}`),
}));

describe("POST /api/meetings/process", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    // Set TRIGGER_SECRET_KEY for tests
    process.env.TRIGGER_SECRET_KEY = "test-trigger-secret";
  });

  afterEach(() => {
    process.env = originalEnv;
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

  it("triggers sync-granola-meetings task with userId in metadata and returns runId", async () => {
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

    // Verify trigger was called with metadata containing userId
    expect(mockTrigger).toHaveBeenCalledWith(
      "sync-granola-meetings",
      { userId: "user-123" },
      {
        metadata: {
          userId: "user-123",
        },
      }
    );
  });
});

describe("GET /api/meetings/process", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    // Set TRIGGER_SECRET_KEY for tests
    process.env.TRIGGER_SECRET_KEY = "test-trigger-secret";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
    });

    const { GET } = await import("@/app/api/meetings/process/route");

    const request = new Request("http://localhost/api/meetings/process?runId=run-123");
    const response = await GET(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 400 when runId is missing", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });

    const { GET } = await import("@/app/api/meetings/process/route");

    const request = new Request("http://localhost/api/meetings/process");
    const response = await GET(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("runId is required");
  });

  it("returns 404 when run belongs to a different user", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });

    // Run belongs to a different user
    mockRetrieve.mockResolvedValue({
      id: "run-456",
      status: "completed",
      metadata: { userId: "user-789" }, // Different user
    });

    const { GET } = await import("@/app/api/meetings/process/route");

    const request = new Request("http://localhost/api/meetings/process?runId=run-456");
    const response = await GET(request);

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("Run not found or access denied");
  });

  it("returns run status when run belongs to the authenticated user", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });

    mockRetrieve.mockResolvedValue({
      id: "run-456",
      status: "completed",
      output: { meetingsProcessed: 5 },
      metadata: { userId: "user-123" }, // Same user
    });

    const { GET } = await import("@/app/api/meetings/process/route");

    const request = new Request("http://localhost/api/meetings/process?runId=run-456");
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("completed");
    expect(body.output).toEqual({ meetingsProcessed: 5 });
    expect(body.metadata).toEqual({ userId: "user-123" });
  });

  it("returns 500 when runs.retrieve throws an error", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });

    mockRetrieve.mockRejectedValue(new Error("Trigger.dev API error"));

    const { GET } = await import("@/app/api/meetings/process/route");

    const request = new Request("http://localhost/api/meetings/process?runId=run-456");
    const response = await GET(request);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toContain("Failed to get run status");
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
