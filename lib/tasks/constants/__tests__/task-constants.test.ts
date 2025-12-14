import { describe, it, expect } from 'vitest';
import { TASK_TYPE_STYLES, getTaskTypeClassName } from '../task-constants';

describe('task-constants', () => {
  describe('getTaskTypeClassName', () => {
    it('should return correct className for periodic tasks', () => {
      expect(getTaskTypeClassName('periodic')).toBe(TASK_TYPE_STYLES.periodic);
    });

    it('should return correct className for specific tasks', () => {
      expect(getTaskTypeClassName('specific')).toBe(TASK_TYPE_STYLES.specific);
    });

    it('should return correct className for when-possible tasks', () => {
      expect(getTaskTypeClassName('whenPossible')).toBe(TASK_TYPE_STYLES.whenPossible);
    });

    it('should return correct className for temp tasks', () => {
      expect(getTaskTypeClassName('temp')).toBe('border-blue-400/30 bg-blue-100/50');
    });

    it('should handle all valid task types', () => {
      const types: Array<'periodic' | 'specific' | 'temp' | 'whenPossible'> = [
        'periodic',
        'specific',
        'temp',
        'whenPossible',
      ];

      types.forEach((type) => {
        const className = getTaskTypeClassName(type);
        expect(typeof className).toBe('string');
        expect(className.length).toBeGreaterThan(0);
      });
    });
  });
});
