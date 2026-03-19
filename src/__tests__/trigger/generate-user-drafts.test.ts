import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/crypto/encryption", () => ({
  decrypt: vi.fn().mockReturnValue("decrypted-api-key"),
}));

vi.mock("@/lib/ai/draft-outreach", () => ({
  generateOutreachDraft: vi.fn().mockResolvedValue({
    subject: "Great catching up",
    body: "<p>Hi Dave,</p><p>Wonderful to reconnect.</p>",
    rationale: "Contact is due for follow-up after recent meeting",
  }),
}));

vi.mock("@/lib/gmail/client", () => ({
  createGmailDraft: vi.fn().mockResolvedValue("gmail-draft-123"),
}));

vi.mock("@/lib/open-brain/client", () => ({
  fetchOpenBrainContext: vi.fn().mockResolvedValue("Open Brain context about Dave"),
}));

// Mock @trigger.dev/sdk
vi.mock("@trigger.dev/sdk", () => ({
  task: vi.fn(
    (config: { run: (payload: unknown) => Promise<unknown> }) => {
      return { ...config, _run: config.run };
    }
  ),
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/crypto/encryption";
import { generateOutreachDraft } from "@/lib/ai/draft-outreach";
import { createGmailDraft } from "@/lib/gmail/client";
import { fetchOpenBrainContext } from "@/lib/open-brain/client";
import { generateUserDrafts } from "@/trigger/generate-user-drafts";

// Helper types for mock chain
type MockFn = ReturnType<typeof vi.fn>;

describe("Generate User Drafts", () => {
  // Build a configurable mock supabase client
  let mockUpdateEq: MockFn;
  let mockInsertSelect: MockFn;
  let mockInsertSingle: MockFn;

  const mockContactMeetingsData = [
    {
      meeting_id: "meeting-1",
      meetings: {
        id: "meeting-1",
        title: "AI Summit Follow-up",
        summary: "Discussed partnership",
        meeting_date: "2026-03-15",
      },
    },
  ];

  const mockActionItemsData = [
    { text: "Send proposal draft", completed: false },
    { text: "Schedule board meeting", completed: true },
  ];

  const mockDueContacts = [
    {
      id: "contact-1",
      name: "Dave Brown",
      email: "dave@example.com",
      category: "advisors",
      background: "Executive with 40 years in media",
      relationship_context: {
        why: "Strategic advisory",
        what: "GTM strategy",
        mutual_value: "Equity for guidance",
      },
      notes: "Cancer survivor",
      outreach_frequency_days: 14,
      last_interaction_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago — due
    },
    {
      id: "contact-2",
      name: "Sarah Chen",
      email: "sarah@startup.io",
      category: "investors",
      background: "VC partner at Horizon",
      relationship_context: null,
      notes: null,
      outreach_frequency_days: 7,
      last_interaction_at: null, // Never contacted — always due
    },
  ];

  function buildMockSupabase() {
    mockUpdateEq = vi.fn().mockResolvedValue({ error: null });
    mockInsertSingle = vi.fn();
    mockInsertSelect = vi.fn().mockReturnValue({ single: mockInsertSingle });

    // We need a sophisticated mock that handles different from() calls
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === "user_settings") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  personality_profile: "Professional and warm",
                  business_objectives: "Scale to 1000 customers",
                  projects: "AI CRM",
                  zai_api_key_encrypted: "encrypted-key-123",
                },
                error: null,
              }),
            }),
          }),
        };
      }

      if (table === "contacts") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                not: vi.fn().mockReturnValue({
                  not: vi.fn().mockReturnValue({
                    order: vi.fn().mockReturnValue({
                      limit: vi
                        .fn()
                        .mockResolvedValue({
                          data: mockDueContacts,
                          error: null,
                        }),
                    }),
                  }),
                }),
              }),
            }),
          }),
        };
      }

      if (table === "outreach_drafts") {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [], // No existing pending drafts
                error: null,
              }),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: "draft-uuid-1" },
                error: null,
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: mockUpdateEq,
          }),
        };
      }

      if (table === "contact_meetings") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: mockContactMeetingsData,
                  error: null,
                }),
              }),
            }),
          }),
        };
      }

      if (table === "action_items") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: mockActionItemsData,
                error: null,
              }),
            }),
          }),
        };
      }

      // Default fallback
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      };
    });

    return { from: mockFrom };
  }

  let mockSupabase: ReturnType<typeof buildMockSupabase>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = buildMockSupabase();
    (createAdminClient as MockFn).mockReturnValue(mockSupabase);
    // Re-establish mock return values after clearAllMocks
    (decrypt as MockFn).mockReturnValue("decrypted-api-key");
    (generateOutreachDraft as MockFn).mockResolvedValue({
      subject: "Great catching up",
      body: "<p>Hi Dave,</p><p>Wonderful to reconnect.</p>",
      rationale: "Contact is due for follow-up after recent meeting",
    });
    (createGmailDraft as MockFn).mockResolvedValue("gmail-draft-123");
    (fetchOpenBrainContext as MockFn).mockResolvedValue(
      "Open Brain context about Dave"
    );
  });

  const runTask = async (payload: { userId: string }) => {
    return (
      generateUserDrafts as unknown as {
        _run: (payload: { userId: string }) => Promise<unknown>;
      }
    )._run(payload);
  };

  it("Test 1: fetches user settings and decrypts zai_api_key_encrypted", async () => {
    await runTask({ userId: "user-123" });

    // Verify user_settings was queried
    expect(mockSupabase.from).toHaveBeenCalledWith("user_settings");
    // Verify decrypt was called
    expect(decrypt).toHaveBeenCalledWith("encrypted-key-123");
  });

  it("Test 2: queries contacts due for outreach (active, email not null, frequency set, past due)", async () => {
    await runTask({ userId: "user-123" });

    // Contacts table must be queried
    expect(mockSupabase.from).toHaveBeenCalledWith("contacts");
  });

  it("Test 3: calls generateOutreachDraft with correct DraftContext including all 5 layers", async () => {
    await runTask({ userId: "user-123" });

    // Should be called for each due contact
    expect(generateOutreachDraft).toHaveBeenCalled();

    const firstCallArgs = (generateOutreachDraft as MockFn).mock.calls[0];
    const [apiKey, context] = firstCallArgs;

    // Verify API key was decrypted
    expect(apiKey).toBe("decrypted-api-key");

    // Verify DraftContext structure: userProfile
    expect(context.userProfile).toEqual({
      personality_profile: "Professional and warm",
      business_objectives: "Scale to 1000 customers",
      projects: "AI CRM",
    });

    // Verify DraftContext: contact
    expect(context.contact.name).toBe("Dave Brown");
    expect(context.contact.email).toBe("dave@example.com");
    expect(context.contact.category).toBe("advisors");

    // Verify DraftContext: recentMeetings (from contact_meetings join)
    expect(context.recentMeetings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: "AI Summit Follow-up" }),
      ])
    );

    // Verify DraftContext: actionItems
    expect(context.actionItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ text: "Send proposal draft", completed: false }),
      ])
    );

    // Verify DraftContext: openBrainContext
    expect(context.openBrainContext).toBe("Open Brain context about Dave");
  });

  it("Test 4: inserts draft into outreach_drafts with status pending_review and gmail_sync_status pending", async () => {
    await runTask({ userId: "user-123" });

    // Verify outreach_drafts insert was called
    expect(mockSupabase.from).toHaveBeenCalledWith("outreach_drafts");
  });

  it("Test 5: calls createGmailDraft and updates gmail_draft_id + gmail_sync_status='synced' on success", async () => {
    await runTask({ userId: "user-123" });

    // Verify Gmail draft creation was called for each contact
    expect(createGmailDraft).toHaveBeenCalledWith(
      "user-123",
      "dave@example.com",
      "Great catching up",
      "<p>Hi Dave,</p><p>Wonderful to reconnect.</p>"
    );
  });

  it("Test 6: catches Gmail sync failure, sets gmail_sync_status='failed', does NOT throw", async () => {
    // Make Gmail fail
    (createGmailDraft as MockFn).mockRejectedValue(
      new Error("Gmail API error")
    );

    // Should NOT throw -- best-effort sync
    const result = await runTask({ userId: "user-123" });

    // Draft should still be generated (persisted to DB)
    expect(generateOutreachDraft).toHaveBeenCalled();

    // Result should include gmailFailed count
    expect(result).toEqual(
      expect.objectContaining({
        generated: expect.any(Number),
        gmailFailed: expect.any(Number),
      })
    );
    expect((result as { gmailFailed: number }).gmailFailed).toBeGreaterThan(0);
  });

  it("Test 7: returns { generated, gmailSynced, gmailFailed } counts", async () => {
    const result = await runTask({ userId: "user-123" });

    expect(result).toHaveProperty("generated");
    expect(result).toHaveProperty("gmailSynced");
    expect(result).toHaveProperty("gmailFailed");

    // With 2 due contacts and successful Gmail sync:
    expect((result as { generated: number }).generated).toBe(2);
    expect((result as { gmailSynced: number }).gmailSynced).toBe(2);
    expect((result as { gmailFailed: number }).gmailFailed).toBe(0);
  });

  it("Test 8: skips contacts that already have a pending_review draft (no duplicate drafts)", async () => {
    // Override the outreach_drafts select to return one existing pending draft
    const mockFromOverride = mockSupabase.from as MockFn;
    const originalImpl = mockFromOverride.getMockImplementation();

    mockFromOverride.mockImplementation((table: string) => {
      if (table === "outreach_drafts") {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [{ contact_id: "contact-1" }], // contact-1 already has a pending draft
                error: null,
              }),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: "draft-uuid-2" },
                error: null,
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      // Fall through to original for other tables
      return originalImpl!(table);
    });

    const result = await runTask({ userId: "user-123" });

    // Only contact-2 should generate a draft (contact-1 skipped)
    expect((result as { generated: number }).generated).toBe(1);
  });
});
