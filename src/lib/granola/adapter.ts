/**
 * Granola Adapter Interface
 *
 * Abstracts meeting data access. Currently implemented via MCP client
 * connecting to mcp.granola.ai. Granola REST API is enterprise-only.
 */

export interface GranolaParticipant {
  name: string;
  email?: string;
  company?: string;
}

export interface GranolaMeeting {
  id: string;
  title: string;
  date: string; // Human-readable date from MCP, e.g. "Oct 13, 2025 10:30 AM"
  participants: GranolaParticipant[];
}

export interface GranolaAdapter {
  /** List all meetings within the configured time range */
  listMeetings(): Promise<GranolaMeeting[]>;

  /** Get full transcript text for a specific meeting */
  getTranscript(meetingId: string): Promise<string>;

  /** Clean up resources (close MCP connection) */
  close(): Promise<void>;
}
