import { z } from "zod";

export const oauthTokenSchema = z.object({
  google_access_token_encrypted: z.string(),
  google_refresh_token_encrypted: z.string().nullable(),
  token_expiry: z.string().datetime(),
  scopes: z.array(z.string()),
});

export type OAuthTokenValues = z.infer<typeof oauthTokenSchema>;
