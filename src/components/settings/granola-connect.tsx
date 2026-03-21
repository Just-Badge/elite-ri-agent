"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

export function GranolaConnect() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check for OAuth callback results in URL params
    const connected = searchParams.get("granola_connected");
    const error = searchParams.get("granola_error");

    if (connected === "true") {
      toast.success("Granola connected successfully!");
      setStatus("active");
      setLoading(false);
      // Clean URL params
      window.history.replaceState({}, "", "/settings/integrations");
      return;
    }

    if (error) {
      toast.error(`Granola connection failed: ${decodeURIComponent(error)}`);
      window.history.replaceState({}, "", "/settings/integrations");
    }

    // Check current status
    async function checkStatus() {
      try {
        const res = await fetch("/api/granola/token");
        if (!res.ok) throw new Error("Failed to check Granola status");
        const data = await res.json();
        setStatus(data.status);
      } catch {
        // Silently fail — status stays null
      } finally {
        setLoading(false);
      }
    }
    checkStatus();
  }, [searchParams]);

  function handleConnect() {
    setConnecting(true);
    // Navigate to OAuth flow — this will redirect through Granola's auth
    window.location.href = "/api/granola/auth";
  }

  if (loading) {
    return (
      <Card>
        <CardContent>
          <div className="animate-pulse space-y-4 py-4">
            <div className="h-4 w-1/3 rounded bg-muted" />
            <div className="h-8 rounded bg-muted" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const isConnected = status === "active";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Granola</CardTitle>
            <CardDescription>
              Connect your Granola account to import meeting transcripts
            </CardDescription>
          </div>
          {isConnected ? (
            <Badge variant="default">Connected</Badge>
          ) : (
            <Badge variant="destructive">Not connected</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isConnected ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Granola is connected. Meeting transcripts will be processed on
              your configured schedule.
            </p>
            <Button variant="outline" onClick={handleConnect}>
              Reconnect
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Click below to sign in with your Granola account. You&apos;ll be
              redirected to Granola to authorize access to your meeting notes.
            </p>
            <Button onClick={handleConnect} disabled={connecting}>
              {connecting ? "Connecting..." : "Connect Granola"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
