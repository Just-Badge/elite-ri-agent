import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const {
  mockFrom,
  mockAuth,
  mockSupabase,
  mockSendGmailDraft,
  mockCreateGmailDraft,
  mockDeleteGmailDraft,
} = vi.hoisted(() => {
  const mockFrom = vi.fn();
  const mockAuth = {
    getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
  };
  const mockSupabase = { from: mockFrom, auth: mockAuth };
  const mockSendGmailDraft = vi.fn().mockResolvedValue(undefined);
  const mockCreateGmailDraft = vi.fn().mockResolvedValue("new-gmail-draft-id");
  const mockDeleteGmailDraft = vi.fn().mockResolvedValue(undefined);

  return { mockFrom, mockAuth, mockSupabase, mockSendGmailDraft, mockCreateGmailDraft, mockDeleteGmailDraft };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}));

vi.mock("@/lib/gmail/client", () => ({
  sendGmailDraft: mockSendGmailDraft,
  createGmailDraft: mockCreateGmailDraft,
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

import { POST } from "@/app/api/drafts/[id]/send/route";

describe("POST /api/drafts/[id]/send", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setUnauthenticated();
    mockCreateGmailDraft.mockResolvedValue("new-gmail-draft-id");
  });

  it("returns 401 without auth", async () => {
    const req = new NextRequest("http://localhost/api/drafts/d1/send", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ id: "d1" }) });
    expect(res.status).toBe(401);
  });

  it("deletes old Gmail draft, creates fresh draft from DB content, sends it, updates status and contact", async () => {
    setAuthenticated();
    const draftId = "draft-send-1";
    const draftData = {
      id: draftId,
      subject: "Follow up",
      body: "<p>Hello Alice</p>",
      status: "pending_review",
      gmail_draft_id: "old-gmail-id",
      contact_id: "contact-1",
      user_id: "user-123",
      contacts: { name: "Alice", email: "alice@example.com" },
    };

    // Call 1: fetch draft with contact join
    const fetchQuery = mockQueryResult({ data: draftData, error: null });
    // Call 2: update outreach_drafts status
    const updateDraftQuery = mockQueryResult({ data: null, error: null });
    // Call 3: update contacts last_interaction_at
    const updateContactQuery = mockQueryResult({ data: null, error: null });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return fetchQuery;
      if (callCount === 2) return updateDraftQuery;
      return updateContactQuery;
    });

    const req = new NextRequest(`http://localhost/api/drafts/${draftId}/send`, { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ id: draftId }) });
    expect(res.status).toBe(200);

    // Should delete old gmail draft
    expect(mockDeleteGmailDraft).toHaveBeenCalledWith("user-123", "old-gmail-id");
    // Should create fresh gmail draft from DB content
    expect(mockCreateGmailDraft).toHaveBeenCalledWith("user-123", "alice@example.com", "Follow up", "<p>Hello Alice</p>");
    // Should send the newly created draft
    expect(mockSendGmailDraft).toHaveBeenCalledWith("user-123", "new-gmail-draft-id");
  });

  it("returns 400 if draft is not pending_review", async () => {
    setAuthenticated();
    const draftData = {
      id: "d-sent",
      subject: "Already sent",
      body: "body",
      status: "sent",
      gmail_draft_id: "gid",
      contact_id: "c1",
      user_id: "user-123",
      contacts: { name: "Bob", email: "bob@example.com" },
    };

    mockFrom.mockReturnValue(mockQueryResult({ data: draftData, error: null }));

    const req = new NextRequest("http://localhost/api/drafts/d-sent/send", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ id: "d-sent" }) });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("pending_review");
  });

  it("creates fresh Gmail draft even when gmail_draft_id is null (failed initial sync), then sends", async () => {
    setAuthenticated();
    const draftData = {
      id: "d-no-gmail",
      subject: "New subject",
      body: "<p>Body</p>",
      status: "pending_review",
      gmail_draft_id: null, // Failed initial sync
      contact_id: "c2",
      user_id: "user-123",
      contacts: { name: "Charlie", email: "charlie@example.com" },
    };

    const fetchQuery = mockQueryResult({ data: draftData, error: null });
    const updateDraftQuery = mockQueryResult({ data: null, error: null });
    const updateContactQuery = mockQueryResult({ data: null, error: null });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return fetchQuery;
      if (callCount === 2) return updateDraftQuery;
      return updateContactQuery;
    });

    const req = new NextRequest("http://localhost/api/drafts/d-no-gmail/send", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ id: "d-no-gmail" }) });
    expect(res.status).toBe(200);

    // Should NOT call deleteGmailDraft since gmail_draft_id is null
    expect(mockDeleteGmailDraft).not.toHaveBeenCalled();
    // Should still create fresh draft and send
    expect(mockCreateGmailDraft).toHaveBeenCalledWith("user-123", "charlie@example.com", "New subject", "<p>Body</p>");
    expect(mockSendGmailDraft).toHaveBeenCalledWith("user-123", "new-gmail-draft-id");
  });

  it("after user edits subject/body via PUT, sends the UPDATED content (fresh draft from DB)", async () => {
    setAuthenticated();
    // Simulates that the user edited the draft -- the DB has updated content
    const editedDraft = {
      id: "d-edited",
      subject: "EDITED Subject",
      body: "<p>EDITED body content</p>",
      status: "pending_review",
      gmail_draft_id: "stale-gmail-id",
      contact_id: "c3",
      user_id: "user-123",
      contacts: { name: "Diana", email: "diana@example.com" },
    };

    const fetchQuery = mockQueryResult({ data: editedDraft, error: null });
    const updateDraftQuery = mockQueryResult({ data: null, error: null });
    const updateContactQuery = mockQueryResult({ data: null, error: null });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return fetchQuery;
      if (callCount === 2) return updateDraftQuery;
      return updateContactQuery;
    });

    const req = new NextRequest("http://localhost/api/drafts/d-edited/send", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ id: "d-edited" }) });
    expect(res.status).toBe(200);

    // Key assertion: the fresh draft uses the EDITED DB content
    expect(mockCreateGmailDraft).toHaveBeenCalledWith(
      "user-123",
      "diana@example.com",
      "EDITED Subject",
      "<p>EDITED body content</p>"
    );
    // Old stale draft should be deleted
    expect(mockDeleteGmailDraft).toHaveBeenCalledWith("user-123", "stale-gmail-id");
  });
});
