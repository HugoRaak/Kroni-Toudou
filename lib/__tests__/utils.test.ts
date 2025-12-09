import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  cn,
  formatDateLocal,
  parseDateLocal,
  normalizeToMidnight,
  isPastDate,
  addDays,
  getRangeForView,
} from '../utils';

describe('utils', () => {
  describe('cn', () => {
    it('should merge class names correctly', () => {
      expect(cn('foo', 'bar')).toBe('foo bar');
    });

    it('should handle conditional classes', () => {
      expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz');
    });

    it('should merge Tailwind classes and remove conflicts', () => {
      // tailwind-merge should remove conflicting classes
      expect(cn('px-2', 'px-4')).toBe('px-4');
    });

    it('should handle empty inputs', () => {
      expect(cn()).toBe('');
      expect(cn('')).toBe('');
    });

    it('should handle arrays and objects', () => {
      expect(cn(['foo', 'bar'], { baz: true, qux: false })).toBe('foo bar baz');
    });
  });

  describe('formatDateLocal', () => {
    it('should format a date to YYYY-MM-DD', () => {
      const date = new Date(2024, 0, 15); // January 15, 2024
      expect(formatDateLocal(date)).toBe('2024-01-15');
    });

    it('should pad single-digit months and days', () => {
      const date = new Date(2024, 0, 5); // January 5, 2024
      expect(formatDateLocal(date)).toBe('2024-01-05');
    });

    it('should handle year boundaries', () => {
      const date = new Date(2023, 11, 31); // December 31, 2023
      expect(formatDateLocal(date)).toBe('2023-12-31');
    });

    it('should handle month boundaries', () => {
      const date = new Date(2024, 0, 1); // January 1, 2024
      expect(formatDateLocal(date)).toBe('2024-01-01');
      
      const date2 = new Date(2024, 1, 29); // February 29, 2024 (leap year)
      expect(formatDateLocal(date2)).toBe('2024-02-29');
    });

    it('should use local timezone components', () => {
      // Create a date that would be different in UTC
      const date = new Date(2024, 5, 15, 23, 30); // June 15, 2024, 23:30
      // Should still format as June 15, not June 16
      expect(formatDateLocal(date)).toBe('2024-06-15');
    });
  });

  describe('parseDateLocal', () => {
    it('should parse YYYY-MM-DD string to Date object', () => {
      const date = parseDateLocal('2024-01-15');
      expect(date.getFullYear()).toBe(2024);
      expect(date.getMonth()).toBe(0); // January is 0
      expect(date.getDate()).toBe(15);
    });

    it('should handle single-digit months and days', () => {
      const date = parseDateLocal('2024-01-05');
      expect(date.getFullYear()).toBe(2024);
      expect(date.getMonth()).toBe(0);
      expect(date.getDate()).toBe(5);
    });

    it('should handle year boundaries', () => {
      const date = parseDateLocal('2023-12-31');
      expect(date.getFullYear()).toBe(2023);
      expect(date.getMonth()).toBe(11);
      expect(date.getDate()).toBe(31);
    });

    it('should handle leap years', () => {
      const date = parseDateLocal('2024-02-29');
      expect(date.getFullYear()).toBe(2024);
      expect(date.getMonth()).toBe(1);
      expect(date.getDate()).toBe(29);
    });

    it('should create date in local timezone', () => {
      const date = parseDateLocal('2024-06-15');
      // Should be at midnight local time, not UTC
      expect(date.getHours()).toBe(0);
      expect(date.getMinutes()).toBe(0);
      expect(date.getSeconds()).toBe(0);
    });
  });

  describe('normalizeToMidnight', () => {
    it('should set time to midnight (00:00:00)', () => {
      const date = new Date(2024, 5, 15, 14, 30, 45, 123);
      const normalized = normalizeToMidnight(date);
      
      expect(normalized.getHours()).toBe(0);
      expect(normalized.getMinutes()).toBe(0);
      expect(normalized.getSeconds()).toBe(0);
      expect(normalized.getMilliseconds()).toBe(0);
    });

    it('should preserve year, month, and day', () => {
      const date = new Date(2024, 5, 15, 14, 30, 45);
      const normalized = normalizeToMidnight(date);
      
      expect(normalized.getFullYear()).toBe(2024);
      expect(normalized.getMonth()).toBe(5);
      expect(normalized.getDate()).toBe(15);
    });

    it('should handle dates already at midnight', () => {
      const date = new Date(2024, 5, 15, 0, 0, 0, 0);
      const normalized = normalizeToMidnight(date);
      
      expect(normalized.getTime()).toBe(date.getTime());
    });

    it('should handle dates at end of day', () => {
      const date = new Date(2024, 5, 15, 23, 59, 59, 999);
      const normalized = normalizeToMidnight(date);
      
      expect(normalized.getHours()).toBe(0);
      expect(normalized.getDate()).toBe(15);
    });
  });

  describe('isPastDate', () => {
    beforeEach(() => {
      // Mock current date to 2024-06-15 12:00:00
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2024, 5, 15, 12, 0, 0));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return true for dates in the past', () => {
      const pastDate = new Date(2024, 5, 14); // June 14, 2024
      expect(isPastDate(pastDate)).toBe(true);
    });

    it('should return false for today', () => {
      const today = new Date(2024, 5, 15); // June 15, 2024
      expect(isPastDate(today)).toBe(false);
    });

    it('should return false for future dates', () => {
      const futureDate = new Date(2024, 5, 16); // June 16, 2024
      expect(isPastDate(futureDate)).toBe(false);
    });

    it('should compare only dates, ignoring time', () => {
      // Even if the past date has a later time, it should be considered past
      const pastDate = new Date(2024, 5, 14, 23, 59, 59); // June 14, 2024 23:59:59
      expect(isPastDate(pastDate)).toBe(true);
      
      // Even if today has an earlier time, it should not be considered past
      const today = new Date(2024, 5, 15, 0, 0, 0); // June 15, 2024 00:00:00
      expect(isPastDate(today)).toBe(false);
    });

    it('should handle dates far in the past', () => {
      const farPast = new Date(2020, 0, 1);
      expect(isPastDate(farPast)).toBe(true);
    });

    it('should handle dates far in the future', () => {
      const farFuture = new Date(2030, 0, 1);
      expect(isPastDate(farFuture)).toBe(false);
    });
  });

  describe('addDays', () => {
    it('should add positive days', () => {
      const date = new Date(2024, 0, 15); // January 15, 2024
      const result = addDays(date, 5);
      
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(0);
      expect(result.getDate()).toBe(20);
    });

    it('should subtract days when negative', () => {
      const date = new Date(2024, 0, 15);
      const result = addDays(date, -5);
      
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(0);
      expect(result.getDate()).toBe(10);
    });

    it('should handle month boundaries', () => {
      const date = new Date(2024, 0, 31); // January 31, 2024
      const result = addDays(date, 1);
      
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(1); // February
      expect(result.getDate()).toBe(1);
    });

    it('should handle year boundaries', () => {
      const date = new Date(2023, 11, 31); // December 31, 2023
      const result = addDays(date, 1);
      
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(0); // January
      expect(result.getDate()).toBe(1);
    });

    it('should handle leap years', () => {
      const date = new Date(2024, 1, 28); // February 28, 2024 (leap year)
      const result = addDays(date, 1);
      
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(1);
      expect(result.getDate()).toBe(29); // February 29
    });

    it('should normalize result to midnight', () => {
      const date = new Date(2024, 0, 15, 14, 30, 45);
      const result = addDays(date, 1);
      
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
    });

    it('should handle zero days', () => {
      const date = new Date(2024, 0, 15);
      const result = addDays(date, 0);
      
      expect(result.getTime()).toBe(normalizeToMidnight(date).getTime());
    });

    it('should handle large day offsets', () => {
      const date = new Date(2024, 0, 15);
      const result = addDays(date, 100);
      
      // Should be approximately 100 days later
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBeGreaterThan(0);
    });
  });

  describe('getRangeForView', () => {
    it('should return same date for day view', () => {
      const anchor = new Date(2024, 5, 15, 14, 30); // June 15, 2024
      const range = getRangeForView('day', anchor);
      
      expect(range.start.getTime()).toBe(range.end.getTime());
      expect(formatDateLocal(range.start)).toBe('2024-06-15');
      expect(formatDateLocal(range.end)).toBe('2024-06-15');
    });

    it('should normalize anchor to midnight for day view', () => {
      const anchor = new Date(2024, 5, 15, 14, 30);
      const range = getRangeForView('day', anchor);
      
      expect(range.start.getHours()).toBe(0);
      expect(range.start.getMinutes()).toBe(0);
    });

    it('should return week range (Monday to Sunday) for week view', () => {
      // June 15, 2024 is a Saturday
      const anchor = new Date(2024, 5, 15);
      const range = getRangeForView('week', anchor);
      
      // Week should start on Monday (June 10) and end on Sunday (June 16)
      expect(range.start.getDay()).toBe(1); // Monday
      expect(range.end.getDay()).toBe(0); // Sunday
      expect(formatDateLocal(range.start)).toBe('2024-06-10');
      expect(formatDateLocal(range.end)).toBe('2024-06-16');
    });

    it('should handle week view when anchor is Monday', () => {
      // June 10, 2024 is a Monday
      const anchor = new Date(2024, 5, 10);
      const range = getRangeForView('week', anchor);
      
      expect(range.start.getDay()).toBe(1); // Monday
      expect(range.end.getDay()).toBe(0); // Sunday
      expect(formatDateLocal(range.start)).toBe('2024-06-10');
      expect(formatDateLocal(range.end)).toBe('2024-06-16');
    });

    it('should handle week view when anchor is Sunday', () => {
      // June 16, 2024 is a Sunday
      const anchor = new Date(2024, 5, 16);
      const range = getRangeForView('week', anchor);
      
      expect(range.start.getDay()).toBe(1); // Monday
      expect(range.end.getDay()).toBe(0); // Sunday
      expect(formatDateLocal(range.start)).toBe('2024-06-10');
      expect(formatDateLocal(range.end)).toBe('2024-06-16');
    });

    it('should return month range for month view', () => {
      const anchor = new Date(2024, 5, 15); // June 15, 2024
      const range = getRangeForView('month', anchor);
      
      // Should start on June 1 and end on June 30
      expect(range.start.getFullYear()).toBe(2024);
      expect(range.start.getMonth()).toBe(5); // June
      expect(range.start.getDate()).toBe(1);
      
      expect(range.end.getFullYear()).toBe(2024);
      expect(range.end.getMonth()).toBe(5); // June
      expect(range.end.getDate()).toBe(30);
    });

    it('should handle month view for February in leap year', () => {
      const anchor = new Date(2024, 1, 15); // February 15, 2024 (leap year)
      const range = getRangeForView('month', anchor);
      
      expect(range.start.getDate()).toBe(1);
      expect(range.end.getDate()).toBe(29); // February 29 in leap year
    });

    it('should handle month view for February in non-leap year', () => {
      const anchor = new Date(2023, 1, 15); // February 15, 2023 (non-leap year)
      const range = getRangeForView('month', anchor);
      
      expect(range.start.getDate()).toBe(1);
      expect(range.end.getDate()).toBe(28); // February 28 in non-leap year
    });

    it('should handle month view for December', () => {
      const anchor = new Date(2024, 11, 15); // December 15, 2024
      const range = getRangeForView('month', anchor);
      
      expect(range.start.getMonth()).toBe(11); // December
      expect(range.start.getDate()).toBe(1);
      expect(range.end.getMonth()).toBe(11); // December
      expect(range.end.getDate()).toBe(31);
    });

    it('should handle month view crossing year boundary', () => {
      const anchor = new Date(2023, 11, 15); // December 15, 2023
      const range = getRangeForView('month', anchor);
      
      expect(range.start.getFullYear()).toBe(2023);
      expect(range.start.getMonth()).toBe(11);
      expect(range.end.getFullYear()).toBe(2023);
      expect(range.end.getMonth()).toBe(11);
    });

    it('should throw error for unknown view', () => {
      const anchor = new Date(2024, 5, 15);
      
      // Testing invalid view type
      expect(() => getRangeForView('invalid' as 'day' | 'week' | 'month', anchor)).toThrow('Unknown view: invalid');
    });
  });
});
