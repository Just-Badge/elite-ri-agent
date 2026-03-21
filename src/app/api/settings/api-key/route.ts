import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/crypto/encryption";
import { apiKeySchema } from "@/lib/validations/settings";
import { ZodError } from "zod";
import { apiUnauthorized, apiError, apiBadRequest, apiValidationError } from "@/lib/api/errors";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiUnauthorized();

  const { data } = await supabase
    .from("user_settings")
    .select("zai_api_key_encrypted")
    .eq("user_id", user.id)
    .single();

  return NextResponse.json({
    hasKey: !!data?.zai_api_key_encrypted,
  });
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiUnauthorized();

  try {
    const body = await request.json();
    const parsed = apiKeySchema.parse(body);

    // Encrypt API key before storage
    const encryptedKey = encrypt(parsed.zai_api_key);

    const { error } = await supabase.from("user_settings").upsert(
      {
        user_id: user.id,
        zai_api_key_encrypted: encryptedKey,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (error) return apiError(error.message, 500);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof ZodError) {
      return apiValidationError(err);
    }
    return apiBadRequest("Invalid request body");
  }
}

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiUnauthorized();

  const { error } = await supabase
    .from("user_settings")
    .update({
      zai_api_key_encrypted: null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  if (error) return apiError(error.message, 500);
  return NextResponse.json({ success: true });
}
