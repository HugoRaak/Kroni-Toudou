import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  isToday,
  getTodayTasksFromStorage,
  saveTodayTasksToStorage,
  getTodayTaskOrder,
  saveTodayTaskOrder,
  getTodayHiddenTaskIds,
  hideTodayTask,
  getTodayTempTasks,
  createTodayTempTask,
  updateTodayTempTask,
  deleteTodayTempTask,
  getTodayHiddenTempTaskIds,
  hideTodayTempTask,
} from '../localStorage-tasks';
import type { DayTasksData } from '@/components/calendar/views/day-view';
import { addDays, normalizeToMidnight } from '@/lib/utils';

describe('localStorage-tasks', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  describe('isToday', () => {
    it('should return true for today', () => {
      const today = new Date();
      expect(isToday(today)).toBe(true);
    });

    it('should return false for yesterday', () => {
      const yesterday = addDays(normalizeToMidnight(new Date()), -1);
      expect(isToday(yesterday)).toBe(false);
    });

    it('should return false for tomorrow', () => {
      const tomorrow = addDays(normalizeToMidnight(new Date()), 1);
      expect(isToday(tomorrow)).toBe(false);
    });

    it('should ignore time component', () => {
      const todayMorning = new Date();
      todayMorning.setHours(0, 0, 0, 0);

      const todayEvening = new Date();
      todayEvening.setHours(23, 59, 59, 999);

      expect(isToday(todayMorning)).toBe(true);
      expect(isToday(todayEvening)).toBe(true);
    });

    it('should return false for different month', () => {
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      expect(isToday(lastMonth)).toBe(false);
    });

    it('should return false for different year', () => {
      const lastYear = new Date();
      lastYear.setFullYear(lastYear.getFullYear() - 1);
      expect(isToday(lastYear)).toBe(false);
    });
  });

  describe('today tasks storage', () => {
    it('should save and retrieve tasks data from storage', () => {
      const mockData: DayTasksData = {
        periodic: [],
        specific: [],
        whenPossible: {
          inProgress: [],
          notStarted: [],
        },
        alerts: [],
      };
      saveTodayTasksToStorage(mockData);

      const result = getTodayTasksFromStorage();

      expect(result).toEqual(mockData);
    });

    it('should return null if no data exists', () => {
      const result = getTodayTasksFromStorage();

      expect(result).toBeNull();
    });
  });

  describe('today task order storage', () => {
    it('should save and retrieve the task order', () => {
      const order = ['task1', 'task2', 'task3'];

      saveTodayTaskOrder(order);
      const result = getTodayTaskOrder();

      expect(result).toEqual(order);
    });

    it('should return an empty array when no order exists', () => {
      const result = getTodayTaskOrder();

      expect(result).toEqual([]);
    });
  });

  describe('getTodayHiddenTaskIds', () => {
    it('should get hidden task IDs from storage', () => {
      hideTodayTask('task1');

      const result = getTodayHiddenTaskIds();

      expect(result).toContain('task1');
    });

    it('should return empty array if no hidden tasks', () => {
      const result = getTodayHiddenTaskIds();

      expect(result).toEqual([]);
    });
  });

  describe('hideTodayTask', () => {
    it('should add task to hidden list', () => {
      hideTodayTask('task1');

      const result = getTodayHiddenTaskIds();
      expect(result).toContain('task1');
    });

    it('should remove task from order when hiding', () => {
      saveTodayTaskOrder(['task1', 'task2', 'task3']);
      hideTodayTask('task2');

      const order = getTodayTaskOrder();
      expect(order).not.toContain('task2');
      expect(order).toContain('task1');
      expect(order).toContain('task3');
    });

    it('should not modify order if task is not in order', () => {
      saveTodayTaskOrder(['task1', 'task3']);
      hideTodayTask('task2');

      const order = getTodayTaskOrder();
      expect(order).toEqual(['task1', 'task3']);
    });
  });

  describe('getTodayTempTasks', () => {
    it('should get temp tasks from storage', () => {
      createTodayTempTask('Temp Task');

      const result = getTodayTempTasks();

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].title).toBe('Temp Task');
    });

    it('should return empty array if no temp tasks exist', () => {
      const result = getTodayTempTasks();

      expect(result).toEqual([]);
    });
  });

  describe('createTodayTempTask', () => {
    it('should create a new temp task', () => {
      const task = createTodayTempTask('New Task', 'Description', 'Présentiel', true);

      expect(task.title).toBe('New Task');
      expect(task.description).toBe('Description');
      expect(task.mode).toBe('Présentiel');
      expect(task.in_progress).toBe(true);
      expect(task.id).toMatch(/^temp-/);
      expect(task.created_at).toBeDefined();
    });

    it('should use default values for optional parameters', () => {
      const task = createTodayTempTask('New Task');

      expect(task.title).toBe('New Task');
      expect(task.description).toBe('');
      expect(task.mode).toBe('Tous');
      expect(task.in_progress).toBe(false);
    });

    it('should save task to storage', () => {
      const task = createTodayTempTask('New Task');

      const tasks = getTodayTempTasks();
      expect(tasks).toContainEqual(task);
    });

    it('should generate unique IDs', () => {
      vi.useFakeTimers();
      const task1 = createTodayTempTask('Task 1');
      vi.advanceTimersByTime(1);
      const task2 = createTodayTempTask('Task 2');

      expect(task1.id).not.toBe(task2.id);

      vi.useRealTimers();
    });
  });

  describe('updateTodayTempTask', () => {
    it('should update existing temp task', () => {
      const task = createTodayTempTask('Original Title', 'Original Description');
      const updated = updateTodayTempTask(task.id, {
        title: 'Updated Title',
        description: 'Updated Description',
      });

      expect(updated).not.toBeNull();
      expect(updated!.title).toBe('Updated Title');
      expect(updated!.description).toBe('Updated Description');
      expect(updated!.id).toBe(task.id);
    });

    it('should update only specified fields', () => {
      const task = createTodayTempTask('Original Title', 'Original Description', 'Tous', false);
      const updated = updateTodayTempTask(task.id, {
        title: 'Updated Title',
      });

      expect(updated!.title).toBe('Updated Title');
      expect(updated!.description).toBe('Original Description');
      expect(updated!.mode).toBe('Tous');
      expect(updated!.in_progress).toBe(false);
    });

    it('should return null if task does not exist', () => {
      const result = updateTodayTempTask('non-existent-id', {
        title: 'Updated Title',
      });

      expect(result).toBeNull();
    });

    it('should persist update in storage', () => {
      const task = createTodayTempTask('Original Title');
      updateTodayTempTask(task.id, { title: 'Updated Title' });

      const tasks = getTodayTempTasks();
      const updatedTask = tasks.find((t) => t.id === task.id);
      expect(updatedTask?.title).toBe('Updated Title');
    });
  });

  describe('deleteTodayTempTask', () => {
    it('should delete existing temp task', () => {
      const task = createTodayTempTask('Task to delete');
      const result = deleteTodayTempTask(task.id);

      expect(result).toBe(true);
      const tasks = getTodayTempTasks();
      expect(tasks.find((t) => t.id === task.id)).toBeUndefined();
    });

    it('should return false if task does not exist', () => {
      const result = deleteTodayTempTask('non-existent-id');

      expect(result).toBe(false);
    });

    it('should not affect other tasks', () => {
      const task1 = createTodayTempTask('Task 1');
      const task2 = createTodayTempTask('Task 2');
      deleteTodayTempTask(task1.id);

      const tasks = getTodayTempTasks();
      expect(tasks.find((t) => t.id === task2.id)).toBeDefined();
      expect(tasks.find((t) => t.id === task1.id)).toBeUndefined();
    });
  });

  describe('getTodayHiddenTempTaskIds', () => {
    it('should get hidden temp task IDs from storage', () => {
      hideTodayTempTask('temp-task1');

      const result = getTodayHiddenTempTaskIds();

      expect(result).toContain('temp-task1');
    });

    it('should return empty array if no hidden temp tasks', () => {
      const result = getTodayHiddenTempTaskIds();

      expect(result).toEqual([]);
    });
  });

  describe('hideTodayTempTask', () => {
    it('should add temp task to hidden list', () => {
      hideTodayTempTask('temp-task1');

      const result = getTodayHiddenTempTaskIds();
      expect(result).toContain('temp-task1');
    });

    it('should remove temp task from order when hiding', () => {
      saveTodayTaskOrder(['temp-task1', 'temp-task2']);
      hideTodayTempTask('temp-task1');

      const order = getTodayTaskOrder();
      expect(order).not.toContain('temp-task1');
      expect(order).toContain('temp-task2');
    });

    it('should not modify order if temp task is not in order', () => {
      saveTodayTaskOrder(['task1']);
      hideTodayTempTask('temp-task1');

      const order = getTodayTaskOrder();
      expect(order).toEqual(['task1']);
    });
  });
});
