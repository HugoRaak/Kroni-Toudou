/**
 * Calendar date utilities for month and week views
 */

export interface MonthGridDate {
  date: number;
  month: number;
  year: number;
  isCurrentMonth: boolean;
  isToday: boolean;
}

/**
 * Gets all dates for a month grid (42 days: 6 weeks)
 */
export function getMonthGridDates(anchorDate: Date): MonthGridDate[] {
  const year = anchorDate.getFullYear();
  const month = anchorDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const startDate = new Date(firstDay);
  // Start from Monday (day 1 in JS where 0 = Sunday)
  startDate.setDate(startDate.getDate() - firstDay.getDay() + 1);

  const dates: MonthGridDate[] = [];
  const dateIterator = new Date(startDate);
  const today = new Date();

  for (let i = 0; i < 42; i++) {
    dates.push({
      date: dateIterator.getDate(),
      month: dateIterator.getMonth(),
      year: dateIterator.getFullYear(),
      isCurrentMonth: dateIterator.getMonth() === month,
      isToday: dateIterator.toDateString() === today.toDateString(),
    });
    dateIterator.setDate(dateIterator.getDate() + 1);
  }

  return dates;
}

/**
 * Gets the date range for a week view (Monday to Sunday)
 */
export function getWeekDateRange(anchorDate: Date): { start: Date; end: Date } {
  const startDate = new Date(anchorDate);
  // Get Monday of the week
  startDate.setDate(anchorDate.getDate() - anchorDate.getDay() + 1);
  
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6); // Sunday

  return { start: startDate, end: endDate };
}

/**
 * Gets all dates for a month grid (used for workdays editing)
 */
export function getMonthGridDatesArray(anchorDate: Date): Date[] {
  const firstDay = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay() + 1);
  
  const dates: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    dates.push(d);
  }
  return dates;
}

