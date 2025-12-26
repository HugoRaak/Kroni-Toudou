import { describe, it, expect } from 'vitest';
import { parseTaskFormData, parsedDataToTaskUpdates } from '../task-form-parser';
import { TASK_TYPES } from '@/lib/tasks/constants/task-constants';
import type { Task } from '@/lib/types';

describe('task-form-parser', () => {
  const createFormData = (data: Record<string, string | boolean>): FormData => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (typeof value === 'boolean') {
        if (value) {
          formData.append(key, 'true');
        }
      } else {
        formData.append(key, value);
      }
    });
    return formData;
  };

  describe('parseTaskFormData', () => {
    it('should parse basic task fields', () => {
      const formData = createFormData({
        title: 'Test Task',
        description: 'Test description',
        taskType: TASK_TYPES.WHEN_POSSIBLE,
        mode: 'Tous',
      });

      const result = parseTaskFormData(formData);

      expect(result).not.toBeNull();
      expect(result!.title).toBe('Test Task');
      expect(result!.description).toBe('Test description');
      expect(result!.taskType).toBe(TASK_TYPES.WHEN_POSSIBLE);
      expect(result!.mode).toBe('Tous');
    });

    it('should trim title', () => {
      const formData = createFormData({
        title: '  Test Task  ',
        description: '',
        taskType: TASK_TYPES.WHEN_POSSIBLE,
      });

      const result = parseTaskFormData(formData);

      expect(result).not.toBeNull();
      expect(result!.title).toBe('Test Task');
    });

    it('should return null for empty title', () => {
      const formData = createFormData({
        title: '',
        description: '',
        taskType: TASK_TYPES.WHEN_POSSIBLE,
      });

      const result = parseTaskFormData(formData);

      expect(result).toBeNull();
    });

    it('should return null for invalid task type', () => {
      const formData = createFormData({
        title: 'Test Task',
        description: '',
        taskType: 'invalid',
      });

      const result = parseTaskFormData(formData);

      expect(result).toBeNull();
    });

    it('should default mode to "Tous" if invalid', () => {
      const formData = createFormData({
        title: 'Test Task',
        description: '',
        taskType: TASK_TYPES.WHEN_POSSIBLE,
        mode: 'invalid',
      });

      const result = parseTaskFormData(formData);

      expect(result).not.toBeNull();
      expect(result!.mode).toBe('Tous');
    });

    describe('periodic tasks', () => {
      it('should parse periodic task with frequency and day', () => {
        const formData = createFormData({
          title: 'Test Task',
          description: '',
          taskType: TASK_TYPES.PERIODIC,
          frequency: 'hebdomadaire',
          day: 'Lundi',
        });

        const result = parseTaskFormData(formData);

        expect(result).not.toBeNull();
        expect(result!.taskType).toBe(TASK_TYPES.PERIODIC);
        expect(result!.frequency).toBe('hebdomadaire');
        expect(result!.day).toBe('Lundi');
        expect(result!.in_progress).toBeUndefined();
      });

      it('should parse personnalisé frequency with required fields', () => {
        const formData = createFormData({
          title: 'Test Task',
          description: '',
          taskType: TASK_TYPES.PERIODIC,
          frequency: 'personnalisé',
          custom_days: '7',
          start_date: '2024-06-01',
        });

        const result = parseTaskFormData(formData);

        expect(result).not.toBeNull();
        expect(result!.frequency).toBe('personnalisé');
        expect(result!.custom_days).toBe(7);
        expect(result!.start_date).toBe('2024-06-01');
      });

      it('should return null if personnalisé frequency missing custom_days', () => {
        const formData = createFormData({
          title: 'Test Task',
          description: '',
          taskType: TASK_TYPES.PERIODIC,
          frequency: 'personnalisé',
          start_date: '2024-06-01',
        });

        const result = parseTaskFormData(formData);

        expect(result).toBeNull();
      });

      it('should return null if personnalisé frequency missing start_date', () => {
        const formData = createFormData({
          title: 'Test Task',
          description: '',
          taskType: TASK_TYPES.PERIODIC,
          frequency: 'personnalisé',
          custom_days: '7',
        });

        const result = parseTaskFormData(formData);

        expect(result).toBeNull();
      });

      it('should parse optional max_shifting_days for personnalisé', () => {
        const formData = createFormData({
          title: 'Test Task',
          description: '',
          taskType: TASK_TYPES.PERIODIC,
          frequency: 'personnalisé',
          custom_days: '7',
          start_date: '2024-06-01',
          max_shifting_days: '30',
        });

        const result = parseTaskFormData(formData);

        expect(result).not.toBeNull();
        expect(result!.max_shifting_days).toBe(30);
      });

      it('should parse annuel frequency with required start_date', () => {
        const formData = createFormData({
          title: 'Test Task',
          description: '',
          taskType: TASK_TYPES.PERIODIC,
          frequency: 'annuel',
          start_date: '2024-06-01',
        });

        const result = parseTaskFormData(formData);

        expect(result).not.toBeNull();
        expect(result!.frequency).toBe('annuel');
        expect(result!.start_date).toBe('2024-06-01');
      });

      it('should return null if annuel frequency missing start_date', () => {
        const formData = createFormData({
          title: 'Test Task',
          description: '',
          taskType: TASK_TYPES.PERIODIC,
          frequency: 'annuel',
        });

        const result = parseTaskFormData(formData);

        expect(result).toBeNull();
      });
    });

    describe('specific tasks', () => {
      it('should parse specific task with due_on', () => {
        const formData = createFormData({
          title: 'Test Task',
          description: '',
          taskType: TASK_TYPES.SPECIFIC,
          due_on: '2024-06-15',
        });

        const result = parseTaskFormData(formData);

        expect(result).not.toBeNull();
        expect(result!.taskType).toBe(TASK_TYPES.SPECIFIC);
        expect(result!.due_on).toBe('2024-06-15');
        expect(result!.in_progress).toBeUndefined();
      });
    });

    describe('when-possible tasks', () => {
      it('should parse when-possible task', () => {
        const formData = createFormData({
          title: 'Test Task',
          description: '',
          taskType: TASK_TYPES.WHEN_POSSIBLE,
        });

        const result = parseTaskFormData(formData);

        expect(result).not.toBeNull();
        expect(result!.taskType).toBe(TASK_TYPES.WHEN_POSSIBLE);
      });

      it('should parse in_progress for when-possible task', () => {
        const formData = createFormData({
          title: 'Test Task',
          description: '',
          taskType: TASK_TYPES.WHEN_POSSIBLE,
          in_progress: true,
        });

        const result = parseTaskFormData(formData);

        expect(result).not.toBeNull();
        expect(result!.in_progress).toBe(true);
      });

      it('should set in_progress to false if not provided', () => {
        const formData = createFormData({
          title: 'Test Task',
          description: '',
          taskType: TASK_TYPES.WHEN_POSSIBLE,
        });

        const result = parseTaskFormData(formData);

        expect(result).not.toBeNull();
        expect(result!.in_progress).toBe(false);
      });
    });

    describe('edge cases', () => {
      it('should handle missing optional fields', () => {
        const formData = createFormData({
          title: 'Test Task',
          description: '',
          taskType: TASK_TYPES.WHEN_POSSIBLE,
        });

        const result = parseTaskFormData(formData);

        expect(result).not.toBeNull();
      });

      it('should handle invalid frequency for periodic task', () => {
        const formData = createFormData({
          title: 'Test Task',
          description: '',
          taskType: TASK_TYPES.PERIODIC,
          frequency: 'invalid',
        });

        const result = parseTaskFormData(formData);

        // Should still parse, but frequency will be undefined
        expect(result).not.toBeNull();
        expect(result!.frequency).toBeUndefined();
      });

      it('should handle invalid day for periodic task', () => {
        const formData = createFormData({
          title: 'Test Task',
          description: '',
          taskType: TASK_TYPES.PERIODIC,
          frequency: 'hebdomadaire',
          day: 'invalid',
        });

        const result = parseTaskFormData(formData);

        expect(result).not.toBeNull();
        expect(result!.day).toBeUndefined();
      });
    });
  });

  describe('parsedDataToTaskUpdates', () => {
    it('should convert parsed data to task updates for periodic task', () => {
      const parsed = {
        title: 'Test Task',
        description: 'Test description',
        taskType: TASK_TYPES.PERIODIC,
        mode: 'Tous' as Task['mode'],
        frequency: 'hebdomadaire' as const,
        day: 'Lundi' as const,
      };

      const result = parsedDataToTaskUpdates(parsed);

      expect(result.title).toBe('Test Task');
      expect(result.description).toBe('Test description');
      expect(result.mode).toBe('Tous');
      expect(result.frequency).toBe('hebdomadaire');
      expect(result.day).toBe('Lundi');
      expect(result.due_on).toBeUndefined();
      expect(result.in_progress).toBeUndefined();
    });

    it('should convert parsed data to task updates for specific task', () => {
      const parsed = {
        title: 'Test Task',
        description: 'Test description',
        taskType: TASK_TYPES.SPECIFIC,
        mode: 'Tous' as Task['mode'],
        due_on: '2024-06-15',
      };

      const result = parsedDataToTaskUpdates(parsed);

      expect(result.title).toBe('Test Task');
      expect(result.due_on).toBe('2024-06-15');
      expect(result.frequency).toBeUndefined();
      expect(result.in_progress).toBeNull();
    });

    it('should convert parsed data to task updates for when-possible task', () => {
      const parsed = {
        title: 'Test Task',
        description: 'Test description',
        taskType: TASK_TYPES.WHEN_POSSIBLE,
        mode: 'Tous' as Task['mode'],
        in_progress: true,
      };

      const result = parsedDataToTaskUpdates(parsed);

      expect(result.title).toBe('Test Task');
      expect(result.in_progress).toBe(true);
      expect(result.frequency).toBeUndefined();
      expect(result.due_on).toBeUndefined();
    });

    it('should include custom fields for personnalisé frequency', () => {
      const parsed = {
        title: 'Test Task',
        description: '',
        taskType: TASK_TYPES.PERIODIC,
        mode: 'Tous' as Task['mode'],
        frequency: 'personnalisé' as const,
        custom_days: 7,
        start_date: '2024-06-01',
        max_shifting_days: 30,
      };

      const result = parsedDataToTaskUpdates(parsed);

      expect(result.custom_days).toBe(7);
      expect(result.start_date).toBe('2024-06-01');
      expect(result.max_shifting_days).toBe(30);
    });

    it('should include start_date for annuel frequency', () => {
      const parsed = {
        title: 'Test Task',
        description: '',
        taskType: TASK_TYPES.PERIODIC,
        mode: 'Tous' as Task['mode'],
        frequency: 'annuel' as const,
        start_date: '2024-06-01',
      };

      const result = parsedDataToTaskUpdates(parsed);

      expect(result.start_date).toBe('2024-06-01');
    });

    it('should clear fields not relevant to task type', () => {
      const parsed = {
        title: 'Test Task',
        description: '',
        taskType: TASK_TYPES.WHEN_POSSIBLE,
        mode: 'Tous' as Task['mode'],
      };

      const result = parsedDataToTaskUpdates(parsed);

      expect(result.frequency).toBeUndefined();
      expect(result.due_on).toBeUndefined();
      expect(result.custom_days).toBeUndefined();
    });
  });
});
