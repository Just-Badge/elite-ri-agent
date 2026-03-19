"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle } from "lucide-react";

interface TriageContact {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  category: string | null;
  ai_confidence: "high" | "medium" | "low";
}

interface TriageContactsProps {
  contacts: TriageContact[];
}

const MAX_DISPLAY = 5;

const confidenceVariant: Record<string, "default" | "secondary"> = {
  high: "default",
  medium: "secondary",
  low: "secondary",
};

export function TriageContacts({ contacts }: TriageContactsProps) {
  const displayed = contacts.slice(0, MAX_DISPLAY);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Needs Review</CardTitle>
      </CardHeader>
      <CardContent>
        {contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <CheckCircle className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">
              All contacts reviewed
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayed.map((contact) => (
              <Link
                key={contact.id}
                href={`/contacts/${contact.id}`}
                className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <span className="truncate text-sm font-medium block">
                    {contact.name}
                  </span>
                  {contact.category && (
                    <span className="text-xs text-muted-foreground">
                      {contact.category}
                    </span>
                  )}
                </div>
                <Badge
                  variant={confidenceVariant[contact.ai_confidence] ?? "secondary"}
                  className="ml-2 shrink-0"
                >
                  {contact.ai_confidence}
                </Badge>
              </Link>
            ))}
            {contacts.length > MAX_DISPLAY && (
              <Link
                href="/contacts"
                className="block text-center text-sm text-muted-foreground hover:text-foreground transition-colors pt-1"
              >
                Review all {contacts.length} contacts
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
