import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { contactSchema } from "@/lib/validations/contacts";
import { ZodError } from "zod";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const category = searchParams.get("category");
  const search = searchParams.get("search");

  let query = supabase
    .from("contacts")
    .select("*, action_items(id, text, completed)")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (category) {
    query = query.eq("category", category);
  }

  if (search) {
    query = query.or(
      `name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%,notes.ilike.%${search}%,category.ilike.%${search}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const parsed = contactSchema.parse(body);

    const { data, error } = await supabase
      .from("contacts")
      .insert({
        ...parsed,
        user_id: user.id,
        ai_confidence: "manual",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
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
