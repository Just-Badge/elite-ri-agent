import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("@trigger.dev/sdk", () => ({
  task: vi.fn((config: unknown) => config),
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("@/lib/granola/client", () => ({
  getOrRefreshAccessToken: vi.fn(),
  getGranolaDocuments: vi.fn(),
  getGranolaTranscript: vi.fn(),
}));

vi.mock("@/lib/ai/extract-contacts", () => ({
  extractContactsFromTranscript: vi.fn(),
}));

vi.mock("@/lib/crypto/encryption", () => ({
  decrypt: vi.fn((val: string) => val.replace("encrypted_", "")),
}));

import { upsertEnrichedContacts } from "@/lib/meetings/db";
import type { ExtractedContact } from "@/lib/ai/types";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("Contact Deduplication (upsertEnrichedContacts)", () => {
  const userId = "user-test-123";
  const meetingId = "meeting-test-456";

  // Mock Supabase client with chainable methods
  let mockInsertReturn: { data: unknown; error: unknown };
  let mockUpdateReturn: { data: unknown; error: unknown };
  let mockSelectSingleReturn: { data: unknown; error: unknown };

  const mockEq = vi.fn();
  const mockSingle = vi.fn();
  const mockInsertSelect = vi.fn();
  const mockInsertSingle = vi.fn();
  const mockInsert = vi.fn();
  const mockUpdate = vi.fn();
  const mockSelect = vi.fn();

  const mockSupabase = {
    from: vi.fn(),
  };

  function setupMockSupabase() {
    // Default return values
    mockInsertReturn = { data: { id: "new-contact-id" }, error: null };
    mockUpdateReturn = { data: null, error: null };
    mockSelectSingleReturn = { data: null, error: null };

    mockSingle.mockImplementation(() => mockInsertReturn);
    mockInsertSingle.mockImplementation(() => mockInsertReturn);
    mockInsertSelect.mockReturnValue({ single: mockInsertSingle });
    mockInsert.mockImplementation(() => ({
      select: mockInsertSelect,
    }));

    const mockUpdateEq = vi.fn().mockImplementation(() => mockUpdateReturn);
    mockUpdate.mockReturnValue({ eq: mockUpdateEq });

    const mockSelectEq = vi.fn().mockReturnValue({
      single: vi.fn().mockImplementation(() => mockSelectSingleReturn),
    });
    mockSelect.mockReturnValue({ eq: mockSelectEq });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "contacts") {
        return {
          insert: mockInsert,
          update: mockUpdate,
          select: mockSelect,
        };
      }
      if (table === "contact_meetings") {
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      if (table === "action_items") {
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      return { insert: vi.fn(), update: vi.fn(), select: vi.fn() };
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    setupMockSupabase();
  });

  it("updates existing contact when extracted email matches (not duplicate)", async () => {
    const existingContacts = [
      { id: "contact-alice", name: "Alice Smith", email: "alice@co.com" },
    ];

    const extracted: ExtractedContact[] = [
      {
        name: "Alice Smith",
        email: "alice@co.com",
        company: "New Company Inc",
        role: "CTO",
        confidence: "high",
      },
    ];

    const result = await upsertEnrichedContacts(
      mockSupabase as unknown as SupabaseClient,
      userId,
      meetingId,
      extracted,
      existingContacts
    );

    // Should UPDATE, not INSERT
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        company: "New Company Inc",
        role: "CTO",
      })
    );
    expect(result.updated).toBe(1);
    expect(result.created).toBe(0);
  });

  it("inserts new contact when email does not match any existing", async () => {
    const existingContacts = [
      { id: "contact-alice", name: "Alice Smith", email: "alice@co.com" },
    ];

    const extracted: ExtractedContact[] = [
      {
        name: "Bob Jones",
        email: "bob@newcompany.com",
        company: "NewCo",
        confidence: "high",
      },
    ];

    const result = await upsertEnrichedContacts(
      mockSupabase as unknown as SupabaseClient,
      userId,
      meetingId,
      extracted,
      existingContacts
    );

    // Should INSERT with the new email
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: userId,
        name: "Bob Jones",
        email: "bob@newcompany.com",
        company: "NewCo",
      })
    );
    expect(result.created).toBe(1);
    expect(result.updated).toBe(0);
  });

  it("updates existing contact cautiously when no email but name matches (only fills empty fields)", async () => {
    const existingContacts = [
      { id: "contact-bob", name: "Bob Smith", email: null },
    ];

    // Mock the full contact fetch to show Bob has company but no role
    mockSelectSingleReturn = {
      data: {
        id: "contact-bob",
        name: "Bob Smith",
        email: null,
        company: "Existing Company",
        role: null,
        location: null,
        category: "networking",
        background: "Known background",
        relationship_context: null,
        notes: "Existing notes",
      },
      error: null,
    };

    const extracted: ExtractedContact[] = [
      {
        name: "Bob Smith",
        email: undefined,
        company: "Different Company",
        role: "VP Engineering",
        location: "San Francisco",
        confidence: "medium",
      },
    ];

    const result = await upsertEnrichedContacts(
      mockSupabase as unknown as SupabaseClient,
      userId,
      meetingId,
      extracted,
      existingContacts
    );

    // Should UPDATE but ONLY fill empty fields (role, location)
    // Should NOT overwrite existing company or notes
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        role: "VP Engineering",
        location: "San Francisco",
      })
    );
    // Verify company is NOT in the update (it already exists on the contact)
    const updateCall = mockUpdate.mock.calls[0][0];
    expect(updateCall.company).toBeUndefined();
    expect(updateCall.notes).toBeUndefined();

    expect(result.updated).toBe(1);
    expect(result.created).toBe(0);
  });

  it("inserts contact with ai_confidence='low' when extraction confidence is low", async () => {
    const existingContacts: { id: string; name: string; email: string | null }[] = [];

    const extracted: ExtractedContact[] = [
      {
        name: "Some Person",
        email: "some@email.com",
        confidence: "low",
      },
    ];

    const result = await upsertEnrichedContacts(
      mockSupabase as unknown as SupabaseClient,
      userId,
      meetingId,
      extracted,
      existingContacts
    );

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        ai_confidence: "low",
        name: "Some Person",
      })
    );
    expect(result.created).toBe(1);
  });

  it("inserts new contact when no email and no name match", async () => {
    const existingContacts = [
      { id: "contact-alice", name: "Alice Smith", email: "alice@co.com" },
    ];

    const extracted: ExtractedContact[] = [
      {
        name: "Completely Unknown Person",
        confidence: "medium",
      },
    ];

    const result = await upsertEnrichedContacts(
      mockSupabase as unknown as SupabaseClient,
      userId,
      meetingId,
      extracted,
      existingContacts
    );

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: userId,
        name: "Completely Unknown Person",
        ai_confidence: "medium",
      })
    );
    expect(result.created).toBe(1);
    expect(result.updated).toBe(0);
  });
});
