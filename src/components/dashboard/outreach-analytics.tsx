"use client";

import { useEffect, useState, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3 } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

type Period = "7d" | "30d" | "90d" | "all";

interface MonthData {
  month: string;
  sent: number;
  dismissed: number;
  pending: number;
  total: number;
}

interface AnalyticsData {
  by_month: MonthData[];
  totals: {
    sent: number;
    dismissed: number;
    pending: number;
    total: number;
  };
}

const PERIODS: { value: Period; label: string }[] = [
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" },
  { value: "all", label: "All" },
];

export function OutreachAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("30d");

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/analytics?period=${period}`);
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } catch {
      // Fetch error -- data remains null
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const isEmpty = !data || !data.totals || data.totals.total === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Outreach Analytics</CardTitle>
        <CardAction>
          <div className="flex gap-1" role="group" aria-label="Period selector">
            {PERIODS.map((p) => (
              <Button
                key={p.value}
                variant={period === p.value ? "default" : "ghost"}
                size="sm"
                onClick={() => setPeriod(p.value)}
                aria-pressed={period === p.value}
              >
                {p.label}
              </Button>
            ))}
          </div>
        </CardAction>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-[300px] w-full rounded-lg" />
        ) : isEmpty ? (
          <EmptyState
            compact
            icon={BarChart3}
            heading="No outreach data yet"
            description="Drafts will appear here once generated"
          />
        ) : (
          <>
            <div data-testid="analytics-chart">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.by_month}>
                  <XAxis dataKey="month" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="sent" fill="#22c55e" name="Sent" />
                  <Bar dataKey="dismissed" fill="#ef4444" name="Dismissed" />
                  <Bar dataKey="pending" fill="#3b82f6" name="Pending" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex items-center justify-around text-center">
              <div>
                <p className="text-2xl font-bold text-green-500">
                  {data.totals.sent}
                </p>
                <p className="text-xs text-muted-foreground">Sent</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-500">
                  {data.totals.dismissed}
                </p>
                <p className="text-xs text-muted-foreground">Dismissed</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-500">
                  {data.totals.pending}
                </p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
