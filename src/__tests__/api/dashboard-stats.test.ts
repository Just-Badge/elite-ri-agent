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

import { GET } from "@/app/api/dashboard/stats/route";

describe("GET /api/dashboard/stats", () => {
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
    const req = new NextRequest("http://localhost/api/dashboard/stats");
    const res = await GET(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns aggregated dashboard data for authenticated user", async () => {
    setAuthenticated();

    const mockContacts = [
      {
        id: "c1", name: "Alice", email: "alice@test.com", company: "Acme",
        category: "investors", outreach_frequency_days: 30,
        last_interaction_at: "2026-02-02T12:00:00Z", // 45 days ago -> warning
        ai_confidence: "high", status: "active", created_at: "2026-01-01T00:00:00Z",
      },
      {
        id: "c2", name: "Bob", email: "bob@test.com", company: "Beta",
        category: "clients", outreach_frequency_days: 30,
        last_interaction_at: "2026-03-15T12:00:00Z", // 4 days ago -> healthy
        ai_confidence: "manual", status: "active", created_at: "2026-01-01T00:00:00Z",
      },
      {
        id: "c3", name: "Carol", email: "carol@test.com", company: "Gamma",
        category: "advisors", outreach_frequency_days: 7,
        last_interaction_at: null, created_at: "2026-02-27T12:00:00Z", // 20 days ago, freq 7 -> critical
        ai_confidence: "low", status: "active",
      },
    ];

    const mockActions = [
      { id: "a1", text: "Follow up", completed: false, contact_id: "c1", contacts: { name: "Alice" } },
      { id: "a2", text: "Send proposal", completed: false, contact_id: "c2", contacts: { name: "Bob" } },
    ];

    const mockDrafts = [
      { status: "sent", sent_at: "2026-03-10T00:00:00Z", created_at: "2026-03-09T00:00:00Z" },
      { status: "pending_review", sent_at: null, created_at: "2026-03-11T00:00:00Z" },
      { status: "dismissed", sent_at: null, created_at: "2026-03-12T00:00:00Z" },
      { status: "approved", sent_at: null, created_at: "2026-03-13T00:00:00Z" },
    ];

    // Route mock by table name
    mockFrom.mockImplementation((table: string) => {
      if (table === "contacts") {
        return mockQueryResult({ data: mockContacts, error: null });
      }
      if (table === "action_items") {
        return mockQueryResult({ data: mockActions, error: null });
      }
      if (table === "outreach_drafts") {
        return mockQueryResult({ data: mockDrafts, error: null });
      }
      return mockQueryResult({ data: [], error: null });
    });

    const req = new NextRequest("http://localhost/api/dashboard/stats");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();

    // at_risk_contacts: Alice (daysOverdue=15) and Carol (daysOverdue=13), sorted by days_overdue desc
    expect(body.data.at_risk_contacts).toHaveLength(2);
    expect(body.data.at_risk_contacts[0].name).toBe("Alice"); // 15 days overdue
    expect(body.data.at_risk_contacts[1].name).toBe("Carol"); // 13 days overdue

    // triage_contacts: contacts where ai_confidence != 'manual' -> Alice (high) and Carol (low)
    expect(body.data.triage_contacts).toHaveLength(2);

    // pending_actions: 2 incomplete action items
    expect(body.data.pending_actions).toHaveLength(2);

    // draft_stats: 1 sent, 1 dismissed, 2 pending (pending_review + approved)
    expect(body.data.draft_stats.total).toBe(4);
    expect(body.data.draft_stats.sent).toBe(1);
    expect(body.data.draft_stats.dismissed).toBe(1);
    expect(body.data.draft_stats.pending).toBe(2);

    // summary
    expect(body.data.summary.total_contacts).toBe(3);
    expect(body.data.summary.at_risk_count).toBe(2);
    expect(body.data.summary.triage_count).toBe(2);
    expect(body.data.summary.pending_actions_count).toBe(2);
  });
});
