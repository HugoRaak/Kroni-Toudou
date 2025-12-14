import { describe, it, expect } from 'vitest';
import { groupTasksByType } from '../task-filtering';
import type { Task } from '@/lib/types';

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

    it('should group specific date tasks correctly', () => {
      const tasks: Task[] = [
        createMockTask({ id: '1', due_on: '2024-06-15' }),
        createMockTask({ id: '2', due_on: '2024-06-20' }),
        createMockTask({ id: '3', due_on: '2024-07-01' }),
      ];

      const result = groupTasksByType(tasks);

      expect(result.periodic).toHaveLength(0);
      expect(result.specificDate).toHaveLength(3);
      expect(result.whenPossible).toHaveLength(0);
    });

    it('should group when-possible tasks correctly', () => {
      const tasks: Task[] = [
        createMockTask({ id: '1' }), // No frequency, no due_on
        createMockTask({ id: '2' }), // No frequency, no due_on
      ];

      const result = groupTasksByType(tasks);

      expect(result.periodic).toHaveLength(0);
      expect(result.specificDate).toHaveLength(0);
      expect(result.whenPossible).toHaveLength(2);
    });

    it('should correctly categorize all three types', () => {
      const tasks: Task[] = [
        createMockTask({ id: '1', frequency: 'quotidien' }),
        createMockTask({ id: '2', due_on: '2024-06-15' }),
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

    it('should not include tasks with due_on in whenPossible', () => {
      const tasks: Task[] = [createMockTask({ id: '1', due_on: '2024-06-15' })];

      const result = groupTasksByType(tasks);

      expect(result.whenPossible).toHaveLength(0);
      expect(result.specificDate).toHaveLength(1);
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
          createMockTask({ id: '1', due_on: '2024-06-15' }),
          createMockTask({ id: '2' }), // no due_on, should not be in specificDate
        ];

        const result = groupTasksByType(tasks);

        expect(result.specificDate).toHaveLength(1);
        expect(result.specificDate[0].id).toBe('1');
      });
    });

    describe('sorting whenPossible tasks', () => {
      it('should sort whenPossible tasks by display_order ascending', () => {
        const tasks: Task[] = [
          createMockTask({ id: '1', display_order: 3 }),
          createMockTask({ id: '2', display_order: 1 }),
          createMockTask({ id: '3', display_order: 2 }),
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
          createMockTask({ id: '3', display_order: 2 }),
        ];

        const result = groupTasksByType(tasks);

        expect(result.whenPossible[0].id).toBe('2'); // in_progress first
        expect(result.whenPossible[1].id).toBe('1');
        expect(result.whenPossible[2].id).toBe('3');
      });

      it('should place tasks without display_order after tasks with display_order', () => {
        const tasks: Task[] = [
          createMockTask({ id: '1', display_order: 2 }),
          createMockTask({ id: '2' }), // no display_order
          createMockTask({ id: '3', display_order: 1 }),
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
});
