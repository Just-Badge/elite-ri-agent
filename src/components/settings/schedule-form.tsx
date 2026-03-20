"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  scheduleSchema,
  type ScheduleFormValues,
} from "@/lib/validations/settings";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { focusFirstError } from "@/lib/utils/focus-first-error";
import { toast } from "sonner";

const INTERVAL_OPTIONS = [1, 2, 4, 6, 8, 12, 24];

function formatHour(hour: number): string {
  if (hour === 0) return "12:00 AM";
  if (hour === 12) return "12:00 PM";
  if (hour < 12) return `${hour}:00 AM`;
  return `${hour - 12}:00 PM`;
}

const TIMEZONES = Intl.supportedValuesOf("timeZone");

export function ScheduleForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      interval_hours: 2,
      start_hour: 8,
      end_hour: 18,
      timezone: "America/Los_Angeles",
    },
  });

  useEffect(() => {
    async function fetchSchedule() {
      try {
        const res = await fetch("/api/settings/schedule");
        if (!res.ok) throw new Error("Failed to load schedule");
        const { data } = await res.json();
        reset({
          interval_hours: data.interval_hours ?? 2,
          start_hour: data.start_hour ?? 8,
          end_hour: data.end_hour ?? 18,
          timezone: data.timezone ?? "America/Los_Angeles",
        });
      } catch {
        toast.error("Failed to load schedule");
      } finally {
        setLoading(false);
      }
    }
    fetchSchedule();
  }, [reset]);

  async function onSubmit(values: ScheduleFormValues) {
    // Client-side validation: end_hour must be > start_hour
    if (values.end_hour <= values.start_hour) {
      setError("end_hour", {
        message: "End hour must be later than start hour",
      });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/settings/schedule", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save schedule");
      }
      toast.success("Schedule saved");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save schedule"
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
        <CardTitle>Processing Schedule</CardTitle>
        <CardDescription>
          Configure when meetings are checked and processed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit, () => focusFirstError(errors))} className="space-y-6">
          <div className="space-y-2">
            <Label>Check for new meetings every</Label>
            <Controller
              name="interval_hours"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(val) => field.onChange(Number(val))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select interval" />
                  </SelectTrigger>
                  <SelectContent>
                    {INTERVAL_OPTIONS.map((hours) => (
                      <SelectItem key={hours} value={hours}>
                        {hours === 1
                          ? "1 hour"
                          : `${hours} hours`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.interval_hours && (
              <p className="text-sm text-destructive">
                {errors.interval_hours.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Processing window start</Label>
              <Controller
                name="start_hour"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(val) => field.onChange(Number(val))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Start hour" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => (
                        <SelectItem key={i} value={i}>
                          {formatHour(i)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.start_hour && (
                <p className="text-sm text-destructive">
                  {errors.start_hour.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Processing window end</Label>
              <Controller
                name="end_hour"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(val) => field.onChange(Number(val))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="End hour" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => (
                        <SelectItem key={i} value={i}>
                          {formatHour(i)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.end_hour && (
                <p className="text-sm text-destructive">
                  {errors.end_hour.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Timezone</Label>
            <Controller
              name="timezone"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.timezone && (
              <p className="text-sm text-destructive">
                {errors.timezone.message}
              </p>
            )}
          </div>

          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Schedule"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
