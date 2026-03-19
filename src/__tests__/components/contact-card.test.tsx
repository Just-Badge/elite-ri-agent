import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ContactCard } from "@/components/contacts/contact-card";

afterEach(() => {
  cleanup();
});

const baseContact = {
  id: "c1",
  name: "Alice Johnson",
  email: "alice@example.com",
  company: "TechCorp",
  role: "CTO",
  category: "investors",
  status: "active",
  last_interaction_at: "2026-03-10T12:00:00Z",
  action_items: [
    { id: "a1", completed: false },
    { id: "a2", completed: true },
    { id: "a3", completed: false },
  ],
};

describe("ContactCard", () => {
  it("renders contact name, email, and company", () => {
    render(<ContactCard contact={baseContact} />);
    expect(screen.getByText("Alice Johnson")).toBeDefined();
    expect(screen.getByText("alice@example.com")).toBeDefined();
    expect(screen.getByText(/TechCorp/)).toBeDefined();
  });

  it("renders category as a Badge", () => {
    render(<ContactCard contact={baseContact} />);
    // base-ui useRender may create multiple elements with the same text
    const badges = screen.getAllByText("investors");
    expect(badges.length).toBeGreaterThan(0);
    // Verify at least one is a badge element
    const hasBadge = badges.some((el) => el.getAttribute("data-slot") === "badge");
    expect(hasBadge).toBe(true);
  });

  it("shows action item count", () => {
    render(<ContactCard contact={baseContact} />);
    // 2 incomplete action items out of 3
    const content = document.body.textContent || "";
    expect(content).toContain("2 action items");
  });

  it("shows last interaction date when present", () => {
    render(<ContactCard contact={baseContact} />);
    // Should show relative date like "X days ago"
    const content = document.body.textContent || "";
    expect(content).toContain("ago");
  });

  it("links to /contacts/[id] detail page", () => {
    render(<ContactCard contact={baseContact} />);
    const link = document.querySelector('a[href="/contacts/c1"]');
    expect(link).not.toBeNull();
  });

  it("shows red left border when risk_level is critical", () => {
    render(
      <ContactCard
        contact={{ ...baseContact, risk_level: "critical", days_overdue: 45 }}
      />
    );
    const card = document.querySelector('[data-slot="card"]');
    expect(card?.className).toContain("border-l-red-500");
    expect(card?.className).toContain("border-l-4");
  });

  it("shows amber left border when risk_level is warning", () => {
    render(
      <ContactCard
        contact={{ ...baseContact, risk_level: "warning", days_overdue: 10 }}
      />
    );
    const card = document.querySelector('[data-slot="card"]');
    expect(card?.className).toContain("border-l-amber-500");
    expect(card?.className).toContain("border-l-4");
  });

  it("shows overdue text when days_overdue > 0", () => {
    render(
      <ContactCard
        contact={{ ...baseContact, risk_level: "warning", days_overdue: 12 }}
      />
    );
    const content = document.body.textContent || "";
    expect(content).toContain("12d overdue");
  });

  it("shows Needs review badge when needs_triage is true", () => {
    render(
      <ContactCard contact={{ ...baseContact, needs_triage: true }} />
    );
    const badges = screen.getAllByText("Needs review");
    expect(badges.length).toBeGreaterThan(0);
  });

  it("no risk/triage indicators when fields are undefined", () => {
    render(<ContactCard contact={baseContact} />);
    const card = document.querySelector('[data-slot="card"]');
    expect(card?.className).not.toContain("border-l-red-500");
    expect(card?.className).not.toContain("border-l-amber-500");
    expect(card?.className).not.toContain("border-l-4");
    const content = document.body.textContent || "";
    expect(content).not.toContain("overdue");
    expect(content).not.toContain("Needs review");
  });
});
