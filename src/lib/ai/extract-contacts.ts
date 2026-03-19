import OpenAI from "openai";
import { contactExtractionSchema, type ExtractionResult } from "@/lib/ai/types";

/**
 * Extract structured contact information from a meeting transcript using
 * z.ai GLM-5 via the OpenAI SDK.
 *
 * @param apiKey - z.ai API key
 * @param transcript - Meeting transcript text
 * @param meetingTitle - Title of the meeting for context
 * @param existingContacts - Known contacts for deduplication awareness
 * @returns Parsed and validated extraction result with contacts and meeting summary
 */
export async function extractContactsFromTranscript(
  apiKey: string,
  transcript: string,
  meetingTitle: string,
  existingContacts: { name: string; email?: string }[]
): Promise<ExtractionResult> {
  const client = new OpenAI({
    apiKey,
    baseURL: "https://api.z.ai/api/paas/v4",
  });

  const existingContactsList = existingContacts.length > 0
    ? existingContacts
        .map((c) => `- ${c.name}${c.email ? ` (${c.email})` : ""}`)
        .join("\n")
    : "None";

  const systemPrompt = `You are a relationship intelligence assistant. Extract contact information from meeting transcripts.

For each person mentioned in the meeting (other than the meeting owner):
- Extract their name, email (if mentioned), company, role, location
- Suggest a category from: accelerators, advisors, clients, investors, networking, partners, potential-team, team
- Write a brief background summary based on what was discussed
- Determine relationship context: why they connected, what was discussed, mutual value
- Extract action items assigned to or about this person
- Write brief notes for memory jogging
- Assign a confidence level:
  - "high" if name AND email are clearly stated
  - "medium" if name is clear but email is uncertain or missing
  - "low" if identity is ambiguous (e.g., only a first name with no other context)

EXISTING CONTACTS (for deduplication -- match by email if possible, by name as secondary):
${existingContactsList}

If a person matches an existing contact, still include them but note the match. Do NOT create duplicate entries for people already in the list.

Return valid JSON with this exact structure:
{
  "contacts": [
    {
      "name": "Full Name",
      "email": "email@example.com or null",
      "company": "Company Name or null",
      "role": "Role/Title or null",
      "location": "Location or null",
      "category": "one of the categories or null",
      "background": "Brief background summary or null",
      "relationship_context": {
        "why": "Why they connected or null",
        "what": "What was discussed or null",
        "mutual_value": "Mutual value proposition or null"
      },
      "action_items": ["action item 1", "action item 2"],
      "notes": "Brief notes or null",
      "confidence": "high|medium|low"
    }
  ],
  "meeting_summary": "2-3 sentence overview of the meeting"
}`;

  const response = await client.chat.completions.create({
    model: "glm-5",
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: `Meeting: "${meetingTitle}"\n\nTranscript:\n${transcript}`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
    max_tokens: 4096,
  });

  const content = response.choices[0]?.message?.content;

  if (!content) {
    throw new Error("No AI response content");
  }

  return contactExtractionSchema.parse(JSON.parse(content));
}
