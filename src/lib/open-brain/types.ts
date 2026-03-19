export interface OpenBrainNote {
  id: string;
  content: string;
  category?: string;
  created_at: string;
}

export interface OpenBrainContext {
  notes: OpenBrainNote[];
  summary: string;
}
