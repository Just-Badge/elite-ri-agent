import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encrypt, decrypt } from "@/lib/crypto/encryption";
import { discoverOAuthServer, exchangeCodeForToken } from "@/lib/granola/oauth";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      new URL("/login?error=unauthorized", request.url)
    );
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(
        `/settings/integrations?granola_error=${encodeURIComponent(error)}`,
        request.url
      )
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL(
        "/settings/integrations?granola_error=missing_code_or_state",
        request.url
      )
    );
  }

  try {
    const cookieStore = await cookies();

    // Verify state
    const storedState = cookieStore.get("granola_oauth_state")?.value;
    if (!storedState || storedState !== state) {
      return NextResponse.redirect(
        new URL(
          "/settings/integrations?granola_error=state_mismatch",
          request.url
        )
      );
    }

    // Get PKCE verifier
    const encryptedVerifier = cookieStore.get("granola_code_verifier")?.value;
    if (!encryptedVerifier) {
      return NextResponse.redirect(
        new URL(
          "/settings/integrations?granola_error=missing_verifier",
          request.url
        )
      );
    }
    const codeVerifier = decrypt(encryptedVerifier);

    // Get client credentials
    const adminClient = createAdminClient();
    const { data: settings } = await adminClient
      .from("user_settings")
      .select("granola_oauth_client_id, granola_oauth_client_secret")
      .eq("user_id", user.id)
      .single();

    if (!settings?.granola_oauth_client_id) {
      return NextResponse.redirect(
        new URL(
          "/settings/integrations?granola_error=no_client_registered",
          request.url
        )
      );
    }

    // Exchange code for token
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || "https://ri.elite.community";
    const redirectUri = `${appUrl}/api/granola/callback`;

    const metadata = await discoverOAuthServer();
    const tokenResponse = await exchangeCodeForToken(
      metadata.token_endpoint,
      code,
      redirectUri,
      settings.granola_oauth_client_id,
      settings.granola_oauth_client_secret,
      codeVerifier
    );

    // Store encrypted tokens
    const updateData: Record<string, string | null> = {
      granola_access_token_encrypted: encrypt(tokenResponse.access_token),
      granola_token_status: "active",
      updated_at: new Date().toISOString(),
    };

    if (tokenResponse.refresh_token) {
      updateData.granola_refresh_token_encrypted = encrypt(
        tokenResponse.refresh_token
      );
    }

    await adminClient
      .from("user_settings")
      .update(updateData)
      .eq("user_id", user.id);

    // Clear OAuth cookies
    cookieStore.delete("granola_oauth_state");
    cookieStore.delete("granola_code_verifier");

    // Redirect back to settings with success
    return NextResponse.redirect(
      new URL("/settings/integrations?granola_connected=true", request.url)
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Token exchange failed";
    return NextResponse.redirect(
      new URL(
        `/settings/integrations?granola_error=${encodeURIComponent(message)}`,
        request.url
      )
    );
  }
}
