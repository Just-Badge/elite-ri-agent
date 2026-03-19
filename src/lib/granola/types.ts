export interface GranolaTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number; // Unix timestamp in milliseconds
}

export interface GranolaDocument {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  last_viewed_panel?: {
    content: unknown; // ProseMirror JSON
  };
}

export interface GranolaDocumentsResponse {
  docs: GranolaDocument[];
}

export interface GranolaTranscriptSegment {
  source: "microphone" | "system";
  text: string;
  start_timestamp: string;
  end_timestamp: string;
  confidence: number;
}
