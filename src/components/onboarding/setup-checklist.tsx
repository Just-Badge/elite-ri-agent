"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Circle } from "lucide-react";
import type { OnboardingStatus, OnboardingStep } from "@/lib/onboarding";
import { ONBOARDING_STEPS } from "@/lib/onboarding";

const STEP_LINKS: Record<OnboardingStep, string> = {
  granola: "/settings/integrations",
  profile: "/settings/profile",
  contacts: "/contacts",
};

function isStepComplete(
  step: OnboardingStep,
  status: OnboardingStatus
): boolean {
  switch (step) {
    case "granola":
      return status.has_granola;
    case "profile":
      return status.has_profile;
    case "contacts":
      return status.has_contacts;
  }
}

export function SetupChecklist() {
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch("/api/onboarding/status");
        if (!res.ok) return;
        const { data } = await res.json();
        setStatus(data);
      } catch {
        // Silently fail - checklist is non-critical
      } finally {
        setLoading(false);
      }
    }
    fetchStatus();
  }, []);

  if (loading) {
    return (
      <SidebarGroup>
        <SidebarGroupLabel>Setup Progress</SidebarGroupLabel>
        <SidebarGroupContent>
          <div className="space-y-2 px-2">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  // Don't render if complete or if fetch failed
  if (!status || status.is_complete) {
    return null;
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>
        Setup Progress ({status.completed_steps} of {status.total_steps})
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {ONBOARDING_STEPS.map((step) => {
            const complete = isStepComplete(step.id, status);

            return (
              <SidebarMenuItem key={step.id}>
                {complete ? (
                  <SidebarMenuButton disabled className="opacity-60">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="line-through">{step.label}</span>
                  </SidebarMenuButton>
                ) : (
                  <SidebarMenuButton
                    render={<Link href={STEP_LINKS[step.id]} />}
                  >
                    <Circle className="h-4 w-4 text-muted-foreground" />
                    <span>{step.label}</span>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
