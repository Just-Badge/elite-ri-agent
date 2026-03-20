"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { ContactForm } from "@/components/contacts/contact-form";
import { MeetingHistory } from "@/components/contacts/meeting-history";
import { ActionItems } from "@/components/contacts/action-items";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Mail,
  Building2,
  MapPin,
  UserPlus,
  Briefcase,
} from "lucide-react";
import { STATUS_COLORS } from "@/lib/constants/status-styles";
import type { ContactFormValues } from "@/lib/validations/contacts";

interface ContactData {
  id: string;
  name: string;
  email?: string | null;
  company?: string | null;
  role?: string | null;
  location?: string | null;
  connected_via?: string | null;
  category?: string | null;
  background?: string | null;
  relationship_context?: {
    why?: string;
    what?: string;
    mutual_value?: string;
  } | null;
  status?: string | null;
  outreach_frequency_days?: number | null;
  notes?: string | null;
  last_interaction_at?: string | null;
  action_items?: Array<{
    id: string;
    text: string;
    completed: boolean;
  }>;
  contact_meetings?: Array<{
    meeting_id: string;
    meetings: {
      id: string;
      title?: string | null;
      meeting_date?: string | null;
      summary?: string | null;
      granola_url?: string | null;
    };
  }>;
}

interface ContactDetailProps {
  contactId: string;
}

export function ContactDetail({ contactId }: ContactDetailProps) {
  const router = useRouter();
  const [contact, setContact] = useState<ContactData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchContact = useCallback(async () => {
    try {
      const res = await fetch(`/api/contacts/${contactId}`);
      if (!res.ok) throw new Error("Failed to load contact");
      const { data } = await res.json();
      setContact(data);
    } catch {
      toast.error("Failed to load contact");
    } finally {
      setLoading(false);
    }
  }, [contactId]);

  useEffect(() => {
    fetchContact();
  }, [fetchContact]);

  async function handleSave(values: ContactFormValues) {
    setSaving(true);
    try {
      const res = await fetch(`/api/contacts/${contactId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save contact");
      }
      toast.success("Contact saved");
      setEditMode(false);
      await fetchContact();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save contact"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleAction(actionItemId: string, completed: boolean) {
    try {
      const res = await fetch(`/api/contacts/${contactId}/action-items`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionItemId, completed }),
      });
      if (!res.ok) throw new Error("Failed to update action item");
      // Update local state optimistically
      setContact((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          action_items: prev.action_items?.map((item) =>
            item.id === actionItemId ? { ...item, completed } : item
          ),
        };
      });
    } catch {
      toast.error("Failed to update action item");
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/contacts/${contactId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete contact");
      toast.success("Contact deleted");
      router.push("/contacts");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete contact"
      );
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium">Contact not found</h3>
        <Link
          href="/contacts"
          className="text-sm text-muted-foreground hover:underline mt-2 inline-block"
        >
          Back to Contacts
        </Link>
      </div>
    );
  }

  const statusColor = STATUS_COLORS[contact.status ?? "active"] ?? "bg-gray-400";
  const meetings = contact.contact_meetings?.map((cm) => cm.meetings) ?? [];

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/contacts"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Contacts
      </Link>

      {/* Header section */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span
            className={`inline-block h-3 w-3 rounded-full ${statusColor}`}
            aria-label={`Status: ${contact.status ?? "active"}`}
          />
          <h1 className="text-3xl font-bold tracking-tight">{contact.name}</h1>
          {contact.category && (
            <Badge variant="secondary">{contact.category}</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={editMode ? "outline" : "default"}
            size="sm"
            onClick={() => setEditMode(!editMode)}
          >
            {editMode ? (
              "Cancel"
            ) : (
              <>
                <Pencil className="h-4 w-4 mr-1" />
                Edit
              </>
            )}
          </Button>
          <Dialog>
            <DialogTrigger
              render={
                <Button variant="destructive" size="sm" />
              }
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Contact</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete {contact.name}? This action
                  cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>
                  Cancel
                </DialogClose>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? "Deleting..." : "Delete"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Edit form */}
      {editMode && (
        <Card>
          <CardHeader>
            <CardTitle>Edit Contact</CardTitle>
          </CardHeader>
          <CardContent>
            <ContactForm
              contact={{
                id: contact.id,
                name: contact.name,
                email: contact.email ?? "",
                company: contact.company ?? "",
                role: contact.role ?? "",
                location: contact.location ?? "",
                connected_via: contact.connected_via ?? "",
                category: contact.category as ContactFormValues["category"],
                background: contact.background ?? "",
                relationship_context: {
                  why: contact.relationship_context?.why ?? "",
                  what: contact.relationship_context?.what ?? "",
                  mutual_value: contact.relationship_context?.mutual_value ?? "",
                },
                status: contact.status ?? "active",
                outreach_frequency_days: contact.outreach_frequency_days ?? 30,
                notes: contact.notes ?? "",
              }}
              onSave={handleSave}
              saving={saving}
            />
          </CardContent>
        </Card>
      )}

      {/* Contact info section (read-only when not editing) */}
      {!editMode && (
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {contact.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{contact.email}</span>
                </div>
              )}
              {contact.company && (
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span>{contact.company}</span>
                </div>
              )}
              {contact.role && (
                <div className="flex items-center gap-2 text-sm">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <span>{contact.role}</span>
                </div>
              )}
              {contact.location && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{contact.location}</span>
                </div>
              )}
              {contact.connected_via && (
                <div className="flex items-center gap-2 text-sm">
                  <UserPlus className="h-4 w-4 text-muted-foreground" />
                  <span>{contact.connected_via}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Relationship Context section (read-only when not editing) */}
      {!editMode && contact.relationship_context && (
        <Card>
          <CardHeader>
            <CardTitle>Relationship Context</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {contact.relationship_context.why && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Why We Connected
                </p>
                <p className="text-sm mt-1">{contact.relationship_context.why}</p>
              </div>
            )}
            {contact.relationship_context.what && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  What Was Discussed
                </p>
                <p className="text-sm mt-1">{contact.relationship_context.what}</p>
              </div>
            )}
            {contact.relationship_context.mutual_value && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Mutual Value
                </p>
                <p className="text-sm mt-1">
                  {contact.relationship_context.mutual_value}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Background section */}
      {!editMode && contact.background && (
        <Card>
          <CardHeader>
            <CardTitle>Background</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{contact.background}</p>
          </CardContent>
        </Card>
      )}

      {/* Meeting History section */}
      <Card>
        <CardHeader>
          <CardTitle>Meeting History</CardTitle>
        </CardHeader>
        <CardContent>
          <MeetingHistory meetings={meetings} />
        </CardContent>
      </Card>

      {/* Action Items section */}
      <Card>
        <CardHeader>
          <CardTitle>Action Items</CardTitle>
        </CardHeader>
        <CardContent>
          <ActionItems
            items={contact.action_items ?? []}
            onToggle={handleToggleAction}
          />
        </CardContent>
      </Card>

      {/* Notes section */}
      {!editMode && contact.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{contact.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Outreach section */}
      {!editMode && (
        <Card>
          <CardHeader>
            <CardTitle>Outreach</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Outreach Frequency</span>
              <span>
                Every {contact.outreach_frequency_days ?? 30} days
              </span>
            </div>
            {contact.last_interaction_at && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Last Interaction</span>
                <span>
                  {formatDistanceToNow(new Date(contact.last_interaction_at), {
                    addSuffix: true,
                  })}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
