import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ActionItems } from "@/components/contacts/action-items";

afterEach(() => cleanup());

const mockItems = [
  { id: "a1", text: "Send term sheet", completed: false },
  { id: "a2", text: "Schedule follow-up", completed: true },
  { id: "a3", text: "Prepare deck", completed: false },
];

describe("ActionItems", () => {
  it("renders action item text with checkbox", () => {
    render(<ActionItems items={mockItems} onToggle={vi.fn()} />);
    expect(screen.getByText("Send term sheet")).toBeDefined();
    expect(screen.getByText("Schedule follow-up")).toBeDefined();
    expect(screen.getByText("Prepare deck")).toBeDefined();
    // Should have 3 checkboxes
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    expect(checkboxes.length).toBe(3);
  });

  it("calls onToggle with actionItemId and new completed state when checkbox clicked", () => {
    const onToggle = vi.fn().mockResolvedValue(undefined);
    render(<ActionItems items={mockItems} onToggle={onToggle} />);

    // Click the first checkbox (Send term sheet, currently not completed)
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    // Incomplete items are shown first, so first checkbox should be "Send term sheet"
    fireEvent.click(checkboxes[0]);

    expect(onToggle).toHaveBeenCalledWith("a1", true);
  });

  it("shows completed items with strikethrough styling", () => {
    render(<ActionItems items={mockItems} onToggle={vi.fn()} />);
    const completedText = screen.getByText("Schedule follow-up");
    expect(completedText.className).toContain("line-through");
  });
});
