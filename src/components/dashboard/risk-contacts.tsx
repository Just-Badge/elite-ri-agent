"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

interface RiskContact {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  category: string | null;
  days_overdue: number;
  risk_level: "critical" | "warning";
}

interface RiskContactsProps {
  contacts: RiskContact[];
}

const MAX_DISPLAY = 5;

export function RiskContacts({ contacts }: RiskContactsProps) {
  const displayed = contacts.slice(0, MAX_DISPLAY);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>At Risk</CardTitle>
      </CardHeader>
      <CardContent>
        {contacts.length === 0 ? (
          <EmptyState
            compact
            icon={CheckCircle}
            heading="No contacts at risk"
            description="All contacts are on track"
          />
        ) : (
          <div className="space-y-3">
            {displayed.map((contact) => (
              <Link
                key={contact.id}
                href={`/contacts/${contact.id}`}
                className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`inline-block h-2 w-2 shrink-0 rounded-full ${
                      contact.risk_level === "critical"
                        ? "bg-red-500"
                        : "bg-amber-500"
                    }`}
                  />
                  <span className="truncate text-sm font-medium">
                    {contact.name}
                  </span>
                </div>
                <Badge
                  variant="secondary"
                  className="ml-2 shrink-0"
                >
                  {contact.days_overdue}d overdue
                </Badge>
              </Link>
            ))}
            {contacts.length > MAX_DISPLAY && (
              <Link
                href="/contacts"
                className="block text-center text-sm text-muted-foreground hover:text-foreground transition-colors pt-1"
              >
                View all {contacts.length} at-risk contacts
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
