import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getMonthGridDates,
  getWeekDateRange,
  getMonthGridDatesArray,
} from '../calendar-date-utils';
import { formatDateLocal } from '@/lib/utils';

describe('calendar-date-utils', () => {
  beforeEach(() => {
    // Mock current date to 2024-06-15 (Saturday) for consistent tests
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 5, 15, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getMonthGridDates', () => {
    it('should return 42 dates (6 weeks)', () => {
      const anchor = new Date(2024, 5, 15); // June 15, 2024
      const dates = getMonthGridDates(anchor);

      expect(dates).toHaveLength(42);
    });

    it('should start from Monday of the week containing the first day of month', () => {
      // June 1, 2024 is a Saturday
      // The grid should start on Monday, May 27, 2024
      const anchor = new Date(2024, 5, 15);
      const dates = getMonthGridDates(anchor);

      const firstDate = dates[0];
      expect(firstDate.year).toBe(2024);
      expect(firstDate.month).toBe(4); // May (0-indexed)
      expect(firstDate.date).toBe(27);
    });

    it('should mark dates from current month correctly', () => {
      const anchor = new Date(2024, 5, 15); // June 2024
      const dates = getMonthGridDates(anchor);

      // First few dates should be from previous month (May)
      expect(dates[0].isCurrentMonth).toBe(false);
      expect(dates[4].isCurrentMonth).toBe(false);

      // Dates from June should be marked as current month
      const juneDates = dates.filter((d) => d.month === 5); // June is month 5 (0-indexed)
      juneDates.forEach((d) => {
        expect(d.isCurrentMonth).toBe(true);
      });
    });

    it('should mark today correctly', () => {
      const anchor = new Date(2024, 5, 15); // June 15, 2024 (today in mock)
      const dates = getMonthGridDates(anchor);

      const todayDate = dates.find((d) => d.date === 15 && d.month === 5 && d.year === 2024);
      expect(todayDate).toBeDefined();
      expect(todayDate?.isToday).toBe(true);
    });

    it('should not mark other dates as today', () => {
      const anchor = new Date(2024, 5, 15);
      const dates = getMonthGridDates(anchor);

      const todayDates = dates.filter((d) => d.isToday);
      expect(todayDates).toHaveLength(1);
    });

    it('should handle month starting on Monday', () => {
      // September 1, 2024 is a Sunday, so grid starts on Monday, August 26
      const anchor = new Date(2024, 8, 15); // September 15, 2024
      const dates = getMonthGridDates(anchor);

      // First date should be from previous month
      expect(dates[0].isCurrentMonth).toBe(false);
      // September dates should start later
      const septemberStart = dates.findIndex((d) => d.month === 8 && d.isCurrentMonth);
      expect(septemberStart).toBeGreaterThan(0);
    });

    it('should handle month ending on Sunday', () => {
      // June 30, 2024 is a Sunday
      const anchor = new Date(2024, 5, 15); // June 2024
      const dates = getMonthGridDates(anchor);

      // Last date of June should be marked as current month
      const juneDates = dates.filter((d) => d.month === 5);
      const lastJuneDate = juneDates[juneDates.length - 1];
      expect(lastJuneDate.date).toBe(30);
      expect(lastJuneDate.isCurrentMonth).toBe(true);
    });

    it('should normalize anchor to midnight', () => {
      const anchor = new Date(2024, 5, 15, 14, 30, 45);
      const dates = getMonthGridDates(anchor);

      // Should still work correctly regardless of time
      expect(dates).toHaveLength(42);
      const juneDates = dates.filter((d) => d.month === 5);
      expect(juneDates.length).toBeGreaterThan(0);
    });

    it('should handle February in leap year', () => {
      const anchor = new Date(2024, 1, 15); // February 2024 (leap year)
      const dates = getMonthGridDates(anchor);

      const febDates = dates.filter((d) => d.month === 1 && d.isCurrentMonth);
      // Should include February 29
      expect(febDates.some((d) => d.date === 29)).toBe(true);
    });

    it('should handle February in non-leap year', () => {
      const anchor = new Date(2023, 1, 15); // February 2023 (non-leap year)
      const dates = getMonthGridDates(anchor);

      const febDates = dates.filter((d) => d.month === 1 && d.isCurrentMonth);
      // Should not include February 29
      expect(febDates.some((d) => d.date === 29)).toBe(false);
      expect(febDates.some((d) => d.date === 28)).toBe(true);
    });
  });

  describe('getWeekDateRange', () => {
    it('should return Monday to Sunday range', () => {
      const anchor = new Date(2024, 5, 15); // June 15, 2024 (Saturday)
      const range = getWeekDateRange(anchor);

      expect(range.start.getDay()).toBe(1); // Monday
      expect(range.end.getDay()).toBe(0); // Sunday
    });

    it('should handle anchor on Monday', () => {
      const anchor = new Date(2024, 5, 10); // June 10, 2024 (Monday)
      const range = getWeekDateRange(anchor);

      expect(range.start.getDay()).toBe(1);
      expect(range.end.getDay()).toBe(0);
      expect(formatDateLocal(range.start)).toBe('2024-06-10');
      expect(formatDateLocal(range.end)).toBe('2024-06-16');
    });

    it('should handle anchor on Sunday', () => {
      const anchor = new Date(2024, 5, 16); // June 16, 2024 (Sunday)
      const range = getWeekDateRange(anchor);

      expect(range.start.getDay()).toBe(1);
      expect(range.end.getDay()).toBe(0);
      expect(formatDateLocal(range.start)).toBe('2024-06-10');
      expect(formatDateLocal(range.end)).toBe('2024-06-16');
    });

    it('should handle anchor in middle of week', () => {
      const anchor = new Date(2024, 5, 12); // June 12, 2024 (Wednesday)
      const range = getWeekDateRange(anchor);

      expect(range.start.getDay()).toBe(1); // Monday
      expect(range.end.getDay()).toBe(0); // Sunday
      expect(formatDateLocal(range.start)).toBe('2024-06-10');
      expect(formatDateLocal(range.end)).toBe('2024-06-16');
    });

    it('should normalize dates to midnight', () => {
      const anchor = new Date(2024, 5, 15, 14, 30, 45);
      const range = getWeekDateRange(anchor);

      expect(range.start.getHours()).toBe(0);
      expect(range.start.getMinutes()).toBe(0);
      expect(range.end.getHours()).toBe(0);
      expect(range.end.getMinutes()).toBe(0);
    });

    it('should handle week crossing month boundary', () => {
      // May 31, 2024 is a Friday
      const anchor = new Date(2024, 4, 31); // May 31, 2024
      const range = getWeekDateRange(anchor);

      // Week should start on Monday, May 27 and end on Sunday, June 2
      expect(range.start.getMonth()).toBe(4); // May
      expect(range.start.getDate()).toBe(27);
      expect(range.end.getMonth()).toBe(5); // June
      expect(range.end.getDate()).toBe(2);
    });

    it('should handle week crossing year boundary', () => {
      // December 30, 2024 is a Monday
      const anchor = new Date(2024, 11, 30); // December 30, 2024
      const range = getWeekDateRange(anchor);

      // Week should start on Monday, December 30 and end on Sunday, January 5, 2025
      expect(range.start.getFullYear()).toBe(2024);
      expect(range.start.getMonth()).toBe(11); // December
      expect(range.end.getFullYear()).toBe(2025);
      expect(range.end.getMonth()).toBe(0); // January
    });
  });

  describe('getMonthGridDatesArray', () => {
    it('should return 42 dates as Date objects', () => {
      const anchor = new Date(2024, 5, 15);
      const dates = getMonthGridDatesArray(anchor);

      expect(dates).toHaveLength(42);
      dates.forEach((date) => {
        expect(date).toBeInstanceOf(Date);
      });
    });

    it('should start from Monday of the week containing the first day of month', () => {
      const anchor = new Date(2024, 5, 15); // June 2024
      const dates = getMonthGridDatesArray(anchor);

      const firstDate = dates[0];
      expect(firstDate.getFullYear()).toBe(2024);
      expect(firstDate.getMonth()).toBe(4); // May
      expect(firstDate.getDate()).toBe(27);
    });

    it('should normalize all dates to midnight', () => {
      const anchor = new Date(2024, 5, 15, 14, 30);
      const dates = getMonthGridDatesArray(anchor);

      dates.forEach((date) => {
        expect(date.getHours()).toBe(0);
        expect(date.getMinutes()).toBe(0);
        expect(date.getSeconds()).toBe(0);
        expect(date.getMilliseconds()).toBe(0);
      });
    });

    it('should include dates from previous and next month', () => {
      const anchor = new Date(2024, 5, 15); // June 2024
      const dates = getMonthGridDatesArray(anchor);

      // First few dates should be from May
      expect(dates[0].getMonth()).toBe(4); // May

      // Middle dates should be from June
      const juneDates = dates.filter((d) => d.getMonth() === 5);
      expect(juneDates.length).toBeGreaterThan(0);

      // Last few dates should be from July
      const lastDate = dates[dates.length - 1];
      expect(lastDate.getMonth()).toBe(6); // July
    });

    it('should handle February in leap year', () => {
      const anchor = new Date(2024, 1, 15); // February 2024 (leap year)
      const dates = getMonthGridDatesArray(anchor);

      const febDates = dates.filter((d) => d.getMonth() === 1);
      expect(febDates.some((d) => d.getDate() === 29)).toBe(true);
    });

    it('should handle February in non-leap year', () => {
      const anchor = new Date(2023, 1, 15); // February 2023 (non-leap year)
      const dates = getMonthGridDatesArray(anchor);

      const febDates = dates.filter((d) => d.getMonth() === 1);
      expect(febDates.some((d) => d.getDate() === 29)).toBe(false);
    });

    it('should normalize anchor to midnight', () => {
      const anchor = new Date(2024, 5, 15, 14, 30, 45);
      const dates = getMonthGridDatesArray(anchor);

      // Should still work correctly
      expect(dates).toHaveLength(42);
    });
  });
});
