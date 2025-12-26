import { Task, Frequency, DayOfWeek } from '@/lib/types';
import { getTasks } from '@/lib/db/tasks';
import { getWorkday, getWorkdaysMap, WorkMode } from '@/lib/db/workdays';
import { formatDateLocal, normalizeToMidnight, addDays, parseDateLocal } from '@/lib/utils';
import {
  getPeriodicTasksForDateWithShift,
  findNextMatchingDate,
  needsShift,
} from './task-shifting-service';
import { getDefaultMaxShiftingDays } from './periodic-dates';
import { sortByDisplayOrder } from '@/lib/tasks/sorting/sort-by-display-order';

export interface CalendarTask {
  id: string;
  title: string;
  description: string;
  type: 'periodic' | 'specific' | 'when_possible';
  frequency?: Frequency;
  day?: DayOfWeek;
  due_on?: string;
  in_progress?: boolean;
  mode?: 'Tous' | 'Présentiel' | 'Distanciel';
  display_order?: number;
  shiftInfo?: {
    originalDay: DayOfWeek;
    originalDate: string; // YYYY-MM-DD
    shiftedDate: string; // YYYY-MM-DD
  };
}

export interface TaskWithShift extends Task {
  shiftInfo?: {
    originalDay: DayOfWeek;
    originalDate: string; // YYYY-MM-DD
    shiftedDate: string; // YYYY-MM-DD
  };
}

export interface TaskShiftAlert {
  taskId: string;
  taskTitle: string;
  originalDate: string; // YYYY-MM-DD
  taskMode: 'Tous' | 'Présentiel' | 'Distanciel';
  frequency: 'annuel' | 'personnalisé';
  isFutureShift?: boolean; // true if the task is in the future, false if in the past
}

// Filter tasks by type
// Rules:
// PERIODIC: frequency != null
// WHEN_POSSIBLE: frequency == null && in_progress != null (boolean)
// SPECIFIC: frequency == null && due_on != null && in_progress == null
function filterTasksByType(tasks: Task[]): {
  periodic: Task[];
  specific: Task[];
  whenPossible: Task[];
} {
  return {
    // PERIODIC: frequency != null
    periodic: tasks.filter((task) => task.frequency !== null && task.frequency !== undefined),
    // SPECIFIC: frequency == null && due_on != null && in_progress == null
    specific: tasks.filter(
      (task) =>
        !task.frequency &&
        task.due_on !== null &&
        task.due_on !== undefined &&
        task.in_progress == null,
    ),
    // WHEN_POSSIBLE: frequency == null && in_progress != null (boolean)
    whenPossible: tasks.filter(
      (task) => !task.frequency && task.in_progress != null,
    ),
  };
}

// Get specific date tasks for a specific date
function getSpecificTasksForDate(tasks: Task[], date: Date): Task[] {
  const normalizedDate = normalizeToMidnight(date);
  const dateString = formatDateLocal(normalizedDate);
  const filtered = tasks.filter((task) => task.due_on === dateString);
  // Sort by due_on ascending (oldest first)
  return filtered.sort((a, b) => {
    if (!a.due_on || !b.due_on) return 0;
    return a.due_on.localeCompare(b.due_on);
  });
}

// Get when possible tasks (separated by in_progress status)
function getWhenPossibleTasks(tasks: Task[]): {
  inProgress: Task[];
  notStarted: Task[];
} {
  const inProgress = tasks.filter((task) => task.in_progress === true);
  const notStarted = tasks.filter((task) => task.in_progress === false);

  // Sort each group by display_order, then by in_progress status
  return {
    inProgress: sortByDisplayOrder(inProgress),
    notStarted: sortByDisplayOrder(notStarted),
  };
}

