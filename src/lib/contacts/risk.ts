import { differenceInDays } from "date-fns";

export type RiskLevel = "critical" | "warning" | "healthy" | "unknown";

export type ContactRisk = {
  days_overdue: number;
  is_at_risk: boolean;
  risk_level: RiskLevel;
};

const DEFAULT_FREQUENCY_DAYS = 30;

export function computeContactRisk(contact: {
  outreach_frequency_days?: number | null;
  last_interaction_at?: string | null;
  created_at?: string | null;
}): ContactRisk {
  const frequency = contact.outreach_frequency_days ?? DEFAULT_FREQUENCY_DAYS;

  // Use last_interaction_at if available, otherwise fall back to created_at
  const referenceDate = contact.last_interaction_at ?? contact.created_at;

  if (!referenceDate) {
    return { days_overdue: 0, is_at_risk: false, risk_level: "unknown" };
  }

  const daysSince = differenceInDays(new Date(), new Date(referenceDate));
  const daysOverdue = daysSince - frequency;

  if (daysOverdue <= 0) {
    return { days_overdue: 0, is_at_risk: false, risk_level: "healthy" };
  }

  // If overdue by more than the frequency itself, it's critical
  const riskLevel: RiskLevel = daysOverdue > frequency ? "critical" : "warning";

  return {
    days_overdue: daysOverdue,
    is_at_risk: true,
    risk_level: riskLevel,
  };
}
