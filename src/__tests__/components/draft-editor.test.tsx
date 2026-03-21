import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { DraftEditor, type EditableDraft } from "@/components/drafts/draft-editor";

const mockDraft: EditableDraft = {
  id: "d1",
  subject: "Follow up on our meeting",
  body: "Hello Alice, I wanted to follow up.",
};

describe("DraftEditor", () => {
  let mockOnClose: () => void;
  let mockOnSave: (data: { subject?: string; body?: string }) => void;

  beforeEach(() => {
    cleanup();
    mockOnClose = vi.fn<() => void>();
    mockOnSave = vi.fn<(data: { subject?: string; body?: string }) => void>();
  });

  it("renders subject input and body textarea when open with draft", () => {
    render(
      <DraftEditor draft={mockDraft} open={true} onClose={mockOnClose} onSave={mockOnSave} />
    );
    expect(screen.getByLabelText("Subject")).toBeDefined();
    expect(screen.getByLabelText("Body")).toBeDefined();
  });

  it("does not render form content when open is false", () => {
    render(
      <DraftEditor draft={mockDraft} open={false} onClose={mockOnClose} onSave={mockOnSave} />
    );
    expect(screen.queryByLabelText("Subject")).toBeNull();
    expect(screen.queryByLabelText("Body")).toBeNull();
  });

  it("calls onSave with updated subject and body when Save clicked", async () => {
    render(
      <DraftEditor draft={mockDraft} open={true} onClose={mockOnClose} onSave={mockOnSave} />
    );
    const subjectInput = screen.getByLabelText("Subject") as HTMLInputElement;
    const bodyInput = screen.getByLabelText("Body") as HTMLTextAreaElement;

    fireEvent.change(subjectInput, { target: { value: "New Subject" } });
    fireEvent.change(bodyInput, { target: { value: "New Body Content" } });

    // base-ui may duplicate button elements
    const saveButtons = screen.getAllByText("Save");
    fireEvent.click(saveButtons[0]);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith({
        subject: "New Subject",
        body: "New Body Content",
      });
    });
  });

  it("calls onClose when Cancel clicked", () => {
    render(
      <DraftEditor draft={mockDraft} open={true} onClose={mockOnClose} onSave={mockOnSave} />
    );
    // base-ui may duplicate button elements
    const cancelButtons = screen.getAllByText("Cancel");
    fireEvent.click(cancelButtons[0]);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("pre-fills form fields with draft subject and body", () => {
    render(
      <DraftEditor draft={mockDraft} open={true} onClose={mockOnClose} onSave={mockOnSave} />
    );
    const subjectInput = screen.getByLabelText("Subject") as HTMLInputElement;
    const bodyInput = screen.getByLabelText("Body") as HTMLTextAreaElement;

    expect(subjectInput.value).toBe("Follow up on our meeting");
    expect(bodyInput.value).toBe("Hello Alice, I wanted to follow up.");
  });
});