// Get all tasks for today's view
export async function getTasksForDay(
  userId: string,
  date?: Date,
  workModeValue?: WorkMode,
): Promise<{
  periodic: TaskWithShift[];
  specific: Task[];
  whenPossible: {
    inProgress: Task[];
    notStarted: Task[];
  };
  alerts: TaskShiftAlert[];
}> {
  const allTasks = await getTasks(userId);
  const { periodic, specific, whenPossible } = filterTasksByType(allTasks);

  // Use provided date or create from current date string to avoid timezone issues
  // When called from server action, date is already parsed from YYYY-MM-DD string
  const today = date ? normalizeToMidnight(date) : normalizeToMidnight(new Date());
  const iso = formatDateLocal(today);
  const workMode = workModeValue ?? (await getWorkday(userId, iso));
  const filterByMode = (tasks: Task[]): Task[] => {
    return tasks.filter((t) => {
      const taskMode = t.mode ?? 'Tous';
      return taskMode === 'Tous' || taskMode === workMode;
    });
  };

  if (workMode === 'Congé') {
    return {
      periodic: [],
      specific: getSpecificTasksForDate(specific, today),
      whenPossible: {
        inProgress: [],
        notStarted: [],
      },
      alerts: [],
    };
  }

  // Use the new shifting logic for periodic tasks
  const { tasks: periodicWithShift, alerts } = await getPeriodicTasksForDateWithShift(
    userId,
    periodic,
    today,
  );

  return {
    periodic: filterByMode(periodicWithShift),
    specific: filterByMode(getSpecificTasksForDate(specific, today)),
    whenPossible: {
      inProgress: filterByMode(getWhenPossibleTasks(whenPossible).inProgress),
      notStarted: filterByMode(getWhenPossibleTasks(whenPossible).notStarted),
    },
    alerts,
  };
}

// Get tasks for a date range (week/month view)
// Only returns specific date tasks, excluding periodic tasks (weekly/monthly)
export async function getTasksForDateRange(
  userId: string,
  startDate: Date,
  endDate: Date,
): Promise<CalendarTask[]> {
  const allTasks = await getTasks(userId);
  const { specific } = filterTasksByType(allTasks);

  const tasks: CalendarTask[] = [];

  // Add only specific date tasks (no periodic tasks for week/month view)
  // Compare date strings (YYYY-MM-DD format) to avoid timezone issues
  const normalizedStartDate = normalizeToMidnight(startDate);
  const normalizedEndDate = normalizeToMidnight(endDate);
  const startDateStr = formatDateLocal(normalizedStartDate);
  const endDateStr = formatDateLocal(normalizedEndDate);
  const specificForRange = specific.filter((task) => {
    if (!task.due_on) return false;
    // task.due_on is already in YYYY-MM-DD format
    return task.due_on >= startDateStr && task.due_on <= endDateStr;
  });

  // Convert to CalendarTask format and sort by due_on ascending
  specificForRange.forEach((task) => {
    tasks.push({
      id: task.id,
      title: task.title,
      description: task.description,
      type: 'specific',
      frequency: task.frequency,
      day: task.day,
      due_on: task.due_on,
      in_progress: task.in_progress,
      mode: task.mode,
      display_order: task.display_order,
    });
  });

  // Sort by due_on ascending (oldest first)
  return tasks.sort((a, b) => {
    if (!a.due_on || !b.due_on) return 0;
    return a.due_on.localeCompare(b.due_on);
  });
}

// Get tasks for a specific date (legacy function for compatibility)
export function getTasksForDate(tasks: CalendarTask[], date: Date): CalendarTask[] {
  const normalizedDate = normalizeToMidnight(date);

  return tasks.filter((task) => {
    if (task.type === 'specific') {
      return task.due_on === formatDateLocal(normalizedDate);
    }
    return false;
  });
}

// Filter tasks by work mode (shared logic)
export function filterTasksByWorkMode<T extends { mode?: 'Tous' | 'Présentiel' | 'Distanciel' }>(
  tasks: T[],
  workMode: 'Présentiel' | 'Distanciel' | 'Congé',
): T[] {
  if (workMode === 'Congé') {
    return tasks.filter((t) => {
      const task = t as T & { due_on?: string; type?: string };
      return task.due_on !== undefined && task.due_on !== null;
    });
  }
  return tasks.filter((t) => {
    const taskMode = t.mode ?? 'Tous';
    return taskMode === 'Tous' || taskMode === workMode;
  });
}

// Convert CalendarTask to Task-like object (for editing)
export function calendarTaskToTaskLike(
  calendarTask: CalendarTask,
): Partial<import('@/lib/types').Task> & { id: string; title: string; description?: string } {
  return {
    id: calendarTask.id,
    title: calendarTask.title,
    description: calendarTask.description,
    frequency: calendarTask.frequency,
    day: calendarTask.day,
    due_on: calendarTask.due_on,
    in_progress: calendarTask.in_progress,
    mode: calendarTask.mode,
  };
}

