import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup, fireEvent } from "@testing-library/react";
import { OutreachAnalytics } from "@/components/dashboard/outreach-analytics";

// Mock recharts to avoid jsdom SVG rendering issues
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
}));

const mockAnalyticsData = {
  data: {
    by_month: [
      { month: "2026-01", sent: 5, dismissed: 2, pending: 3, total: 10 },
      { month: "2026-02", sent: 8, dismissed: 1, pending: 4, total: 13 },
    ],
    totals: { sent: 13, dismissed: 3, pending: 7, total: 23 },
  },
};

const emptyAnalyticsData = {
  data: {
    by_month: [],
    totals: { sent: 0, dismissed: 0, pending: 0, total: 0 },
  },
};

function mockFetchWith(data: unknown) {
  vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    json: async () => data,
  } as Response);
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("OutreachAnalytics", () => {
  it("renders chart container when data is available", async () => {
    mockFetchWith(mockAnalyticsData);
    render(<OutreachAnalytics />);

    await waitFor(() => {
      expect(screen.getByTestId("analytics-chart")).toBeDefined();
    });

    expect(screen.getByTestId("responsive-container")).toBeDefined();
    expect(screen.getByTestId("bar-chart")).toBeDefined();
  });

  it("renders period selector buttons", async () => {
    mockFetchWith(mockAnalyticsData);
    render(<OutreachAnalytics />);

    await waitFor(() => {
      expect(screen.getByText("Outreach Analytics")).toBeDefined();
    });

    expect(screen.getByText("7d")).toBeDefined();
    expect(screen.getByText("30d")).toBeDefined();
    expect(screen.getByText("90d")).toBeDefined();
    expect(screen.getByText("All")).toBeDefined();
  });

  it("shows empty state when no data", async () => {
    mockFetchWith(emptyAnalyticsData);
    render(<OutreachAnalytics />);

    await waitFor(() => {
      expect(screen.getByText("No outreach data yet")).toBeDefined();
    });
  });

  it("displays total stats below chart", async () => {
    mockFetchWith(mockAnalyticsData);
    render(<OutreachAnalytics />);

    await waitFor(() => {
      expect(screen.getByText("13")).toBeDefined();
    });

    // Totals: sent=13, dismissed=3, pending=7
    expect(screen.getByText("3")).toBeDefined();
    expect(screen.getByText("7")).toBeDefined();

    // Labels
    const sentLabels = screen.getAllByText("Sent");
    expect(sentLabels.length).toBeGreaterThan(0);
    const dismissedLabels = screen.getAllByText("Dismissed");
    expect(dismissedLabels.length).toBeGreaterThan(0);
    const pendingLabels = screen.getAllByText("Pending");
    expect(pendingLabels.length).toBeGreaterThan(0);
  });

  it("changes period when clicking buttons", async () => {
    mockFetchWith(mockAnalyticsData);
    render(<OutreachAnalytics />);

    await waitFor(() => {
      expect(screen.getByTestId("analytics-chart")).toBeDefined();
    });

    const fetchSpy = vi.mocked(globalThis.fetch);
    const callCount = fetchSpy.mock.calls.length;

    fireEvent.click(screen.getByText("90d"));

    // Should trigger a new fetch with updated period
    await waitFor(() => {
      expect(fetchSpy.mock.calls.length).toBeGreaterThan(callCount);
    });

    // The last call should include period=90d
    const lastCall = fetchSpy.mock.calls[fetchSpy.mock.calls.length - 1];
    expect(lastCall[0]).toContain("period=90d");
  });
});
