"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function GranolaTokenForm() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshToken, setRefreshToken] = useState("");
  const [clientId, setClientId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [instructionsOpen, setInstructionsOpen] = useState(false);

  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch("/api/granola/token");
        if (!res.ok) throw new Error("Failed to check Granola status");
        const data = await res.json();
        setStatus(data.status);
      } catch {
        toast.error("Failed to check Granola status");
      } finally {
        setLoading(false);
      }
    }
    checkStatus();
  }, []);

  async function handleSave() {
    if (!refreshToken.trim() || !clientId.trim()) {
      toast.error("Both refresh token and client ID are required");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/granola/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refresh_token: refreshToken,
          client_id: clientId,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save Granola token");
      }
      toast.success("Granola connected successfully");
      setStatus("active");
      setEditing(false);
      setRefreshToken("");
      setClientId("");
      setError(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save Granola token";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
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
        {isConnected && !editing ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Granola is connected. Meeting transcripts will be processed on
              your configured schedule.
            </p>
            <Button variant="outline" onClick={() => setEditing(true)}>
              Update Token
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <Collapsible
              open={instructionsOpen}
              onOpenChange={setInstructionsOpen}
            >
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md bg-muted/50 p-3 text-sm font-medium hover:bg-muted">
                <span>How to get your Granola credentials</span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform duration-200",
                    instructionsOpen && "rotate-180"
                  )}
                />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="rounded-b-md bg-muted/50 px-3 pb-3 text-sm text-muted-foreground">
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Open the Granola desktop app</li>
                    <li>Open your browser DevTools (F12) on app.granola.so</li>
                    <li>Go to Network tab, find any API request</li>
                    <li>
                      Copy the{" "}
                      <code className="text-xs bg-muted px-1 rounded">
                        Authorization: Bearer ...
                      </code>{" "}
                      token value
                    </li>
                    <li>
                      For Client ID, check the OAuth/login request or local
                      storage
                    </li>
                  </ol>
                </div>
              </CollapsibleContent>
            </Collapsible>
            <div className="space-y-2">
              <Label htmlFor="granola_refresh_token">Refresh Token</Label>
              <Input
                id="granola_refresh_token"
                type="password"
                placeholder="Paste your Granola refresh token"
                value={refreshToken}
                onChange={(e) => setRefreshToken(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="granola_client_id">Client ID</Label>
              <Input
                id="granola_client_id"
                type="text"
                placeholder="Granola WorkOS client ID"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              />
            </div>
            {error && (
              <div className="flex items-center gap-2">
                <p className="text-sm text-destructive flex-1">{error}</p>
                <Button variant="outline" size="sm" onClick={handleSave}>
                  Retry
                </Button>
              </div>
            )}
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Connecting..." : "Connect Granola"}
              </Button>
              {isConnected && (
                <Button variant="outline" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
