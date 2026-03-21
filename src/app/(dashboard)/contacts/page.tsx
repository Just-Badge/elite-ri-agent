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
import { computeContactRisk } from "@/lib/contacts/risk";
import { CONTACT_CATEGORIES } from "@/lib/validations/contacts";
import { Button } from "@/components/ui/button";
import { Search, Users, RefreshCw, Loader2 } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ProcessingStatus } from "@/components/contacts/processing-status";

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
  outreach_frequency_days?: number | null;
  ai_confidence?: string | null;
  created_at?: string | null;
  days_overdue?: number;
  risk_level?: "critical" | "warning" | "healthy" | "unknown";
  needs_triage?: boolean;
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [publicToken, setPublicToken] = useState<string | null>(null);
  const [triggerApiUrl, setTriggerApiUrl] = useState<string | undefined>();
  const [searching, setSearching] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalContacts, setTotalContacts] = useState(0);

  async function handleProcessMeetings() {
    setProcessing(true);
    setRunId(null);
    setPublicToken(null);
    try {
      const res = await fetch("/api/meetings/process", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to trigger processing");
      }
      const data = await res.json();
      setRunId(data.runId);
      setPublicToken(data.publicToken);
      setTriggerApiUrl(data.apiUrl);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to trigger processing"
      );
      setProcessing(false);
    }
  }

  function handleProcessingComplete() {
    setProcessing(false);
    fetchContacts();
  }

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (categoryFilter) params.set("category", categoryFilter);
      params.set("page", String(page));
      params.set("limit", "24");

      const queryString = params.toString();
      const url = `/api/contacts${queryString ? `?${queryString}` : ""}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        const enriched = (json.data ?? []).map((c: Contact) => ({
          ...c,
          ...computeContactRisk(c),
          needs_triage: c.ai_confidence != null && c.ai_confidence !== "manual",
        }));
        setContacts(enriched);
        setTotalPages(json.pagination?.totalPages ?? 1);
        setTotalContacts(json.pagination?.total ?? 0);
      }
    } catch {
      // Fetch error -- contacts remain empty
    } finally {
      setLoading(false);
      setSearching(false);
    }
  }, [search, categoryFilter, page]);

  useEffect(() => {
    setPage(1);
  }, [search, categoryFilter]);

  useEffect(() => {
    if (search) setSearching(true);
    const timer = setTimeout(() => {
      fetchContacts();
    }, search ? 300 : 0); // Debounce search by 300ms

    return () => clearTimeout(timer);
  }, [fetchContacts, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contacts</h1>
          <p className="text-muted-foreground" aria-live="polite">
            {loading
              ? "Loading contacts..."
              : `${totalContacts} contact${totalContacts !== 1 ? "s" : ""}`}
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

      {runId && publicToken && (
        <ProcessingStatus
          runId={runId}
          publicToken={publicToken}
          baseURL={triggerApiUrl}
          onComplete={handleProcessingComplete}
        />
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          {searching ? (
            <Loader2 className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground animate-spin" />
          ) : (
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          )}
          <Input
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
            aria-label="Search contacts"
          />
        </div>
        <Select
          value={categoryFilter ?? "all"}
          onValueChange={(val) =>
            setCategoryFilter(val === "all" ? null : val)
          }
        >
          <SelectTrigger className="w-full sm:w-[180px]" aria-label="Filter by category">
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
        search || categoryFilter ? (
          <EmptyState
            icon={Search}
            heading="No contacts found"
            description="Try adjusting your search or filter criteria."
          />
        ) : (
          <EmptyState
            icon={Users}
            heading="No contacts yet"
            description="Process your first meetings to start building your network."
            action={{ label: "Process Meetings", href: "/settings/integrations" }}
          />
        )
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {contacts.map((contact) => (
              <ContactCard key={contact.id} contact={contact} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
