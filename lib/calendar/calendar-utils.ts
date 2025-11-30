import { Task, Frequency, DayOfWeek } from '@/lib/types';
import { getTasks } from '@/lib/db/tasks';
import { getWorkday, getWorkdaysInRange, WorkMode } from '@/lib/db/workdays';
import { formatDateLocal, normalizeToMidnight, addDays, parseDateLocal } from '@/lib/utils';

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

// Helper function to get day name in French
function getDayName(date: Date): DayOfWeek {
  const days: DayOfWeek[] = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  return days[date.getDay()];
}

// Helper function to get day index (0 = Sunday, 1 = Monday, etc.)
function getDayIndex(dayName: DayOfWeek): number {
  const days: DayOfWeek[] = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  return days.indexOf(dayName);
}

function getFirstWeekday(year: number, month: number, targetDay: number): Date {
  const date = normalizeToMidnight(new Date(year, month, 1));
  const offset = (targetDay - date.getDay() + 7) % 7;
  return addDays(date, offset);
}

// Find the next date that matches the task's mode, starting from the given date
// Returns null if no match found within the max days
async function findNextMatchingDate(
  startDate: Date,
  taskMode: 'Tous' | 'Présentiel' | 'Distanciel',
  workdaysMap: Record<string, WorkMode>,
  maxDays: number
): Promise<Date | null> {
  const current = normalizeToMidnight(startDate);
  
  let checkDate = normalizeToMidnight(current);
  let daysChecked = 0;
  
  while (daysChecked <= maxDays) {
    const dateStr = formatDateLocal(checkDate);
    const workMode = workdaysMap[dateStr] ?? 'Présentiel'; // Default to Présentiel if not found
    
    // Skip if it's a holiday
    if (workMode === 'Congé') {
      checkDate = addDays(checkDate, 1);
      daysChecked++;
      continue;
    }
    
    // Check if work mode matches task mode
    if (taskMode === workMode || taskMode === 'Tous') {
      return checkDate;
    }
    
    checkDate = addDays(checkDate, 1);
    daysChecked++;
  }

  return null; // No match found within the limit
}

async function getWorkdaysMap(userId: string, startDate: Date, maxDays: number = 45): Promise<Record<string, WorkMode>> {
  const current = normalizeToMidnight(startDate);
  const endDate = addDays(current, maxDays);
  const startDateStr = formatDateLocal(current);
  const endDateStr = formatDateLocal(endDate);
  return await getWorkdaysInRange(userId, startDateStr, endDateStr);
}

// Sort tasks by display_order (ascending), with tasks without display_order at the end
export function sortByDisplayOrder<T extends { display_order?: number }>(tasks: T[]): T[] {
  return [...tasks].sort((a, b) => {
    if (a.display_order !== undefined && b.display_order !== undefined) {
      return a.display_order - b.display_order;
    }
    if (a.display_order !== undefined) return -1;
    if (b.display_order !== undefined) return 1;
    return 0;
  });
}

// Filter tasks by type
export function filterTasksByType(tasks: Task[]): {
  periodic: Task[];
  specific: Task[];
  whenPossible: Task[];
} {
  return {
    periodic: tasks.filter(task => task.frequency !== null && task.frequency !== undefined),
    specific: tasks.filter(task => task.due_on !== null && task.due_on !== undefined),
    whenPossible: tasks.filter(task => task.in_progress !== null && task.in_progress !== undefined)
  };
}

