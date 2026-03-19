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

export function ApiKeyForm() {
  const [loading, setLoading] = useState(true);
  const [hasKey, setHasKey] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [keyValue, setKeyValue] = useState("");

  useEffect(() => {
    async function checkKey() {
      try {
        const res = await fetch("/api/settings/api-key");
        if (!res.ok) throw new Error("Failed to check API key status");
        const data = await res.json();
        setHasKey(data.hasKey);
      } catch {
        toast.error("Failed to check API key status");
      } finally {
        setLoading(false);
      }
    }
    checkKey();
  }, []);

  async function handleSave() {
    if (!keyValue.trim()) {
      toast.error("Please enter an API key");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/settings/api-key", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zai_api_key: keyValue }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save API key");
      }
      toast.success("API key saved");
      setHasKey(true);
      setEditing(false);
      setKeyValue("");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save API key"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/api-key", {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove API key");
      toast.success("API key removed");
      setHasKey(false);
      setEditing(false);
      setKeyValue("");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to remove API key"
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>z.ai API Key</CardTitle>
            <CardDescription>
              Required for AI-powered email drafting
            </CardDescription>
          </div>
          {hasKey ? (
            <Badge variant="default">Connected</Badge>
          ) : (
            <Badge variant="destructive">Not configured</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {hasKey && !editing ? (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditing(true)}>
              Update API Key
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemove}
              disabled={saving}
            >
              {saving ? "Removing..." : "Remove Key"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="zai_api_key">API Key</Label>
              <Input
                id="zai_api_key"
                type="password"
                placeholder="Enter your z.ai API key"
                value={keyValue}
                onChange={(e) => setKeyValue(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save API Key"}
              </Button>
              {hasKey && (
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
