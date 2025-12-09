import { describe, it, expect } from 'vitest';
import {
  calculateReorderedSortKey,
  calculateNonReorderedSortKey,
  countReorderedBefore,
} from '../task-sorting-helpers';

describe('task-sorting-helpers', () => {
  describe('calculateReorderedSortKey', () => {
    it('should return the new position as sort key', () => {
      expect(calculateReorderedSortKey(0)).toBe(0);
      expect(calculateReorderedSortKey(1)).toBe(1);
      expect(calculateReorderedSortKey(5)).toBe(5);
      expect(calculateReorderedSortKey(100)).toBe(100);
    });

    it('should handle negative positions', () => {
      expect(calculateReorderedSortKey(-1)).toBe(-1);
      expect(calculateReorderedSortKey(-5)).toBe(-5);
    });

    it('should handle zero position', () => {
      expect(calculateReorderedSortKey(0)).toBe(0);
    });
  });

  describe('calculateNonReorderedSortKey', () => {
    it('should calculate sort key when maxReorderedBeforeNewPos is -1', () => {
      const result = calculateNonReorderedSortKey(5, 0, -1, 10);
      const expected = -1 + 5 / 11; // basePos = -1, fractionalOffset = 5/11

      expect(result).toBeCloseTo(expected, 10);
    });

    it('should calculate sort key when maxReorderedBeforeNewPos is provided', () => {
      const result = calculateNonReorderedSortKey(5, 0, 3, 10);
      const expected = 3 + 1 + 5 / 11; // basePos = 4, fractionalOffset = 5/11

      expect(result).toBeCloseTo(expected, 10);
    });

    it('should handle position 0', () => {
      const result = calculateNonReorderedSortKey(0, 0, 2, 10);
      const expected = 3 + 0 / 11; // basePos = 3, fractionalOffset = 0

      expect(result).toBeCloseTo(expected, 10);
    });

    it('should handle position at end of list', () => {
      const result = calculateNonReorderedSortKey(10, 0, 5, 10);
      const expected = 6 + 10 / 11; // basePos = 6, fractionalOffset = 10/11

      expect(result).toBeCloseTo(expected, 10);
    });

    it('should handle reorderedBeforeCount parameter (currently unused)', () => {
      // The function accepts reorderedBeforeCount but doesn't use it
      const result1 = calculateNonReorderedSortKey(5, 0, 3, 10);
      const result2 = calculateNonReorderedSortKey(5, 2, 3, 10);

      // Results should be the same since reorderedBeforeCount is not used
      expect(result1).toBeCloseTo(result2, 10);
    });

    it('should handle edge case with totalTasks = 0', () => {
      const result = calculateNonReorderedSortKey(0, 0, -1, 0);
      const expected = -1 + 0 / 1; // fractionalOffset = 0/1 = 0

      expect(result).toBeCloseTo(expected, 10);
    });

    it('should handle very large totalTasks', () => {
      const result = calculateNonReorderedSortKey(50, 0, 10, 1000);
      const expected = 11 + 50 / 1001;

      expect(result).toBeCloseTo(expected, 10);
    });
  });

  describe('countReorderedBefore', () => {
    it('should count reordered tasks with oldPos < targetOldPos', () => {
      const taskIds = ['task1', 'task2'];
      const oldOrderMap = new Map([
        ['task1', 2],
        ['task2', 4],
      ]);
      const newPositionMap = new Map([
        ['task1', 1],
        ['task2', 3],
      ]);
      const targetOldPos = 5;

      const result = countReorderedBefore(taskIds, oldOrderMap, newPositionMap, targetOldPos);

      // Both tasks have oldPos < targetOldPos (5)
      expect(result).toBe(2);
    });

    it('should count reordered tasks that moved before targetOldPos', () => {
      const taskIds = ['task1', 'task2'];
      const oldOrderMap = new Map([
        ['task1', 10], // oldPos > targetOldPos
        ['task2', 8], // oldPos > targetOldPos
      ]);
      const newPositionMap = new Map([
        ['task1', 3], // newPos < targetOldPos
        ['task2', 4], // newPos < targetOldPos
      ]);
      const targetOldPos = 5;

      const result = countReorderedBefore(taskIds, oldOrderMap, newPositionMap, targetOldPos);

      // Both tasks moved from after targetOldPos to before it
      expect(result).toBe(2);
    });

    it('should not count tasks that did not move before targetOldPos', () => {
      const taskIds = ['task1', 'task2'];
      const oldOrderMap = new Map([
        ['task1', 10], // oldPos > targetOldPos
        ['task2', 8], // oldPos > targetOldPos
      ]);
      const newPositionMap = new Map([
        ['task1', 6], // newPos > targetOldPos (did not move before)
        ['task2', 7], // newPos > targetOldPos (did not move before)
      ]);
      const targetOldPos = 5;

      const result = countReorderedBefore(taskIds, oldOrderMap, newPositionMap, targetOldPos);

      // Neither task moved before targetOldPos
      expect(result).toBe(0);
    });

    it('should handle mixed scenarios', () => {
      const taskIds = ['task1', 'task2', 'task3', 'task4'];
      const oldOrderMap = new Map([
        ['task1', 2], // oldPos < targetOldPos (count)
        ['task2', 10], // oldPos > targetOldPos, newPos < targetOldPos (count)
        ['task3', 8], // oldPos > targetOldPos, newPos > targetOldPos (don't count)
        ['task4', 1], // oldPos < targetOldPos (count)
      ]);
      const newPositionMap = new Map([
        ['task1', 0],
        ['task2', 3], // moved before targetOldPos
        ['task3', 6], // still after targetOldPos
        ['task4', 1],
      ]);
      const targetOldPos = 5;

      const result = countReorderedBefore(taskIds, oldOrderMap, newPositionMap, targetOldPos);

      // task1, task2, task4 should be counted
      expect(result).toBe(3);
    });

    it('should handle empty taskIds array', () => {
      const result = countReorderedBefore([], new Map(), new Map(), 5);

      expect(result).toBe(0);
    });

    it('should handle tasks not in oldOrderMap', () => {
      const taskIds = ['task1', 'task2'];
      const oldOrderMap = new Map([['task1', 2]]);
      const newPositionMap = new Map([
        ['task1', 1],
        ['task2', 3],
      ]);
      const targetOldPos = 5;

      const result = countReorderedBefore(taskIds, oldOrderMap, newPositionMap, targetOldPos);

      // task2 is not in oldOrderMap, so oldPos = Infinity, which is > targetOldPos
      // newPos = 3 < targetOldPos, so it should be counted
      expect(result).toBe(2); // task1 (oldPos < target) + task2 (moved before)
    });

    it('should handle tasks not in newPositionMap', () => {
      const taskIds = ['task1', 'task2'];
      const oldOrderMap = new Map([
        ['task1', 2],
        ['task2', 4],
      ]);
      const newPositionMap = new Map([['task1', 1]]);
      const targetOldPos = 5;

      const result = countReorderedBefore(taskIds, oldOrderMap, newPositionMap, targetOldPos);

      // task2 is not in newPositionMap, so newPos = Infinity, which is > targetOldPos
      // oldPos = 4 < targetOldPos, so it should be counted
      expect(result).toBe(2); // task1 (oldPos < target) + task2 (oldPos < target)
    });

    it('should handle targetOldPos = 0', () => {
      const taskIds = ['task1'];
      const oldOrderMap = new Map([
        ['task1', 1], // oldPos > targetOldPos (0)
      ]);
      const newPositionMap = new Map([
        ['task1', 0], // newPos = targetOldPos (edge case)
      ]);
      const targetOldPos = 0;

      const result = countReorderedBefore(taskIds, oldOrderMap, newPositionMap, targetOldPos);

      // newPos (0) is not < targetOldPos (0), so it should not be counted
      expect(result).toBe(0);
    });
  });
});
