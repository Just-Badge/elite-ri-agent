import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Use vi.hoisted to ensure mock variables are available when vi.mock is hoisted
const { mockFrom, mockAuth, mockSupabase } = vi.hoisted(() => {
  // Chainable query builder mock
  const createChainableQuery = (resolvedValue: { data: unknown; error: unknown; count?: number }) => {
    const chain: Record<string, unknown> = {};
    const methods = ["select", "insert", "update", "delete", "eq", "or", "ilike", "order", "single", "maybeSingle"];
    for (const method of methods) {
      chain[method] = vi.fn().mockReturnValue(chain);
    }
    // The last method in any chain should resolve the promise
    chain.then = vi.fn((resolve: (val: unknown) => void) => resolve(resolvedValue));
    // Make it thenable
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

// Helper to build a chainable query that resolves to a specific value
function mockQueryResult(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  const methods = ["select", "insert", "update", "delete", "eq", "or", "ilike", "order", "single", "maybeSingle"];
  for (const method of methods) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }
  // Make it thenable so `await` resolves to result
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

// Import route handlers (they will use the mocked supabase)
import { GET as listContacts, POST as createContact } from "@/app/api/contacts/route";
import { GET as getContact, PUT as updateContact, DELETE as deleteContact } from "@/app/api/contacts/[id]/route";
import { PUT as toggleActionItem } from "@/app/api/contacts/[id]/action-items/route";

describe("GET /api/contacts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setUnauthenticated();
  });

  it("returns 401 when unauthenticated", async () => {
    const req = new NextRequest("http://localhost/api/contacts");
    const res = await listContacts(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns contacts with action_items for authenticated user", async () => {
    setAuthenticated();
    const mockContacts = [
      { id: "c1", name: "Alice", email: "alice@example.com", action_items: [{ id: "a1", text: "Follow up", completed: false }] },
      { id: "c2", name: "Bob", email: "bob@example.com", action_items: [] },
    ];
    mockFrom.mockReturnValue(mockQueryResult({ data: mockContacts, error: null }));

    const req = new NextRequest("http://localhost/api/contacts");
    const res = await listContacts(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(2);
    expect(body.data[0].name).toBe("Alice");
    expect(body.data[0].action_items).toHaveLength(1);
  });

  it("filters by search param (name/email/company)", async () => {
    setAuthenticated();
    const mockContacts = [{ id: "c1", name: "Alice", action_items: [] }];
    const query = mockQueryResult({ data: mockContacts, error: null });
    mockFrom.mockReturnValue(query);

    const req = new NextRequest("http://localhost/api/contacts?search=alice");
    const res = await listContacts(req);
    expect(res.status).toBe(200);
    // Verify .or() was called for text search
    expect(query.or).toHaveBeenCalled();
  });

  it("filters by category param", async () => {
    setAuthenticated();
    const query = mockQueryResult({ data: [], error: null });
    mockFrom.mockReturnValue(query);

    const req = new NextRequest("http://localhost/api/contacts?category=investors");
    const res = await listContacts(req);
    expect(res.status).toBe(200);
    // Verify .eq() was called with category filter
    expect(query.eq).toHaveBeenCalledWith("category", "investors");
  });
});

describe("POST /api/contacts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setUnauthenticated();
  });

  it("creates contact and returns 201", async () => {
    setAuthenticated();
    const newContact = { id: "c-new", name: "Charlie", email: "charlie@example.com" };
    const query = mockQueryResult({ data: newContact, error: null });
    mockFrom.mockReturnValue(query);

    const req = new NextRequest("http://localhost/api/contacts", {
      method: "POST",
      body: JSON.stringify({ name: "Charlie", email: "charlie@example.com" }),
    });
    const res = await createContact(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data).toBeDefined();
  });

  it("returns 400 for invalid body (missing name)", async () => {
    setAuthenticated();

    const req = new NextRequest("http://localhost/api/contacts", {
      method: "POST",
      body: JSON.stringify({ email: "no-name@example.com" }),
    });
    const res = await createContact(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
  });
});

describe("GET /api/contacts/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setUnauthenticated();
  });

  it("returns 404 for non-existent contact", async () => {
    setAuthenticated();
    const query = mockQueryResult({ data: null, error: { code: "PGRST116", message: "not found" } });
    mockFrom.mockReturnValue(query);

    const req = new NextRequest("http://localhost/api/contacts/nonexistent-id");
    const res = await getContact(req, { params: Promise.resolve({ id: "nonexistent-id" }) });
    expect(res.status).toBe(404);
  });
});

describe("PUT /api/contacts/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setUnauthenticated();
  });

  it("validates and updates contact", async () => {
    setAuthenticated();
    const contactId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
    const query = mockQueryResult({ data: { id: contactId }, error: null });
    mockFrom.mockReturnValue(query);

    const req = new NextRequest(`http://localhost/api/contacts/${contactId}`, {
      method: "PUT",
      body: JSON.stringify({ name: "Alice Updated", company: "NewCo" }),
    });
    const res = await updateContact(req, { params: Promise.resolve({ id: contactId }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

describe("DELETE /api/contacts/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setUnauthenticated();
  });

  it("deletes the contact", async () => {
    setAuthenticated();
    const query = mockQueryResult({ data: null, error: null });
    mockFrom.mockReturnValue(query);

    const req = new NextRequest("http://localhost/api/contacts/c1", {
      method: "DELETE",
    });
    const res = await deleteContact(req, { params: Promise.resolve({ id: "c1" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

describe("PUT /api/contacts/[id]/action-items", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setUnauthenticated();
  });

  it("toggles completed status", async () => {
    setAuthenticated();
    const query = mockQueryResult({ data: { id: "ai-1", completed: true }, error: null });
    mockFrom.mockReturnValue(query);

    const req = new NextRequest("http://localhost/api/contacts/c1/action-items", {
      method: "PUT",
      body: JSON.stringify({ actionItemId: "ai-1", completed: true }),
    });
    const res = await toggleActionItem(req, { params: Promise.resolve({ id: "c1" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
