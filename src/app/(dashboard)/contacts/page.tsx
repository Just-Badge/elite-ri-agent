"use client";

import { useEffect, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ContactCard } from "@/components/contacts/contact-card";
import { CONTACT_CATEGORIES } from "@/lib/validations/contacts";
import { Button } from "@/components/ui/button";
import { Search, Loader2, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface Contact {
  id: string;
  name: string;
  email?: string | null;
  company?: string | null;
  role?: string | null;
  category?: string | null;
  last_interaction_at?: string | null;
  status?: string | null;
  action_items?: { id: string; completed: boolean }[];
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  async function handleProcessMeetings() {
    setProcessing(true);
    try {
      const res = await fetch("/api/meetings/process", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to trigger processing");
      }
      toast.success("Meeting processing triggered");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to trigger processing"
      );
    } finally {
      setProcessing(false);
    }
  }

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (categoryFilter) params.set("category", categoryFilter);

      const queryString = params.toString();
      const url = `/api/contacts${queryString ? `?${queryString}` : ""}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setContacts(json.data ?? []);
      }
    } catch {
      // Fetch error -- contacts remain empty
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchContacts();
    }, search ? 300 : 0); // Debounce search by 300ms

    return () => clearTimeout(timer);
  }, [fetchContacts, search]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contacts</h1>
          <p className="text-muted-foreground">
            {loading
              ? "Loading contacts..."
              : `${contacts.length} contact${contacts.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleProcessMeetings}
          disabled={processing}
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${processing ? "animate-spin" : ""}`} />
          {processing ? "Processing..." : "Process Meetings"}
        </Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select
          value={categoryFilter ?? "all"}
          onValueChange={(val) =>
            setCategoryFilter(val === "all" ? null : val)
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CONTACT_CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat.replace("-", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : contacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Loader2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium">No contacts found</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {search || categoryFilter
              ? "Try adjusting your search or filter criteria."
              : "Import contacts from meetings or add them manually."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {contacts.map((contact) => (
            <ContactCard key={contact.id} contact={contact} />
          ))}
        </div>
      )}
    </div>
  );
}
