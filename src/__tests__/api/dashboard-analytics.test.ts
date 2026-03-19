import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { NextRequest } from "next/server";

const { mockFrom, mockAuth, mockSupabase } = vi.hoisted(() => {
  const createChainableQuery = (resolvedValue: { data: unknown; error: unknown }) => {
    const chain: Record<string, unknown> = {};
    const methods = ["select", "insert", "update", "delete", "eq", "or", "ilike", "order", "single", "maybeSingle", "gte", "in"];
    for (const method of methods) {
      chain[method] = vi.fn().mockReturnValue(chain);
    }
    chain.then = vi.fn((resolve: (val: unknown) => void) => resolve(resolvedValue));
    Object.defineProperty(chain, Symbol.toStringTag, { value: "Promise" });
    return chain;
  };

  const defaultQuery = createChainableQuery({ data: [], error: null });
  const mockFrom = vi.fn().mockReturnValue(defaultQuery);
  const mockAuth = {
    getUser: vi.fn().mockResolvedValue({
      data: { user: null },
    }),
  };
  const mockSupabase = { from: mockFrom, auth: mockAuth };

  return { mockFrom, mockAuth, mockSupabase, createChainableQuery };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}));

function mockQueryResult(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  const methods = ["select", "insert", "update", "delete", "eq", "or", "ilike", "order", "single", "maybeSingle", "gte", "in"];
  for (const method of methods) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }
  chain.then = (resolve: (val: unknown) => void, _reject?: (val: unknown) => void) => {
    return Promise.resolve(resolve(result));
  };
  return chain;
}

function setAuthenticated(userId = "user-123") {
  mockAuth.getUser.mockResolvedValue({
    data: { user: { id: userId } },
  });
}

function setUnauthenticated() {
  mockAuth.getUser.mockResolvedValue({
    data: { user: null },
  });
}

import { GET } from "@/app/api/dashboard/analytics/route";

describe("GET /api/dashboard/analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setUnauthenticated();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-19T12:00:00Z"));
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it("returns 401 when unauthenticated", async () => {
    const req = new NextRequest("http://localhost/api/dashboard/analytics");
    const res = await GET(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns by_month aggregation and totals with default 30d period", async () => {
    setAuthenticated();

    const mockDrafts = [
      { status: "sent", created_at: "2026-03-05T00:00:00Z" },
      { status: "sent", created_at: "2026-03-10T00:00:00Z" },
      { status: "pending_review", created_at: "2026-03-12T00:00:00Z" },
      { status: "dismissed", created_at: "2026-03-15T00:00:00Z" },
      { status: "approved", created_at: "2026-03-01T00:00:00Z" },
      { status: "sent", created_at: "2026-02-20T00:00:00Z" },
    ];

    mockFrom.mockReturnValue(mockQueryResult({ data: mockDrafts, error: null }));

    const req = new NextRequest("http://localhost/api/dashboard/analytics");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();

    // Should have by_month entries
    expect(body.data.by_month).toBeDefined();
    expect(Array.isArray(body.data.by_month)).toBe(true);

    // Find the March 2026 entry
    const march = body.data.by_month.find((m: { month: string }) => m.month === "2026-03");
    expect(march).toBeDefined();
    expect(march.sent).toBe(2); // 2 sent in March
    expect(march.pending).toBe(2); // 1 pending_review + 1 approved in March
    expect(march.dismissed).toBe(1);
    expect(march.total).toBe(5); // total in March

    // Check Feb entry
    const feb = body.data.by_month.find((m: { month: string }) => m.month === "2026-02");
    expect(feb).toBeDefined();
    expect(feb.sent).toBe(1);

    // Totals should match sum
    expect(body.data.totals.sent).toBe(3);
    expect(body.data.totals.pending).toBe(2);
    expect(body.data.totals.dismissed).toBe(1);
    expect(body.data.totals.total).toBe(6);
  });

  it("accepts period query param", async () => {
    setAuthenticated();

    const query = mockQueryResult({ data: [], error: null });
    mockFrom.mockReturnValue(query);

    const req = new NextRequest("http://localhost/api/dashboard/analytics?period=7d");
    const res = await GET(req);
    expect(res.status).toBe(200);
    // Verify the query was called with gte for date filtering
    expect(query.gte).toHaveBeenCalled();
  });

  it("returns all data when period is 'all'", async () => {
    setAuthenticated();

    const query = mockQueryResult({ data: [], error: null });
    mockFrom.mockReturnValue(query);

    const req = new NextRequest("http://localhost/api/dashboard/analytics?period=all");
    const res = await GET(req);
    expect(res.status).toBe(200);
    // When period=all, gte should NOT be called
    expect(query.gte).not.toHaveBeenCalled();
  });
});
