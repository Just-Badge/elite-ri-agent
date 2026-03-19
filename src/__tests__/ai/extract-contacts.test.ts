import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock OpenAI
const mockCreate = vi.fn();
const mockOpenAIConstructor = vi.fn().mockImplementation(() => ({
  chat: {
    completions: {
      create: mockCreate,
    },
  },
}));

vi.mock("openai", () => ({
  default: mockOpenAIConstructor,
}));

import { extractContactsFromTranscript } from "@/lib/ai/extract-contacts";

const MOCK_AI_RESPONSE = {
  contacts: [
    {
      name: "Dave Brown",
      email: "dave@example.com",
      company: "Tech Advisors Inc",
      role: "Strategic Advisor",
      location: "Remote",
      category: "advisors" as const,
      background: "Executive with 40 years in media and technology",
      relationship_context: {
        why: "Strategic advisory relationship",
        what: "Go-to-market strategy and investor introductions",
        mutual_value: "Equity participation for strategic guidance",
      },
      action_items: [
        "Schedule monthly check-in",
        "Track investor introductions",
      ],
      notes: "Cancer survivor, strong resilience perspective",
      confidence: "high" as const,
    },
    {
      name: "Sarah",
      email: null,
      company: null,
      role: "Unknown",
      location: null,
      category: null,
      background: null,
      relationship_context: null,
      action_items: null,
      notes: "Briefly mentioned in conversation",
      confidence: "low" as const,
    },
  ],
  meeting_summary:
    "Strategic advisory meeting discussing go-to-market strategy, investor network, and FAST agreement formalization.",
};

describe("AI Contact Extraction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify(MOCK_AI_RESPONSE),
          },
        },
      ],
    });
  });

  it("creates OpenAI client with baseURL https://api.z.ai/api/paas/v4 and provided API key", async () => {
    await extractContactsFromTranscript(
      "test-api-key",
      "Test transcript",
      "Test Meeting",
      []
    );

    expect(mockOpenAIConstructor).toHaveBeenCalledWith({
      apiKey: "test-api-key",
      baseURL: "https://api.z.ai/api/paas/v4",
    });
  });

  it("sends system prompt with extraction instructions and existing contacts for dedup", async () => {
    const existingContacts = [
      { name: "Alice", email: "alice@co.com" },
      { name: "Bob" },
    ];

    await extractContactsFromTranscript(
      "test-api-key",
      "Test transcript",
      "Test Meeting",
      existingContacts
    );

    const callArgs = mockCreate.mock.calls[0][0];
    const systemMessage = callArgs.messages.find(
      (m: { role: string }) => m.role === "system"
    );

    // System prompt should contain extraction instructions
    expect(systemMessage.content).toContain("Extract contact information");
    // Should reference existing contacts for dedup
    expect(systemMessage.content).toContain("Alice");
    expect(systemMessage.content).toContain("alice@co.com");
    expect(systemMessage.content).toContain("Bob");
  });

  it("passes transcript as user message content with meeting title", async () => {
    await extractContactsFromTranscript(
      "test-api-key",
      "Hello Dave, nice to meet you.",
      "Strategy Discussion",
      []
    );

    const callArgs = mockCreate.mock.calls[0][0];
    const userMessage = callArgs.messages.find(
      (m: { role: string }) => m.role === "user"
    );

    expect(userMessage.content).toContain("Hello Dave, nice to meet you.");
    expect(userMessage.content).toContain("Strategy Discussion");
  });

  it('uses model "glm-5" with response_format json_object and temperature 0.3', async () => {
    await extractContactsFromTranscript(
      "test-api-key",
      "Test transcript",
      "Test Meeting",
      []
    );

    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.model).toBe("glm-5");
    expect(callArgs.response_format).toEqual({ type: "json_object" });
    expect(callArgs.temperature).toBe(0.3);
  });

  it("parses and validates response with Zod schema", async () => {
    const result = await extractContactsFromTranscript(
      "test-api-key",
      "Test transcript",
      "Test Meeting",
      []
    );

    // Result should match the mock AI response structure
    expect(result.contacts).toHaveLength(2);
    expect(result.contacts[0].name).toBe("Dave Brown");
    expect(result.contacts[0].email).toBe("dave@example.com");
  });

  it("returns contacts with confidence field (high/medium/low)", async () => {
    const result = await extractContactsFromTranscript(
      "test-api-key",
      "Test transcript",
      "Test Meeting",
      []
    );

    expect(result.contacts[0].confidence).toBe("high");
    expect(result.contacts[1].confidence).toBe("low");
  });

  it("returns meeting_summary field", async () => {
    const result = await extractContactsFromTranscript(
      "test-api-key",
      "Test transcript",
      "Test Meeting",
      []
    );

    expect(result.meeting_summary).toContain("Strategic advisory meeting");
  });

  it("throws on empty/null AI response", async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: null,
          },
        },
      ],
    });

    await expect(
      extractContactsFromTranscript(
        "test-api-key",
        "Test transcript",
        "Test Meeting",
        []
      )
    ).rejects.toThrow("No AI response content");
  });
});
