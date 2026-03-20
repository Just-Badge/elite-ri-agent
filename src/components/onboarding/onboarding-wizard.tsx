"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { OnboardingStatus } from "@/lib/onboarding";
import {
  WelcomeStep,
  GranolaStep,
  ProfileStep,
  ProcessStep,
} from "@/components/onboarding/wizard-steps";

interface OnboardingWizardProps {
  onboardingStatus: OnboardingStatus;
  onComplete: () => void;
}

type WizardStepId = "welcome" | "granola" | "profile" | "process";

export function OnboardingWizard({
  onboardingStatus,
  onComplete,
}: OnboardingWizardProps) {
  const [open, setOpen] = useState(true);

  // Build list of steps, skipping those already completed
  const steps = useMemo(() => {
    const allSteps: WizardStepId[] = ["welcome", "granola", "profile", "process"];
    return allSteps.filter((step) => {
      if (step === "welcome") return true; // always show welcome
      if (step === "granola") return !onboardingStatus.has_granola;
      if (step === "profile") return !onboardingStatus.has_profile;
      if (step === "process") return !onboardingStatus.has_contacts;
      return true;
    });
  }, [onboardingStatus]);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const currentStep = steps[currentStepIndex];

  function handleNext() {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      // All steps done
      setOpen(false);
      onComplete();
    }
  }

  function handleSkip() {
    setOpen(false);
    onComplete();
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setOpen(false);
      onComplete();
    }
  }

  // Calculate display step number (exclude welcome from count)
  const stepsWithoutWelcome = steps.filter((s) => s !== "welcome");
  const currentDisplayIndex =
    currentStep === "welcome"
      ? 0
      : stepsWithoutWelcome.indexOf(currentStep) + 1;
  const totalDisplaySteps = stepsWithoutWelcome.length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="sr-only">Setup Wizard</DialogTitle>
          <DialogDescription className="sr-only">
            Walk through the setup steps to get started with ELITE.
          </DialogDescription>
          {currentStep !== "welcome" && totalDisplaySteps > 0 && (
            <p className="text-xs text-muted-foreground">
              Step {currentDisplayIndex} of {totalDisplaySteps}
            </p>
          )}
        </DialogHeader>

        {currentStep === "welcome" && (
          <WelcomeStep onNext={handleNext} onSkip={handleSkip} />
        )}
        {currentStep === "granola" && (
          <GranolaStep onNext={handleNext} onSkip={handleSkip} />
        )}
        {currentStep === "profile" && (
          <ProfileStep onNext={handleNext} onSkip={handleSkip} />
        )}
        {currentStep === "process" && (
          <ProcessStep onNext={handleNext} onSkip={handleSkip} />
        )}
      </DialogContent>
    </Dialog>
  );
}
