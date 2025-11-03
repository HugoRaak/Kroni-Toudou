export type CalendarView = 'day' | 'week' | 'month';

/**
 * Navigates a calendar date by one unit in the specified direction.
 * @param date - The current anchor date
 * @param direction - 'prev' to go backward, 'next' to go forward
 * @param view - The calendar view type
 * @returns A new Date object with the updated date
 */
export function navigateCalendarDate(
  date: Date,
  direction: 'prev' | 'next',
  view: CalendarView
): Date {
  const newDate = new Date(date);
  const multiplier = direction === 'next' ? 1 : -1;
  
  switch (view) {
    case 'day':
      newDate.setDate(date.getDate() + multiplier);
      break;
    case 'week':
      newDate.setDate(date.getDate() + (multiplier * 7));
      break;
    case 'month':
      newDate.setMonth(date.getMonth() + multiplier);
      break;
  }
  
  return newDate;
}

