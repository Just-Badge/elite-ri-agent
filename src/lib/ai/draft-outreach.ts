import OpenAI from "openai";

export interface DraftContext {
  userProfile: {
    personality_profile: string;
    business_objectives?: string;
    projects?: string;
  };
  contact: {
    name: string;
    email: string;
    category?: string;
    background?: string;
    relationship_context?: {
      why?: string;
      what?: string;
      mutual_value?: string;
    };
    notes?: string;
  };
  recentMeetings: {
    title: string;
    summary?: string;
    date: string;
  }[];
  actionItems: {
    text: string;
    completed: boolean;
  }[];
  openBrainContext: string;
}

/**
 * Generate a personalized outreach email draft using z.ai GLM-5.
 *
 * Uses a 5-layer context prompt:
 *   1. User personality profile (system)
 *   2. Contact details (user)
 *   3. Recent meetings (user)
 *   4. Action items (user)
 *   5. Open Brain supplemental knowledge (user, optional)
 *
 * @param apiKey - z.ai API key
 * @param context - Layered context for personalization
 * @returns Parsed draft with subject, body (HTML), and rationale
 */
export async function generateOutreachDraft(
  apiKey: string,
  context: DraftContext
): Promise<{ subject: string; body: string; rationale: string }> {
  const client = new OpenAI({
    apiKey,
    baseURL: "https://api.z.ai/api/paas/v4",
  });

  // -- System prompt: user personality + guidelines --
  const systemParts: string[] = [
    "You are an outreach email assistant. Write personalized, warm emails that maintain professional relationships.",
    "",
    "SENDER PROFILE:",
    `Personality: ${context.userProfile.personality_profile}`,
  ];

  if (context.userProfile.business_objectives) {
    systemParts.push(
      `Business Objectives: ${context.userProfile.business_objectives}`
    );
  }
  if (context.userProfile.projects) {
    systemParts.push(`Current Projects: ${context.userProfile.projects}`);
  }

  systemParts.push(
    "",
    "GUIDELINES:",
    "- Write in the sender's authentic voice based on their personality profile",
    "- Reference specific meeting context and shared history",
    "- Keep it brief: 3-5 short paragraphs",
    "- Include a soft call-to-action (not pushy)",
    "- No template phrases like 'I hope this email finds you well'",
    "- Be genuine and relationship-focused",
    "",
    'Return valid JSON with this exact structure: { "subject": "Email subject line", "body": "HTML email body", "rationale": "Brief explanation of why this outreach makes sense now" }'
  );

  const systemPrompt = systemParts.join("\n");

  // -- User prompt: 5 context layers --
  const userParts: string[] = [];

  // Layer 1: Contact
  userParts.push("CONTACT:");
  userParts.push(`Name: ${context.contact.name}`);
  userParts.push(`Email: ${context.contact.email}`);
  if (context.contact.category) {
    userParts.push(`Category: ${context.contact.category}`);
  }
  if (context.contact.background) {
    userParts.push(`Background: ${context.contact.background}`);
  }
  if (context.contact.relationship_context) {
    userParts.push(
      `Relationship Context: ${JSON.stringify(context.contact.relationship_context)}`
    );
  }
  if (context.contact.notes) {
    userParts.push(`Notes: ${context.contact.notes}`);
  }

  // Layer 2: Recent meetings
  userParts.push("");
  userParts.push("RECENT MEETINGS:");
  if (context.recentMeetings.length > 0) {
    for (const meeting of context.recentMeetings) {
      const summaryPart = meeting.summary ? ` - ${meeting.summary}` : "";
      userParts.push(`- [${meeting.date}] ${meeting.title}${summaryPart}`);
    }
  } else {
    userParts.push("No recent meetings");
  }

  // Layer 3: Action items
  userParts.push("");
  userParts.push("ACTION ITEMS:");
  if (context.actionItems.length > 0) {
    for (const item of context.actionItems) {
      const status = item.completed ? "[DONE]" : "[PENDING]";
      userParts.push(`- ${status} ${item.text}`);
    }
  } else {
    userParts.push("No action items");
  }

  // Layer 4: Open Brain context (optional)
  if (context.openBrainContext) {
    userParts.push("");
    userParts.push("SUPPLEMENTAL KNOWLEDGE:");
    userParts.push(context.openBrainContext);
  }

  // Final instruction
  userParts.push("");
  userParts.push(
    "Draft a brief, warm outreach email to maintain this relationship."
  );

  const userPrompt = userParts.join("\n");

  const response = await client.chat.completions.create({
    model: "glm-5",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
    max_tokens: 2048,
  });

  const content = response.choices[0]?.message?.content;

  if (!content) {
    throw new Error("No AI response content for outreach draft");
  }

  const parsed = JSON.parse(content);

  return {
    subject: parsed.subject,
    body: parsed.body,
    rationale: parsed.rationale,
  };
}
