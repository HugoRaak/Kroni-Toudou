import { describe, it, expect, beforeEach } from 'vitest';
import { groupTasksByType, groupInProgressTasksByDueDate } from '../task-filtering';
import type { Task } from '@/lib/types';
import { formatDateLocal, normalizeToMidnight, addDays } from '@/lib/utils';

describe('task-filtering', () => {
  const createMockTask = (overrides: Partial<Task> = {}): Task => ({
    id: '1',
    user_id: 'user1',
    title: 'Test Task',
    description: '',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  });

  describe('groupTasksByType', () => {
    it('should group periodic tasks correctly', () => {
      const tasks: Task[] = [
        createMockTask({ id: '1', frequency: 'quotidien' }),
        createMockTask({ id: '2', frequency: 'hebdomadaire' }),
        createMockTask({ id: '3', frequency: 'mensuel' }),
      ];

      const result = groupTasksByType(tasks);

      expect(result.periodic).toHaveLength(3);
      expect(result.specificDate).toHaveLength(0);
      expect(result.whenPossible).toHaveLength(0);
    });

    it('should group specific date tasks correctly (with in_progress=undefined)', () => {
      const tasks: Task[] = [
        createMockTask({ id: '1', due_on: '2024-06-15', in_progress: undefined }),
        createMockTask({ id: '2', due_on: '2024-06-20', in_progress: undefined }),
        createMockTask({ id: '3', due_on: '2024-07-01', in_progress: undefined }),
      ];

      const result = groupTasksByType(tasks);

      expect(result.periodic).toHaveLength(0);
      expect(result.specificDate).toHaveLength(3);
      expect(result.whenPossible).toHaveLength(0);
    });

    it('should group when-possible tasks correctly (with in_progress boolean)', () => {
      const tasks: Task[] = [
        createMockTask({ id: '1', in_progress: true }), // No frequency, in_progress=true
        createMockTask({ id: '2', in_progress: false }), // No frequency, in_progress=false
        createMockTask({ id: '3', in_progress: true, due_on: '2024-06-15' }), // No frequency, in_progress=true, with due_on
      ];

      const result = groupTasksByType(tasks);

      expect(result.periodic).toHaveLength(0);
      expect(result.specificDate).toHaveLength(0);
      expect(result.whenPossible).toHaveLength(3);
    });

    it('should correctly categorize all three types', () => {
      const tasks: Task[] = [
        createMockTask({ id: '1', frequency: 'quotidien' }), // periodic
        createMockTask({ id: '2', due_on: '2024-06-15', in_progress: undefined }), // specific
        createMockTask({ id: '3', in_progress: true }), // when-possible
      ];

      const result = groupTasksByType(tasks);

      expect(result.periodic).toHaveLength(1);
      expect(result.specificDate).toHaveLength(1);
      expect(result.whenPossible).toHaveLength(1);
    });

    it('should not include tasks with frequency in specificDate or whenPossible', () => {
      const tasks: Task[] = [
        createMockTask({ id: '1', frequency: 'quotidien', due_on: '2024-06-15' }),
      ];

      const result = groupTasksByType(tasks);

      expect(result.periodic).toHaveLength(1);
      expect(result.specificDate).toHaveLength(0);
      expect(result.whenPossible).toHaveLength(0);
    });

    it('should include tasks with due_on and in_progress=true in whenPossible', () => {
      const tasks: Task[] = [
        createMockTask({ id: '1', due_on: '2024-06-15', in_progress: true }),
      ];

      const result = groupTasksByType(tasks);

      expect(result.whenPossible).toHaveLength(1);
      expect(result.specificDate).toHaveLength(0);
    });

    it('should include tasks with due_on and in_progress=false in whenPossible', () => {
      const tasks: Task[] = [
        createMockTask({ id: '1', due_on: '2024-06-15', in_progress: false }),
      ];

      const result = groupTasksByType(tasks);

      expect(result.whenPossible).toHaveLength(1);
      expect(result.specificDate).toHaveLength(0);
    });

    it('should not include tasks with due_on and in_progress=undefined in whenPossible (should be specific)', () => {
      const tasks: Task[] = [
        createMockTask({ id: '1', due_on: '2024-06-15', in_progress: undefined }),
      ];

      const result = groupTasksByType(tasks);

      expect(result.whenPossible).toHaveLength(0);
      expect(result.specificDate).toHaveLength(1);
    });

    it('should not include tasks with in_progress=undefined in whenPossible', () => {
      const tasks: Task[] = [
        createMockTask({ id: '1', in_progress: undefined }),
      ];

      const result = groupTasksByType(tasks);

      expect(result.whenPossible).toHaveLength(0);
    });

    it('should ensure periodic tasks are never in whenPossible or specific', () => {
      const tasks: Task[] = [
        createMockTask({ id: '1', frequency: 'quotidien', in_progress: true }),
        createMockTask({ id: '2', frequency: 'hebdomadaire', due_on: '2024-06-15', in_progress: undefined }),
      ];

      const result = groupTasksByType(tasks);

      expect(result.periodic).toHaveLength(2);
      expect(result.specificDate).toHaveLength(0);
      expect(result.whenPossible).toHaveLength(0);
    });

    describe('sorting periodic tasks', () => {
      it('should sort periodic tasks by display_order ascending', () => {
        const tasks: Task[] = [
          createMockTask({ id: '1', frequency: 'quotidien', display_order: 3 }),
          createMockTask({ id: '2', frequency: 'hebdomadaire', display_order: 1 }),
          createMockTask({ id: '3', frequency: 'mensuel', display_order: 2 }),
        ];

        const result = groupTasksByType(tasks);

        expect(result.periodic[0].id).toBe('2');
        expect(result.periodic[1].id).toBe('3');
        expect(result.periodic[2].id).toBe('1');
      });

      it('should place tasks without display_order after tasks with display_order', () => {
        const tasks: Task[] = [
          createMockTask({ id: '1', frequency: 'quotidien', display_order: 2 }),
          createMockTask({ id: '2', frequency: 'hebdomadaire' }), // no display_order
          createMockTask({ id: '3', frequency: 'mensuel', display_order: 1 }),
        ];

        const result = groupTasksByType(tasks);

        expect(result.periodic[0].id).toBe('3');
        expect(result.periodic[1].id).toBe('1');
        expect(result.periodic[2].id).toBe('2');
      });
    });

    describe('sorting specificDate tasks', () => {
      it('should sort specificDate tasks by due_on ascending', () => {
        const tasks: Task[] = [
          createMockTask({ id: '1', due_on: '2024-06-20' }),
          createMockTask({ id: '2', due_on: '2024-06-15' }),
          createMockTask({ id: '3', due_on: '2024-07-01' }),
        ];

        const result = groupTasksByType(tasks);

        expect(result.specificDate[0].id).toBe('2');
        expect(result.specificDate[1].id).toBe('1');
        expect(result.specificDate[2].id).toBe('3');
      });

      it('should handle tasks without due_on in specificDate (edge case)', () => {
        const tasks: Task[] = [
          createMockTask({ id: '1', due_on: '2024-06-15', in_progress: undefined }),
          createMockTask({ id: '2' }), // no due_on, no in_progress, should not be in specificDate
        ];

        const result = groupTasksByType(tasks);

        expect(result.specificDate).toHaveLength(1);
        expect(result.specificDate[0].id).toBe('1');
      });
    });

    describe('sorting whenPossible tasks', () => {
      it('should sort whenPossible tasks by display_order ascending', () => {
        const tasks: Task[] = [
          createMockTask({ id: '1', display_order: 3, in_progress: true }),
          createMockTask({ id: '2', display_order: 1, in_progress: false }),
          createMockTask({ id: '3', display_order: 2, in_progress: true }),
        ];

        const result = groupTasksByType(tasks);

        expect(result.whenPossible[0].id).toBe('2');
        expect(result.whenPossible[1].id).toBe('3');
        expect(result.whenPossible[2].id).toBe('1');
      });

      it('should place in_progress tasks before others when display_order is equal', () => {
        const tasks: Task[] = [
          createMockTask({ id: '1', display_order: 1, in_progress: false }),
          createMockTask({ id: '2', display_order: 1, in_progress: true }),
          createMockTask({ id: '3', display_order: 2, in_progress: false }),
        ];

        const result = groupTasksByType(tasks);

        expect(result.whenPossible[0].id).toBe('2'); // in_progress first
        expect(result.whenPossible[1].id).toBe('1');
        expect(result.whenPossible[2].id).toBe('3');
      });

      it('should place tasks without display_order after tasks with display_order', () => {
        const tasks: Task[] = [
          createMockTask({ id: '1', display_order: 2, in_progress: true }),
          createMockTask({ id: '2', in_progress: false }), // no display_order
          createMockTask({ id: '3', display_order: 1, in_progress: true }),
        ];

        const result = groupTasksByType(tasks);

        expect(result.whenPossible[0].id).toBe('3');
        expect(result.whenPossible[1].id).toBe('1');
        expect(result.whenPossible[2].id).toBe('2');
      });

      it('should handle all tasks without display_order', () => {
        const tasks: Task[] = [
          createMockTask({ id: '1', in_progress: true }),
          createMockTask({ id: '2', in_progress: false }),
          createMockTask({ id: '3', in_progress: true }),
        ];

        const result = groupTasksByType(tasks);

        // in_progress tasks should come first
        expect(result.whenPossible[0].in_progress).toBe(true);
        expect(result.whenPossible[1].in_progress).toBe(true);
        expect(result.whenPossible[2].in_progress).toBe(false);
      });
    });

    it('should handle empty array', () => {
      const result = groupTasksByType([]);

      expect(result.periodic).toEqual([]);
      expect(result.specificDate).toEqual([]);
      expect(result.whenPossible).toEqual([]);
    });
  });

  describe('groupInProgressTasksByDueDate', () => {
    let today: string;

    beforeEach(() => {
      today = formatDateLocal(normalizeToMidnight(new Date()));
    });

    it('should group tasks with no due date into noDue', () => {
      const tasks: Task[] = [
        createMockTask({ id: '1', in_progress: true }),
        createMockTask({ id: '2', in_progress: true }),
      ];

      const result = groupInProgressTasksByDueDate(tasks);

      expect(result.noDue).toHaveLength(2);
      expect(result.upcoming).toHaveLength(0);
      expect(result.overdue).toHaveLength(0);
    });

    it('should group tasks with future due dates into upcoming', () => {
      const tomorrow = formatDateLocal(addDays(normalizeToMidnight(new Date()), 1));
      const nextWeek = formatDateLocal(addDays(normalizeToMidnight(new Date()), 7));

      const tasks: Task[] = [
        createMockTask({ id: '1', in_progress: true, due_on: tomorrow }),
        createMockTask({ id: '2', in_progress: true, due_on: nextWeek }),
      ];

      const result = groupInProgressTasksByDueDate(tasks);

      expect(result.upcoming).toHaveLength(2);
      expect(result.overdue).toHaveLength(0);
      expect(result.noDue).toHaveLength(0);
    });

    it('should group tasks with past due dates into overdue', () => {
      const yesterday = formatDateLocal(addDays(normalizeToMidnight(new Date()), -1));
      const lastWeek = formatDateLocal(addDays(normalizeToMidnight(new Date()), -7));

      const tasks: Task[] = [
        createMockTask({ id: '1', in_progress: true, due_on: yesterday }),
        createMockTask({ id: '2', in_progress: true, due_on: lastWeek }),
      ];

      const result = groupInProgressTasksByDueDate(tasks);

      expect(result.overdue).toHaveLength(2);
      expect(result.upcoming).toHaveLength(0);
      expect(result.noDue).toHaveLength(0);
    });

    it('should group tasks with today as due date into upcoming', () => {
      const tasks: Task[] = [
        createMockTask({ id: '1', in_progress: true, due_on: today }),
      ];

      const result = groupInProgressTasksByDueDate(tasks);

      expect(result.upcoming).toHaveLength(1);
      expect(result.overdue).toHaveLength(0);
      expect(result.noDue).toHaveLength(0);
    });

    it('should correctly categorize all three groups', () => {
      const yesterday = formatDateLocal(addDays(normalizeToMidnight(new Date()), -1));
      const tomorrow = formatDateLocal(addDays(normalizeToMidnight(new Date()), 1));

      const tasks: Task[] = [
        createMockTask({ id: '1', in_progress: true }), // no due
        createMockTask({ id: '2', in_progress: true, due_on: yesterday }), // overdue
        createMockTask({ id: '3', in_progress: true, due_on: tomorrow }), // upcoming
        createMockTask({ id: '4', in_progress: true }), // no due
      ];

      const result = groupInProgressTasksByDueDate(tasks);

      expect(result.noDue).toHaveLength(2);
      expect(result.overdue).toHaveLength(1);
      expect(result.upcoming).toHaveLength(1);
    });

    it('should group all tasks passed to it (caller should filter to in_progress=true only)', () => {
      const tomorrow = formatDateLocal(addDays(normalizeToMidnight(new Date()), 1));

      const tasks: Task[] = [
        createMockTask({ id: '1', in_progress: true, due_on: tomorrow }), // should be grouped
        createMockTask({ id: '2', in_progress: false, due_on: tomorrow }), // will be grouped (function doesn't filter)
        createMockTask({ id: '3', in_progress: true }), // should be grouped
      ];

      const result = groupInProgressTasksByDueDate(tasks);

      // Function groups all tasks passed to it (caller should filter to in_progress=true only)
      expect(result.upcoming).toHaveLength(2);
      expect(result.noDue).toHaveLength(1);
      expect(result.noDue[0].id).toBe('3');
    });

    describe('sorting', () => {
      it('should sort upcoming tasks by due_on ascending, then display_order', () => {
        const tomorrow = formatDateLocal(addDays(normalizeToMidnight(new Date()), 1));
        const nextWeek = formatDateLocal(addDays(normalizeToMidnight(new Date()), 7));

        const tasks: Task[] = [
          createMockTask({ id: '1', in_progress: true, due_on: nextWeek, display_order: 1 }),
          createMockTask({ id: '2', in_progress: true, due_on: tomorrow, display_order: 2 }),
          createMockTask({ id: '3', in_progress: true, due_on: tomorrow, display_order: 1 }),
        ];

        const result = groupInProgressTasksByDueDate(tasks);

        expect(result.upcoming[0].id).toBe('3'); // same due_on, lower display_order
        expect(result.upcoming[1].id).toBe('2');
        expect(result.upcoming[2].id).toBe('1');
      });

      it('should sort overdue tasks by due_on ascending, then display_order', () => {
        const yesterday = formatDateLocal(addDays(normalizeToMidnight(new Date()), -1));
        const lastWeek = formatDateLocal(addDays(normalizeToMidnight(new Date()), -7));

        const tasks: Task[] = [
          createMockTask({ id: '1', in_progress: true, due_on: yesterday, display_order: 2 }),
          createMockTask({ id: '2', in_progress: true, due_on: lastWeek, display_order: 1 }),
          createMockTask({ id: '3', in_progress: true, due_on: yesterday, display_order: 1 }),
        ];

        const result = groupInProgressTasksByDueDate(tasks);

        expect(result.overdue[0].id).toBe('2'); // earlier due_on
        expect(result.overdue[1].id).toBe('3'); // same due_on, lower display_order
        expect(result.overdue[2].id).toBe('1');
      });

      it('should sort noDue tasks by display_order', () => {
        const tasks: Task[] = [
          createMockTask({ id: '1', in_progress: true, display_order: 3 }),
          createMockTask({ id: '2', in_progress: true, display_order: 1 }),
          createMockTask({ id: '3', in_progress: true, display_order: 2 }),
        ];

        const result = groupInProgressTasksByDueDate(tasks);

        expect(result.noDue[0].id).toBe('2');
        expect(result.noDue[1].id).toBe('3');
        expect(result.noDue[2].id).toBe('1');
      });
    });

    it('should handle empty array', () => {
      const result = groupInProgressTasksByDueDate([]);

      expect(result.upcoming).toEqual([]);
      expect(result.overdue).toEqual([]);
      expect(result.noDue).toEqual([]);
    });
  });
});
