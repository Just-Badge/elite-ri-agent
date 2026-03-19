import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { computeContactRisk } from "@/lib/contacts/risk";

describe("computeContactRisk", () => {
  beforeEach(() => {
    // Fixed date: 2026-03-19T12:00:00Z
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-19T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns warning when contact is overdue but within frequency threshold", () => {
    // 45 days since last interaction, frequency is 30 days
    // daysOverdue = 45 - 30 = 15, which is > 0 but <= 30 (frequency)
    const result = computeContactRisk({
      outreach_frequency_days: 30,
      last_interaction_at: "2026-02-02T12:00:00Z", // 45 days ago
    });

    expect(result.days_overdue).toBe(15);
    expect(result.is_at_risk).toBe(true);
    expect(result.risk_level).toBe("warning");
  });

  it("returns critical when contact is overdue by more than the frequency", () => {
    // 70 days since last interaction, frequency is 30 days
    // daysOverdue = 70 - 30 = 40, which is > 30 (frequency) -> critical
    const result = computeContactRisk({
      outreach_frequency_days: 30,
      last_interaction_at: "2026-01-08T12:00:00Z", // 70 days ago
    });

    expect(result.days_overdue).toBe(40);
    expect(result.is_at_risk).toBe(true);
    expect(result.risk_level).toBe("critical");
  });

  it("returns healthy when contact is within outreach window", () => {
    // 10 days since last interaction, frequency is 30 days
    // daysOverdue = 10 - 30 = -20, clamped to 0
    const result = computeContactRisk({
      outreach_frequency_days: 30,
      last_interaction_at: "2026-03-09T12:00:00Z", // 10 days ago
    });

    expect(result.days_overdue).toBe(0);
    expect(result.is_at_risk).toBe(false);
    expect(result.risk_level).toBe("healthy");
  });

  it("returns unknown when no reference date is available", () => {
    const result = computeContactRisk({
      outreach_frequency_days: null,
      last_interaction_at: null,
      created_at: null,
    });

    expect(result.days_overdue).toBe(0);
    expect(result.is_at_risk).toBe(false);
    expect(result.risk_level).toBe("unknown");
  });

  it("uses created_at as fallback when last_interaction_at is null", () => {
    // created_at 5 days ago, default frequency 30 days
    // daysSince = 5, daysOverdue = 5 - 30 = -25, clamped to 0
    const result = computeContactRisk({
      outreach_frequency_days: null,
      last_interaction_at: null,
      created_at: "2026-03-14T12:00:00Z", // 5 days ago
    });

    expect(result.days_overdue).toBe(0);
    expect(result.is_at_risk).toBe(false);
    expect(result.risk_level).toBe("healthy");
  });

  it("uses custom frequency with created_at fallback for critical result", () => {
    // created_at 20 days ago, frequency 7 days
    // daysSince = 20, daysOverdue = 20 - 7 = 13, which is > 7 (frequency) -> critical
    const result = computeContactRisk({
      outreach_frequency_days: 7,
      last_interaction_at: null,
      created_at: "2026-02-27T12:00:00Z", // 20 days ago
    });

    expect(result.days_overdue).toBe(13);
    expect(result.is_at_risk).toBe(true);
    expect(result.risk_level).toBe("critical");
  });
});
