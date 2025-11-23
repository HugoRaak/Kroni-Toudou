import { Task, Frequency, DayOfWeek } from '@/lib/types';
import { getTasks } from '@/lib/db/tasks';
import { getWorkday, getWorkdaysInRange, WorkMode } from '@/lib/db/workdays';
import { formatDateLocal, normalizeToMidnight, addDays } from '@/lib/utils';

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
// Returns null if no match found within 7 days (safety limit)
async function findNextMatchingDate(
  startDate: Date,
  taskMode: 'Tous' | 'Présentiel' | 'Distanciel',
  frequency: Frequency,
  workdaysMap: Record<string, WorkMode>
): Promise<Date | null> {
  if (taskMode === 'Tous') {
    return startDate; // No need to shift if task is for all modes
  }
  const maxDays = frequency === 'hebdomadaire' ? 7 : frequency === 'mensuel' ? 28 : 0;
  const current = normalizeToMidnight(startDate);
  
  let checkDate = new Date(current);
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
    
    // Check if work mode matches task mode (taskMode is 'Présentiel' | 'Distanciel' here)
    if (taskMode === workMode) {
      return checkDate;
    }
    
    checkDate = addDays(checkDate, 1);
    daysChecked++;
  }
  
  return null; // No match found within the limit
}

async function getWorkdaysMap(userId: string, startDate: Date, maxDays: number = 28): Promise<Record<string, WorkMode>> {
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
  date: Date,
  originalWorkMode: WorkMode
): Promise<TaskWithShift[]> {
  const normalizedDate = normalizeToMidnight(date);
  const dateStr = formatDateLocal(normalizedDate);
  
  // Get all periodic tasks (weekly and monthly only, daily don't need shifting)
  const periodicTasks = tasks.filter(task => {
    return task.frequency === 'hebdomadaire' || task.frequency === 'mensuel';
  });

  
  const result: TaskWithShift[] = [];
  const workdaysMap = await getWorkdaysMap(userId, normalizedDate);

  for (const task of periodicTasks) {
    if (!task.day) continue;

    const taskMode = task.mode ?? 'Tous';
    
    // Calculate the original scheduled date for this task
    let originalScheduledDate: Date | null = null;
    const dayName = getDayName(normalizedDate);
    const taskDayIndex = getDayIndex(task.day);
    const currentDayIndex = getDayIndex(dayName);
    
    if (task.frequency === 'hebdomadaire') {
      // For weekly tasks, find this week's occurrence of the task day
      if (task.day === dayName) {
        // Today is the scheduled day
        originalScheduledDate = normalizedDate;
      } else {
        if (currentDayIndex > taskDayIndex) {
          originalScheduledDate = addDays(normalizedDate, -(currentDayIndex - taskDayIndex));
        } else {
          originalScheduledDate = addDays(normalizedDate, -(7-(taskDayIndex - currentDayIndex)));
        }
      }
    } else if (task.frequency === 'mensuel') {
      // For monthly tasks, find the first occurrence of the task day in this month
      if (task.day === dayName && normalizedDate.getDate() <= 7) {
        // Today is the scheduled day (first occurrence in month)
        originalScheduledDate = normalizedDate;
      } else {
        const candidateDate = getFirstWeekday(normalizedDate.getFullYear(), normalizedDate.getMonth(), taskDayIndex);;
        if (candidateDate > normalizedDate && normalizedDate.getDate() <= 7) {
          continue;
        } else {
          originalScheduledDate = candidateDate;
        }
      }
    }
    
    if (!originalScheduledDate) continue;
    
    // Check the work mode on the original scheduled date
    const originalDateStr = formatDateLocal(originalScheduledDate);
    
    // If task mode is "Tous", always show on scheduled day
    if (taskMode === 'Tous') {
      if (originalDateStr === dateStr) {
        result.push(task);
      }
      continue;
    }
    
    // If original day matches task mode, show it on that day
    if (originalWorkMode === taskMode && originalDateStr === dateStr) {
      result.push(task);
      continue;
    }
    
    // If original day doesn't match and it's not a holiday, shift to next matching day
    if (originalWorkMode !== taskMode && originalWorkMode !== 'Congé') {
      const shiftedDate = await findNextMatchingDate(originalScheduledDate, taskMode, task.frequency ?? 'hebdomadaire', workdaysMap);
      
      if (shiftedDate && formatDateLocal(shiftedDate) === dateStr) {
        // Today is the shifted date, include the task with shift info
        result.push({
          ...task,
          shiftInfo: {
            originalDay: task.day,
            originalDate: formatDateLocal(originalScheduledDate),
            shiftedDate: dateStr
          }
        });
      }
    }
  }
  
  // Also include daily tasks (they don't need shifting)
  const dailyTasks = tasks.filter(task => task.frequency === 'quotidien');
  result.push(...dailyTasks);
  
  // Sort by display_order
  return sortByDisplayOrder(result);
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
}> {
  const allTasks = await getTasks(userId);
  const { periodic, specific, whenPossible } = filterTasksByType(allTasks);
  
  // Use provided date or create from current date string to avoid timezone issues
  // When called from server action, date is already parsed from YYYY-MM-DD string
  const today = date ? normalizeToMidnight(date) : normalizeToMidnight(new Date());
  const iso = formatDateLocal(today);
  const workMode = workModeValue ?? (await getWorkday(userId, iso));
  const filterByMode = (tasks: Task[]): Task[] => {
    if (workMode === 'Congé') return [];
    return tasks.filter(t => {
      const taskMode = t.mode ?? 'Tous';
      return taskMode === 'Tous' || taskMode === workMode;
    });
  };

  // Use the new shifting logic for periodic tasks
  const periodicWithShift = await getPeriodicTasksForDateWithShift(userId, periodic, today, workMode);
  // Filter daily tasks by mode (they come from getPeriodicTasksForDateWithShift but need mode filtering)
  const filteredPeriodic = periodicWithShift.filter(task => {
    if (workMode === 'Congé') return false;
    // Tasks with shiftInfo are already correctly shifted, just check mode
    const taskMode = task.mode ?? 'Tous';
    return taskMode === 'Tous' || taskMode === workMode;
  });
  
  return {
    periodic: filteredPeriodic,
    specific: filterByMode(getSpecificTasksForDate(specific, today)),
    whenPossible: {
      inProgress: filterByMode(getWhenPossibleTasks(whenPossible).inProgress),
      notStarted: filterByMode(getWhenPossibleTasks(whenPossible).notStarted),
    }
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