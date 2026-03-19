import { z } from "zod";

export const profileSchema = z.object({
  personality_profile: z.string().min(1, "Required").max(2000),
  business_objectives: z.string().max(2000).optional(),
  projects: z.string().max(2000).optional(),
});

export const apiKeySchema = z.object({
  zai_api_key: z.string().min(1, "API key is required"),
});

export const scheduleSchema = z.object({
  interval_hours: z.number().min(1).max(24),
  start_hour: z.number().min(0).max(23),
  end_hour: z.number().min(0).max(23),
  timezone: z.string().min(1, "Timezone is required"),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
export type ApiKeyFormValues = z.infer<typeof apiKeySchema>;
export type ScheduleFormValues = z.infer<typeof scheduleSchema>;
