import { describe, it, expect } from 'vitest';
import {
  getDayName,
  getDefaultMaxShiftingDays,
  calculateOriginalScheduledDate,
} from '../periodic-dates';
import type { Task } from '@/lib/types';
import { formatDateLocal } from '@/lib/utils';

describe('periodic-dates', () => {
  const createMockTask = (overrides: Partial<Task> = {}): Task => ({
    id: '1',
    user_id: 'user1',
    title: 'Test Task',
    description: '',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  });

  describe('getDayName', () => {
    it('should return correct day name for each day of week', () => {
      expect(getDayName(new Date(2024, 5, 9))).toBe('Dimanche'); // Sunday
      expect(getDayName(new Date(2024, 5, 10))).toBe('Lundi'); // Monday
      expect(getDayName(new Date(2024, 5, 11))).toBe('Mardi'); // Tuesday
      expect(getDayName(new Date(2024, 5, 12))).toBe('Mercredi'); // Wednesday
      expect(getDayName(new Date(2024, 5, 13))).toBe('Jeudi'); // Thursday
      expect(getDayName(new Date(2024, 5, 14))).toBe('Vendredi'); // Friday
      expect(getDayName(new Date(2024, 5, 15))).toBe('Samedi'); // Saturday
    });
  });

  describe('getDefaultMaxShiftingDays', () => {
    it('should return 7 for hebdomadaire frequency', () => {
      expect(getDefaultMaxShiftingDays('hebdomadaire')).toBe(7);
    });

    it('should return 28 for mensuel frequency', () => {
      expect(getDefaultMaxShiftingDays('mensuel')).toBe(28);
    });

    it('should return 45 for annuel frequency', () => {
      expect(getDefaultMaxShiftingDays('annuel')).toBe(45);
    });

    it('should return 7 for personnalisé frequency', () => {
      expect(getDefaultMaxShiftingDays('personnalisé')).toBe(7);
    });

    it('should return 7 for undefined frequency', () => {
      expect(getDefaultMaxShiftingDays(undefined)).toBe(7);
    });

    it('should return 7 for quotidien frequency', () => {
      expect(getDefaultMaxShiftingDays('quotidien')).toBe(7);
    });
  });

  describe('calculateOriginalScheduledDate', () => {
    describe('hebdomadaire frequency', () => {
      it('should return target date if it matches task day', () => {
        const task = createMockTask({
          frequency: 'hebdomadaire',
          day: 'Lundi',
        });
        const targetDate = new Date(2024, 5, 10); // Monday, June 10, 2024

        const result = calculateOriginalScheduledDate(task, targetDate);

        expect(result).not.toBeNull();
        expect(formatDateLocal(result!)).toBe('2024-06-10');
      });

      it('should calculate previous occurrence when target is after task day', () => {
        const task = createMockTask({
          frequency: 'hebdomadaire',
          day: 'Lundi',
        });
        const targetDate = new Date(2024, 5, 12); // Wednesday, June 12, 2024

        const result = calculateOriginalScheduledDate(task, targetDate);

        expect(result).not.toBeNull();
        expect(formatDateLocal(result!)).toBe('2024-06-10'); // Previous Monday
      });

      it('should calculate previous occurrence when target is before task day', () => {
        const task = createMockTask({
          frequency: 'hebdomadaire',
          day: 'Vendredi',
        });
        const targetDate = new Date(2024, 5, 10); // Monday, June 10, 2024

        const result = calculateOriginalScheduledDate(task, targetDate);

        expect(result).not.toBeNull();
        expect(formatDateLocal(result!)).toBe('2024-06-07'); // Previous Friday
      });

      it('should return null if task has no day', () => {
        const task = createMockTask({
          frequency: 'hebdomadaire',
        });
        const targetDate = new Date(2024, 5, 10);

        const result = calculateOriginalScheduledDate(task, targetDate);

        expect(result).toBeNull();
      });
    });

    describe('mensuel frequency', () => {
      it('should return target date if it matches task day in first week', () => {
        const task = createMockTask({
          frequency: 'mensuel',
          day: 'Lundi',
        });
        const targetDate = new Date(2024, 5, 3); // Monday, June 3, 2024 (first Monday of month)

        const result = calculateOriginalScheduledDate(task, targetDate);

        expect(result).not.toBeNull();
        expect(formatDateLocal(result!)).toBe('2024-06-03');
      });

      it('should return first occurrence of month if target is later', () => {
        const task = createMockTask({
          frequency: 'mensuel',
          day: 'Lundi',
        });
        const targetDate = new Date(2024, 5, 15); // Saturday, June 15, 2024

        const result = calculateOriginalScheduledDate(task, targetDate);

        expect(result).not.toBeNull();
        expect(formatDateLocal(result!)).toBe('2024-06-03'); // First Monday of June
      });

      it('should return null if first occurrence is after target date', () => {
        const task = createMockTask({
          frequency: 'mensuel',
          day: 'Lundi',
        });
        const targetDate = new Date(2024, 5, 1); // Saturday, June 1, 2024 (before first Monday)

        const result = calculateOriginalScheduledDate(task, targetDate);

        expect(result).toBeNull();
      });

      it('should return null if task has no day', () => {
        const task = createMockTask({
          frequency: 'mensuel',
        });
        const targetDate = new Date(2024, 5, 10);

        const result = calculateOriginalScheduledDate(task, targetDate);

        expect(result).toBeNull();
      });
    });

    describe('annuel frequency', () => {
      it('should return candidate date if within max shifting days', () => {
        const task = createMockTask({
          frequency: 'annuel',
          start_date: '2023-06-15',
        });
        const targetDate = new Date(2024, 5, 20); // June 20, 2024

        const result = calculateOriginalScheduledDate(task, targetDate);

        expect(result).not.toBeNull();
        expect(formatDateLocal(result!)).toBe('2024-06-15');
      });

      it('should return null if no start_date', () => {
        const task = createMockTask({
          frequency: 'annuel',
        });
        const targetDate = new Date(2024, 5, 15);

        const result = calculateOriginalScheduledDate(task, targetDate);

        expect(result).toBeNull();
      });

      it('should return null if candidate date is after target date', () => {
        const task = createMockTask({
          frequency: 'annuel',
          start_date: '2023-06-15',
        });
        const targetDate = new Date(2024, 5, 10); // Before June 15

        const result = calculateOriginalScheduledDate(task, targetDate);

        expect(result).toBeNull();
      });

      it('should return null if target date is before start_date', () => {
        const task = createMockTask({
          frequency: 'annuel',
          start_date: '2024-06-15',
        });
        const targetDate = new Date(2024, 5, 10); // June 10, 2024

        const result = calculateOriginalScheduledDate(task, targetDate);

        expect(result).toBeNull();
      });

      it('should return null if days difference exceeds max_shifting_days', () => {
        const task = createMockTask({
          frequency: 'annuel',
          start_date: '2023-06-15',
          max_shifting_days: 10,
        });
        const targetDate = new Date(2024, 5, 30); // June 30, 2024 (15 days after June 15)

        const result = calculateOriginalScheduledDate(task, targetDate);

        expect(result).toBeNull();
      });

      it('should use default max_shifting_days if not provided', () => {
        const task = createMockTask({
          frequency: 'annuel',
          start_date: '2023-06-15',
        });
        const targetDate = new Date(2024, 5, 20); // Within 45 days

        const result = calculateOriginalScheduledDate(task, targetDate);

        expect(result).not.toBeNull();
      });
    });

    describe('personnalisé frequency', () => {
      it('should return target date if it matches custom_days interval', () => {
        const task = createMockTask({
          frequency: 'personnalisé',
          start_date: '2024-06-01',
          custom_days: 7,
        });
        const targetDate = new Date(2024, 5, 15); // 14 days after start (2 * 7)

        const result = calculateOriginalScheduledDate(task, targetDate);

        expect(result).not.toBeNull();
        expect(formatDateLocal(result!)).toBe('2024-06-15');
      });

      it('should return previous occurrence if target does not match interval', () => {
        const task = createMockTask({
          frequency: 'personnalisé',
          start_date: '2024-06-01',
          custom_days: 7,
        });
        const targetDate = new Date(2024, 5, 17); // 16 days after start (not a multiple of 7)

        const result = calculateOriginalScheduledDate(task, targetDate);

        expect(result).not.toBeNull();
        expect(formatDateLocal(result!)).toBe('2024-06-15'); // Previous occurrence (14 days)
      });

      it('should return null if no start_date', () => {
        const task = createMockTask({
          frequency: 'personnalisé',
          custom_days: 7,
        });
        const targetDate = new Date(2024, 5, 15);

        const result = calculateOriginalScheduledDate(task, targetDate);

        expect(result).toBeNull();
      });

      it('should return null if no custom_days', () => {
        const task = createMockTask({
          frequency: 'personnalisé',
          start_date: '2024-06-01',
        });
        const targetDate = new Date(2024, 5, 15);

        const result = calculateOriginalScheduledDate(task, targetDate);

        expect(result).toBeNull();
      });

      it('should return null if target date is before start_date', () => {
        const task = createMockTask({
          frequency: 'personnalisé',
          start_date: '2025-06-15',
          custom_days: 7,
        });
        const targetDate = new Date(2024, 5, 10); // June 10, 2024

        const result = calculateOriginalScheduledDate(task, targetDate);

        expect(result).toBeNull();
      });
      
      it('should handle negative days difference', () => {
        const task = createMockTask({
          frequency: 'personnalisé',
          start_date: '2024-06-15',
          custom_days: 7,
        });
        const targetDate = new Date(2024, 5, 10); // Before start_date

        const result = calculateOriginalScheduledDate(task, targetDate);

        expect(result).toBeNull();
      });
    });

    describe('edge cases', () => {
      it('should return null for unknown frequency', () => {
        const task = createMockTask({
          frequency: 'quotidien' as any,
        });
        const targetDate = new Date(2024, 5, 15);

        const result = calculateOriginalScheduledDate(task, targetDate);

        expect(result).toBeNull();
      });

      it('should handle task with no frequency', () => {
        const task = createMockTask({});
        const targetDate = new Date(2024, 5, 15);

        const result = calculateOriginalScheduledDate(task, targetDate);

        expect(result).toBeNull();
      });

      it('should normalize target date to midnight', () => {
        const task = createMockTask({
          frequency: 'hebdomadaire',
          day: 'Lundi',
        });
        const targetDate = new Date(2024, 5, 10, 14, 30, 45);

        const result = calculateOriginalScheduledDate(task, targetDate);

        expect(result).not.toBeNull();
        expect(result!.getHours()).toBe(0);
        expect(result!.getMinutes()).toBe(0);
      });
    });
  });
});
