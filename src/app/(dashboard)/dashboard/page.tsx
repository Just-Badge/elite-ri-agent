"use client";

import { useEffect, useState, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/dashboard/stat-card";
import { RiskContacts } from "@/components/dashboard/risk-contacts";
import { TriageContacts } from "@/components/dashboard/triage-contacts";
import { PendingActions } from "@/components/dashboard/pending-actions";
import { OutreachAnalytics } from "@/components/dashboard/outreach-analytics";
import { AlertTriangle, Users, UserCheck, ListTodo } from "lucide-react";
import { toast } from "sonner";

interface DashboardStats {
  at_risk_contacts: Array<{
    id: string;
    name: string;
    email: string | null;
    company: string | null;
    category: string | null;
    days_overdue: number;
    risk_level: "critical" | "warning";
  }>;
  triage_contacts: Array<{
    id: string;
    name: string;
    email: string | null;
    company: string | null;
    category: string | null;
    ai_confidence: "high" | "medium" | "low";
  }>;
  pending_actions: Array<{
    id: string;
    text: string;
    contact_id: string;
    contacts: { name: string };
  }>;
  draft_stats: {
    total: number;
    sent: number;
    pending: number;
    dismissed: number;
  };
  summary: {
    total_contacts: number;
    at_risk_count: number;
    triage_count: number;
    pending_actions_count: number;
  };
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/stats");
      if (!res.ok) {
        throw new Error("Failed to load dashboard data");
      }
      const json = await res.json();
      setStats(json.data);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load dashboard"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Your relationship intelligence hub
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const atRiskVariant =
    stats.summary.at_risk_count > 0
      ? stats.at_risk_contacts.some((c) => c.risk_level === "critical")
        ? "critical"
        : "warning"
      : "default";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Your relationship intelligence hub
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Contacts"
          value={stats.summary.total_contacts}
          icon={Users}
        />
        <StatCard
          title="At Risk"
          value={stats.summary.at_risk_count}
          icon={AlertTriangle}
          variant={atRiskVariant}
        />
        <StatCard
          title="Needs Triage"
          value={stats.summary.triage_count}
          icon={UserCheck}
        />
        <StatCard
          title="Pending Actions"
          value={stats.summary.pending_actions_count}
          icon={ListTodo}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <RiskContacts contacts={stats.at_risk_contacts} />
        <TriageContacts contacts={stats.triage_contacts} />
        <PendingActions actions={stats.pending_actions} />
      </div>

      <OutreachAnalytics />
    </div>
  );
}
