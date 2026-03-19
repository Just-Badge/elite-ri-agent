import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import DashboardPage from "@/app/(dashboard)/dashboard/page";

const mockStatsData = {
  data: {
    at_risk_contacts: [
      {
        id: "r1",
        name: "Risk Contact",
        email: "risk@test.com",
        company: "RiskCo",
        category: "investors",
        days_overdue: 15,
        risk_level: "critical" as const,
      },
    ],
    triage_contacts: [
      {
        id: "t1",
        name: "Triage Contact",
        email: "triage@test.com",
        company: "TriageCo",
        category: "advisors",
        ai_confidence: "high" as const,
      },
    ],
    pending_actions: [
      {
        id: "a1",
        text: "Follow up on partnership proposal",
        contact_id: "c1",
        contacts: { name: "Action Contact" },
      },
    ],
    draft_stats: { total: 10, sent: 5, pending: 3, dismissed: 2 },
    summary: {
      total_contacts: 25,
      at_risk_count: 1,
      triage_count: 1,
      pending_actions_count: 1,
    },
  },
};

const emptyStatsData = {
  data: {
    at_risk_contacts: [],
    triage_contacts: [],
    pending_actions: [],
    draft_stats: { total: 0, sent: 0, pending: 0, dismissed: 0 },
    summary: {
      total_contacts: 0,
      at_risk_count: 0,
      triage_count: 0,
      pending_actions_count: 0,
    },
  },
};

const mockAnalyticsData = {
  data: {
    by_month: [],
    totals: { sent: 0, dismissed: 0, pending: 0, total: 0 },
  },
};

function mockFetchWith(statsData: unknown) {
  vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
    const urlStr = typeof url === "string" ? url : "";
    if (urlStr.includes("/api/dashboard/analytics")) {
      return { ok: true, json: async () => mockAnalyticsData } as Response;
    }
    return { ok: true, json: async () => statsData } as Response;
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("DashboardPage", () => {
  it("renders 4 stat cards with correct values", async () => {
    mockFetchWith(mockStatsData);
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("25")).toBeDefined();
    });

    expect(screen.getByText("Total Contacts")).toBeDefined();
    expect(screen.getAllByText("At Risk").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Needs Triage")).toBeDefined();
    expect(screen.getAllByText("Pending Actions").length).toBeGreaterThanOrEqual(1);
  });

  it("renders at-risk contacts list", async () => {
    mockFetchWith(mockStatsData);
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Risk Contact")).toBeDefined();
    });

    // base-ui Badge renders duplicate elements
    const overdueBadges = screen.getAllByText("15d overdue");
    expect(overdueBadges.length).toBeGreaterThan(0);
  });

  it("renders triage contacts list", async () => {
    mockFetchWith(mockStatsData);
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Triage Contact")).toBeDefined();
    });

    // ai_confidence badge rendered in triage widget
    const confidenceBadges = screen.getAllByText("high");
    expect(confidenceBadges.length).toBeGreaterThan(0);
  });

  it("renders pending actions list", async () => {
    mockFetchWith(mockStatsData);
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Follow up on partnership proposal")).toBeDefined();
    });

    expect(screen.getByText("Action Contact")).toBeDefined();
  });

  it("shows loading skeletons initially", () => {
    vi.spyOn(globalThis, "fetch").mockReturnValue(
      new Promise(() => {}) // Never resolves
    );

    render(<DashboardPage />);

    const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThanOrEqual(4);
  });

  it("shows empty states when arrays are empty", async () => {
    mockFetchWith(emptyStatsData);
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("No contacts at risk")).toBeDefined();
    });

    expect(screen.getByText("All contacts reviewed")).toBeDefined();
    expect(screen.getByText("No pending action items")).toBeDefined();
  });
});
