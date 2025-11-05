import { normalizeToMidnight } from "@/lib/utils";

export type CalendarView = 'day' | 'week' | 'month';

/**
 * Navigates a calendar date by one unit in the specified direction.
 * @param date - The current anchor date
 * @param direction - 'prev' to go backward, 'next' to go forward
 * @param view - The calendar view type
 * @returns A new Date object with the updated date (normalized to midnight local time)
 */
export function navigateCalendarDate(
  date: Date,
  direction: 'prev' | 'next',
  view: CalendarView
): Date {
  const normalized = normalizeToMidnight(date);
  const multiplier = direction === 'next' ? 1 : -1;
  
  // Create dates directly using constructor to guarantee midnight local time
  switch (view) {
    case 'day':
      return new Date(normalized.getFullYear(), normalized.getMonth(), normalized.getDate() + multiplier);
    case 'week':
      return new Date(normalized.getFullYear(), normalized.getMonth(), normalized.getDate() + (multiplier * 7));
    case 'month':
      return new Date(normalized.getFullYear(), normalized.getMonth() + multiplier, normalized.getDate());
    default:
      return normalized;
  }
}

