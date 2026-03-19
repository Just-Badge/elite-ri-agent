import { createAdminClient } from "@/lib/supabase/admin";
import type { OpenBrainNote } from "./types";

export async function fetchOpenBrainContext(
  userId: string,
  contactName?: string,
  contactEmail?: string
): Promise<string> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("open_brain_notes")
      .select("id, content, category, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      // Graceful fallback -- table may not exist yet
      return "";
    }

    if (!data || data.length === 0) {
      return "";
    }

    let notes = data as OpenBrainNote[];

    // Filter notes mentioning the contact if name or email provided
    if (contactName || contactEmail) {
      notes = notes.filter((note) => {
        const contentLower = note.content.toLowerCase();
        if (contactName && contentLower.includes(contactName.toLowerCase())) {
          return true;
        }
        if (contactEmail && contentLower.includes(contactEmail.toLowerCase())) {
          return true;
        }
        return false;
      });
    }

    if (notes.length === 0) {
      return "";
    }

    return (
      "KNOWLEDGE BASE NOTES:\n" + notes.map((n) => `- ${n.content}`).join("\n")
    );
  } catch {
    // Never throw -- return empty string on any error
    return "";
  }
}
