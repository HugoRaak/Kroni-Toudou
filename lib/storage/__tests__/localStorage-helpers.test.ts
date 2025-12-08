import { describe, it, expect, beforeEach } from 'vitest';
import { storage } from '../localStorage-helpers';
import type { DayTasksData } from '@/components/calendar/views/day-view';
import type { TempTask } from '@/lib/types';
import { formatDateLocal, normalizeToMidnight } from '@/lib/utils';

describe('localStorage-helpers', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  describe('storage.tasks', () => {
    const mockTasksData: DayTasksData = {
      periodic: [],
      specific: [],
      whenPossible: {
        inProgress: [],
        notStarted: [],
      },
      alerts: [],
    };

    it('should get tasks data for today by default', () => {
      const today = normalizeToMidnight(new Date());
      const key = `kroni-today-tasks-${formatDateLocal(today)}`;
      window.localStorage.setItem(key, JSON.stringify(mockTasksData));

      const result = storage.tasks.get();

      expect(result).toEqual(mockTasksData);
    });

    it('should get tasks data for specific date', () => {
      const date = new Date(2024, 5, 15);
      const key = `kroni-today-tasks-${formatDateLocal(date)}`;
      window.localStorage.setItem(key, JSON.stringify(mockTasksData));

      const result = storage.tasks.get(date);

      expect(result).toEqual(mockTasksData);
    });

    it('should return null if no data exists', () => {
      const result = storage.tasks.get();

      expect(result).toBeNull();
    });

    it('should set tasks data for today by default', () => {
      storage.tasks.set(mockTasksData);

      const today = normalizeToMidnight(new Date());
      const key = `kroni-today-tasks-${formatDateLocal(today)}`;
      const stored = window.localStorage.getItem(key);

      expect(stored).not.toBeNull();
      expect(JSON.parse(stored!)).toEqual(mockTasksData);
    });

    it('should set tasks data for specific date', () => {
      const date = normalizeToMidnight(new Date(2024, 5, 15));
      storage.tasks.set(mockTasksData, date);

      const key = `kroni-today-tasks-${formatDateLocal(date)}`;
      const stored = window.localStorage.getItem(key);

      expect(stored).not.toBeNull();
      expect(JSON.parse(stored!)).toEqual(mockTasksData);
    });

    it('should cleanup old tasks keys when setting new data', () => {
      const oldDate = normalizeToMidnight(new Date(2024, 5, 10));
      const oldKey = `kroni-today-tasks-${formatDateLocal(oldDate)}`;
      window.localStorage.setItem(oldKey, JSON.stringify(mockTasksData));

      const newDate = normalizeToMidnight(new Date(2024, 5, 15));
      storage.tasks.set(mockTasksData, newDate);

      // Old key should be removed
      expect(window.localStorage.getItem(oldKey)).toBeNull();
      // New key should exist
      const newKey = `kroni-today-tasks-${formatDateLocal(newDate)}`;
      expect(window.localStorage.getItem(newKey)).not.toBeNull();
    });
  });

  describe('storage.order', () => {
    it('should get order array for today by default', () => {
      const today = normalizeToMidnight(new Date());
      const key = `kroni-today-order-${formatDateLocal(today)}`;
      const order = ['task1', 'task2', 'task3'];
      window.localStorage.setItem(key, JSON.stringify(order));

      const result = storage.order.get();

      expect(result).toEqual(order);
    });

    it('should return empty array if no order exists', () => {
      const result = storage.order.get();

      expect(result).toEqual([]);
    });

    it('should set order array for specific date', () => {
      const date = normalizeToMidnight(new Date(2024, 5, 15));
      const order = ['task1', 'task2'];

      storage.order.set(order, date);

      const key = `kroni-today-order-${formatDateLocal(date)}`;
      const stored = window.localStorage.getItem(key);

      expect(stored).not.toBeNull();
      expect(JSON.parse(stored!)).toEqual(order);
    });

    it('should cleanup old order keys when setting new data', () => {
      const oldDate = normalizeToMidnight(new Date(2024, 5, 10));
      const oldKey = `kroni-today-order-${formatDateLocal(oldDate)}`;
      window.localStorage.setItem(oldKey, JSON.stringify(['task1']));

      const newDate = normalizeToMidnight(new Date(2024, 5, 15));
      storage.order.set(['task2'], newDate);

      expect(window.localStorage.getItem(oldKey)).toBeNull();
    });
  });

  describe('storage.hidden', () => {
    it('should get hidden tasks array for today by default', () => {
      const today = normalizeToMidnight(new Date());
      const key = `kroni-today-hidden-${formatDateLocal(today)}`;
      const hidden = ['task1', 'task2'];
      window.localStorage.setItem(key, JSON.stringify(hidden));

      const result = storage.hidden.get();

      expect(result).toEqual(hidden);
    });

    it('should return empty array if no hidden tasks exist', () => {
      const result = storage.hidden.get();

      expect(result).toEqual([]);
    });

    it('should add task to hidden list', () => {
      const date = normalizeToMidnight(new Date(2024, 5, 15));
      storage.hidden.add('task1', date);

      const result = storage.hidden.get(date);

      expect(result).toContain('task1');
      expect(result).toHaveLength(1);
    });

    it('should not add duplicate task to hidden list', () => {
      const date = normalizeToMidnight(new Date(2024, 5, 15));
      storage.hidden.add('task1', date);
      storage.hidden.add('task1', date);

      const result = storage.hidden.get(date);

      expect(result).toContain('task1');
      expect(result).toHaveLength(1);
    });

    it('should add multiple different tasks', () => {
      const date = normalizeToMidnight(new Date(2024, 5, 15));
      storage.hidden.add('task1', date);
      storage.hidden.add('task2', date);

      const result = storage.hidden.get(date);

      expect(result).toContain('task1');
      expect(result).toContain('task2');
      expect(result).toHaveLength(2);
    });

    it('should cleanup old hidden keys when adding', () => {
      const oldDate = normalizeToMidnight(new Date(2024, 5, 10));
      const oldKey = `kroni-today-hidden-${formatDateLocal(oldDate)}`;
      window.localStorage.setItem(oldKey, JSON.stringify(['task1']));

      const newDate = normalizeToMidnight(new Date(2024, 5, 15));
      storage.hidden.add('task2', newDate);

      expect(window.localStorage.getItem(oldKey)).toBeNull();
    });
  });

  describe('storage.tempTasks', () => {
    const mockTempTask: TempTask = {
      id: 'temp-1',
      title: 'Temp Task',
      description: '',
      created_at: '2024-06-15T00:00:00Z',
    };

    it('should get temp tasks array for today by default', () => {
      const today = normalizeToMidnight(new Date());
      const key = `kroni-temp-tasks-${formatDateLocal(today)}`;
      const tempTasks = [mockTempTask];
      window.localStorage.setItem(key, JSON.stringify(tempTasks));

      const result = storage.tempTasks.get();

      expect(result).toEqual(tempTasks);
    });

    it('should return empty array if no temp tasks exist', () => {
      const result = storage.tempTasks.get();

      expect(result).toEqual([]);
    });

    it('should set temp tasks for specific date', () => {
      const date = normalizeToMidnight(new Date(2024, 5, 15));
      const tempTasks = [mockTempTask];

      storage.tempTasks.set(tempTasks, date);

      const key = `kroni-temp-tasks-${formatDateLocal(date)}`;
      const stored = window.localStorage.getItem(key);

      expect(stored).not.toBeNull();
      expect(JSON.parse(stored!)).toEqual(tempTasks);
    });

    it('should cleanup old temp tasks keys when getting', () => {
      const oldDate = normalizeToMidnight(new Date(2024, 5, 10));
      const oldKey = `kroni-temp-tasks-${formatDateLocal(oldDate)}`;
      window.localStorage.setItem(oldKey, JSON.stringify([mockTempTask]));

      const newDate = normalizeToMidnight(new Date(2024, 5, 15));
      storage.tempTasks.get(newDate);

      expect(window.localStorage.getItem(oldKey)).toBeNull();
    });

    it('should cleanup old temp tasks keys when setting', () => {
      const oldDate = normalizeToMidnight(new Date(2024, 5, 10));
      const oldKey = `kroni-temp-tasks-${formatDateLocal(oldDate)}`;
      window.localStorage.setItem(oldKey, JSON.stringify([mockTempTask]));

      const newDate = normalizeToMidnight(new Date(2024, 5, 15));
      storage.tempTasks.set([mockTempTask], newDate);

      expect(window.localStorage.getItem(oldKey)).toBeNull();
    });
  });

  describe('storage.tempHidden', () => {
    it('should get temp hidden tasks array for today by default', () => {
      const today = normalizeToMidnight(new Date());
      const key = `kroni-temp-hidden-${formatDateLocal(today)}`;
      const hidden = ['temp-task1'];
      window.localStorage.setItem(key, JSON.stringify(hidden));

      const result = storage.tempHidden.get();

      expect(result).toEqual(hidden);
    });

    it('should return empty array if no temp hidden tasks exist', () => {
      const result = storage.tempHidden.get();

      expect(result).toEqual([]);
    });

    it('should add task to temp hidden list', () => {
      const date = normalizeToMidnight(new Date(2024, 5, 15));
      storage.tempHidden.add('temp-task1', date);

      const result = storage.tempHidden.get(date);

      expect(result).toContain('temp-task1');
      expect(result).toHaveLength(1);
    });

    it('should not add duplicate task to temp hidden list', () => {
      const date = normalizeToMidnight(new Date(2024, 5, 15));
      storage.tempHidden.add('temp-task1', date);
      storage.tempHidden.add('temp-task1', date);

      const result = storage.tempHidden.get(date);

      expect(result).toContain('temp-task1');
      expect(result).toHaveLength(1);
    });
  });

  describe('storage.dayViewLayout', () => {
    it('should get default layout as single', () => {
      const result = storage.dayViewLayout.get();

      expect(result).toBe('single');
    });

    it('should get stored layout', () => {
      window.localStorage.setItem('kroni-day-view-layout', JSON.stringify('three-column'));

      const result = storage.dayViewLayout.get();

      expect(result).toBe('three-column');
    });

    it('should set layout', () => {
      storage.dayViewLayout.set('three-column');

      const stored = window.localStorage.getItem('kroni-day-view-layout');
      expect(stored).not.toBeNull();
      expect(JSON.parse(stored!)).toBe('three-column');
    });

    it('should update layout', () => {
      storage.dayViewLayout.set('three-column');
      storage.dayViewLayout.set('single');

      const result = storage.dayViewLayout.get();

      expect(result).toBe('single');
    });
  });

  describe('edge cases', () => {
    it('should handle invalid JSON in localStorage', () => {
      const today = normalizeToMidnight(new Date());
      const key = `kroni-today-tasks-${formatDateLocal(today)}`;
      window.localStorage.setItem(key, 'invalid json');

      const result = storage.tasks.get();

      expect(result).toBeNull();
    });

    it('should handle date normalization', () => {
      const date = new Date(2024, 5, 15, 14, 30, 45);
      const normalized = normalizeToMidnight(date);
      const key = `kroni-today-tasks-${formatDateLocal(normalized)}`;
      const mockData: DayTasksData = {
        periodic: [],
        specific: [],
        whenPossible: {
          inProgress: [],
          notStarted: [],
        },
        alerts: [],
      };
      window.localStorage.setItem(key, JSON.stringify(mockData));

      const result = storage.tasks.get(date);

      expect(result).toEqual(mockData);
    });
  });
});
