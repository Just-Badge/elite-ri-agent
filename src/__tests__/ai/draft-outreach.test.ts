import { describe, it, expect, vi, beforeEach } from "vitest";

// Use vi.hoisted to ensure mock variables are available when vi.mock is hoisted
const { mockCreate, mockOpenAIConstructor } = vi.hoisted(() => {
  const mockCreate = vi.fn();
  const mockOpenAIConstructor = vi.fn().mockImplementation(function (this: unknown) {
    (this as Record<string, unknown>).chat = {
      completions: {
        create: mockCreate,
      },
    };
  });
  return { mockCreate, mockOpenAIConstructor };
});

vi.mock("openai", () => ({
  default: mockOpenAIConstructor,
}));

import {
  generateOutreachDraft,
  type DraftContext,
} from "@/lib/ai/draft-outreach";

const MOCK_DRAFT_RESPONSE = {
  subject: "Great catching up at the summit",
  body: "<p>Hi Dave,</p><p>It was wonderful to reconnect at the AI Summit last week.</p><p>Looking forward to continuing our conversation about the partnership.</p><p>Best,</p>",
  rationale:
    "Contact is due for follow-up after recent meeting. Referenced specific meeting context and pending action item.",
};

function buildMockContext(
  overrides: Partial<DraftContext> = {}
): DraftContext {
  return {
    userProfile: {
      personality_profile:
        "Professional but warm. Direct communicator. Values authenticity.",
      business_objectives: "Scale SaaS product to 1000 customers",
      projects: "AI-powered CRM, Mobile app launch",
    },
    contact: {
      name: "Dave Brown",
      email: "dave@example.com",
      category: "advisors",
      background: "Executive with 40 years in media and technology",
      relationship_context: {
        why: "Strategic advisory relationship",
        what: "Go-to-market strategy",
        mutual_value: "Equity participation for strategic guidance",
      },
      notes: "Cancer survivor, strong resilience perspective",
    },
    recentMeetings: [
      {
        title: "AI Summit Follow-up",
        summary: "Discussed partnership opportunities and timeline",
        date: "2026-03-15",
      },
      {
        title: "Quarterly Review",
        summary: "Reviewed Q1 metrics and GTM strategy",
        date: "2026-03-01",
      },
    ],
    actionItems: [
      { text: "Send partnership proposal draft", completed: false },
      { text: "Schedule board meeting", completed: true },
    ],
    openBrainContext:
      "KNOWLEDGE BASE NOTES:\n- Dave mentioned interest in blockchain applications\n- Dave's company exploring AI partnerships",
    ...overrides,
  };
}

describe("AI Outreach Draft Generation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify(MOCK_DRAFT_RESPONSE),
          },
        },
      ],
    });
  });

  it("Test 1: calls OpenAI with model glm-5 and baseURL https://api.z.ai/api/paas/v4", async () => {
    const context = buildMockContext();
    await generateOutreachDraft("test-api-key", context);

    expect(mockOpenAIConstructor).toHaveBeenCalledWith({
      apiKey: "test-api-key",
      baseURL: "https://api.z.ai/api/paas/v4",
    });

    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.model).toBe("glm-5");
  });

  it("Test 2: includes user personality profile in system prompt", async () => {
    const context = buildMockContext();
    await generateOutreachDraft("test-api-key", context);

    const callArgs = mockCreate.mock.calls[0][0];
    const systemMessage = callArgs.messages.find(
      (m: { role: string }) => m.role === "system"
    );

    expect(systemMessage.content).toContain(
      "Professional but warm. Direct communicator. Values authenticity."
    );
    expect(systemMessage.content).toContain(
      "Scale SaaS product to 1000 customers"
    );
    expect(systemMessage.content).toContain(
      "AI-powered CRM, Mobile app launch"
    );
  });

  it("Test 3: includes contact name, email, category, background, relationship_context in user prompt", async () => {
    const context = buildMockContext();
    await generateOutreachDraft("test-api-key", context);

    const callArgs = mockCreate.mock.calls[0][0];
    const userMessage = callArgs.messages.find(
      (m: { role: string }) => m.role === "user"
    );

    expect(userMessage.content).toContain("Dave Brown");
    expect(userMessage.content).toContain("dave@example.com");
    expect(userMessage.content).toContain("advisors");
    expect(userMessage.content).toContain(
      "Executive with 40 years in media and technology"
    );
    expect(userMessage.content).toContain("Strategic advisory relationship");
    expect(userMessage.content).toContain("Go-to-market strategy");
    expect(userMessage.content).toContain(
      "Equity participation for strategic guidance"
    );
  });

  it("Test 4: includes recent meeting summaries in user prompt", async () => {
    const context = buildMockContext();
    await generateOutreachDraft("test-api-key", context);

    const callArgs = mockCreate.mock.calls[0][0];
    const userMessage = callArgs.messages.find(
      (m: { role: string }) => m.role === "user"
    );

    expect(userMessage.content).toContain("AI Summit Follow-up");
    expect(userMessage.content).toContain(
      "Discussed partnership opportunities and timeline"
    );
    expect(userMessage.content).toContain("Quarterly Review");
    expect(userMessage.content).toContain("2026-03-15");
  });

  it("Test 5: includes action items in user prompt", async () => {
    const context = buildMockContext();
    await generateOutreachDraft("test-api-key", context);

    const callArgs = mockCreate.mock.calls[0][0];
    const userMessage = callArgs.messages.find(
      (m: { role: string }) => m.role === "user"
    );

    expect(userMessage.content).toContain("Send partnership proposal draft");
    expect(userMessage.content).toContain("Schedule board meeting");
    expect(userMessage.content).toContain("[PENDING]");
    expect(userMessage.content).toContain("[DONE]");
  });

  it("Test 6: includes Open Brain context when provided (non-empty string)", async () => {
    const context = buildMockContext();
    await generateOutreachDraft("test-api-key", context);

    const callArgs = mockCreate.mock.calls[0][0];
    const userMessage = callArgs.messages.find(
      (m: { role: string }) => m.role === "user"
    );

    expect(userMessage.content).toContain("SUPPLEMENTAL KNOWLEDGE");
    expect(userMessage.content).toContain(
      "Dave mentioned interest in blockchain applications"
    );
  });

  it("Test 7: omits Open Brain section when context is empty string", async () => {
    const context = buildMockContext({ openBrainContext: "" });
    await generateOutreachDraft("test-api-key", context);

    const callArgs = mockCreate.mock.calls[0][0];
    const userMessage = callArgs.messages.find(
      (m: { role: string }) => m.role === "user"
    );

    expect(userMessage.content).not.toContain("SUPPLEMENTAL KNOWLEDGE");
  });

  it("Test 8: returns parsed JSON with subject, body, rationale fields", async () => {
    const context = buildMockContext();
    const result = await generateOutreachDraft("test-api-key", context);

    expect(result).toEqual({
      subject: "Great catching up at the summit",
      body: expect.stringContaining("<p>Hi Dave,</p>"),
      rationale: expect.stringContaining("Contact is due for follow-up"),
    });
  });

  it("Test 9: uses response_format json_object and temperature 0.7", async () => {
    const context = buildMockContext();
    await generateOutreachDraft("test-api-key", context);

    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.response_format).toEqual({ type: "json_object" });
    expect(callArgs.temperature).toBe(0.7);
  });

  it("Test 10: throws when AI returns no content", async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: null,
          },
        },
      ],
    });

    const context = buildMockContext();

    await expect(
      generateOutreachDraft("test-api-key", context)
    ).rejects.toThrow();
  });
});
