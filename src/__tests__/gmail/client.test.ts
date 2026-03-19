import { describe, it, expect, vi, beforeEach } from "vitest";

// Hoisted mock variables (established pattern from Phase 2)
const mockDraftsCreate = vi.fn();
const mockDraftsSend = vi.fn();
const mockDraftsDelete = vi.fn();
const mockOAuth2Constructor = vi.fn();
const mockOAuth2Client = {
  setCredentials: vi.fn(),
  on: vi.fn(),
};

vi.mock("@googleapis/gmail", () => {
  // Use function constructors so they work with `new`
  function MockGmail() {
    return {
      users: {
        drafts: {
          create: mockDraftsCreate,
          send: mockDraftsSend,
          delete: mockDraftsDelete,
        },
      },
    };
  }

  function MockOAuth2(...args: unknown[]) {
    mockOAuth2Constructor(...args);
    return mockOAuth2Client;
  }

  return {
    gmail_v1: { Gmail: MockGmail },
    auth: { OAuth2: MockOAuth2 },
  };
});

vi.mock("@/lib/crypto/encryption", () => ({
  encrypt: vi.fn((val: string) => `encrypted_${val}`),
  decrypt: vi.fn((val: string) => val.replace("encrypted_", "")),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/gmail/mime", () => ({
  buildMimeMessage: vi.fn(() => "base64url_encoded_mime_message"),
}));

import {
  getGmailClient,
  createGmailDraft,
  sendGmailDraft,
  deleteGmailDraft,
} from "@/lib/gmail/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt, encrypt } from "@/lib/crypto/encryption";
import { buildMimeMessage } from "@/lib/gmail/mime";

describe("Gmail Client", () => {
  const mockUpdate = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ error: null }),
  });

  const mockSelect = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: {
          google_refresh_token_encrypted: "encrypted_test-refresh-token",
          google_access_token_encrypted: "encrypted_test-access-token",
          token_expiry: new Date(Date.now() + 3600 * 1000).toISOString(),
          token_status: "active",
        },
        error: null,
      }),
    }),
  });

  const mockSupabase = {
    from: vi.fn().mockReturnValue({
      select: mockSelect,
      update: mockUpdate,
    }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      mockSupabase
    );
    process.env.GOOGLE_CLIENT_ID = "test-client-id";
    process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";
  });

  describe("getGmailClient", () => {
    it("throws when no refresh token found for user", async () => {
      const noTokenSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: "No rows found" },
              }),
            }),
          }),
        }),
      };
      (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
        noTokenSupabase
      );

      await expect(getGmailClient("user-no-token")).rejects.toThrow(
        /no.*token/i
      );
    });

    it("creates OAuth2Client with decrypted refresh token", async () => {
      await getGmailClient("user-123");

      expect(decrypt).toHaveBeenCalledWith("encrypted_test-refresh-token");
      expect(mockOAuth2Constructor).toHaveBeenCalledWith(
        "test-client-id",
        "test-client-secret"
      );
      expect(mockOAuth2Client.setCredentials).toHaveBeenCalledWith({
        refresh_token: "test-refresh-token",
      });
    });
  });

  describe("createGmailDraft", () => {
    it("calls gmail.users.drafts.create with raw MIME message and returns draft ID", async () => {
      mockDraftsCreate.mockResolvedValue({
        data: { id: "draft-abc", message: { id: "msg-123" } },
      });

      const draftId = await createGmailDraft(
        "user-123",
        "recipient@example.com",
        "Test Subject",
        "<p>Hello</p>"
      );

      expect(buildMimeMessage).toHaveBeenCalledWith(
        "recipient@example.com",
        "Test Subject",
        "<p>Hello</p>"
      );
      expect(mockDraftsCreate).toHaveBeenCalledWith({
        userId: "me",
        requestBody: {
          message: { raw: "base64url_encoded_mime_message" },
        },
      });
      expect(draftId).toBe("draft-abc");
    });
  });

  describe("sendGmailDraft", () => {
    it("calls gmail.users.drafts.send with draft ID", async () => {
      mockDraftsSend.mockResolvedValue({
        data: { id: "msg-sent", threadId: "thread-1" },
      });

      await sendGmailDraft("user-123", "draft-abc");

      expect(mockDraftsSend).toHaveBeenCalledWith({
        userId: "me",
        requestBody: { id: "draft-abc" },
      });
    });
  });

  describe("deleteGmailDraft", () => {
    it("calls gmail.users.drafts.delete with draft ID", async () => {
      mockDraftsDelete.mockResolvedValue({});

      await deleteGmailDraft("user-123", "draft-abc");

      expect(mockDraftsDelete).toHaveBeenCalledWith({
        userId: "me",
        id: "draft-abc",
      });
    });
  });

  describe("Token refresh handler", () => {
    it("persists new encrypted tokens to oauth_tokens table on token event", async () => {
      await getGmailClient("user-123");

      // Get the token handler registered via on("tokens")
      expect(mockOAuth2Client.on).toHaveBeenCalledWith(
        "tokens",
        expect.any(Function)
      );

      // Simulate the token event
      const tokenHandler = mockOAuth2Client.on.mock.calls.find(
        (call: unknown[]) => call[0] === "tokens"
      )?.[1];
      expect(tokenHandler).toBeDefined();

      await tokenHandler({
        access_token: "new-access-token",
        refresh_token: "new-refresh-token",
        expiry_date: Date.now() + 3600 * 1000,
      });

      expect(encrypt).toHaveBeenCalledWith("new-access-token");
      expect(encrypt).toHaveBeenCalledWith("new-refresh-token");
      expect(mockSupabase.from).toHaveBeenCalledWith("oauth_tokens");
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          google_access_token_encrypted: "encrypted_new-access-token",
          google_refresh_token_encrypted: "encrypted_new-refresh-token",
        })
      );
    });
  });
});
