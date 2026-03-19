import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { ZodError } from "zod";

const toggleActionItemSchema = z.object({
  actionItemId: z.string(),
  completed: z.boolean(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(
  request: NextRequest,
  _context: RouteContext
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { actionItemId, completed } = toggleActionItemSchema.parse(body);

    const { error } = await supabase
      .from("action_items")
      .update({ completed, updated_at: new Date().toISOString() })
      .eq("id", actionItemId)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

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
