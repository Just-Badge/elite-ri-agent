"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  profileSchema,
  type ProfileFormValues,
} from "@/lib/validations/settings";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { focusFirstError } from "@/lib/utils/focus-first-error";
import { toast } from "sonner";

export function ProfileForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      personality_profile: "",
      business_objectives: "",
      projects: "",
    },
  });

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch("/api/settings/profile");
        if (!res.ok) throw new Error("Failed to load profile");
        const { data } = await res.json();
        reset({
          personality_profile: data.personality_profile || "",
          business_objectives: data.business_objectives || "",
          projects: data.projects || "",
        });
      } catch {
        toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [reset]);

  async function onSubmit(values: ProfileFormValues) {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save profile");
      }
      toast.success("Profile saved");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save profile"
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
            <div className="h-24 rounded bg-muted" />
            <div className="h-4 w-1/3 rounded bg-muted" />
            <div className="h-24 rounded bg-muted" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Communication Style</CardTitle>
        <CardDescription>
          Tell us about your communication preferences so the AI can draft
          emails in your voice.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit, () => focusFirstError(errors))} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="personality_profile">Communication Style</Label>
            <Textarea
              id="personality_profile"
              placeholder="Describe your tone, style, and personality for AI-drafted emails (e.g., 'casual and direct, uses humor, avoids corporate jargon')"
              rows={4}
              {...register("personality_profile")}
              aria-invalid={!!errors.personality_profile}
            />
            {errors.personality_profile && (
              <p className="text-sm text-destructive">
                {errors.personality_profile.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="business_objectives">Business Objectives</Label>
            <Textarea
              id="business_objectives"
              placeholder="What are your current business goals? (optional)"
              rows={3}
              {...register("business_objectives")}
              aria-invalid={!!errors.business_objectives}
            />
            {errors.business_objectives && (
              <p className="text-sm text-destructive">
                {errors.business_objectives.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="projects">Current Projects</Label>
            <Textarea
              id="projects"
              placeholder="What projects are you working on? (optional)"
              rows={3}
              {...register("projects")}
              aria-invalid={!!errors.projects}
            />
            {errors.projects && (
              <p className="text-sm text-destructive">
                {errors.projects.message}
              </p>
            )}
          </div>

          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Profile"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
