import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { scheduleSchema } from "@/lib/validations/settings";
import { ZodError } from "zod";

const SCHEDULE_DEFAULTS = {
  interval_hours: 2,
  start_hour: 8,
  end_hour: 18,
  timezone: "America/Los_Angeles",
};

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("user_settings")
    .select("processing_schedule")
    .eq("user_id", user.id)
    .single();

  return NextResponse.json({
    data: data?.processing_schedule || SCHEDULE_DEFAULTS,
  });
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const parsed = scheduleSchema.parse(body);

    // Additional validation: end_hour must be greater than start_hour
    if (parsed.end_hour <= parsed.start_hour) {
      return NextResponse.json(
        { error: "End hour must be greater than start hour" },
        { status: 400 }
      );
    }

    // Validate timezone is a valid IANA timezone
    const validTimezones = Intl.supportedValuesOf("timeZone");
    if (!validTimezones.includes(parsed.timezone)) {
      return NextResponse.json(
        { error: "Invalid timezone" },
        { status: 400 }
      );
    }

    const { error } = await supabase.from("user_settings").upsert(
      {
        user_id: user.id,
        processing_schedule: parsed,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation failed", issues: err.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
