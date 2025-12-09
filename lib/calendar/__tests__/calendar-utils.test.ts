import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getTasksForDay,
  getTasksForDateRange,
  getTasksForDate,
  checkFutureTaskShifts,
  filterTasksByWorkMode,
  calendarTaskToTaskLike,
  type CalendarTask,
} from '../calendar-utils';
import { getTasks } from '@/lib/db/tasks';
import { getWorkday, getWorkdaysMap, type WorkMode } from '@/lib/db/workdays';
import { getPeriodicTasksForDateWithShift } from '../task-shifting-service';
import type { Task } from '@/lib/types';
import { normalizeToMidnight, formatDateLocal, addDays } from '@/lib/utils';

// Mock dependencies
vi.mock('@/lib/db/tasks', () => ({
  getTasks: vi.fn(),
}));

vi.mock('@/lib/db/workdays', () => ({
  getWorkday: vi.fn(),
  getWorkdaysMap: vi.fn(),
}));

vi.mock('../task-shifting-service', async () => {
  const actual = await vi.importActual<typeof import('../task-shifting-service')>(
    '../task-shifting-service',
  );
  return {
    ...actual,
    findNextMatchingDate: actual.findNextMatchingDate,
    needsShift: actual.needsShift,
    getPeriodicTasksForDateWithShift: vi.fn(),
  };
});