// Get periodic tasks for a specific date with mode-based shifting
// Returns tasks that should be displayed on the given date, potentially shifted from their original day
async function getPeriodicTasksForDateWithShift(
  userId: string,
  tasks: Task[],
  date: Date
): Promise<{ tasks: TaskWithShift[]; alerts: TaskShiftAlert[] }> {
  const normalizedDate = normalizeToMidnight(date);
  const dateStr = formatDateLocal(normalizedDate);
  
  // Get all periodic tasks (weekly, monthly, yearly, and custom - daily don't need shifting)
  const periodicTasks = tasks.filter(task => {
    return task.frequency === 'hebdomadaire' || task.frequency === 'mensuel' || task.frequency === 'annuel' || task.frequency === 'personnalisé';
  });

  
  const result: TaskWithShift[] = [];
  const alerts: TaskShiftAlert[] = [];
  // Get workdays from 45 days before to 45 days after normalizedDate
  // This covers the maximum range needed for yearly/personnalisé tasks
  // where originalScheduledDate might be in the past
  const earliestDate = addDays(normalizedDate, -45);
  const workdaysMap = await getWorkdaysMap(userId, earliestDate, 90);

  for (const task of periodicTasks) {
    const taskMode = task.mode ?? 'Tous';
    
    // Calculate the original scheduled date for this task
    let originalScheduledDate: Date | null = null;
    let maxDays = 0;
    const dayName = getDayName(normalizedDate);
    const taskDayIndex = task.day ? getDayIndex(task.day) : null;
    const currentDayIndex = getDayIndex(dayName);
    const startDate = task.start_date ? parseDateLocal(task.start_date) : null;
    const normalizedStartDate = startDate ? normalizeToMidnight(startDate) : null;
    
    if (task.frequency === 'hebdomadaire') {
      if (!taskDayIndex) continue;
      // For weekly tasks, find this week's occurrence of the task day
      if (task.day === dayName) {
        // Today is the scheduled day
        originalScheduledDate = normalizedDate;
      } else {
        maxDays = 7;
        if (currentDayIndex > taskDayIndex) {
          originalScheduledDate = addDays(normalizedDate, -(currentDayIndex - taskDayIndex));
        } else {
          originalScheduledDate = addDays(normalizedDate, -(7-(taskDayIndex - currentDayIndex)));
        }
      }
    } else if (task.frequency === 'mensuel') {
      if (!taskDayIndex) continue;
      // For monthly tasks, find the first occurrence of the task day in this month
      if (task.day === dayName && normalizedDate.getDate() <= 7) {
        // Today is the scheduled day (first occurrence in month)
        originalScheduledDate = normalizedDate;
      } else {
        const candidateDate = getFirstWeekday(normalizedDate.getFullYear(), normalizedDate.getMonth(), taskDayIndex);
        if (candidateDate > normalizedDate) {
          continue;
        } else {
          originalScheduledDate = candidateDate;
          maxDays = 28;
        }
      }
    } else if (task.frequency === 'annuel') {
      if (!startDate || !normalizedStartDate) continue;
      const currentYear = normalizedDate.getFullYear();
      const startMonth = normalizedStartDate.getMonth();
      const startDay = normalizedStartDate.getDate();

      const candidateDate = normalizeToMidnight(new Date(currentYear, startMonth, startDay));
      const daysDifference = Math.floor((normalizedDate.getTime() - candidateDate.getTime()) / 86400000);

      // Skip if candidateDate is in the future or more than 45 days before normalizedDate
      if (candidateDate > normalizedDate || daysDifference > 45) {
        continue;
      } else {
        originalScheduledDate = candidateDate;
        maxDays = 45;
      }
    } else if (task.frequency === 'personnalisé') {
      if (!startDate || !normalizedStartDate || !task.custom_days) continue;

      const daysBetween = Math.floor((normalizedDate.getTime() - normalizedStartDate.getTime()) / 86400000);
      
      if (daysBetween >= 0 && daysBetween % task.custom_days === 0) {
        // Today is the scheduled day
        originalScheduledDate = normalizedDate;
      } else {
        const k = Math.floor(daysBetween / task.custom_days);
        const previousOffset = k * task.custom_days;
        const candidateDate = normalizeToMidnight(new Date(normalizedStartDate.getTime() + previousOffset * 86400000));

        if (workdaysMap[formatDateLocal(candidateDate)] === taskMode) {
          continue;
        } else {
          originalScheduledDate = candidateDate;
          switch (task.custom_days) {
            case 3:
              maxDays = 5;
              break;
            case 14:
              maxDays = 7;
              break;
            case 30:
              maxDays = 7;
              break;
            default:
              maxDays = 7;
              break;
          }
        }
      }
    }
    
    if (!originalScheduledDate) continue;
    
    // Check the work mode on the original scheduled date
    const originalDateStr = formatDateLocal(originalScheduledDate);
    const originalWorkMode = workdaysMap[originalDateStr];
    
    if (originalDateStr === dateStr) {
      if (workdaysMap[dateStr] === taskMode || taskMode === 'Tous') {
        result.push(task);
      }
      continue;
    }
    
    // If original day doesn't match, shift to next matching day
    if (originalWorkMode !== taskMode) {
      const shiftedDate = await findNextMatchingDate(originalScheduledDate, taskMode, workdaysMap, maxDays);

      if (shiftedDate && formatDateLocal(shiftedDate) === dateStr) {
        // Today is the shifted date, include the task with shift info
        result.push({
          ...task,
          shiftInfo: {
            originalDay: task.day ?? getDayName(originalScheduledDate),
            originalDate: formatDateLocal(originalScheduledDate),
            shiftedDate: dateStr
          }
        });
      } else if (shiftedDate === null && (task.frequency === 'annuel' || task.frequency === 'personnalisé')) {
        // Task couldn't be shifted to a matching date - alert user
        // Determine if this is a future task (original date is after the current date being checked)
        const isFutureShift = originalScheduledDate >= normalizedDate;
        alerts.push({
          taskId: task.id,
          taskTitle: task.title,
          originalDate: originalDateStr,
          taskMode: taskMode,
          frequency: task.frequency,
          isFutureShift
        });
      }
    }
  }
  
  // Also include daily tasks (they don't need shifting)
  const dailyTasks = tasks.filter(task => task.frequency === 'quotidien');
  result.push(...dailyTasks);
  
  // Sort by display_order
  return { tasks: sortByDisplayOrder(result), alerts };
}

