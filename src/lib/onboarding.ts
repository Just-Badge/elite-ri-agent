export interface OnboardingStatus {
  has_granola: boolean;
  has_contacts: boolean;
  has_profile: boolean;
  is_complete: boolean;
  completed_steps: number;
  total_steps: number;
}

export type OnboardingStep = "granola" | "profile" | "contacts";

export const ONBOARDING_STEPS: {
  id: OnboardingStep;
  label: string;
  description: string;
}[] = [
  {
    id: "granola",
    label: "Connect Granola",
    description: "Link your Granola account to import meetings",
  },
  {
    id: "profile",
    label: "Complete Profile",
    description: "Define your communication style for better outreach",
  },
  {
    id: "contacts",
    label: "Process Meetings",
    description: "Import contacts from your first meetings",
  },
];
