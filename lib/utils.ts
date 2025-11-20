import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { getWeekDateRange } from "./calendar/calendar-date-utils";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Formats a date to YYYY-MM-DD using local timezone components (not UTC)
export function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Parses a YYYY-MM-DD date string to Date object using local timezone (avoids UTC timezone issues)
export function parseDateLocal(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// Normalizes a date to midnight local time (00:00:00) to avoid timezone issues
export function normalizeToMidnight(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// Checks if a date is before today (in the past)
export function isPastDate(date: Date): boolean {
  const normalizedDate = normalizeToMidnight(date);
  const normalizedToday = normalizeToMidnight(new Date());
  return normalizedDate < normalizedToday;
}

// Helper function to add days to a date
// Uses milliseconds to avoid timezone and month boundary issues
export function addDays(date: Date, days: number): Date {
  const normalized = normalizeToMidnight(date);
  const result = new Date(normalized.getTime() + days * 24 * 60 * 60 * 1000);
  return normalizeToMidnight(result);
}

export function getRangeForView(
  view: "day" | "week" | "month",
  anchor: Date
) {
  const d = normalizeToMidnight(anchor);

  if (view === "day") {
    return { start: d, end: d };
  }

  if (view === "week") {
    const range = getWeekDateRange(d);

    return { start: range.start, end: range.end };
  }

  if (view === "month") {
    return {
      start: new Date(d.getFullYear(), d.getMonth(), 1),
      end: new Date(d.getFullYear(), d.getMonth() + 1, 0)
    };
  }

  throw new Error(`Unknown view: ${view}`);
}
