import type { Task, Frequency, DayOfWeek } from '@/lib/types';
import { TASK_TYPES, FREQUENCIES, DAYS_OF_WEEK, TASK_TITLE_MAX_LENGTH, TASK_DESCRIPTION_MAX_LENGTH } from '@/lib/tasks/task-constants';

export function isValidTaskType(type: string): type is typeof TASK_TYPES[keyof typeof TASK_TYPES] {
  return Object.values(TASK_TYPES).includes(type as any);
}

export function isValidFrequency(frequency: string): frequency is Frequency {
  return FREQUENCIES.includes(frequency as Frequency);
}

export function isValidDayOfWeek(day: string): day is DayOfWeek {
  return DAYS_OF_WEEK.includes(day as DayOfWeek);
}

export function isValidMode(mode: string): mode is NonNullable<Task['mode']> {
  return mode === 'Tous' || mode === 'Présentiel' || mode === 'Distanciel';
}

export function validateTaskTitle(title: string): boolean {
  return title.trim().length > 0 && title.trim().length <= TASK_TITLE_MAX_LENGTH;
}

export function validateTaskDescription(description: string): boolean {
  return description.length <= TASK_DESCRIPTION_MAX_LENGTH;
}

export function validatePostponedDays(days: string): boolean {
  const parsed = Number(days);
  return Number.isInteger(parsed) && parsed > 0;
}

export function validateDueOn(dueOn: string): boolean {
  // Validate YYYY-MM-DD format to avoid timezone issues
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dueOn)) {
    return false;
  }
  // Parse components to ensure valid date
  const [year, month, day] = dueOn.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  // Check if date components match (handles invalid dates like 2025-02-30)
  return date.getFullYear() === year && 
         date.getMonth() === month - 1 && 
         date.getDate() === day;
}