// Get specific date tasks for a specific date
export function getSpecificTasksForDate(tasks: Task[], date: Date): Task[] {
  const normalizedDate = normalizeToMidnight(date);
  const dateString = formatDateLocal(normalizedDate);
  const filtered = tasks.filter(task => task.due_on === dateString);
  // Sort by due_on ascending (oldest first)
  return filtered.sort((a, b) => {
    if (!a.due_on || !b.due_on) return 0;
    return a.due_on.localeCompare(b.due_on);
  });
}

// Get when possible tasks (separated by in_progress status)
export function getWhenPossibleTasks(tasks: Task[]): {
  inProgress: Task[];
  notStarted: Task[];
} {
  const inProgress = tasks.filter(task => task.in_progress === true);
  const notStarted = tasks.filter(task => task.in_progress === false);
  
  // Sort each group by display_order, then by in_progress status
  return {
    inProgress: sortByDisplayOrder(inProgress),
    notStarted: sortByDisplayOrder(notStarted)
  };
}

// Get all tasks for today's view
export async function getTasksForDay(userId: string, date?: Date, workModeValue?: WorkMode): Promise<{
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
    return tasks.filter(t => {
      const taskMode = t.mode ?? 'Tous';
      return taskMode === 'Tous' || taskMode === workMode;
    });
  };

  if (workMode === 'Congé') {
    return {
      periodic: [],
      specific: filterByMode(getSpecificTasksForDate(specific, today)),
      whenPossible: {
        inProgress: [],
        notStarted: [],
      },
      alerts: []
    };
  };

  // Use the new shifting logic for periodic tasks
  const { tasks: periodicWithShift, alerts } = await getPeriodicTasksForDateWithShift(userId, periodic, today);
  
  return {
    periodic: filterByMode(periodicWithShift),
    specific: filterByMode(getSpecificTasksForDate(specific, today)),
    whenPossible: {
      inProgress: filterByMode(getWhenPossibleTasks(whenPossible).inProgress),
      notStarted: filterByMode(getWhenPossibleTasks(whenPossible).notStarted),
    },
    alerts
  };
}

