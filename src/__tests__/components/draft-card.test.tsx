import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { DraftCard, type DraftData } from "@/components/drafts/draft-card";

const baseDraft: DraftData = {
  id: "d1",
  subject: "Follow up on our meeting",
  body: "<p>Hello Alice, I wanted to follow up on our recent conversation.</p>",
  status: "pending_review",
  gmail_sync_status: "synced",
  ai_rationale: "Contact hasn't been reached in 30 days",
  created_at: "2026-03-15T10:00:00Z",
  contacts: { name: "Alice Johnson", email: "alice@example.com" },
};

describe("DraftCard", () => {
  const mockOnSend = vi.fn();
  const mockOnDismiss = vi.fn();
  const mockOnEdit = vi.fn();

  beforeEach(() => {
    cleanup();
  });

  it("renders contact name and subject", () => {
    render(
      <DraftCard draft={baseDraft} onSend={mockOnSend} onDismiss={mockOnDismiss} onEdit={mockOnEdit} />
    );
    expect(screen.getByText("Alice Johnson")).toBeDefined();
    // base-ui may create duplicate DOM elements
    expect(screen.getAllByText("Follow up on our meeting").length).toBeGreaterThan(0);
  });

  it("renders action buttons (Send, Edit, Dismiss) for pending_review status", () => {
    render(
      <DraftCard draft={baseDraft} onSend={mockOnSend} onDismiss={mockOnDismiss} onEdit={mockOnEdit} />
    );
    // base-ui useRender creates duplicate DOM elements for buttons
    expect(screen.getAllByText("Send").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Edit").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Dismiss").length).toBeGreaterThan(0);
  });

  it("does NOT render action buttons for sent status", () => {
    const sentDraft: DraftData = { ...baseDraft, status: "sent" };
    render(
      <DraftCard draft={sentDraft} onSend={mockOnSend} onDismiss={mockOnDismiss} onEdit={mockOnEdit} />
    );
    expect(screen.queryByText("Send")).toBeNull();
    expect(screen.queryByText("Edit")).toBeNull();
    expect(screen.queryByText("Dismiss")).toBeNull();
    // Should show status badge instead
    const badges = screen.getAllByText("sent");
    expect(badges.length).toBeGreaterThan(0);
  });

  it("renders gmail sync status indicator", () => {
    render(
      <DraftCard draft={baseDraft} onSend={mockOnSend} onDismiss={mockOnDismiss} onEdit={mockOnEdit} />
    );
    // base-ui may create duplicate DOM elements
    expect(screen.getAllByText("Synced").length).toBeGreaterThan(0);
    const dot = document.querySelector('[aria-label="Gmail sync: Synced"]');
    expect(dot).not.toBeNull();
  });

  it("calls onSend when Send button clicked", () => {
    render(
      <DraftCard draft={baseDraft} onSend={mockOnSend} onDismiss={mockOnDismiss} onEdit={mockOnEdit} />
    );
    // Click the first Send button (base-ui duplicates)
    const sendButtons = screen.getAllByText("Send");
    fireEvent.click(sendButtons[0]);
    expect(mockOnSend).toHaveBeenCalledWith("d1");
  });
});
