import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ContactCard } from "@/components/contacts/contact-card";

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
    const badge = screen.getByText("investors");
    expect(badge).toBeDefined();
  });

  it("shows action item count", () => {
    render(<ContactCard contact={baseContact} />);
    // 2 incomplete action items out of 3
    expect(screen.getByText(/2 action items/)).toBeDefined();
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
});
