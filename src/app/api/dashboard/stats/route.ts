import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { computeContactRisk } from "@/lib/contacts/risk";
import { apiUnauthorized, apiError } from "@/lib/api/errors";

export async function GET(_request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiUnauthorized();

  // Run 3 parallel queries
  const [contactsResult, actionsResult, draftsResult] = await Promise.all([
    supabase
      .from("contacts")
      .select(
        "id, name, email, company, category, outreach_frequency_days, last_interaction_at, ai_confidence, status, created_at"
      )
      .eq("user_id", user.id),
    supabase
      .from("action_items")
      .select("id, text, completed, contact_id, contacts(name)")
      .eq("user_id", user.id)
      .eq("completed", false),
    supabase
      .from("outreach_drafts")
      .select("status, sent_at, created_at")
      .eq("user_id", user.id),
  ]);

  if (contactsResult.error) {
    return apiError(contactsResult.error.message, 500);
  }

  const contacts = contactsResult.data ?? [];
  const actions = actionsResult.data ?? [];
  const drafts = draftsResult.data ?? [];

  // Compute risk for each contact
  const contactsWithRisk = contacts.map((contact) => ({
    ...contact,
    ...computeContactRisk({
      outreach_frequency_days: contact.outreach_frequency_days,
      last_interaction_at: contact.last_interaction_at,
      created_at: contact.created_at,
    }),
  }));

  // Filter at-risk contacts, sorted by days_overdue desc
  const at_risk_contacts = contactsWithRisk
    .filter((c) => c.is_at_risk)
    .sort((a, b) => b.days_overdue - a.days_overdue);

  // Filter triage contacts (AI-created, not yet reviewed)
  const triage_contacts = contactsWithRisk.filter(
    (c) => c.ai_confidence !== "manual"
  );

  // Pending action items (already filtered by completed=false in query)
  const pending_actions = actions;

  // Draft stats
  const draft_stats = {
    total: drafts.length,
    sent: drafts.filter((d) => d.status === "sent").length,
    pending: drafts.filter(
      (d) => d.status === "pending_review" || d.status === "approved"
    ).length,
    dismissed: drafts.filter((d) => d.status === "dismissed").length,
  };

  // Summary
  const summary = {
    total_contacts: contacts.length,
    at_risk_count: at_risk_contacts.length,
    triage_count: triage_contacts.length,
    pending_actions_count: pending_actions.length,
  };

  return NextResponse.json({
    data: {
      at_risk_contacts,
      triage_contacts,
      pending_actions,
      draft_stats,
      summary,
    },
  });
}
