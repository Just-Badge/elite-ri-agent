import { ProfileForm } from "@/components/settings/profile-form";

export default function ProfileSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile Settings</h1>
        <p className="text-muted-foreground">
          Define your communication style and business context for AI-generated
          drafts.
        </p>
      </div>
      <ProfileForm />
    </div>
  );
}
