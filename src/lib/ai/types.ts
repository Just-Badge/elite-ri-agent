import { z } from "zod";

export const extractedContactSchema = z.object({
  name: z.string(),
  email: z.string().email().optional().nullable(),
  company: z.string().optional().nullable(),
  role: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  category: z
    .enum([
      "accelerators",
      "advisors",
      "clients",
      "investors",
      "networking",
      "partners",
      "potential-team",
      "team",
    ])
    .optional()
    .nullable(),
  background: z.string().optional().nullable(),
  relationship_context: z
    .object({
      why: z.string().optional().nullable(),
      what: z.string().optional().nullable(),
      mutual_value: z.string().optional().nullable(),
    })
    .optional()
    .nullable(),
  action_items: z.array(z.string()).optional().nullable(),
  notes: z.string().optional().nullable(),
  confidence: z.enum(["high", "medium", "low"]),
});

export const contactExtractionSchema = z.object({
  contacts: z.array(extractedContactSchema),
  meeting_summary: z.string(),
});

export type ExtractedContact = z.infer<typeof extractedContactSchema>;
export type ExtractionResult = z.infer<typeof contactExtractionSchema>;
