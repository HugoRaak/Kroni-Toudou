import type { Task, Frequency, DayOfWeek } from '@/lib/types';
import { TASK_TYPES } from '@/lib/tasks/task-constants';
import {
  isValidTaskType,
  isValidFrequency,
  isValidDayOfWeek,
  isValidMode,
  validateTaskTitle,
  validateTaskDescription,
  validatePostponedDays,
  validateDueOn,
} from '@/lib/tasks/task-validation';

export interface ParsedTaskFormData {
  title: string;
  description: string;
  taskType: typeof TASK_TYPES[keyof typeof TASK_TYPES];
  mode: Task['mode'];
  frequency?: Frequency;
  day?: DayOfWeek;
  due_on?: string;
  postponed_days?: number;
  in_progress?: boolean;
}

export function parseTaskFormData(formData: FormData): ParsedTaskFormData | null {
  const title = String(formData.get('title') || '').trim();
  const description = String(formData.get('description') || '');
  const taskTypeRaw = String(formData.get('taskType') || '');
  const frequencyRaw = String(formData.get('frequency') || '');
  const dayRaw = String(formData.get('day') || '');
  const due_onRaw = String(formData.get('due_on') || '');
  const postponed_daysRaw = String(formData.get('postponed_days') || '');
  const modeRaw = String(formData.get('mode') || 'Tous');

  // Validate common fields
  if (!validateTaskTitle(title)) {
    return null;
  }
  if (!validateTaskDescription(description)) {
    return null;
  }
  if (!isValidTaskType(taskTypeRaw)) {
    return null;
  }

  const mode: Task['mode'] = isValidMode(modeRaw) ? modeRaw : 'Tous';

  const result: ParsedTaskFormData = {
    title,
    description,
    taskType: taskTypeRaw,
    mode,
  };

  // Parse task type specific fields
  if (taskTypeRaw === TASK_TYPES.PERIODIC) {
    if (frequencyRaw && isValidFrequency(frequencyRaw)) {
      result.frequency = frequencyRaw;
    }
    if (dayRaw && isValidDayOfWeek(dayRaw)) {
      result.day = dayRaw;
    }
    result.in_progress = undefined;
  } else if (taskTypeRaw === TASK_TYPES.SPECIFIC) {
    if (due_onRaw && validateDueOn(due_onRaw)) {
      result.due_on = due_onRaw;
    }
    if (postponed_daysRaw && validatePostponedDays(postponed_daysRaw)) {
      result.postponed_days = Number(postponed_daysRaw);
    }
    result.in_progress = undefined;
  } else if (taskTypeRaw === TASK_TYPES.WHEN_POSSIBLE) {
    result.in_progress = formData.get('in_progress') != null;
  }

  return result;
}

export function parsedDataToTaskUpdates(
  parsed: ParsedTaskFormData
): Partial<Pick<Task, 'title' | 'description' | 'frequency' | 'day' | 'due_on' | 'postponed_days' | 'in_progress' | 'mode'>> {
  const updates: Partial<Task> = {
    title: parsed.title,
    description: parsed.description,
    mode: parsed.mode,
    frequency: undefined,
    day: undefined,
    due_on: undefined,
    postponed_days: undefined,
    in_progress: undefined,
  };

  if (parsed.taskType === TASK_TYPES.PERIODIC) {
    updates.frequency = parsed.frequency;
    updates.day = parsed.day;
  } else if (parsed.taskType === TASK_TYPES.SPECIFIC) {
    updates.due_on = parsed.due_on;
    updates.postponed_days = parsed.postponed_days;
  } else if (parsed.taskType === TASK_TYPES.WHEN_POSSIBLE) {
    updates.in_progress = parsed.in_progress;
  }

  return updates;
}

