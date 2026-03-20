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
import { toast } from "sonner";

export function GranolaTokenForm() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshToken, setRefreshToken] = useState("");
  const [clientId, setClientId] = useState("");

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
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save Granola token"
      );
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
            <div className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">
                How to get your Granola token:
              </p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Open the Granola desktop app</li>
                <li>Open your browser DevTools (F12) on app.granola.so</li>
                <li>Go to Network tab, find any API request</li>
                <li>
                  Copy the <code className="text-xs bg-muted px-1 rounded">Authorization: Bearer ...</code> token value
                </li>
                <li>
                  For Client ID, check the OAuth/login request or local storage
                </li>
              </ol>
            </div>
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
