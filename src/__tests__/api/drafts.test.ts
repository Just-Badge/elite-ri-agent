import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockFrom, mockAuth, mockSupabase, mockDeleteGmailDraft } = vi.hoisted(() => {
  const createChainableQuery = (resolvedValue: { data: unknown; error: unknown }) => {
    const chain: Record<string, unknown> = {};
    const methods = ["select", "insert", "update", "delete", "eq", "or", "ilike", "order", "single", "maybeSingle"];
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
  const mockDeleteGmailDraft = vi.fn().mockResolvedValue(undefined);

  return { mockFrom, mockAuth, mockSupabase, createChainableQuery, mockDeleteGmailDraft };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}));

vi.mock("@/lib/gmail/client", () => ({
  deleteGmailDraft: mockDeleteGmailDraft,
}));

function mockQueryResult(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  const methods = ["select", "insert", "update", "delete", "eq", "or", "ilike", "order", "single", "maybeSingle"];
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

import { GET } from "@/app/api/drafts/route";
import { PUT, DELETE } from "@/app/api/drafts/[id]/route";

describe("GET /api/drafts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setUnauthenticated();
  });

  it("returns 401 without auth", async () => {
    const req = new NextRequest("http://localhost/api/drafts");
    const res = await GET(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns list of user's drafts with contact name joined", async () => {
    setAuthenticated();
    const mockDrafts = [
      { id: "d1", subject: "Follow up", status: "pending_review", contacts: { name: "Alice", email: "alice@example.com" } },
      { id: "d2", subject: "Check in", status: "pending_review", contacts: { name: "Bob", email: "bob@example.com" } },
    ];
    const query = mockQueryResult({ data: mockDrafts, error: null });
    mockFrom.mockReturnValue(query);

    const req = new NextRequest("http://localhost/api/drafts");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(2);
    expect(body.data[0].contacts.name).toBe("Alice");
    expect(query.select).toHaveBeenCalledWith("*, contacts(name, email)");
  });

  it("filters by status query param", async () => {
    setAuthenticated();
    const query = mockQueryResult({ data: [], error: null });
    mockFrom.mockReturnValue(query);

    const req = new NextRequest("http://localhost/api/drafts?status=pending_review");
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(query.eq).toHaveBeenCalledWith("status", "pending_review");
  });
});

describe("PUT /api/drafts/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setUnauthenticated();
  });

  it("updates subject and body with Zod validation", async () => {
    setAuthenticated();
    const draftId = "draft-123";
    const query = mockQueryResult({ data: { id: draftId, subject: "Updated" }, error: null });
    mockFrom.mockReturnValue(query);

    const req = new NextRequest(`http://localhost/api/drafts/${draftId}`, {
      method: "PUT",
      body: JSON.stringify({ subject: "Updated Subject", body: "Updated body content" }),
    });
    const res = await PUT(req, { params: Promise.resolve({ id: draftId }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("returns 400 for invalid payload", async () => {
    setAuthenticated();

    const req = new NextRequest("http://localhost/api/drafts/draft-123", {
      method: "PUT",
      body: JSON.stringify({ subject: "" }), // min 1 char
    });
    const res = await PUT(req, { params: Promise.resolve({ id: "draft-123" }) });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
  });
});

describe("DELETE /api/drafts/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setUnauthenticated();
  });

  it("marks draft as dismissed and calls deleteGmailDraft if gmail_draft_id exists", async () => {
    setAuthenticated();
    const draftId = "draft-123";
    // First query: fetch draft to get gmail_draft_id
    const fetchQuery = mockQueryResult({
      data: { id: draftId, gmail_draft_id: "gmail-abc", user_id: "user-123" },
      error: null,
    });
    // Second query: update status
    const updateQuery = mockQueryResult({ data: null, error: null });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? fetchQuery : updateQuery;
    });

    const req = new NextRequest(`http://localhost/api/drafts/${draftId}`, { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ id: draftId }) });
    expect(res.status).toBe(200);
    expect(mockDeleteGmailDraft).toHaveBeenCalledWith("user-123", "gmail-abc");
  });

  it("handles deleteGmailDraft failure gracefully (still dismisses in DB)", async () => {
    setAuthenticated();
    const draftId = "draft-456";
    mockDeleteGmailDraft.mockRejectedValue(new Error("Gmail API error"));

    const fetchQuery = mockQueryResult({
      data: { id: draftId, gmail_draft_id: "gmail-xyz", user_id: "user-123" },
      error: null,
    });
    const updateQuery = mockQueryResult({ data: null, error: null });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? fetchQuery : updateQuery;
    });

    const req = new NextRequest(`http://localhost/api/drafts/${draftId}`, { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ id: draftId }) });
    // Should still succeed -- Gmail delete is best-effort
    expect(res.status).toBe(200);
    expect(mockDeleteGmailDraft).toHaveBeenCalled();
  });
});
