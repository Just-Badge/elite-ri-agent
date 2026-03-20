import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { OnboardingStatus } from "@/lib/onboarding";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check user settings for Granola token and profile
  const { data: settings, error: settingsError } = await supabase
    .from("user_settings")
    .select(
      "granola_refresh_token_encrypted, granola_token_status, personality_profile"
    )
    .eq("user_id", user.id)
    .single();

  if (settingsError && settingsError.code !== "PGRST116") {
    return NextResponse.json(
      { error: settingsError.message },
      { status: 500 }
    );
  }

  // Check contacts count
  const { count: contactCount, error: contactError } = await supabase
    .from("contacts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (contactError) {
    return NextResponse.json(
      { error: contactError.message },
      { status: 500 }
    );
  }

  const has_granola =
    !!settings?.granola_refresh_token_encrypted &&
    settings?.granola_token_status === "active";
  const has_profile = !!(
    settings?.personality_profile &&
    settings.personality_profile.trim().length > 0
  );
  const has_contacts = (contactCount ?? 0) > 0;
  const is_complete = has_granola && has_profile && has_contacts;
  const completed_steps = [has_granola, has_profile, has_contacts].filter(
    Boolean
  ).length;

  const status: OnboardingStatus = {
    has_granola,
    has_contacts,
    has_profile,
    is_complete,
    completed_steps,
    total_steps: 3,
  };

  return NextResponse.json({ data: status });
}
