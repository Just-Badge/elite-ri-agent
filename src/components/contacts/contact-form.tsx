"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  contactSchema,
  CONTACT_CATEGORIES,
  type ContactFormValues,
} from "@/lib/validations/contacts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { focusFirstError } from "@/lib/utils/focus-first-error";

interface ContactFormProps {
  contact: ContactFormValues & { id: string; status?: string };
  onSave: (values: ContactFormValues) => Promise<void>;
  saving?: boolean;
}

const STATUS_OPTIONS = ["active", "not_pursuing", "dormant"] as const;

export function ContactForm({ contact, onSave, saving }: ContactFormProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: contact.name ?? "",
      email: contact.email ?? "",
      company: contact.company ?? "",
      role: contact.role ?? "",
      location: contact.location ?? "",
      connected_via: contact.connected_via ?? "",
      category: contact.category,
      background: contact.background ?? "",
      relationship_context: {
        why: contact.relationship_context?.why ?? "",
        what: contact.relationship_context?.what ?? "",
        mutual_value: contact.relationship_context?.mutual_value ?? "",
      },
      status: (contact.status as "active" | "not_pursuing" | "dormant") ?? "active",
      outreach_frequency_days: contact.outreach_frequency_days ?? 30,
      notes: contact.notes ?? "",
    },
  });

  return (
    <form onSubmit={handleSubmit(onSave, () => focusFirstError(errors))} className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            {...register("name")}
            aria-invalid={!!errors.name}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            {...register("email")}
            aria-invalid={!!errors.email}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="company">Company</Label>
          <Input id="company" {...register("company")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="role">Role</Label>
          <Input id="role" {...register("role")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input id="location" {...register("location")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="connected_via">Connected Via</Label>
          <Input id="connected_via" {...register("connected_via")} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Category</Label>
          <Controller
            name="category"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value ?? ""}
                onValueChange={field.onChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CONTACT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat.replace("-", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-2">
          <Label>Status</Label>
          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value ?? "active"}
                onValueChange={field.onChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="background">Background</Label>
        <Textarea
          id="background"
          rows={3}
          {...register("background")}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="relationship_context.why">Why We Connected</Label>
          <Textarea
            id="relationship_context.why"
            rows={2}
            {...register("relationship_context.why")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="relationship_context.what">What Was Discussed</Label>
          <Textarea
            id="relationship_context.what"
            rows={2}
            {...register("relationship_context.what")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="relationship_context.mutual_value">Mutual Value</Label>
          <Textarea
            id="relationship_context.mutual_value"
            rows={2}
            {...register("relationship_context.mutual_value")}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="outreach_frequency_days">Outreach Frequency (days)</Label>
        <Input
          id="outreach_frequency_days"
          type="number"
          min={1}
          max={365}
          {...register("outreach_frequency_days", { valueAsNumber: true })}
        />
        {errors.outreach_frequency_days && (
          <p className="text-sm text-destructive">
            {errors.outreach_frequency_days.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          rows={4}
          {...register("notes")}
        />
      </div>

      <Button type="submit" disabled={saving}>
        {saving ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}
