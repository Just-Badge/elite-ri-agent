/**
 * Shared scheduling utilities.
 *
 * Extracted from the dispatcher so they can be reused by both
 * meeting and outreach dispatchers, and tested independently.
 */

export interface ProcessingSchedule {
  interval_hours: number;
  start_hour: number;
  end_hour: number;
  timezone: string;
}

/**
 * Get the current hour (0-23) in a given IANA timezone.
 * Uses Intl.DateTimeFormat to reliably handle DST and timezone offsets.
 */
export function getHourInTimezone(date: Date, timezone: string): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const hourPart = parts.find((p) => p.type === "hour");
  return parseInt(hourPart?.value ?? "0", 10);
}

/**
 * Check if processing should occur at the given hour based on interval.
 * Calculates if the current hour is at an interval boundary from the start hour.
 * Handles wraparound for windows that cross midnight.
 */
export function shouldProcessAtHour(
  currentHour: number,
  startHour: number,
  endHour: number,
  intervalHours: number
): boolean {
  let hoursSinceStart: number;

  if (startHour <= endHour) {
    if (currentHour < startHour || currentHour >= endHour) {
      return false;
    }
    hoursSinceStart = currentHour - startHour;
  } else {
    if (currentHour < startHour && currentHour >= endHour) {
      return false;
    }
    if (currentHour >= startHour) {
      hoursSinceStart = currentHour - startHour;
    } else {
      hoursSinceStart = 24 - startHour + currentHour;
    }
  }

  return hoursSinceStart % intervalHours === 0;
}
