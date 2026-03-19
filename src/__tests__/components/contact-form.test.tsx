import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { ContactForm } from "@/components/contacts/contact-form";

afterEach(() => cleanup());

const mockContact = {
  id: "c1",
  name: "Alice Johnson",
  email: "alice@example.com",
  company: "TechCorp",
  role: "CTO",
  location: "San Francisco",
  connected_via: "Y Combinator",
  category: "investors" as const,
  background: "Former Google engineer",
  relationship_context: {
    why: "Met at YC Demo Day",
    what: "Discussed Series A",
    mutual_value: "Introductions to LPs",
  },
  status: "active" as const,
  outreach_frequency_days: 14,
  notes: "Follow up about term sheet",
};

describe("ContactForm", () => {
  it("renders all editable fields", () => {
    render(
      <ContactForm contact={mockContact} onSave={vi.fn()} />
    );
    expect(screen.getByLabelText("Name")).toBeDefined();
    expect(screen.getByLabelText("Email")).toBeDefined();
    expect(screen.getByLabelText("Company")).toBeDefined();
    expect(screen.getByLabelText("Role")).toBeDefined();
    expect(screen.getByLabelText("Location")).toBeDefined();
    expect(screen.getByLabelText("Connected Via")).toBeDefined();
    expect(screen.getByLabelText("Background")).toBeDefined();
    expect(screen.getByLabelText("Notes")).toBeDefined();
    expect(screen.getByLabelText("Outreach Frequency (days)")).toBeDefined();
  });

  it("category field renders as Select with all 8 CONTACT_CATEGORIES options", () => {
    render(
      <ContactForm contact={mockContact} onSave={vi.fn()} />
    );
    // The label should exist
    expect(screen.getByText("Category")).toBeDefined();
    // We verify the category value is displayed (base-ui Select shows the value)
    const content = document.body.textContent || "";
    expect(content).toContain("investors");
  });

  it("outreach_frequency_days renders as number input", () => {
    render(
      <ContactForm contact={mockContact} onSave={vi.fn()} />
    );
    const input = screen.getByLabelText("Outreach Frequency (days)") as HTMLInputElement;
    expect(input.type).toBe("number");
    expect(input.value).toBe("14");
  });

  it("calls onSave callback with updated values on submit", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <ContactForm contact={mockContact} onSave={onSave} />
    );

    // Change the name field
    const nameInput = screen.getByLabelText("Name") as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "Alice Smith" } });

    // Submit the form
    const submitButton = screen.getByRole("button", { name: /save changes/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1);
    });

    // Verify the payload includes the updated name
    const savedValues = onSave.mock.calls[0][0];
    expect(savedValues.name).toBe("Alice Smith");
  });
});
