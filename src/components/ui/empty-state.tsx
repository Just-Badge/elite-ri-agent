import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";

export interface EmptyStateProps {
  icon: LucideIcon;
  heading: string;
  description: string;
  action?: { label: string; href: string };
  compact?: boolean;
}

export function EmptyState({
  icon: Icon,
  heading,
  description,
  action,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${
        compact ? "py-6" : "py-12"
      }`}
    >
      <Icon
        className={`text-muted-foreground/50 ${
          compact ? "h-8 w-8 mb-2" : "h-12 w-12 mb-4"
        }`}
      />
      {compact ? (
        <p className="text-sm font-medium">{heading}</p>
      ) : (
        <h3 className="text-lg font-medium">{heading}</h3>
      )}
      <p
        className={`text-muted-foreground mt-1 ${
          compact ? "text-xs" : "text-sm"
        }`}
      >
        {description}
      </p>
      {action && (
        <Button render={<Link href={action.href} />} className="mt-4">
          {action.label}
        </Button>
      )}
    </div>
  );
}
