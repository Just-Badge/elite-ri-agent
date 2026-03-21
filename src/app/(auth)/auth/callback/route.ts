import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/crypto/encryption";
import { createAdminClient } from "@/lib/supabase/admin";
import { appUrl } from "@/lib/url";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // CRITICAL: Get session immediately to capture provider tokens.
      // provider_token and provider_refresh_token are ONLY available
      // right after the code exchange -- Supabase does NOT persist them.
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.provider_token) {
        const userId = session.user.id;

        // Encrypt provider tokens before storage
        const encryptedAccessToken = encrypt(session.provider_token);
        const encryptedRefreshToken = session.provider_refresh_token
          ? encrypt(session.provider_refresh_token)
          : null;

        // Upsert into oauth_tokens table using admin client (bypasses RLS).
        // Admin client is needed because the RLS INSERT policy requires
        // auth.uid() = user_id, but the session may not be fully established
        // in cookie context during callback processing.
        const adminClient = createAdminClient();

        await adminClient
          .from("oauth_tokens")
          .upsert(
            {
              user_id: userId,
              google_access_token_encrypted: encryptedAccessToken,
              google_refresh_token_encrypted: encryptedRefreshToken,
              token_expiry: new Date(
                Date.now() + 3600 * 1000
              ).toISOString(),
              token_status: "active",
              scopes: ["gmail.compose", "gmail.send"],
            },
            { onConflict: "user_id" }
          );
      }

      // Create user_settings row if first login
      const adminClient2 = createAdminClient();
      await adminClient2
        .from("user_settings")
        .upsert(
          { user_id: session!.user.id },
          { onConflict: "user_id" }
        );

      return NextResponse.redirect(appUrl(next));
    }
  }

  // Auth error -- redirect to login with error parameter
  return NextResponse.redirect(appUrl("/login?error=auth_callback_failed"));
}