// Check for tasks that can't be shifted in the next 45 days
export async function checkFutureTaskShifts(
  userId: string,
  startDate: Date,
): Promise<TaskShiftAlert[]> {
  const allTasks = await getTasks(userId);

  // Filter only yearly and custom tasks
  const yearlyAndCustomTasks = allTasks.filter(
    (task) => task.frequency === 'annuel' || task.frequency === 'personnalisé',
  );

  if (yearlyAndCustomTasks.length === 0) {
    return [];
  }

  const normalizedStartDate = normalizeToMidnight(startDate);
  const endDate = addDays(normalizedStartDate, 45);

  // Get workdays map for the next 45 days (plus some buffer for shifting)
  const earliestDate = addDays(normalizedStartDate, -45);
  const workdaysMap = await getWorkdaysMap(userId, earliestDate, 90);

  const allAlerts: TaskShiftAlert[] = [];
  const seenAlerts = new Set<string>(); // To avoid duplicates

  for (const task of yearlyAndCustomTasks) {
    const taskMode = task.mode ?? 'Tous';

    const startDateTask = task.start_date ? parseDateLocal(task.start_date) : null;
    const normalizedStartDateTask = startDateTask ? normalizeToMidnight(startDateTask) : null;

    if (!normalizedStartDateTask) continue;
    if (normalizedStartDateTask > endDate) continue;

    // Calculate scheduled dates in the next 45 days
    const scheduledDates: Date[] = [];

    if (task.frequency === 'annuel') {
      // For yearly tasks, check this year's occurrence and next year's if within 45 days
      const currentYear = normalizedStartDate.getFullYear();
      const startMonth = normalizedStartDateTask.getMonth();
      const startDay = normalizedStartDateTask.getDate();

      // This year's occurrence
      const thisYearDate = normalizeToMidnight(new Date(currentYear, startMonth, startDay));
      if (thisYearDate >= normalizedStartDate && thisYearDate <= endDate) {
        scheduledDates.push(thisYearDate);
      }

      // Next year's occurrence (if within 45 days)
      const nextYearDate = normalizeToMidnight(new Date(currentYear + 1, startMonth, startDay));
      if (nextYearDate <= endDate) {
        scheduledDates.push(nextYearDate);
      }
    } else if (task.frequency === 'personnalisé' && task.custom_days) {
      // For custom tasks, calculate all occurrences in the next 45 days
      const startCheckDate =
        normalizedStartDateTask > normalizedStartDate
          ? normalizedStartDateTask
          : normalizedStartDate;
      const daysFromStart = Math.floor(
        (startCheckDate.getTime() - normalizedStartDateTask.getTime()) / 86400000,
      );

      // Find the first occurrence >= startCheckDate
      const firstOccurrenceOffset =
        daysFromStart >= 0 ? Math.ceil(daysFromStart / task.custom_days) * task.custom_days : 0;

      let currentOffset = firstOccurrenceOffset;
      const maxOffset = Math.floor(
        (endDate.getTime() - normalizedStartDateTask.getTime()) / 86400000,
      );

      while (currentOffset <= maxOffset) {
        const scheduledDate = normalizeToMidnight(
          new Date(normalizedStartDateTask.getTime() + currentOffset * 86400000),
        );
        if (scheduledDate >= startCheckDate && scheduledDate <= endDate) {
          scheduledDates.push(scheduledDate);
        }
        currentOffset += task.custom_days;
      }
    }

    // Check each scheduled date
    for (const scheduledDate of scheduledDates) {
      const dateStr = formatDateLocal(scheduledDate);
      const workMode = workdaysMap[dateStr];

      if (needsShift(scheduledDate, taskMode, workMode)) {
        const maxShiftingDays = task.max_shifting_days ?? getDefaultMaxShiftingDays(task.frequency);
        const shiftedDate = await findNextMatchingDate(
          scheduledDate,
          taskMode,
          workdaysMap,
          maxShiftingDays,
        );

        // If couldn't shift, create alert
        if (shiftedDate === null) {
          const alertKey = `${task.id}-${dateStr}`;
          if (!seenAlerts.has(alertKey)) {
            seenAlerts.add(alertKey);
            // Determine if this is a future task (scheduled date is after today)
            const isFutureShift = scheduledDate >= normalizedStartDate;
            allAlerts.push({
              taskId: task.id,
              taskTitle: task.title,
              originalDate: dateStr,
              taskMode: taskMode,
              isFutureShift,
              frequency: task.frequency as 'annuel' | 'personnalisé',
            });
          }
        }
      }
    }
  }

  return allAlerts;
}
