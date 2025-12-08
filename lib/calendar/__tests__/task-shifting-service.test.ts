import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  findNextMatchingDate,
  getPeriodicTasksForDateWithShift,
} from '../task-shifting-service';
import { getWorkdaysMap, type WorkMode } from '@/lib/db/workdays';
import type { Task } from '@/lib/types';
import { addDays, formatDateLocal, normalizeToMidnight } from '@/lib/utils';

// Mock workdays
vi.mock('@/lib/db/workdays', () => ({
  getWorkdaysMap: vi.fn(),
}));

describe('task-shifting-service', () => {
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

  describe('findNextMatchingDate', () => {
    it('should return start date if it matches task mode', async () => {
      const startDate = normalizeToMidnight(new Date(2024, 5, 10)); // Monday
      const workdaysMap: Record<string, WorkMode> = {
        [formatDateLocal(startDate)]: 'Présentiel',
      };

      const result = await findNextMatchingDate(startDate, 'Présentiel', workdaysMap, 7);

      expect(result).not.toBeNull();
      expect(formatDateLocal(result!)).toBe(formatDateLocal(startDate));
    });

    it('should return start date if task mode is Tous', async () => {
      const startDate = normalizeToMidnight(new Date(2024, 5, 10));
      const workdaysMap: Record<string, WorkMode> = {
        [formatDateLocal(startDate)]: 'Présentiel',
      };

      const result = await findNextMatchingDate(startDate, 'Tous', workdaysMap, 7);

      expect(result).not.toBeNull();
      expect(formatDateLocal(result!)).toBe(formatDateLocal(startDate));
    });

    it('should skip Congé days', async () => {
      const startDate = normalizeToMidnight(new Date(2024, 5, 10)); // Monday
      const nextDate = normalizeToMidnight(new Date(2024, 5, 11)); // Tuesday
      const workdaysMap: Record<string, WorkMode> = {
        [formatDateLocal(startDate)]: 'Congé',
        [formatDateLocal(nextDate)]: 'Présentiel',
      };

      const result = await findNextMatchingDate(startDate, 'Présentiel', workdaysMap, 7);

      expect(result).not.toBeNull();
      expect(formatDateLocal(result!)).toBe(formatDateLocal(nextDate));
    });

    it('should find next matching date when mode does not match', async () => {
      const startDate = normalizeToMidnight(new Date(2024, 5, 10)); // Monday (Présentiel)
      const nextDate = normalizeToMidnight(new Date(2024, 5, 12)); // Wednesday (Distanciel)
      const workdaysMap: Record<string, WorkMode> = {
        [formatDateLocal(startDate)]: 'Présentiel',
        [formatDateLocal(normalizeToMidnight(new Date(2024, 5, 11)))]: 'Présentiel',
        [formatDateLocal(nextDate)]: 'Distanciel',
      };

      const result = await findNextMatchingDate(startDate, 'Distanciel', workdaysMap, 7);

      expect(result).not.toBeNull();
      expect(formatDateLocal(result!)).toBe(formatDateLocal(nextDate));
    });

    it('should return null if no matching date found within maxDays', async () => {
      const startDate = normalizeToMidnight(new Date(2024, 5, 10));
      const workdaysMap: Record<string, WorkMode> = {
        [formatDateLocal(startDate)]: 'Présentiel',
        [formatDateLocal(normalizeToMidnight(new Date(2024, 5, 11)))]: 'Présentiel',
        [formatDateLocal(normalizeToMidnight(new Date(2024, 5, 12)))]: 'Présentiel',
        [formatDateLocal(normalizeToMidnight(new Date(2024, 5, 13)))]: 'Distanciel',
      };

      const result = await findNextMatchingDate(startDate, 'Distanciel', workdaysMap, 2);

      expect(result).toBeNull();
    });

    it('should use default work mode if date not in map', async () => {
      const startDate = normalizeToMidnight(new Date(2024, 5, 10));
      const workdaysMap: Record<string, WorkMode> = {};

      const result = await findNextMatchingDate(startDate, 'Présentiel', workdaysMap, 7);

      // Should use default 'Présentiel' from code
      expect(result).not.toBeNull();
      expect(formatDateLocal(result!)).toBe(formatDateLocal(startDate));
    });

    it('should handle maxDays boundary correctly', async () => {
      const startDate = normalizeToMidnight(new Date(2024, 5, 10));
      const matchingDate = normalizeToMidnight(new Date(2024, 5, 17)); // 7 days later
      const workdaysMap: Record<string, WorkMode> = {
        [formatDateLocal(startDate)]: 'Présentiel',
        [formatDateLocal(matchingDate)]: 'Distanciel',
      };

      const result = await findNextMatchingDate(startDate, 'Distanciel', workdaysMap, 7);

      expect(result).not.toBeNull();
      expect(formatDateLocal(result!)).toBe(formatDateLocal(matchingDate));
    });
  });

  describe('getPeriodicTasksForDateWithShift', () => {
    it('should return daily tasks without shift', async () => {
      const tasks = [
        createMockTask({ id: '1', frequency: 'quotidien' }),
      ];
      const date = normalizeToMidnight(new Date(2024, 5, 15));

      vi.mocked(getWorkdaysMap).mockResolvedValue({});

      const result = await getPeriodicTasksForDateWithShift('user1', tasks, date);

      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].id).toBe('1');
      expect(result.tasks[0].shiftInfo).toBeUndefined();
      expect(result.alerts).toHaveLength(0);
    });

    it('should filter periodic tasks by frequency', async () => {
      const tasks = [
        createMockTask({ id: '1', frequency: 'hebdomadaire', day: 'Lundi' }),
        createMockTask({ id: '2', frequency: 'mensuel', day: 'Lundi' }),
        createMockTask({ id: '3', frequency: 'annuel', start_date: '2024-06-03' }),
        createMockTask({ id: '4', frequency: 'personnalisé', custom_days: 2, start_date: '2024-06-01' }),
        createMockTask({ id: '5', frequency: 'quotidien' }),
        createMockTask({ id: '6', due_on: '2024-06-15' }), // Not periodic
        createMockTask({ id: '7', in_progress: true }), // Not periodic
      ];
      const date = normalizeToMidnight(new Date(2024, 5, 3)); // Monday

      vi.mocked(getWorkdaysMap).mockResolvedValue({
        [formatDateLocal(date)]: 'Présentiel',
      });

      const result = await getPeriodicTasksForDateWithShift('user1', tasks, date);

      // Should include periodic tasks (1-4) and daily tasks (5)
      const taskIds = result.tasks.map(t => t.id);
      expect(taskIds).toContain('1');
      expect(taskIds).toContain('2');
      expect(taskIds).toContain('3');
      expect(taskIds).toContain('4');
      expect(taskIds).toContain('5');
      expect(taskIds).not.toContain('6');
      expect(taskIds).not.toContain('7');
    });

    it('should add shiftInfo when hebdomadaire task is shifted', async () => {
      const tasks = [
        createMockTask({
          id: '1',
          frequency: 'hebdomadaire',
          day: 'Lundi',
          mode: 'Tous',
        }),
      ];
      const originalDate = normalizeToMidnight(new Date(2024, 5, 10)); // Monday
      const shiftedDate = normalizeToMidnight(new Date(2024, 5, 12)); // Wednesday
      const targetDate = shiftedDate;

      vi.mocked(getWorkdaysMap).mockResolvedValue({
        [formatDateLocal(originalDate)]: 'Congé',
        [formatDateLocal(addDays(originalDate, 1))]: 'Congé',
        [formatDateLocal(shiftedDate)]: 'Distanciel',
      });

      const result = await getPeriodicTasksForDateWithShift('user1', tasks, targetDate);

      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].shiftInfo).toBeDefined();
      expect(result.tasks[0].shiftInfo?.originalDate).toBe(formatDateLocal(originalDate));
      expect(result.tasks[0].shiftInfo?.shiftedDate).toBe(formatDateLocal(shiftedDate));
    });

    it('should add shiftInfo when mensuel task is shifted', async () => {
      const tasks = [
        createMockTask({
          id: '1',
          frequency: 'mensuel',
          day: 'Lundi',
          mode: 'Distanciel',
        }),
      ];
      // First Monday of June 2024 is June 3
      const originalDate = normalizeToMidnight(new Date(2024, 5, 3)); // Monday, June 3, 2024
      const shiftedDate = normalizeToMidnight(new Date(2024, 5, 5)); // Wednesday, June 5, 2024
      const targetDate = shiftedDate;

      vi.mocked(getWorkdaysMap).mockResolvedValue({
        [formatDateLocal(originalDate)]: 'Présentiel',
        [formatDateLocal(addDays(originalDate, 1))]: 'Présentiel',
        [formatDateLocal(shiftedDate)]: 'Distanciel',
      });

      const result = await getPeriodicTasksForDateWithShift('user1', tasks, targetDate);

      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].shiftInfo).toBeDefined();
      expect(result.tasks[0].shiftInfo?.originalDate).toBe(formatDateLocal(originalDate));
      expect(result.tasks[0].shiftInfo?.shiftedDate).toBe(formatDateLocal(shiftedDate));
    });

    it('should add shiftInfo when annuel task is shifted', async () => {
      const tasks = [
        createMockTask({
          id: '1',
          frequency: 'annuel',
          start_date: '2023-06-15',
          mode: 'Distanciel',
        }),
      ];
      const originalDate = normalizeToMidnight(new Date(2024, 5, 15)); // June 15, 2024
      const shiftedDate = normalizeToMidnight(new Date(2024, 5, 19)); // June 19, 2024
      const targetDate = shiftedDate;

      vi.mocked(getWorkdaysMap).mockResolvedValue({
        [formatDateLocal(originalDate)]: 'Présentiel',
        [formatDateLocal(addDays(originalDate, 1))]: 'Présentiel',
        [formatDateLocal(addDays(originalDate, 2))]: 'Présentiel',
        [formatDateLocal(addDays(originalDate, 3))]: 'Présentiel',
        [formatDateLocal(shiftedDate)]: 'Distanciel',
      });

      const result = await getPeriodicTasksForDateWithShift('user1', tasks, targetDate);

      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].shiftInfo).toBeDefined();
      expect(result.tasks[0].shiftInfo?.originalDate).toBe(formatDateLocal(originalDate));
      expect(result.tasks[0].shiftInfo?.shiftedDate).toBe(formatDateLocal(shiftedDate));
    });

    it('should add shiftInfo when personnalisé task is shifted', async () => {
      const tasks = [
        createMockTask({
          id: '1',
          frequency: 'personnalisé',
          start_date: '2024-06-01',
          custom_days: 7,
          mode: 'Distanciel',
        }),
      ];
      // First occurrence after start_date: June 8 (7 days after June 1)
      const originalDate = normalizeToMidnight(new Date(2024, 5, 8));
      const shiftedDate = normalizeToMidnight(new Date(2024, 5, 12)); // Wednesday
      const targetDate = shiftedDate;

      vi.mocked(getWorkdaysMap).mockResolvedValue({
        [formatDateLocal(originalDate)]: 'Présentiel',
        [formatDateLocal(addDays(originalDate, 1))]: 'Présentiel',
        [formatDateLocal(addDays(originalDate, 2))]: 'Présentiel',
        [formatDateLocal(addDays(originalDate, 3))]: 'Présentiel',
        [formatDateLocal(shiftedDate)]: 'Distanciel',
      });

      const result = await getPeriodicTasksForDateWithShift('user1', tasks, targetDate);

      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].shiftInfo).toBeDefined();
      expect(result.tasks[0].shiftInfo?.originalDate).toBe(formatDateLocal(originalDate));
      expect(result.tasks[0].shiftInfo?.shiftedDate).toBe(formatDateLocal(shiftedDate));
    });

    it('should not shift task if original date matches task mode', async () => {
      const tasks = [
        createMockTask({
          id: '1',
          frequency: 'hebdomadaire',
          day: 'Lundi',
          mode: 'Présentiel',
        }),
      ];
      const date = normalizeToMidnight(new Date(2024, 5, 10)); // Monday

      vi.mocked(getWorkdaysMap).mockResolvedValue({
        [formatDateLocal(date)]: 'Présentiel',
      });

      const result = await getPeriodicTasksForDateWithShift('user1', tasks, date);

      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].shiftInfo).toBeUndefined();
    });

    it('should generate alert when shift fails for annuel frequency', async () => {
      const tasks = [
        createMockTask({
          id: '1',
          frequency: 'annuel',
          start_date: '2024-06-15',
          mode: 'Distanciel',
          max_shifting_days: 5,
        }),
      ];
      const targetDate = normalizeToMidnight(new Date(2024, 5, 20));

      // All dates in range are Présentiel, no Distanciel found
      const workdaysMap: Record<string, WorkMode> = {};
      for (let i = 0; i <= 5; i++) {
        const checkDate = normalizeToMidnight(new Date(2024, 5, 15 + i));
        workdaysMap[formatDateLocal(checkDate)] = 'Présentiel';
      }

      vi.mocked(getWorkdaysMap).mockResolvedValue(workdaysMap);

      const result = await getPeriodicTasksForDateWithShift('user1', tasks, targetDate);

      expect(result.alerts).toHaveLength(1);
      expect(result.alerts[0].taskId).toBe('1');
      expect(result.alerts[0].frequency).toBe('annuel');
    });

    it('should generate alert when shift fails for personnalisé frequency', async () => {
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
      const targetDate = normalizeToMidnight(new Date(2024, 5, 15));

      const workdaysMap: Record<string, WorkMode> = {};
      for (let i = 0; i <= 3; i++) {
        const checkDate = normalizeToMidnight(new Date(2024, 5, 8 + i));
        workdaysMap[formatDateLocal(checkDate)] = 'Présentiel';
      }

      vi.mocked(getWorkdaysMap).mockResolvedValue(workdaysMap);

      const result = await getPeriodicTasksForDateWithShift('user1', tasks, targetDate);

      expect(result.alerts).toHaveLength(1);
      expect(result.alerts[0].taskId).toBe('1');
      expect(result.alerts[0].frequency).toBe('personnalisé');
    });

    it('should use default max_shifting_days if not provided', async () => {
      const tasks = [
        createMockTask({
          id: '1',
          frequency: 'hebdomadaire',
          day: 'Lundi',
          mode: 'Distanciel',
        }),
      ];
      const date = normalizeToMidnight(new Date(2024, 5, 10));

      vi.mocked(getWorkdaysMap).mockResolvedValue({
        [formatDateLocal(date)]: 'Présentiel',
      });

      const result = await getPeriodicTasksForDateWithShift('user1', tasks, date);

      // Should still attempt to shift with default max days
      expect(result.tasks).toBeDefined();
    });

    it('should sort tasks by display_order', async () => {
      const tasks = [
        createMockTask({ id: '1', frequency: 'quotidien', display_order: 3 }),
        createMockTask({ id: '2', frequency: 'quotidien', display_order: 1 }),
        createMockTask({ id: '3', frequency: 'quotidien', display_order: 2 }),
      ];
      const date = normalizeToMidnight(new Date(2024, 5, 15));

      vi.mocked(getWorkdaysMap).mockResolvedValue({});

      const result = await getPeriodicTasksForDateWithShift('user1', tasks, date);

      expect(result.tasks[0].id).toBe('2');
      expect(result.tasks[1].id).toBe('3');
      expect(result.tasks[2].id).toBe('1');
    });
  });
});
