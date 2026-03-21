import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encrypt } from "@/lib/crypto/encryption";
import {
  discoverOAuthServer,
  registerClient,
  generatePKCE,
  buildAuthorizationUrl,
} from "@/lib/granola/oauth";
import crypto from "crypto";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || "https://ri.elite.community";
    const redirectUri = `${appUrl}/api/granola/callback`;

    // 1. Discover OAuth endpoints
    const metadata = await discoverOAuthServer();

    // 2. Check if we already have a registered client for this user
    const adminClient = createAdminClient();
    const { data: settings } = await adminClient
      .from("user_settings")
      .select("granola_oauth_client_id, granola_oauth_client_secret")
      .eq("user_id", user.id)
      .single();

    let clientId = settings?.granola_oauth_client_id;
    let clientSecret = settings?.granola_oauth_client_secret;

    // 3. Register client via DCR if needed
    if (!clientId) {
      const dcr = await registerClient(
        metadata.registration_endpoint,
        redirectUri
      );
      clientId = dcr.client_id;
      clientSecret = dcr.client_secret || null;

      // Store the client credentials
      await adminClient
        .from("user_settings")
        .update({
          granola_oauth_client_id: clientId,
          granola_oauth_client_secret: clientSecret,
        })
        .eq("user_id", user.id);
    }

    // 4. Generate PKCE and state
    const { codeVerifier, codeChallenge } = generatePKCE();
    const state = crypto.randomBytes(16).toString("hex");

    // Store PKCE verifier and state in encrypted cookie
    const cookieStore = await cookies();
    cookieStore.set("granola_oauth_state", state, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 600, // 10 minutes
      path: "/",
    });
    cookieStore.set("granola_code_verifier", encrypt(codeVerifier), {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });

    // 5. Build authorization URL and redirect
    const authUrl = buildAuthorizationUrl(
      metadata.authorization_endpoint,
      clientId,
      redirectUri,
      codeChallenge,
      state
    );

    return NextResponse.redirect(authUrl);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "OAuth initialization failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
