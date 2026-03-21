/**
 * Granola MCP Adapter
 *
 * Connects to mcp.granola.ai via Streamable HTTP transport using the user's
 * OAuth access token. Calls list_meetings, get_meeting_transcript tools.
 *
 * The MCP server returns XML-formatted meeting data with participant info
 * including names, emails, and sometimes companies.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { GranolaAdapter, GranolaMeeting, GranolaParticipant } from "./adapter";

const GRANOLA_MCP_URL = "https://mcp.granola.ai";

/**
 * Parse participant string from MCP response.
 *
 * Format: "Name (note creator) from Company <email>, Name2 <email2>"
 * Each participant is comma-separated with pattern:
 *   [Name] [optional: (note creator)] [optional: from Company] <email>
 */
export function parseParticipants(raw: string): GranolaParticipant[] {
  if (!raw.trim()) return [];

  // Split by comma, but be careful with commas inside angle brackets
  const parts: string[] = [];
  let current = "";
  let inAngle = false;

  for (const char of raw) {
    if (char === "<") inAngle = true;
    if (char === ">") inAngle = false;
    if (char === "," && !inAngle) {
      parts.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim()) parts.push(current.trim());

  return parts.map((part) => {
    const participant: GranolaParticipant = { name: "" };

    // Extract email from <email>
    const emailMatch = part.match(/<([^>]+)>/);
    if (emailMatch) {
      participant.email = emailMatch[1];
      part = part.replace(/<[^>]+>/, "").trim();
    }

    // Remove "(note creator)" marker
    part = part.replace(/\(note creator\)/i, "").trim();

    // Extract company from "from Company"
    const fromMatch = part.match(/\bfrom\s+(.+)$/i);
    if (fromMatch) {
      participant.company = fromMatch[1].trim();
      part = part.replace(/\bfrom\s+.+$/i, "").trim();
    }

    participant.name = part.trim();

    return participant;
  }).filter((p) => p.name.length > 0);
}

/**
 * Parse the XML meeting list from MCP list_meetings response.
 */
export function parseMeetingsXml(xml: string): GranolaMeeting[] {
  const meetings: GranolaMeeting[] = [];

  // Match each <meeting> element
  const meetingRegex = /<meeting\s+id="([^"]+)"\s+title="([^"]+)"\s+date="([^"]+)"[^>]*>([\s\S]*?)<\/meeting>/g;

  let match: RegExpExecArray | null;
  while ((match = meetingRegex.exec(xml)) !== null) {
    const [, id, title, date, body] = match;

    // Extract participants
    const participantsMatch = body.match(/<known_participants>\s*([\s\S]*?)\s*<\/known_participants>/);
    const participantsRaw = participantsMatch ? participantsMatch[1].trim() : "";
    const participants = parseParticipants(participantsRaw);

    meetings.push({
      id,
      title: decodeXmlEntities(title),
      date,
      participants,
    });
  }

  return meetings;
}

function decodeXmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export class GranolaMcpAdapter implements GranolaAdapter {
  private client: Client;
  private transport: StreamableHTTPClientTransport;
  private connected = false;

  constructor(private accessToken: string) {
    this.client = new Client({
      name: "elite-ri-agent",
      version: "1.0.0",
    });

    this.transport = new StreamableHTTPClientTransport(
      new URL(GRANOLA_MCP_URL),
      {
        requestInit: {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        },
      }
    );
  }

  private async ensureConnected(): Promise<void> {
    if (!this.connected) {
      await this.client.connect(this.transport);
      this.connected = true;
    }
  }

  async listMeetings(): Promise<GranolaMeeting[]> {
    await this.ensureConnected();

    const result = await this.client.callTool({
      name: "list_meetings",
      arguments: {
        time_range: "custom",
        custom_start: "2025-01-01",
        custom_end: new Date().toISOString().split("T")[0],
      },
    });

    // MCP tool results come as content array with text parts
    const textContent = Array.isArray(result.content)
      ? result.content
          .filter((c): c is { type: "text"; text: string } => c.type === "text")
          .map((c) => c.text)
          .join("")
      : "";

    return parseMeetingsXml(textContent);
  }

  async getTranscript(meetingId: string): Promise<string> {
    await this.ensureConnected();

    const result = await this.client.callTool({
      name: "get_meeting_transcript",
      arguments: { meeting_id: meetingId },
    });

    const textContent = Array.isArray(result.content)
      ? result.content
          .filter((c): c is { type: "text"; text: string } => c.type === "text")
          .map((c) => c.text)
          .join("")
      : "";

    return textContent;
  }

  async close(): Promise<void> {
    if (this.connected) {
      await this.client.close();
      this.connected = false;
    }
  }
}
