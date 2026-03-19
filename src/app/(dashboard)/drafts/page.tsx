"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DraftList } from "@/components/drafts/draft-list";
import { DraftEditor, type EditableDraft } from "@/components/drafts/draft-editor";
import type { DraftData } from "@/components/drafts/draft-card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const STATUS_OPTIONS = [
  { value: "pending_review", label: "Pending Review" },
  { value: "sent", label: "Sent" },
  { value: "dismissed", label: "Dismissed" },
  { value: "all", label: "All" },
];

export default function DraftsPage() {
  const [drafts, setDrafts] = useState<DraftData[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending_review");
  const [editingDraft, setEditingDraft] = useState<EditableDraft | null>(null);

  const fetchDrafts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }
      const queryString = params.toString();
      const url = `/api/drafts${queryString ? `?${queryString}` : ""}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setDrafts(json.data ?? []);
      }
    } catch {
      // Fetch error -- drafts remain empty
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchDrafts();
  }, [fetchDrafts]);

  async function handleSend(id: string) {
    try {
      const res = await fetch(`/api/drafts/${id}/send`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send draft");
      }
      toast.success("Email sent");
      setDrafts((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to send draft"
      );
    }
  }

  async function handleDismiss(id: string) {
    try {
      const res = await fetch(`/api/drafts/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to dismiss draft");
      }
      toast.success("Draft dismissed");
      setDrafts((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to dismiss draft"
      );
    }
  }

  function handleEdit(draft: DraftData) {
    setEditingDraft({
      id: draft.id,
      subject: draft.subject,
      body: draft.body,
    });
  }

  async function handleSaveEdit(data: { subject?: string; body?: string }) {
    if (!editingDraft) return;

    try {
      const res = await fetch(`/api/drafts/${editingDraft.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to update draft");
      }
      toast.success("Draft updated");
      setDrafts((prev) =>
        prev.map((d) =>
          d.id === editingDraft.id
            ? { ...d, subject: data.subject ?? d.subject, body: data.body ?? d.body }
            : d
        )
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update draft"
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">Draft Review</h1>
          {!loading && (
            <Badge variant="secondary">{drafts.length}</Badge>
          )}
        </div>
        <Select
          value={statusFilter}
          onValueChange={setStatusFilter}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DraftList
        drafts={drafts}
        loading={loading}
        onSend={handleSend}
        onDismiss={handleDismiss}
        onEdit={handleEdit}
      />

      <DraftEditor
        draft={editingDraft}
        open={editingDraft !== null}
        onClose={() => setEditingDraft(null)}
        onSave={handleSaveEdit}
      />
    </div>
  );
}
