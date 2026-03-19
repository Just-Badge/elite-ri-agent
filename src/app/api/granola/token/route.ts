import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/crypto/encryption";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { refresh_token, client_id } = body;

    if (!refresh_token || !client_id) {
      return NextResponse.json(
        { error: "refresh_token and client_id are required" },
        { status: 400 }
      );
    }

    const encryptedToken = encrypt(refresh_token);

    const { error } = await supabase
      .from("user_settings")
      .update({
        granola_refresh_token_encrypted: encryptedToken,
        granola_client_id: client_id,
        granola_token_status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json(
        { error: "Failed to store token", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("user_settings")
    .select("granola_token_status, granola_token_expiry")
    .eq("user_id", user.id)
    .single();

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    status: data?.granola_token_status || null,
    expiry: data?.granola_token_expiry || null,
  });
}
