import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

import { fetchOpenBrainContext } from "@/lib/open-brain/client";
import { createAdminClient } from "@/lib/supabase/admin";

describe("fetchOpenBrainContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty string when open_brain_notes table does not exist (graceful fallback)", async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: null,
                error: {
                  message:
                    'relation "public.open_brain_notes" does not exist',
                  code: "42P01",
                },
              }),
            }),
          }),
        }),
      }),
    };
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      mockSupabase
    );

    const result = await fetchOpenBrainContext("user-123");
    expect(result).toBe("");
  });

  it("returns empty string when table exists but has no rows for contact/user", async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        }),
      }),
    };
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      mockSupabase
    );

    const result = await fetchOpenBrainContext("user-123");
    expect(result).toBe("");
  });

  it("returns formatted context string when matching notes found", async () => {
    const mockNotes = [
      {
        id: "note-1",
        content: "Met at TechCrunch Disrupt, discussed AI strategy",
        category: "networking",
        created_at: "2026-03-01T10:00:00Z",
      },
      {
        id: "note-2",
        content: "Interested in partnership for Q2 launch",
        category: "business",
        created_at: "2026-03-05T14:00:00Z",
      },
    ];

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: mockNotes,
                error: null,
              }),
            }),
          }),
        }),
      }),
    };
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      mockSupabase
    );

    const result = await fetchOpenBrainContext("user-123");

    expect(result).toContain("KNOWLEDGE BASE NOTES:");
    expect(result).toContain(
      "Met at TechCrunch Disrupt, discussed AI strategy"
    );
    expect(result).toContain("Interested in partnership for Q2 launch");
  });

  it("handles Supabase query errors gracefully (returns empty string, does not throw)", async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockRejectedValue(
                new Error("Connection refused")
              ),
            }),
          }),
        }),
      }),
    };
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      mockSupabase
    );

    // Should NOT throw, should return ""
    const result = await fetchOpenBrainContext("user-123");
    expect(result).toBe("");
  });
});
