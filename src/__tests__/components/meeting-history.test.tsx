import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MeetingHistory } from "@/components/contacts/meeting-history";

const mockMeetings = [
  {
    id: "m1",
    title: "Series A Discussion",
    meeting_date: "2026-03-15T10:00:00Z",
    summary: "Discussed term sheet details and next steps.",
    granola_url: "https://app.granola.so/notes/abc123",
  },
  {
    id: "m2",
    title: "Follow-up Call",
    meeting_date: "2026-03-10T14:00:00Z",
    summary: "Reviewed portfolio fit and timeline.",
    granola_url: "https://app.granola.so/notes/def456",
  },
];

describe("MeetingHistory", () => {
  it("renders meeting title and formatted date", () => {
    render(<MeetingHistory meetings={mockMeetings} />);
    expect(screen.getByText("Series A Discussion")).toBeDefined();
    // date-fns format "MMM d, yyyy"
    expect(screen.getByText("Mar 15, 2026")).toBeDefined();
  });

  it("renders Granola URL as external link with target=_blank", () => {
    render(<MeetingHistory meetings={mockMeetings} />);
    const links = document.querySelectorAll('a[target="_blank"]');
    expect(links.length).toBeGreaterThanOrEqual(2);
    const hrefs = Array.from(links).map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("https://app.granola.so/notes/abc123");
    expect(hrefs).toContain("https://app.granola.so/notes/def456");
  });

  it("renders meeting summary text", () => {
    render(<MeetingHistory meetings={mockMeetings} />);
    expect(screen.getByText("Discussed term sheet details and next steps.")).toBeDefined();
    expect(screen.getByText("Reviewed portfolio fit and timeline.")).toBeDefined();
  });

  it("shows 'No meetings yet' when empty", () => {
    render(<MeetingHistory meetings={[]} />);
    expect(screen.getByText("No meetings yet")).toBeDefined();
  });
});
