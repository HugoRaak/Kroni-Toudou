import { describe, it, expect } from 'vitest';
import { navigateCalendarDate } from '../calendar-navigation';
import { normalizeToMidnight, formatDateLocal } from '@/lib/utils';

describe('calendar-navigation', () => {
  describe('navigateCalendarDate', () => {
    describe('day view', () => {
      it('should navigate forward by one day', () => {
        const date = new Date(2024, 5, 15); // June 15, 2024
        const result = navigateCalendarDate(date, 'next', 'day');

        expect(formatDateLocal(result)).toBe('2024-06-16');
      });

      it('should navigate backward by one day', () => {
        const date = new Date(2024, 5, 15);
        const result = navigateCalendarDate(date, 'prev', 'day');

        expect(formatDateLocal(result)).toBe('2024-06-14');
      });

      it('should handle month boundaries when navigating forward', () => {
        const date = new Date(2024, 5, 30); // June 30, 2024
        const result = navigateCalendarDate(date, 'next', 'day');

        expect(result.getMonth()).toBe(6); // July
        expect(result.getDate()).toBe(1);
      });

      it('should handle month boundaries when navigating backward', () => {
        const date = new Date(2024, 5, 1); // June 1, 2024
        const result = navigateCalendarDate(date, 'prev', 'day');

        expect(result.getMonth()).toBe(4); // May
        expect(result.getDate()).toBe(31);
      });

      it('should handle year boundaries when navigating forward', () => {
        const date = new Date(2023, 11, 31); // December 31, 2023
        const result = navigateCalendarDate(date, 'next', 'day');

        expect(result.getFullYear()).toBe(2024);
        expect(result.getMonth()).toBe(0); // January
        expect(result.getDate()).toBe(1);
      });

      it('should handle year boundaries when navigating backward', () => {
        const date = new Date(2024, 0, 1); // January 1, 2024
        const result = navigateCalendarDate(date, 'prev', 'day');

        expect(result.getFullYear()).toBe(2023);
        expect(result.getMonth()).toBe(11); // December
        expect(result.getDate()).toBe(31);
      });

      it('should normalize result to midnight', () => {
        const date = new Date(2024, 5, 15, 14, 30, 45);
        const result = navigateCalendarDate(date, 'next', 'day');

        expect(result.getHours()).toBe(0);
        expect(result.getMinutes()).toBe(0);
        expect(result.getSeconds()).toBe(0);
      });
    });

    describe('week view', () => {
      it('should navigate forward by 7 days', () => {
        const date = new Date(2024, 5, 15); // June 15, 2024
        const result = navigateCalendarDate(date, 'next', 'week');

        expect(formatDateLocal(result)).toBe('2024-06-22');
      });

      it('should navigate backward by 7 days', () => {
        const date = new Date(2024, 5, 15);
        const result = navigateCalendarDate(date, 'prev', 'week');

        expect(formatDateLocal(result)).toBe('2024-06-08');
      });

      it('should handle month boundaries when navigating forward', () => {
        const date = new Date(2024, 5, 28); // June 28, 2024
        const result = navigateCalendarDate(date, 'next', 'week');

        expect(result.getMonth()).toBe(6); // July
        expect(result.getDate()).toBe(5);
      });

      it('should handle month boundaries when navigating backward', () => {
        const date = new Date(2024, 5, 3); // June 3, 2024
        const result = navigateCalendarDate(date, 'prev', 'week');

        expect(result.getMonth()).toBe(4); // May
        expect(result.getDate()).toBe(27);
      });

      it('should handle year boundaries when navigating forward', () => {
        const date = new Date(2023, 11, 28); // December 28, 2023
        const result = navigateCalendarDate(date, 'next', 'week');

        expect(result.getFullYear()).toBe(2024);
        expect(result.getMonth()).toBe(0); // January
        expect(result.getDate()).toBe(4);
      });

      it('should normalize result to midnight', () => {
        const date = new Date(2024, 5, 15, 14, 30, 45);
        const result = navigateCalendarDate(date, 'next', 'week');

        expect(result.getHours()).toBe(0);
        expect(result.getMinutes()).toBe(0);
      });
    });

    describe('month view', () => {
      it('should navigate forward by one month', () => {
        const date = new Date(2024, 5, 15); // June 15, 2024
        const result = navigateCalendarDate(date, 'next', 'month');

        expect(result.getFullYear()).toBe(2024);
        expect(result.getMonth()).toBe(6); // July
        expect(result.getDate()).toBe(15);
      });

      it('should navigate backward by one month', () => {
        const date = new Date(2024, 5, 15);
        const result = navigateCalendarDate(date, 'prev', 'month');

        expect(result.getFullYear()).toBe(2024);
        expect(result.getMonth()).toBe(4); // May
        expect(result.getDate()).toBe(15);
      });

      it('should handle year boundaries when navigating forward', () => {
        const date = new Date(2023, 11, 15); // December 15, 2023
        const result = navigateCalendarDate(date, 'next', 'month');

        expect(result.getFullYear()).toBe(2024);
        expect(result.getMonth()).toBe(0); // January
        expect(result.getDate()).toBe(15);
      });

      it('should handle year boundaries when navigating backward', () => {
        const date = new Date(2024, 0, 15); // January 15, 2024
        const result = navigateCalendarDate(date, 'prev', 'month');

        expect(result.getFullYear()).toBe(2023);
        expect(result.getMonth()).toBe(11); // December
        expect(result.getDate()).toBe(15);
      });

      it('should handle months with different day counts', () => {
        // Navigate from January 31 to February
        const date = new Date(2024, 0, 31); // January 31, 2024
        const result = navigateCalendarDate(date, 'next', 'month');

        // February has 29 days in 2024 (leap year), so should adjust to Feb 29
        expect(result.getMonth()).toBe(1); // February
        expect(result.getDate()).toBe(29);
      });

      it('should handle February 29 in leap year when navigating to non-leap year', () => {
        const date = new Date(2024, 1, 29); // February 29, 2024 (leap year)
        const result = navigateCalendarDate(date, 'next', 'month');

        // March 29, 2024
        expect(result.getMonth()).toBe(2); // March
        expect(result.getDate()).toBe(29);
      });

      it('should normalize result to midnight', () => {
        const date = new Date(2024, 5, 15, 14, 30, 45);
        const result = navigateCalendarDate(date, 'next', 'month');

        expect(result.getHours()).toBe(0);
        expect(result.getMinutes()).toBe(0);
      });
    });

    describe('edge cases', () => {
      it('should handle invalid view by returning normalized date', () => {
        const date = new Date(2024, 5, 15, 14, 30, 45);

        const result = navigateCalendarDate(date, 'next', 'invalid' as any);

        const normalized = normalizeToMidnight(date);
        expect(result.getTime()).toBe(normalized.getTime());
      });

      it('should preserve date when navigating with same date multiple times', () => {
        const date = new Date(2024, 5, 15);
        let result = date;

        // Navigate forward then backward
        result = navigateCalendarDate(result, 'next', 'day');
        result = navigateCalendarDate(result, 'prev', 'day');

        expect(formatDateLocal(result)).toBe('2024-06-15');
      });
    });
  });
});
