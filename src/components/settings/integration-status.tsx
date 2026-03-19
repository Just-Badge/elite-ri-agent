"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

export function IntegrationStatus() {
  // Users must sign in via Google OAuth, so if they reach this page
  // they are authenticated with Google by definition
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Google Account</CardTitle>
            <CardDescription>
              Used for Gmail access and calendar integration
            </CardDescription>
          </div>
          <Badge variant="default">Connected</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <span>Connected via Google OAuth</span>
        </div>
      </CardContent>
    </Card>
  );
}
