import { ScheduleForm } from "@/components/settings/schedule-form";

export default function ScheduleSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Processing Schedule
        </h1>
        <p className="text-muted-foreground">
          Configure when and how often meetings are processed.
        </p>
      </div>
      <ScheduleForm />
      <p className="text-sm text-muted-foreground">
        Meetings from Granola will be checked and processed during this window.
      </p>
    </div>
  );
}