// Get tasks for a date range (week/month view)
// Only returns specific date tasks, excluding periodic tasks (weekly/monthly)
export async function getTasksForDateRange(
  userId: string,
  startDate: Date,
  endDate: Date
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
  const specificForRange = specific.filter(task => {
    if (!task.due_on) return false;
    // task.due_on is already in YYYY-MM-DD format
    return task.due_on >= startDateStr && task.due_on <= endDateStr;
  });
  
  // Convert to CalendarTask format and sort by due_on ascending
  specificForRange.forEach(task => {
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
      display_order: task.display_order
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
  const dayName = getDayName(normalizedDate);
  
  return tasks.filter(task => {
    if (task.type === 'specific') {
      return task.due_on === formatDateLocal(normalizedDate);
    }
    
    if (task.type === 'periodic' && task.frequency && task.day) {
      switch (task.frequency) {
        case 'hebdomadaire':
          return task.day === dayName;
        case 'mensuel':
          return task.day === dayName && normalizedDate.getDate() <= 7;
        default:
          return false;
      }
    }
    
    return false;
  });
}

// Filter tasks by work mode (shared logic)
export function filterTasksByWorkMode<T extends { mode?: 'Tous' | 'Présentiel' | 'Distanciel' }>(
  tasks: T[],
  workMode: 'Présentiel' | 'Distanciel' | 'Congé'
): T[] {
  if (workMode === 'Congé') return [];
  return tasks.filter(t => {
    const taskMode = t.mode ?? 'Tous';
    return taskMode === 'Tous' || taskMode === workMode;
  });
}

// Convert CalendarTask to Task-like object (for editing)
export function calendarTaskToTaskLike(calendarTask: CalendarTask): Partial<import('@/lib/types').Task> & { id: string; title: string; description?: string } {
  return {
    id: calendarTask.id,
    title: calendarTask.title,
    description: calendarTask.description,
    frequency: calendarTask.frequency,
    day: calendarTask.day,
    due_on: calendarTask.due_on,
    in_progress: calendarTask.in_progress,
    mode: calendarTask.mode,
    postponed_days: undefined,
  };
}

// Check for tasks that can't be shifted in the next 45 days
export async function checkFutureTaskShifts(
  userId: string,
  startDate: Date
): Promise<TaskShiftAlert[]> {
  const allTasks = await getTasks(userId);
  
  // Filter only yearly and custom tasks
  const yearlyAndCustomTasks = allTasks.filter(task => 
    task.frequency === 'annuel' || task.frequency === 'personnalisé'
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
      // Only consider dates that are >= start date of the task
      if (normalizedStartDateTask > endDate) {
        // Task starts after the range, skip it
        continue;
      }
      
      const startCheckDate = normalizedStartDateTask > normalizedStartDate ? normalizedStartDateTask : normalizedStartDate;
      const daysFromStart = Math.floor((startCheckDate.getTime() - normalizedStartDateTask.getTime()) / 86400000);
      
      // Find the first occurrence >= startCheckDate
      const firstOccurrenceOffset = daysFromStart >= 0 
        ? Math.ceil(daysFromStart / task.custom_days) * task.custom_days
        : 0;
      
      let currentOffset = firstOccurrenceOffset;
      const maxOffset = Math.floor((endDate.getTime() - normalizedStartDateTask.getTime()) / 86400000);
      
      while (currentOffset <= maxOffset) {
        const scheduledDate = normalizeToMidnight(new Date(normalizedStartDateTask.getTime() + currentOffset * 86400000));
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
      
      // If work mode doesn't match, try to shift
      if (workMode !== taskMode) {
        let maxDays = 0;
        if (task.frequency === 'annuel') {
          maxDays = 45;
        } else if (task.frequency === 'personnalisé' && task.custom_days) {
          switch (task.custom_days) {
            case 3:
              maxDays = 5;
              break;
            case 14:
              maxDays = 7;
              break;
            case 30:
              maxDays = 7;
              break;
            default:
              maxDays = 7;
              break;
          }
        }

        const shiftedDate = await findNextMatchingDate(scheduledDate, taskMode, workdaysMap, maxDays);

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
              frequency: task.frequency as 'annuel' | 'personnalisé'
            });
          }
        }
      }
    }
  }
  
  return allAlerts;
}