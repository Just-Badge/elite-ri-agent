/**
 * Seed Contact Import Function
 *
 * Reads all `.md` files from the relationships directory, parses them
 * with parseSeedContactMd, and inserts contacts, meetings, contact_meetings,
 * and action_items into Supabase using the admin client (bypasses RLS).
 */

import * as fs from "fs";
import * as path from "path";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseSeedContactMd, ParsedContact } from "@/lib/seed/md-parser";

interface ImportResult {
  contactsImported: number;
  meetingsImported: number;
  actionItemsImported: number;
}

/**
 * Recursively find all .md files in a directory.
 */
function findMdFiles(dir: string): string[] {
  const results: string[] = [];

  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findMdFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      results.push(fullPath);
    }
  }

  return results;
}

/**
 * Import all seed contacts from the relationships directory into Supabase.
 *
 * @param userId - The user_id to assign to all imported records
 * @param relationshipsDir - Path to the relationships/ directory
 * @returns Import statistics
 */
export async function importSeedContacts(
  userId: string,
  relationshipsDir: string
): Promise<ImportResult> {
  const supabase = createAdminClient();
  let contactsImported = 0;
  let meetingsImported = 0;
  let actionItemsImported = 0;

  // Read all category subdirectories
  const categories = fs.readdirSync(relationshipsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  for (const category of categories) {
    const categoryDir = path.join(relationshipsDir, category);
    const mdFiles = findMdFiles(categoryDir);

    for (const filePath of mdFiles) {
      const content = fs.readFileSync(filePath, "utf-8");
      const parsed = parseSeedContactMd(content, category);

      // Insert contact
      const { data: contact, error: contactError } = await supabase
        .from("contacts")
        .upsert(
          {
            user_id: userId,
            name: parsed.name,
            email: parsed.email || null,
            company: parsed.company || null,
            role: parsed.role || null,
            location: parsed.location || null,
            connected_via: parsed.connected_via || null,
            category: parsed.category,
            background: parsed.background || null,
            relationship_context: parsed.relationship_context || {},
            status: parsed.status,
            outreach_frequency_days: 30,
            last_interaction_at: parsed.last_contact
              ? new Date(parsed.last_contact).toISOString()
              : null,
            notes: parsed.notes || null,
            ai_confidence: "manual",
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id,email",
            ignoreDuplicates: false,
          }
        )
        .select("id")
        .single();

      if (contactError) {
        console.error(
          `Failed to import contact ${parsed.name}: ${contactError.message}`
        );
        continue;
      }

      contactsImported++;
      const contactId = contact.id;

      // Insert meetings and create junction records
      for (const meeting of parsed.meetings) {
        const { data: meetingRecord, error: meetingError } = await supabase
          .from("meetings")
          .insert({
            user_id: userId,
            title: meeting.title || null,
            meeting_date: meeting.date
              ? new Date(meeting.date).toISOString()
              : null,
            summary: meeting.summary || null,
            granola_url: meeting.granola_url || null,
            created_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (meetingError) {
          console.error(
            `Failed to import meeting for ${parsed.name}: ${meetingError.message}`
          );
          continue;
        }

        meetingsImported++;

        // Create junction record
        await supabase.from("contact_meetings").insert({
          user_id: userId,
          contact_id: contactId,
          meeting_id: meetingRecord.id,
        });
      }

      // Insert action items
      for (const actionText of parsed.action_items) {
        const { error: actionError } = await supabase
          .from("action_items")
          .insert({
            user_id: userId,
            contact_id: contactId,
            text: actionText,
            completed: false,
          });

        if (actionError) {
          console.error(
            `Failed to import action item for ${parsed.name}: ${actionError.message}`
          );
          continue;
        }

        actionItemsImported++;
      }
    }
  }

  return { contactsImported, meetingsImported, actionItemsImported };
}