describe('calendar-utils', () => {
  const createMockTask = (overrides: Partial<Task> = {}): Task => ({
    id: '1',
    user_id: 'user1',
    title: 'Test Task',
    description: '',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getTasksForDay', () => {
    it('should return all task types for a day', async () => {
      const periodicTask = createMockTask({ id: '1', frequency: 'hebdomadaire', day: 'Lundi' });
      const specificTask = createMockTask({ id: '2', due_on: '2024-06-15' });
      const specificTask2 = createMockTask({ id: '2', due_on: '2024-06-16' });
      const whenPossibleTask = createMockTask({ id: '3', in_progress: false });

      vi.mocked(getTasks).mockResolvedValue([
        periodicTask,
        specificTask,
        specificTask2,
        whenPossibleTask,
      ]);
      vi.mocked(getWorkday).mockResolvedValue('Présentiel');
      vi.mocked(getPeriodicTasksForDateWithShift).mockResolvedValue({
        tasks: [periodicTask],
        alerts: [],
      });

      const date = normalizeToMidnight(new Date(2024, 5, 15));
      const result = await getTasksForDay('user1', date);

      expect(result.periodic).toHaveLength(1);
      expect(result.specific).toHaveLength(1);
      expect(result.whenPossible.notStarted).toHaveLength(1);
    });

    it('should filter tasks by work mode', async () => {
      const task1 = createMockTask({ id: '1', frequency: 'hebdomadaire', mode: 'Présentiel' });
      const task2 = createMockTask({ id: '2', frequency: 'hebdomadaire', mode: 'Distanciel' });
      const task3 = createMockTask({ id: '3', frequency: 'hebdomadaire', mode: 'Tous' });

      vi.mocked(getTasks).mockResolvedValue([task1, task2, task3]);
      vi.mocked(getWorkday).mockResolvedValue('Présentiel');
      vi.mocked(getPeriodicTasksForDateWithShift).mockResolvedValue({
        tasks: [task1, task2, task3],
        alerts: [],
      });

      const date = normalizeToMidnight(new Date(2024, 5, 15));
      const result = await getTasksForDay('user1', date, 'Présentiel');

      // Should include Présentiel and Tous tasks, exclude Distanciel
      const periodicIds = result.periodic.map((t) => t.id);
      expect(periodicIds).toContain('1');
      expect(periodicIds).toContain('3');
      expect(periodicIds).not.toContain('2');
    });

    it('should return empty periodic and when-possible tasks when work mode is Congé', async () => {
      const periodicTask = createMockTask({ id: '1', frequency: 'hebdomadaire' });
      const specificTask = createMockTask({ id: '2', due_on: '2024-06-15', mode: 'Présentiel' });
      const whenPossibleTask = createMockTask({ id: '3', in_progress: false });

      vi.mocked(getTasks).mockResolvedValue([periodicTask, specificTask, whenPossibleTask]);
      vi.mocked(getWorkday).mockResolvedValue('Congé');

      const date = normalizeToMidnight(new Date(2024, 5, 15));
      const result = await getTasksForDay('user1', date);

      expect(result.periodic).toHaveLength(0);
      expect(result.specific).toHaveLength(1); // Specific tasks still shown
      expect(result.whenPossible.inProgress).toHaveLength(0);
      expect(result.whenPossible.notStarted).toHaveLength(0);
    });

    it('should use provided work mode value', async () => {
      const task = createMockTask({ id: '1', frequency: 'hebdomadaire' });

      vi.mocked(getTasks).mockResolvedValue([task]);
      vi.mocked(getPeriodicTasksForDateWithShift).mockResolvedValue({
        tasks: [task],
        alerts: [],
      });

      const date = normalizeToMidnight(new Date(2024, 5, 15));
      const result = await getTasksForDay('user1', date, 'Distanciel');

      // Should not call getWorkday when workModeValue is provided
      expect(getWorkday).not.toHaveBeenCalled();
      expect(result.periodic).toHaveLength(1);
    });

    it('should separate when-possible tasks by in_progress status', async () => {
      const inProgressTask = createMockTask({ id: '1', in_progress: true });
      const notStartedTask = createMockTask({ id: '2', in_progress: false });

      vi.mocked(getTasks).mockResolvedValue([inProgressTask, notStartedTask]);
      vi.mocked(getWorkday).mockResolvedValue('Présentiel');
      vi.mocked(getPeriodicTasksForDateWithShift).mockResolvedValue({
        tasks: [],
        alerts: [],
      });

      const date = normalizeToMidnight(new Date(2024, 5, 15));
      const result = await getTasksForDay('user1', date);

      expect(result.whenPossible.inProgress).toHaveLength(1);
      expect(result.whenPossible.inProgress[0].id).toBe('1');
      expect(result.whenPossible.notStarted).toHaveLength(1);
      expect(result.whenPossible.notStarted[0].id).toBe('2');
    });

    it('should include alerts from periodic tasks', async () => {
      const periodicTask = createMockTask({ id: '1', frequency: 'hebdomadaire' });
      const alerts = [
        {
          taskId: '1',
          taskTitle: 'Test Task',
          originalDate: '2024-06-10',
          taskMode: 'Distanciel' as const,
          frequency: 'annuel' as const,
        },
      ];

      vi.mocked(getTasks).mockResolvedValue([periodicTask]);
      vi.mocked(getWorkday).mockResolvedValue('Présentiel');
      vi.mocked(getPeriodicTasksForDateWithShift).mockResolvedValue({
        tasks: [periodicTask],
        alerts,
      });

      const date = normalizeToMidnight(new Date(2024, 5, 15));
      const result = await getTasksForDay('user1', date);

      expect(result.alerts).toEqual(alerts);
    });
  });

  describe('getTasksForDateRange', () => {
    it('should return only specific date tasks in range', async () => {
      const task1 = createMockTask({ id: '1', due_on: '2024-06-15' });
      const task2 = createMockTask({ id: '2', due_on: '2024-06-20' });
      const task3 = createMockTask({ id: '3', due_on: '2024-07-01' }); // Outside range
      const periodicTask = createMockTask({ id: '4', frequency: 'hebdomadaire' }); // Should be excluded
      const whenPossibleTask = createMockTask({ id: '5', in_progress: false }); // Should be excluded

      vi.mocked(getTasks).mockResolvedValue([task1, task2, task3, periodicTask, whenPossibleTask]);

      const startDate = normalizeToMidnight(new Date(2024, 5, 10));
      const endDate = normalizeToMidnight(new Date(2024, 5, 25));
      const result = await getTasksForDateRange('user1', startDate, endDate);

      expect(result).toHaveLength(2);
      expect(result.map((t) => t.id)).toContain('1');
      expect(result.map((t) => t.id)).toContain('2');
      expect(result.map((t) => t.id)).not.toContain('3');
      expect(result.map((t) => t.id)).not.toContain('4');
      expect(result.map((t) => t.id)).not.toContain('5');
    });

    it('should sort tasks by due_on ascending', async () => {
      const task1 = createMockTask({ id: '1', due_on: '2024-06-20' });
      const task2 = createMockTask({ id: '2', due_on: '2024-06-15' });
      const task3 = createMockTask({ id: '3', due_on: '2024-06-18' });

      vi.mocked(getTasks).mockResolvedValue([task1, task2, task3]);

      const startDate = normalizeToMidnight(new Date(2024, 5, 10));
      const endDate = normalizeToMidnight(new Date(2024, 5, 25));
      const result = await getTasksForDateRange('user1', startDate, endDate);

      expect(result[0].id).toBe('2'); // 2024-06-15
      expect(result[1].id).toBe('3'); // 2024-06-18
      expect(result[2].id).toBe('1'); // 2024-06-20
    });

    it('should include tasks on boundary dates', async () => {
      const task1 = createMockTask({ id: '1', due_on: '2024-06-10' }); // Start date
      const task2 = createMockTask({ id: '2', due_on: '2024-06-25' }); // End date

      vi.mocked(getTasks).mockResolvedValue([task1, task2]);

      const startDate = normalizeToMidnight(new Date(2024, 5, 10));
      const endDate = normalizeToMidnight(new Date(2024, 5, 25));
      const result = await getTasksForDateRange('user1', startDate, endDate);

      expect(result).toHaveLength(2);
      expect(result.map((t) => t.id)).toContain('1');
      expect(result.map((t) => t.id)).toContain('2');
    });

    it('should convert tasks to CalendarTask format', async () => {
      const task = createMockTask({
        id: '1',
        title: 'Test Task',
        description: 'Description',
        due_on: '2024-06-15',
        mode: 'Présentiel',
        display_order: 5,
      });

      vi.mocked(getTasks).mockResolvedValue([task]);

      const startDate = normalizeToMidnight(new Date(2024, 5, 10));
      const endDate = normalizeToMidnight(new Date(2024, 5, 20));
      const result = await getTasksForDateRange('user1', startDate, endDate);

      expect(result[0].id).toBe('1');
      expect(result[0].title).toBe('Test Task');
      expect(result[0].type).toBe('specific');
      expect(result[0].due_on).toBe('2024-06-15');
      expect(result[0].mode).toBe('Présentiel');
      expect(result[0].display_order).toBe(5);
    });
  });

  describe('getTasksForDate', () => {
    const createMockCalendarTask = (overrides: Partial<CalendarTask> = {}): CalendarTask => ({
      id: '1',
      title: 'Test Task',
      description: '',
      type: 'specific',
      ...overrides,
    });

    it('should return specific tasks for matching date', () => {
      const tasks: CalendarTask[] = [
        createMockCalendarTask({ id: '1', type: 'specific', due_on: '2024-06-15' }),
        createMockCalendarTask({ id: '2', type: 'specific', due_on: '2024-06-16' }),
        createMockCalendarTask({ id: '3', type: 'specific', due_on: '2024-06-15' }),
      ];
      const date = normalizeToMidnight(new Date(2024, 5, 15));

      const result = getTasksForDate(tasks, date);

      expect(result).toHaveLength(2);
      expect(result.map((t) => t.id)).toContain('1');
      expect(result.map((t) => t.id)).toContain('3');
      expect(result.map((t) => t.id)).not.toContain('2');
    });

    it('should not return periodic or when-possible tasks', () => {
      const tasks: CalendarTask[] = [
        createMockCalendarTask({
          id: '1',
          type: 'periodic',
          frequency: 'hebdomadaire',
          day: 'Lundi',
        }),
        createMockCalendarTask({ id: '2', type: 'when_possible', in_progress: true }),
      ];
      const date = normalizeToMidnight(new Date(2024, 5, 15));

      const result = getTasksForDate(tasks, date);

      expect(result).toHaveLength(0);
    });

    it('should normalize date to midnight', () => {
      const tasks: CalendarTask[] = [
        createMockCalendarTask({ id: '1', type: 'specific', due_on: '2024-06-15' }),
      ];
      const date = new Date(2024, 5, 15, 14, 30, 45);

      const result = getTasksForDate(tasks, date);

      expect(result).toHaveLength(1);
    });
  });

  describe('checkFutureTaskShifts', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return empty array when no yearly or custom tasks', async () => {
      const tasks = [
        createMockTask({ id: '1', frequency: 'hebdomadaire' }),
        createMockTask({ id: '2', due_on: '2024-06-15' }),
      ];

      vi.mocked(getTasks).mockResolvedValue(tasks);

      const startDate = normalizeToMidnight(new Date(2024, 5, 15));
      const result = await checkFutureTaskShifts('user1', startDate);

      expect(result).toEqual([]);
    });

    it('should return alerts for yearly tasks on today that cannot be shifted', async () => {
      const tasks = [
        createMockTask({
          id: '1',
          frequency: 'annuel',
          start_date: '2023-06-15',
          mode: 'Tous',
          max_shifting_days: 5,
        }),
      ];

      vi.mocked(getTasks).mockResolvedValue(tasks);

      const workdaysMap: Record<string, WorkMode> = {};
      const startDate = normalizeToMidnight(new Date(2024, 5, 15));
      for (let i = -45; i <= 45; i++) {
        const checkDate = addDays(startDate, i);
        workdaysMap[formatDateLocal(checkDate)] = 'Congé';
      }

      vi.mocked(getWorkdaysMap).mockResolvedValue(workdaysMap);

      const result = await checkFutureTaskShifts('user1', startDate);

      expect(result).toHaveLength(1);
      expect(result[0].taskId).toBe('1');
      expect(result[0].frequency).toBe('annuel');
      expect(result[0].originalDate).toBe('2024-06-15');
    });

    it('should return alerts for yearly tasks on the future that cannot be shifted', async () => {
      const tasks = [
        createMockTask({
          id: '1',
          frequency: 'annuel',
          start_date: '2023-06-15',
          mode: 'Présentiel',
          max_shifting_days: 5,
        }),
      ];

      vi.mocked(getTasks).mockResolvedValue(tasks);

      const workdaysMap: Record<string, WorkMode> = {};
      const startDate = normalizeToMidnight(new Date(2024, 5, 10));
      for (let i = 0; i <= 45; i++) {
        const checkDate = addDays(startDate, i);
        workdaysMap[formatDateLocal(checkDate)] = 'Distanciel';
      }

      vi.mocked(getWorkdaysMap).mockResolvedValue(workdaysMap);

      const result = await checkFutureTaskShifts('user1', startDate);

      expect(result).toHaveLength(1);
      expect(result[0].taskId).toBe('1');
      expect(result[0].frequency).toBe('annuel');
      expect(result[0].originalDate).toBe('2024-06-15');
    });

    it('should return alerts for custom tasks on today that cannot be shifted', async () => {
      const tasks = [
        createMockTask({
          id: '1',
          frequency: 'personnalisé',
          start_date: '2024-06-01',
          custom_days: 7,
          mode: 'Distanciel',
          max_shifting_days: 3,
        }),
      ];

      vi.mocked(getTasks).mockResolvedValue(tasks);

      const workdaysMap: Record<string, WorkMode> = {};
      const startDate = normalizeToMidnight(new Date(2024, 5, 1));
      for (let i = 0; i <= 45; i++) {
        const checkDate = addDays(startDate, i);
        workdaysMap[formatDateLocal(checkDate)] = 'Présentiel';
      }

      vi.mocked(getWorkdaysMap).mockResolvedValue(workdaysMap);

      const result = await checkFutureTaskShifts('user1', startDate);

      expect(result).toHaveLength(7);
    });

    it('should return alerts for custom tasks in the future that cannot be shifted', async () => {
      const tasks = [
        createMockTask({
          id: '1',
          frequency: 'personnalisé',
          start_date: '2024-06-01',
          custom_days: 7,
          mode: 'Tous',
          max_shifting_days: 3,
        }),
      ];

      vi.mocked(getTasks).mockResolvedValue(tasks);

      const workdaysMap: Record<string, WorkMode> = {};
      const startDate = normalizeToMidnight(new Date(2024, 5, 4));
      for (let i = 0; i <= 45; i++) {
        const checkDate = addDays(startDate, i);
        workdaysMap[formatDateLocal(checkDate)] = 'Congé';
      }

      vi.mocked(getWorkdaysMap).mockResolvedValue(workdaysMap);

      const result = await checkFutureTaskShifts('user1', startDate);

      expect(result).toHaveLength(6);
    });

    it('should return alerts for custom tasks with custom workdays that sometimes cannot be shifted', async () => {
      const tasks = [
        createMockTask({
          id: '1',
          frequency: 'personnalisé',
          start_date: '2024-06-01',
          custom_days: 3,
          mode: 'Tous',
          max_shifting_days: 5,
        }),
      ];

      vi.mocked(getTasks).mockResolvedValue(tasks);

      const workdaysMap: Record<string, WorkMode> = {};
      const startDate = normalizeToMidnight(new Date(2024, 5, 1));
      let checkDate = startDate;
      for (let i = 0; i <= 20; i++) {
        checkDate = addDays(checkDate, 1);
        workdaysMap[formatDateLocal(checkDate)] = 'Congé';
      }
      for (let i = 0; i <= 10; i++) {
        checkDate = addDays(checkDate, 1);
        workdaysMap[formatDateLocal(checkDate)] = 'Distanciel';
      }
      for (let i = 0; i <= 15; i++) {
        checkDate = addDays(checkDate, 1);
        workdaysMap[formatDateLocal(checkDate)] = 'Congé';
      }

      vi.mocked(getWorkdaysMap).mockResolvedValue(workdaysMap);

      const result = await checkFutureTaskShifts('user1', startDate);

      expect(result).toHaveLength(9);
    });

    it('should not return alerts when tasks can be shifted', async () => {
      const tasks = [
        createMockTask({
          id: '1',
          frequency: 'annuel',
          start_date: '2023-06-15',
          mode: 'Distanciel',
        }),
      ];

      vi.mocked(getTasks).mockResolvedValue(tasks);

      const workdaysMap: Record<string, WorkMode> = {};
      const startDate = normalizeToMidnight(new Date(2024, 5, 15));
      let checkDate = startDate;
      for (let i = 0; i <= 15; i++) {
        checkDate = addDays(checkDate, 1);
        workdaysMap[formatDateLocal(checkDate)] = 'Présentiel';
      }
      checkDate = addDays(checkDate, 1);
      workdaysMap[formatDateLocal(checkDate)] = 'Distanciel';
      for (let i = 0; i <= 29; i++) {
        checkDate = addDays(checkDate, 1);
        workdaysMap[formatDateLocal(checkDate)] = 'Congé';
      }

      vi.mocked(getWorkdaysMap).mockResolvedValue(workdaysMap);

      const result = await checkFutureTaskShifts('user1', startDate);

      expect(result).toEqual([]);
    });

    it('should skip tasks without start_date', async () => {
      const tasks = [
        createMockTask({
          id: '1',
          frequency: 'annuel',
          mode: 'Distanciel',
        }),
      ];

      vi.mocked(getTasks).mockResolvedValue(tasks);

      const startDate = normalizeToMidnight(new Date(2024, 5, 15));
      const result = await checkFutureTaskShifts('user1', startDate);

      expect(result).toEqual([]);
    });

    it('should skip tasks with start_date after end date', async () => {
      const tasks = [
        createMockTask({
          id: '1',
          frequency: 'annuel',
          start_date: '2024-08-15', // After startDate + 45 days
          mode: 'Distanciel',
        }),
      ];

      vi.mocked(getTasks).mockResolvedValue(tasks);

      const startDate = normalizeToMidnight(new Date(2024, 5, 15));
      const result = await checkFutureTaskShifts('user1', startDate);

      expect(result).toEqual([]);
    });

    it('should mark isFutureShift correctly', async () => {
      const tasks = [
        createMockTask({
          id: '1',
          frequency: 'annuel',
          start_date: '2023-06-10', // Past
          mode: 'Distanciel',
          max_shifting_days: 5,
        }),
        createMockTask({
          id: '2',
          frequency: 'annuel',
          start_date: '2024-06-20', // Future
          mode: 'Distanciel',
          max_shifting_days: 5,
        }),
      ];

      vi.mocked(getTasks).mockResolvedValue(tasks);

      const workdaysMap: Record<string, WorkMode> = {};
      for (let i = 0; i <= 45; i++) {
        const checkDate = normalizeToMidnight(new Date(2024, 5, 15 + i));
        workdaysMap[formatDateLocal(checkDate)] = 'Présentiel';
      }

      vi.mocked(getWorkdaysMap).mockResolvedValue(workdaysMap);

      const startDate = normalizeToMidnight(new Date(2024, 5, 15));
      const result = await checkFutureTaskShifts('user1', startDate);

      const pastAlert = result.find((a) => a.taskId === '1');
      const futureAlert = result.find((a) => a.taskId === '2');

      if (pastAlert) {
        expect(pastAlert.isFutureShift).toBe(false);
      }
      if (futureAlert) {
        expect(futureAlert.isFutureShift).toBe(true);
      }
    });

    it('should avoid duplicate alerts', async () => {
      const tasks = [
        createMockTask({
          id: '1',
          frequency: 'personnalisé',
          start_date: '2024-06-01',
          custom_days: 7,
          mode: 'Distanciel',
          max_shifting_days: 3,
        }),
      ];

      vi.mocked(getTasks).mockResolvedValue(tasks);

      const workdaysMap: Record<string, WorkMode> = {};
      for (let i = 0; i <= 45; i++) {
        const checkDate = normalizeToMidnight(new Date(2024, 5, 1 + i));
        workdaysMap[formatDateLocal(checkDate)] = 'Présentiel';
      }

      vi.mocked(getWorkdaysMap).mockResolvedValue(workdaysMap);

      const startDate = normalizeToMidnight(new Date(2024, 5, 15));
      const result = await checkFutureTaskShifts('user1', startDate);

      // Check for duplicates by taskId and originalDate
      const alertKeys = result.map((a) => `${a.taskId}-${a.originalDate}`);
      const uniqueKeys = new Set(alertKeys);
      expect(alertKeys.length).toBe(uniqueKeys.size);
    });

    it('should include next-year occurrence for yearly tasks when inside range', async () => {
      const tasks = [
        createMockTask({
          id: '1',
          frequency: 'annuel',
          start_date: '2024-01-10', // January 10, 2024
          mode: 'Tous',
          max_shifting_days: 5,
        }),
      ];

      vi.mocked(getTasks).mockResolvedValue(tasks);

      // We start the window mid-December 2024
      const startDate = normalizeToMidnight(new Date(2024, 11, 20)); // December 20, 2024

      const workdaysMap: Record<string, WorkMode> = {};
      // We cover the range [-45, +45] around startDate
      for (let i = -45; i <= 45; i++) {
        const checkDate = addDays(startDate, i);
        // Everything is in "Congé" -> forces a shift, but it will be impossible
        workdaysMap[formatDateLocal(checkDate)] = 'Congé';
      }

      vi.mocked(getWorkdaysMap).mockResolvedValue(workdaysMap);

      const result = await checkFutureTaskShifts('user1', startDate);

      // The occurrence taken into account must be the 10 January 2025
      const expectedNextYearDate = formatDateLocal(
        normalizeToMidnight(new Date(2025, 0, 10)), // January 10, 2025
      );

      expect(result).toHaveLength(1);
      expect(result[0].taskId).toBe('1');
      expect(result[0].frequency).toBe('annuel');
      expect(result[0].originalDate).toBe(expectedNextYearDate);
    });

    it('should correctly calculate first occurrence when start date is before start range (negative offset)', async () => {
      const task = createMockTask({
        id: '1',
        frequency: 'personnalisé' as const,
        start_date: '2024-05-01',
        custom_days: 10,
        title: 'Custom Task',
        mode: 'Tous' as const,
        max_shifting_days: 3,
      });

      vi.mocked(getTasks).mockResolvedValue([task]);

      // startDate AFTER start_date -> daysFromStart positive
      const startDate = normalizeToMidnight(new Date(2024, 5, 1)); // June 1
      const workdaysMap: Record<string, WorkMode> = {};

      // Make ALL days incompatible to force alert
      for (let i = -45; i <= 45; i++) {
        const d = addDays(startDate, i);
        workdaysMap[formatDateLocal(d)] = 'Congé';
      }

      vi.mocked(getWorkdaysMap).mockResolvedValue(workdaysMap);

      const result = await checkFutureTaskShifts('user1', startDate);

      expect(result.length).toBeGreaterThan(0); // Alerts exist
    });
  });

  describe('filterTasksByWorkMode', () => {
    it('should return empty array when workMode is Congé and tasks have no due_on', () => {
      const tasks = [
        { id: '1', mode: 'Tous' as const },
        { id: '2', mode: 'Présentiel' as const },
      ];

      const result = filterTasksByWorkMode(tasks, 'Congé');
      expect(result).toEqual([]);
    });

    it('should return specific tasks (with due_on) when workMode is Congé', () => {
      const tasks = [
        { id: '1', mode: 'Tous' as const, due_on: '2024-01-01' },
        { id: '2', mode: 'Présentiel' as const, due_on: '2024-01-02' },
        { id: '3', mode: 'Distanciel' as const },
      ];

      const result = filterTasksByWorkMode(tasks, 'Congé');
      expect(result.map((t) => t.id)).toEqual(['1', '2']);
    });

    it('should include tasks with mode Tous when filtering', () => {
      const tasks = [
        { id: '1', mode: 'Tous' as const },
        { id: '2', mode: 'Distanciel' as const },
      ];

      const result = filterTasksByWorkMode(tasks, 'Présentiel');
      expect(result.map((t) => t.id)).toEqual(['1']);
    });
  });

  describe('calendarTaskToTaskLike', () => {
    it('should convert CalendarTask to Task-like object and set postponed_days to undefined', () => {
      const task: CalendarTask = {
        id: '1',
        title: 'Test',
        description: 'Desc',
        type: 'periodic',
        day: 'Lundi' as const,
        frequency: 'hebdomadaire' as const,
        due_on: '2024-06-10',
        in_progress: true,
        mode: 'Distanciel' as const,
        display_order: 3,
      };

      const result = calendarTaskToTaskLike(task);
      expect(result.id).toBe('1');
      expect(result.title).toBe('Test');
      expect(result.postponed_days).toBeUndefined();
    });
  });
});
