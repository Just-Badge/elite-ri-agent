"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepProps {
  onNext: () => void;
  onSkip: () => void;
}

export function WelcomeStep({ onNext, onSkip }: StepProps) {
  return (
    <div className="space-y-6 text-center py-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Welcome to ELITE
        </h2>
        <p className="text-muted-foreground mt-2">
          Your AI-powered relationship intelligence platform. ELITE turns your
          meeting notes into actionable insights and helps you maintain
          meaningful professional relationships.
        </p>
      </div>
      <p className="text-sm text-muted-foreground">
        Let&apos;s get you set up in just a few steps.
      </p>
      <div className="flex flex-col gap-2">
        <Button onClick={onNext} size="lg">
          Get Started
        </Button>
        <button
          type="button"
          onClick={onSkip}
          className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
        >
          I&apos;ll set up later
        </button>
      </div>
    </div>
  );
}

export function GranolaStep({ onNext, onSkip }: StepProps) {
  const [refreshToken, setRefreshToken] = useState("");
  const [clientId, setClientId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [instructionsOpen, setInstructionsOpen] = useState(false);

  async function handleConnect() {
    if (!refreshToken.trim() || !clientId.trim()) {
      setError("Both refresh token and client ID are required");
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
        throw new Error(data.error || "Failed to connect Granola");
      }
      onNext();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to connect Granola"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 py-2">
      <div>
        <h2 className="text-lg font-semibold">Connect Granola</h2>
        <p className="text-sm text-muted-foreground mt-1">
          ELITE imports your meeting notes from Granola to build relationship
          intelligence.
        </p>
      </div>

      <Collapsible open={instructionsOpen} onOpenChange={setInstructionsOpen}>
        <CollapsibleTrigger
          className="flex w-full items-center justify-between rounded-md p-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
        >
          <span>How to find your Granola credentials</span>
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform duration-200",
              instructionsOpen && "rotate-180"
            )}
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground mt-1">
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
                For Client ID, check the OAuth/login request or local storage
              </li>
            </ol>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <div className="space-y-2">
        <Label htmlFor="wizard_refresh_token">Refresh Token</Label>
        <Input
          id="wizard_refresh_token"
          type="password"
          placeholder="Paste your Granola refresh token"
          value={refreshToken}
          onChange={(e) => setRefreshToken(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="wizard_client_id">Client ID</Label>
        <Input
          id="wizard_client_id"
          type="text"
          placeholder="Granola WorkOS client ID"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
        />
      </div>

      {error && (
        <div className="flex items-center gap-2">
          <p className="text-sm text-destructive flex-1">{error}</p>
          <Button variant="outline" size="sm" onClick={handleConnect}>
            Retry
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Button onClick={handleConnect} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {saving ? "Connecting..." : "Connect & Continue"}
        </Button>
        <button
          type="button"
          onClick={onSkip}
          className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}

export function ProfileStep({ onNext, onSkip }: StepProps) {
  const [personalityProfile, setPersonalityProfile] = useState("");
  const [businessObjectives, setBusinessObjectives] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!personalityProfile.trim()) {
      setError("Communication style is required");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personality_profile: personalityProfile,
          business_objectives: businessObjectives || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save profile");
      }
      onNext();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save profile"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 py-2">
      <div>
        <h2 className="text-lg font-semibold">Complete Your Profile</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Tell us about your communication style so ELITE can draft emails in
          your voice.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="wizard_personality">Communication Style</Label>
        <Textarea
          id="wizard_personality"
          placeholder="Describe your tone, style, and personality for AI-drafted emails"
          rows={3}
          value={personalityProfile}
          onChange={(e) => setPersonalityProfile(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="wizard_objectives">
          Business Objectives{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Textarea
          id="wizard_objectives"
          placeholder="What are your current business goals?"
          rows={2}
          value={businessObjectives}
          onChange={(e) => setBusinessObjectives(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-col gap-2">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {saving ? "Saving..." : "Save & Continue"}
        </Button>
        <button
          type="button"
          onClick={onSkip}
          className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}

export function ProcessStep({ onNext, onSkip }: StepProps) {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleProcess() {
    setProcessing(true);
    setError(null);
    try {
      const res = await fetch("/api/meetings/process", {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to trigger processing");
      }
      setSuccess(true);
      // Give user a moment to see the success message before advancing
      setTimeout(() => onNext(), 2000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to trigger processing"
      );
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="space-y-4 py-2">
      <div>
        <h2 className="text-lg font-semibold">Process Your Meetings</h2>
        <p className="text-sm text-muted-foreground mt-1">
          ELITE will import your recent Granola meetings, extract contacts, and
          build your relationship graph automatically.
        </p>
      </div>

      {success ? (
        <div className="flex items-center gap-2 rounded-md bg-muted/50 p-4">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <p className="text-sm font-medium">
            Processing started! Your contacts will appear shortly.
          </p>
        </div>
      ) : (
        <>
          {error && (
            <div className="flex items-center gap-2">
              <p className="text-sm text-destructive flex-1">{error}</p>
              <Button variant="outline" size="sm" onClick={handleProcess}>
                Retry
              </Button>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button onClick={handleProcess} disabled={processing}>
              {processing && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {processing ? "Starting..." : "Process Now"}
            </Button>
            <button
              type="button"
              onClick={onSkip}
              className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
            >
              I&apos;ll do this later
            </button>
          </div>
        </>
      )}
    </div>
  );
}
