import type { Frequency, DayOfWeek, Task } from '@/lib/types';

// Task type constants
export const TASK_TYPES = {
  PERIODIC: 'periodic',
  SPECIFIC: 'specific',
  WHEN_POSSIBLE: 'when-possible',
} as const;

export type TaskType = (typeof TASK_TYPES)[keyof typeof TASK_TYPES];

// Task frequency constants
export const FREQUENCIES: Frequency[] = [
  'quotidien',
  'hebdomadaire',
  'mensuel',
  'annuel',
  'personnalisé',
];

// Day of week constants
export const DAYS_OF_WEEK: DayOfWeek[] = [
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
  'Dimanche',
];

// Task mode constants
export const TASK_MODES: Task['mode'][] = ['Tous', 'Présentiel', 'Distanciel'];

// Validation constants
export const TASK_TITLE_MAX_LENGTH = 100;
export const TASK_DESCRIPTION_MAX_LENGTH = 100000;
export const MAX_SHIFTING_DAYS_LIMIT = 45;

// Task type styling constants
export const TASK_TYPE_STYLES = {
  periodic: 'border-yellow-400/30 bg-yellow-100/50',
  specific: 'border-violet-500/20 bg-violet-500/10',
  whenPossible: 'border-orange-600/25 bg-orange-50',
} as const;

// Get task type className
export function getTaskTypeClassName(
  taskType: 'periodic' | 'specific' | 'temp' | 'whenPossible',
): string {
  if (taskType === 'periodic') return TASK_TYPE_STYLES.periodic;
  if (taskType === 'specific') return TASK_TYPE_STYLES.specific;
  if (taskType === 'temp') return 'border-blue-400/30 bg-blue-100/50';
  return TASK_TYPE_STYLES.whenPossible;
}
