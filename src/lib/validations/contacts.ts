import { z } from "zod";

export const CONTACT_CATEGORIES = [
  "accelerators",
  "advisors",
  "clients",
  "investors",
  "networking",
  "partners",
  "potential-team",
  "team",
] as const;

export const contactSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  email: z.string().email().optional().or(z.literal("")),
  company: z.string().max(200).optional(),
  role: z.string().max(200).optional(),
  location: z.string().max(200).optional(),
  connected_via: z.string().max(500).optional(),
  category: z.enum(CONTACT_CATEGORIES).optional(),
  background: z.string().max(5000).optional(),
  relationship_context: z
    .object({
      why: z.string().optional(),
      what: z.string().optional(),
      mutual_value: z.string().optional(),
    })
    .optional(),
  status: z.enum(["active", "not_pursuing", "dormant"]).default("active"),
  outreach_frequency_days: z.number().int().min(1).max(365).default(30),
  notes: z.string().max(10000).optional(),
});

export const contactUpdateSchema = contactSchema.partial().extend({
  id: z.string().uuid(),
});

export type ContactFormValues = z.infer<typeof contactSchema>;
export type ContactUpdateValues = z.infer<typeof contactUpdateSchema>;
