import { describe, it, expect } from 'vitest';
import {
  isValidTaskType,
  isValidFrequency,
  isValidDayOfWeek,
  isValidMode,
  validateTaskTitle,
  validateTaskDescription,
  validatePostponedDays,
  validateDueOn,
  validateCustomDays,
  validateStartDate,
  validateMaxShiftingDays,
} from '../task-validation';
import { TASK_TYPES, FREQUENCIES, DAYS_OF_WEEK, TASK_DESCRIPTION_MAX_LENGTH } from '@/lib/tasks/constants/task-constants';

describe('task-validation', () => {
  describe('isValidTaskType', () => {
    it('should return true for valid task types', () => {
      expect(isValidTaskType(TASK_TYPES.PERIODIC)).toBe(true);
      expect(isValidTaskType(TASK_TYPES.SPECIFIC)).toBe(true);
      expect(isValidTaskType(TASK_TYPES.WHEN_POSSIBLE)).toBe(true);
    });

    it('should return false for invalid task types', () => {
      expect(isValidTaskType('invalid')).toBe(false);
      expect(isValidTaskType('')).toBe(false);
      expect(isValidTaskType('PERIODIC')).toBe(false); // uppercase
    });
  });

  describe('isValidFrequency', () => {
    it('should return true for valid frequencies', () => {
      FREQUENCIES.forEach(freq => {
        expect(isValidFrequency(freq)).toBe(true);
      });
    });

    it('should return false for invalid frequencies', () => {
      expect(isValidFrequency('invalid')).toBe(false);
      expect(isValidFrequency('')).toBe(false);
      expect(isValidFrequency('daily')).toBe(false);
    });
  });

  describe('isValidDayOfWeek', () => {
    it('should return true for valid days of week', () => {
      DAYS_OF_WEEK.forEach(day => {
        expect(isValidDayOfWeek(day)).toBe(true);
      });
    });

    it('should return false for invalid days of week', () => {
      expect(isValidDayOfWeek('invalid')).toBe(false);
      expect(isValidDayOfWeek('')).toBe(false);
      expect(isValidDayOfWeek('Monday')).toBe(false); // English
    });
  });

  describe('isValidMode', () => {
    it('should return true for valid modes', () => {
      expect(isValidMode('Tous')).toBe(true);
      expect(isValidMode('Présentiel')).toBe(true);
      expect(isValidMode('Distanciel')).toBe(true);
    });

    it('should return false for invalid modes', () => {
      expect(isValidMode('invalid')).toBe(false);
      expect(isValidMode('')).toBe(false);
      expect(isValidMode('Remote')).toBe(false);
    });
  });

  describe('validateTaskTitle', () => {
    it('should return true for valid titles', () => {
      expect(validateTaskTitle('Valid Title')).toBe(true);
      expect(validateTaskTitle('A')).toBe(true);
      expect(validateTaskTitle('a'.repeat(100))).toBe(true); // Max length
    });

    it('should return false for empty or whitespace-only titles', () => {
      expect(validateTaskTitle('')).toBe(false);
      expect(validateTaskTitle('   ')).toBe(false);
      expect(validateTaskTitle('\t\n')).toBe(false);
    });

    it('should return false for titles exceeding max length', () => {
      expect(validateTaskTitle('a'.repeat(101))).toBe(false);
      expect(validateTaskTitle('a'.repeat(200))).toBe(false);
    });

    it('should trim whitespace before validation', () => {
      expect(validateTaskTitle('  Valid Title  ')).toBe(true);
      expect(validateTaskTitle('  ')).toBe(false);
    });
  });

  describe('validateTaskDescription', () => {
    it('should return true for valid descriptions', () => {
      expect(validateTaskDescription('')).toBe(true);
      expect(validateTaskDescription('Valid description')).toBe(true);
      expect(validateTaskDescription('a'.repeat(TASK_DESCRIPTION_MAX_LENGTH))).toBe(true); // Max length
    });

    it('should return false for descriptions exceeding max length', () => {
      expect(validateTaskDescription('a'.repeat(TASK_DESCRIPTION_MAX_LENGTH + 1))).toBe(false);
      expect(validateTaskDescription('a'.repeat(TASK_DESCRIPTION_MAX_LENGTH * 2))).toBe(false);
    });
  });

  describe('validatePostponedDays', () => {
    it('should return true for positive integers', () => {
      expect(validatePostponedDays('1')).toBe(true);
      expect(validatePostponedDays('5')).toBe(true);
      expect(validatePostponedDays('100')).toBe(true);
    });

    it('should return false for zero', () => {
      expect(validatePostponedDays('0')).toBe(false);
    });

    it('should return false for negative numbers', () => {
      expect(validatePostponedDays('-1')).toBe(false);
      expect(validatePostponedDays('-5')).toBe(false);
    });

    it('should return false for non-integers', () => {
      expect(validatePostponedDays('1.5')).toBe(false);
    });

    it('should accept integer-like values with .0', () => {
      expect(validatePostponedDays('2.0')).toBe(true);
    });

    it('should return false for non-numeric strings', () => {
      expect(validatePostponedDays('abc')).toBe(false);
      expect(validatePostponedDays('')).toBe(false);
    });
  });

  describe('validateDueOn', () => {
    it('should return true for valid YYYY-MM-DD dates', () => {
      expect(validateDueOn('2024-06-15')).toBe(true);
      expect(validateDueOn('2024-01-01')).toBe(true);
      expect(validateDueOn('2024-12-31')).toBe(true);
    });

    it('should return false for invalid date formats', () => {
      expect(validateDueOn('2024/06/15')).toBe(false);
      expect(validateDueOn('06-15-2024')).toBe(false);
      expect(validateDueOn('2024-6-15')).toBe(false);
      expect(validateDueOn('24-06-15')).toBe(false);
    });

    it('should return false for invalid dates', () => {
      expect(validateDueOn('2024-02-30')).toBe(false); // Invalid date
      expect(validateDueOn('2024-13-01')).toBe(false); // Invalid month
      expect(validateDueOn('2024-06-32')).toBe(false); // Invalid day
    });

    it('should return false for empty string', () => {
      expect(validateDueOn('')).toBe(false);
    });

    it('should handle leap years correctly', () => {
      expect(validateDueOn('2024-02-29')).toBe(true); // Leap year
      expect(validateDueOn('2023-02-29')).toBe(false); // Non-leap year
    });
  });

  describe('validateCustomDays', () => {
    it('should return true for positive integers', () => {
      expect(validateCustomDays('1')).toBe(true);
      expect(validateCustomDays('7')).toBe(true);
      expect(validateCustomDays('30')).toBe(true);
    });

    it('should return false for zero', () => {
      expect(validateCustomDays('0')).toBe(false);
    });

    it('should return false for negative numbers', () => {
      expect(validateCustomDays('-1')).toBe(false);
    });

    it('should return false for non-integers', () => {
      expect(validateCustomDays('1.5')).toBe(false);
    });

    it('should return false for non-numeric strings', () => {
      expect(validateCustomDays('abc')).toBe(false);
      expect(validateCustomDays('')).toBe(false);
    });
  });

  describe('validateStartDate', () => {
    it('should use same validation as validateDueOn', () => {
      expect(validateStartDate('2024-06-15')).toBe(true);
      expect(validateStartDate('2024-02-30')).toBe(false);
      expect(validateStartDate('invalid')).toBe(false);
    });
  });

  describe('validateMaxShiftingDays', () => {
    it('should return true for valid positive integers within limit', () => {
      expect(validateMaxShiftingDays('1')).toBe(true);
      expect(validateMaxShiftingDays('45')).toBe(true); // Max limit
      expect(validateMaxShiftingDays('30')).toBe(true);
    });

    it('should return false for zero', () => {
      expect(validateMaxShiftingDays('0')).toBe(false);
    });

    it('should return false for negative numbers', () => {
      expect(validateMaxShiftingDays('-1')).toBe(false);
    });

    it('should return false for values exceeding limit', () => {
      expect(validateMaxShiftingDays('46')).toBe(false);
      expect(validateMaxShiftingDays('100')).toBe(false);
    });

    it('should return false for non-integers', () => {
      expect(validateMaxShiftingDays('1.5')).toBe(false);
    });

    it('should return false for non-numeric strings', () => {
      expect(validateMaxShiftingDays('abc')).toBe(false);
      expect(validateMaxShiftingDays('')).toBe(false);
    });
  });
});
