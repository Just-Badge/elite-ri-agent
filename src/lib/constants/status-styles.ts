/**
 * Centralized status style constants.
 *
 * Single source of truth for status colors, risk borders, and sync status
 * styles used across contact and draft components.
 */

export const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500",
  dormant: "bg-gray-400",
  not_pursuing: "bg-red-500",
};

export const RISK_BORDER: Record<string, string> = {
  critical: "border-l-4 border-l-red-500",
  warning: "border-l-4 border-l-amber-500",
};

export const SYNC_STATUS_STYLES: Record<string, { dot: string; label: string; description: string }> = {
  synced: { dot: "bg-green-500", label: "Synced", description: "This draft is synced with your Gmail drafts folder" },
  pending: { dot: "bg-yellow-500", label: "Pending", description: "Waiting to sync with Gmail" },
  failed: { dot: "bg-red-500", label: "Failed", description: "Failed to sync with Gmail -- will retry automatically" },
};
