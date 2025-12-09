import { describe, it, expect } from 'vitest';
import { taskWithTypeToTaskLike } from '../task-conversion';
import type { Task, TempTask, TaskWithType } from '@/lib/types';
import type { TaskWithShift } from '@/lib/calendar/calendar-utils';

describe('task-conversion', () => {
  const createMockTask = (overrides: Partial<Task> = {}): Task => ({
    id: '1',
    user_id: 'user1',
    title: 'Test Task',
    description: 'Test description',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  });

  const createMockTempTask = (overrides: Partial<TempTask> = {}): TempTask => ({
    id: 'temp-1',
    title: 'Temp Task',
    description: 'Temp description',
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  });

  describe('taskWithTypeToTaskLike', () => {
    it('should convert periodic task without shiftInfo', () => {
      const task: TaskWithType = {
        ...createMockTask({ id: '1', frequency: 'quotidien' }),
        taskType: 'periodic',
      };

      const result = taskWithTypeToTaskLike(task);

      expect(result.id).toBe('1');
      expect(result.title).toBe('Test Task');
      expect(result.description).toBe('Test description');
      expect((result as Task).frequency).toBe('quotidien');
    });

    it('should convert specific task without shiftInfo', () => {
      const task: TaskWithType = {
        ...createMockTask({ id: '1', due_on: '2024-06-15' }),
        taskType: 'specific',
      };

      const result = taskWithTypeToTaskLike(task);

      expect(result.id).toBe('1');
      expect(result.title).toBe('Test Task');
      expect((result as Task).due_on).toBe('2024-06-15');
    });

    it('should preserve shiftInfo for periodic tasks', () => {
      const taskWithShift: TaskWithShift & { taskType: 'periodic' } = {
        ...createMockTask({ id: '1', frequency: 'quotidien' }),
        taskType: 'periodic',
        shiftInfo: {
          originalDay: 'Lundi',
          originalDate: '2024-06-15',
          shiftedDate: '2024-06-16',
        },
      };

      const result = taskWithTypeToTaskLike(taskWithShift);

      expect(result.id).toBe('1');
      expect((result as TaskWithShift).shiftInfo).toBeDefined();
      expect((result as TaskWithShift).shiftInfo?.originalDay).toBe('Lundi');
      expect((result as TaskWithShift).shiftInfo?.originalDate).toBe('2024-06-15');
      expect((result as TaskWithShift).shiftInfo?.shiftedDate).toBe('2024-06-16');
    });

    it('should preserve shiftInfo for specific tasks', () => {
      const taskWithShift: TaskWithShift & { taskType: 'specific' } = {
        ...createMockTask({ id: '1', due_on: '2024-06-15' }),
        taskType: 'specific',
        shiftInfo: {
          originalDay: 'Lundi',
          originalDate: '2024-06-15',
          shiftedDate: '2024-06-16',
        },
      };

      const result = taskWithTypeToTaskLike(taskWithShift);

      expect(result.id).toBe('1');
      expect((result as TaskWithShift).shiftInfo).toBeDefined();
    });

    it('should convert temp task correctly', () => {
      const tempTask: TaskWithType = {
        ...createMockTempTask({ id: 'temp-1' }),
        taskType: 'temp',
      };

      const result = taskWithTypeToTaskLike(tempTask);

      expect(result.id).toBe('temp-1');
      expect(result.title).toBe('Temp Task');
      expect(result.description).toBe('Temp description');
      expect(result.created_at).toBe('2024-01-01T00:00:00Z');
      expect(result.updated_at).toBe('2024-01-01T00:00:00Z'); // Should use created_at
    });

    it('should preserve mode for temp task', () => {
      const tempTask: TaskWithType = {
        ...createMockTempTask({ mode: 'Présentiel' }),
        taskType: 'temp',
      };

      const result = taskWithTypeToTaskLike(tempTask);

      expect(result.mode).toBe('Présentiel');
    });

    it('should preserve in_progress for temp task', () => {
      const tempTask: TaskWithType = {
        ...createMockTempTask({ in_progress: true }),
        taskType: 'temp',
      };

      const result = taskWithTypeToTaskLike(tempTask);

      expect(result.in_progress).toBe(true);
    });

    it('should not include shiftInfo for temp tasks', () => {
      const tempTask: TaskWithType = {
        ...createMockTempTask(),
        taskType: 'temp',
      };

      const result = taskWithTypeToTaskLike(tempTask);

      expect('shiftInfo' in result).toBe(false);
    });

    it('should handle task with all fields', () => {
      const task: TaskWithType = {
        ...createMockTask({
          id: '1',
          frequency: 'hebdomadaire',
          day: 'Lundi',
          mode: 'Distanciel',
          in_progress: true,
          display_order: 5,
        }),
        taskType: 'periodic',
      };

      const result = taskWithTypeToTaskLike(task);

      expect(result.id).toBe('1');
      expect((result as Task).frequency).toBe('hebdomadaire');
      expect((result as Task).day).toBe('Lundi');
      expect(result.mode).toBe('Distanciel');
      expect(result.in_progress).toBe(true);
    });

    it('should return same object reference for task without shiftInfo', () => {
      const task: TaskWithType = {
        ...createMockTask({ id: '1' }),
        taskType: 'periodic',
      };

      const result = taskWithTypeToTaskLike(task);

      // Should return the same object (not a copy)
      expect(result).toBe(task);
    });
  });
});
