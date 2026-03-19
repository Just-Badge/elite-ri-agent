import { z } from "zod";

export const DRAFT_STATUSES = [
  "pending_review",
  "approved",
  "sent",
  "dismissed",
] as const;

export type DraftStatus = (typeof DRAFT_STATUSES)[number];

export const outreachDraftSchema = z.object({
  contact_id: z.string().uuid(),
  subject: z.string().min(1).max(500),
  body: z.string().min(1).max(50000),
  ai_rationale: z.string().optional(),
});

export const draftUpdateSchema = z.object({
  subject: z.string().min(1).max(500).optional(),
  body: z.string().min(1).max(50000).optional(),
});
