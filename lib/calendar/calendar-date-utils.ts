/**
 * Calendar date utilities for month and week views
 */

import { formatDateLocal, normalizeToMidnight } from "@/lib/utils";

export interface MonthGridDate {
  date: number;
  month: number;
  year: number;
  isCurrentMonth: boolean;
  isToday: boolean;
}

/**
 * Gets all dates for a month grid (42 days: 6 weeks)
 * Week starts on Monday (French locale)
 */
export function getMonthGridDates(anchorDate: Date): MonthGridDate[] {
  const normalizedAnchor = normalizeToMidnight(anchorDate);
  const year = normalizedAnchor.getFullYear();
  const month = normalizedAnchor.getMonth();

  const firstDay = new Date(year, month, 1);
  const startDate = new Date(firstDay);
  // Start from Monday: getDay() returns 0 (Sunday) to 6 (Saturday)
  // To get Monday: if day is 0 (Sunday), go back 6 days; otherwise go back (day - 1) days
  const dayOfWeek = firstDay.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  startDate.setDate(startDate.getDate() - daysToMonday);

  const dates: MonthGridDate[] = [];
  const dateIterator = new Date(startDate);
  const today = normalizeToMidnight(new Date());
  const todayStr = formatDateLocal(today);

  for (let i = 0; i < 42; i++) {
    const dateStr = formatDateLocal(dateIterator);
    dates.push({
      date: dateIterator.getDate(),
      month: dateIterator.getMonth(),
      year: dateIterator.getFullYear(),
      isCurrentMonth: dateIterator.getMonth() === month,
      isToday: dateStr === todayStr,
    });
    dateIterator.setDate(dateIterator.getDate() + 1);
  }

  return dates;
}

/**
 * Gets the date range for a week view (Monday to Sunday)
 * Week starts on Monday (French locale)
 */
export function getWeekDateRange(anchorDate: Date): { start: Date; end: Date } {
  const normalizedAnchor = normalizeToMidnight(anchorDate);
  const startDate = new Date(normalizedAnchor);
  // Get Monday of the week: getDay() returns 0 (Sunday) to 6 (Saturday)
  // To get Monday: if day is 0 (Sunday), go back 6 days; otherwise go back (day - 1) days
  const dayOfWeek = normalizedAnchor.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  startDate.setDate(normalizedAnchor.getDate() - daysToMonday);
  
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6); // Sunday

  return { start: startDate, end: endDate };
}

/**
 * Gets all dates for a month grid (used for workdays editing)
 * Week starts on Monday (French locale)
 */
export function getMonthGridDatesArray(anchorDate: Date): Date[] {
  const normalizedAnchor = normalizeToMidnight(anchorDate);
  const firstDay = new Date(normalizedAnchor.getFullYear(), normalizedAnchor.getMonth(), 1);
  const startDate = new Date(firstDay);
  // Start from Monday: getDay() returns 0 (Sunday) to 6 (Saturday)
  // To get Monday: if day is 0 (Sunday), go back 6 days; otherwise go back (day - 1) days
  const dayOfWeek = firstDay.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  startDate.setDate(startDate.getDate() - daysToMonday);
  
  const dates: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    dates.push(d);
  }
  return dates;
}

