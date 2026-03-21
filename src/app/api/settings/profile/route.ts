import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { profileSchema } from "@/lib/validations/settings";
import { ZodError } from "zod";
import { apiUnauthorized, apiError, apiBadRequest, apiValidationError } from "@/lib/api/errors";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiUnauthorized();

  const { data, error } = await supabase
    .from("user_settings")
    .select("personality_profile, business_objectives, projects")
    .eq("user_id", user.id)
    .single();

  if (error && error.code !== "PGRST116") {
    return apiError(error.message, 500);
  }

  return NextResponse.json({
    data: data || {
      personality_profile: "",
      business_objectives: "",
      projects: "",
    },
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
    const parsed = profileSchema.parse(body);

    const { error } = await supabase.from("user_settings").upsert(
      {
        user_id: user.id,
        personality_profile: parsed.personality_profile,
        business_objectives: parsed.business_objectives || null,
        projects: parsed.projects || null,
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
