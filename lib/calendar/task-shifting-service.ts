import { Task } from '@/lib/types';
import { getWorkdaysMap, WorkMode } from '@/lib/db/workdays';
import { normalizeToMidnight, formatDateLocal, addDays } from '@/lib/utils';
import {
  calculateOriginalScheduledDate,
  getDayName,
  getDefaultMaxShiftingDays,
} from './periodic-dates';
import type { TaskWithShift, TaskShiftAlert } from './calendar-utils';
import { sortByDisplayOrder } from '@/lib/tasks/sorting/sort-by-display-order';

/**
 * Détermine si une tâche doit être décalée
 */
export function needsShift(
  _originalDate: Date,
  taskMode: 'Tous' | 'Présentiel' | 'Distanciel',
  workMode: WorkMode,
): boolean {
  if (taskMode === 'Tous') {
    return workMode === 'Congé';
  }
  return workMode !== taskMode;
}

/**
 * Trouve la prochaine date compatible avec le mode de la tâche
 */
export async function findNextMatchingDate(
  startDate: Date,
  taskMode: 'Tous' | 'Présentiel' | 'Distanciel',
  workdaysMap: Record<string, WorkMode>,
  maxDays: number,
): Promise<Date | null> {
  const current = normalizeToMidnight(startDate);
  let checkDate = normalizeToMidnight(current);
  let daysChecked = 0;

  while (daysChecked <= maxDays) {
    const dateStr = formatDateLocal(checkDate);
    const workMode = workdaysMap[dateStr] ?? 'Présentiel';

    if (workMode === 'Congé') {
      checkDate = addDays(checkDate, 1);
      daysChecked++;
      continue;
    }

    if (taskMode === workMode || taskMode === 'Tous') {
      return checkDate;
    }

    checkDate = addDays(checkDate, 1);
    daysChecked++;
  }

  return null;
}

/**
 * Obtient les tâches périodiques pour une date avec décalage automatique
 */
export async function getPeriodicTasksForDateWithShift(
  userId: string,
  tasks: Task[],
  date: Date,
): Promise<{ tasks: TaskWithShift[]; alerts: TaskShiftAlert[] }> {
  const normalizedDate = normalizeToMidnight(date);
  const dateStr = formatDateLocal(normalizedDate);

  const periodicTasks = tasks.filter(
    (task) =>
      task.frequency === 'hebdomadaire' ||
      task.frequency === 'mensuel' ||
      task.frequency === 'annuel' ||
      task.frequency === 'personnalisé',
  );

  const result: TaskWithShift[] = [];
  const alerts: TaskShiftAlert[] = [];

  const earliestDate = addDays(normalizedDate, -45);
  const workdaysMap = await getWorkdaysMap(userId, earliestDate, 90);

  for (const task of periodicTasks) {
    const taskMode = task.mode ?? 'Tous';
    const originalScheduledDate = calculateOriginalScheduledDate(task, normalizedDate);

    // Special handling for custom frequency: check if candidate date matches task mode
    // If it matches, skip (task is already on a compatible day)
    if (task.frequency === 'personnalisé' && originalScheduledDate) {
      const candidateDateStr = formatDateLocal(originalScheduledDate);
      if (workdaysMap[candidateDateStr] === taskMode) {
        continue;
      }
    }

    if (!originalScheduledDate) continue;

    const maxDays = task.max_shifting_days ?? getDefaultMaxShiftingDays(task.frequency);
    const originalDateStr = formatDateLocal(originalScheduledDate);
    const originalWorkMode = workdaysMap[originalDateStr];

    if (originalDateStr === dateStr) {
      if (workdaysMap[dateStr] === taskMode || taskMode === 'Tous') {
        result.push(task);
        continue;
      }
    }

    if (needsShift(originalScheduledDate, taskMode, originalWorkMode)) {
      const shiftedDate = await findNextMatchingDate(
        originalScheduledDate,
        taskMode,
        workdaysMap,
        maxDays,
      );

      if (shiftedDate && formatDateLocal(shiftedDate) === dateStr) {
        result.push({
          ...task,
          shiftInfo: {
            originalDay: task.day ?? getDayName(originalScheduledDate),
            originalDate: originalDateStr,
            shiftedDate: dateStr,
          },
        });
      } else if (
        shiftedDate === null &&
        (task.frequency === 'annuel' || task.frequency === 'personnalisé')
      ) {
        const isFutureShift = originalScheduledDate >= normalizedDate;
        alerts.push({
          taskId: task.id,
          taskTitle: task.title,
          originalDate: originalDateStr,
          taskMode: taskMode,
          frequency: task.frequency,
          isFutureShift,
        });
      }
    }
  }

  const dailyTasks = tasks.filter((task) => task.frequency === 'quotidien');
  result.push(...dailyTasks);

  return { tasks: sortByDisplayOrder(result), alerts };
}
