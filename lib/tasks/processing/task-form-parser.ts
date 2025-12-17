import type { Task, Frequency, DayOfWeek } from '@/lib/types';
import { TASK_TYPES } from '@/lib/tasks/constants/task-constants';
import {
  isValidTaskType,
  isValidFrequency,
  isValidDayOfWeek,
  isValidMode,
  validateTaskTitle,
  validateTaskDescription,
  validatePostponedDays,
  validateDueOn,
  validateCustomDays,
  validateStartDate,
  validateMaxShiftingDays,
} from '@/lib/tasks/validation/task-validation';

interface ParsedTaskFormData {
  title: string;
  description: string;
  taskType: (typeof TASK_TYPES)[keyof typeof TASK_TYPES];
  mode: Task['mode'];
  frequency?: Frequency;
  day?: DayOfWeek;
  custom_days?: number;
  max_shifting_days?: number;
  start_date?: string;
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
  const custom_daysRaw = String(formData.get('custom_days') || '');
  const max_shifting_daysRaw = String(formData.get('max_shifting_days') || '');
  const start_dateRaw = String(formData.get('start_date') || '');
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

  const mode: Task['mode'] = isValidMode(modeRaw) ? (modeRaw as Task['mode']) : 'Tous';

  const result: ParsedTaskFormData = {
    title,
    description,
    taskType: taskTypeRaw,
    mode,
  };

  // Parse task type specific fields
  if (taskTypeRaw === TASK_TYPES.PERIODIC) {
    if (frequencyRaw && isValidFrequency(frequencyRaw)) {
      result.frequency = frequencyRaw as Frequency;
    }
    if (dayRaw && isValidDayOfWeek(dayRaw)) {
      result.day = dayRaw as DayOfWeek;
    }
    // Handle custom frequency fields
    if (frequencyRaw === 'personnalisé') {
      // Both custom_days and start_date are required for personnalisé frequency
      if (!custom_daysRaw || !validateCustomDays(custom_daysRaw)) {
        return null; // Validation failed: custom_days is missing or invalid
      }
      if (!start_dateRaw || !validateStartDate(start_dateRaw)) {
        return null; // Validation failed: start_date is missing or invalid
      }
      result.custom_days = Number(custom_daysRaw);
      result.start_date = start_dateRaw;
      // max_shifting_days is optional, only parse if provided
      if (max_shifting_daysRaw && validateMaxShiftingDays(max_shifting_daysRaw)) {
        result.max_shifting_days = Number(max_shifting_daysRaw);
      }
    }
    // Handle annual frequency fields
    if (frequencyRaw === 'annuel') {
      // start_date is required for annuel frequency
      if (!start_dateRaw || !validateStartDate(start_dateRaw)) {
        return null; // Validation failed: start_date is missing or invalid
      }
      result.start_date = start_dateRaw;
    }
    // PERIODIC: in_progress not used, leave undefined
    result.in_progress = undefined;
  } else if (taskTypeRaw === TASK_TYPES.SPECIFIC) {
    if (due_onRaw && validateDueOn(due_onRaw)) {
      result.due_on = due_onRaw;
    }
    if (postponed_daysRaw && validatePostponedDays(postponed_daysRaw)) {
      result.postponed_days = Number(postponed_daysRaw);
    }
    // SPECIFIC: force in_progress to undefined (tasks with specific dates don't use in_progress)
    // Note: We'll set it to null in parsedDataToTaskUpdates to clear it in DB
    result.in_progress = undefined;
  } else if (taskTypeRaw === TASK_TYPES.WHEN_POSSIBLE) {
    // WHEN_POSSIBLE: force in_progress to be boolean (true or false, never null/undefined)
    const inProgressValue = formData.get('in_progress') != null;
    result.in_progress = inProgressValue;
    // Allow due_on for "when possible" tasks regardless of in_progress state
    if (due_onRaw && validateDueOn(due_onRaw)) {
      result.due_on = due_onRaw;
    }
  }

  return result;
}

export function parsedDataToTaskUpdates(
  parsed: ParsedTaskFormData,
): Partial<
  Pick<
    Task,
    | 'title'
    | 'description'
    | 'frequency'
    | 'day'
    | 'custom_days'
    | 'max_shifting_days'
    | 'start_date'
    | 'due_on'
    | 'postponed_days'
    | 'in_progress'
    | 'mode'
  >
> {
  const updates: Partial<Task> = {
    title: parsed.title,
    description: parsed.description,
    mode: parsed.mode,
    frequency: undefined,
    day: undefined,
    custom_days: undefined,
    max_shifting_days: undefined,
    start_date: undefined,
    due_on: undefined,
    postponed_days: undefined,
    in_progress: undefined,
  };

  if (parsed.taskType === TASK_TYPES.PERIODIC) {
    updates.frequency = parsed.frequency;
    updates.day = parsed.day;
    // Include custom fields if frequency is personnalisé
    if (parsed.frequency === 'personnalisé') {
      updates.custom_days = parsed.custom_days;
      updates.start_date = parsed.start_date;
      // Only include max_shifting_days if provided (optional)
      if (parsed.max_shifting_days !== undefined) {
        updates.max_shifting_days = parsed.max_shifting_days;
      }
    }
    // Include start_date if frequency is annuel
    if (parsed.frequency === 'annuel') {
      updates.start_date = parsed.start_date;
    }
    // PERIODIC: don't set in_progress (leave undefined to not modify it)
    updates.in_progress = undefined;
  } else if (parsed.taskType === TASK_TYPES.SPECIFIC) {
    updates.due_on = parsed.due_on;
    updates.postponed_days = parsed.postponed_days;
    // SPECIFIC: force in_progress to null (to clear it in DB)
    // Type assertion needed because Task type allows boolean | undefined, but DB accepts null
    (updates as any).in_progress = null;
  } else if (parsed.taskType === TASK_TYPES.WHEN_POSSIBLE) {
    // WHEN_POSSIBLE: force in_progress to be boolean (true or false)
    updates.in_progress = parsed.in_progress ?? false;
    // Include due_on if provided (allowed for both in_progress true and false)
    if (parsed.due_on !== undefined) {
      updates.due_on = parsed.due_on || undefined;
    }
  }

  return updates;
}
