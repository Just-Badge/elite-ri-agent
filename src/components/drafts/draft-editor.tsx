"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { draftUpdateSchema } from "@/lib/validations/drafts";
import { focusFirstError } from "@/lib/utils/focus-first-error";
import type { z } from "zod";

type DraftUpdateData = z.infer<typeof draftUpdateSchema>;

export interface EditableDraft {
  id: string;
  subject: string;
  body: string;
}

interface DraftEditorProps {
  draft: EditableDraft | null;
  open: boolean;
  onClose: () => void;
  onSave: (data: DraftUpdateData) => void;
}

export function DraftEditor({ draft, open, onClose, onSave }: DraftEditorProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DraftUpdateData>({
    resolver: zodResolver(draftUpdateSchema),
    defaultValues: {
      subject: draft?.subject ?? "",
      body: draft?.body ?? "",
    },
  });

  useEffect(() => {
    if (draft) {
      reset({
        subject: draft.subject,
        body: draft.body,
      });
    }
  }, [draft, reset]);

  function onSubmit(data: DraftUpdateData) {
    onSave(data);
    onClose();
  }

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Edit Draft</SheetTitle>
          <SheetDescription>
            Edit the subject and body before sending.
          </SheetDescription>
        </SheetHeader>

        {draft && (
          <form onSubmit={handleSubmit(onSubmit, () => focusFirstError(errors))} className="space-y-4 px-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="draft-subject">Subject</Label>
              <Input
                id="draft-subject"
                {...register("subject")}
              />
              {errors.subject && (
                <p className="text-sm text-destructive">{errors.subject.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="draft-body">Body</Label>
              <Textarea
                id="draft-body"
                rows={10}
                {...register("body")}
              />
              {errors.body && (
                <p className="text-sm text-destructive">{errors.body.message}</p>
              )}
            </div>

            <SheetFooter className="gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </SheetFooter>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
