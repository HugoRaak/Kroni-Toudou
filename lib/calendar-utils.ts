import { Task, Frequency, DayOfWeek } from './types';
import { getTasks } from './db/tasks';
import { getWorkday } from './db/workdays';
import { formatDateLocal } from './utils';

export interface CalendarTask {
  id: string;
  title: string;
  description: string;
  type: 'periodic' | 'specific' | 'when_possible';
  frequency?: Frequency;
  day?: DayOfWeek;
  due_on?: string;
  in_progress?: boolean;
  is_remote?: boolean;
}

// Helper function to get day name in French
function getDayName(date: Date): DayOfWeek {
  const days: DayOfWeek[] = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  return days[date.getDay()];
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

// Get periodic tasks for a specific date
export function getPeriodicTasksForDate(tasks: Task[], date: Date): Task[] {
  const dayName = getDayName(date);
  
  return tasks.filter(task => {
    if (!task.frequency) return false;
    
    switch (task.frequency) {
      case 'quotidien':
        return true;
      
      case 'hebdomadaire':
        return task.day === dayName;
      
      case 'mensuel':
        return task.day === dayName && date.getDate() <= 7;
      
      default:
        return false;
    }
  });
}

// Get specific date tasks for a specific date
export function getSpecificTasksForDate(tasks: Task[], date: Date): Task[] {
  const dateString = formatDateLocal(date);
  return tasks.filter(task => task.due_on === dateString);
}

// Get when possible tasks (separated by in_progress status)
export function getWhenPossibleTasks(tasks: Task[]): {
  inProgress: Task[];
  notStarted: Task[];
} {
  return {
    inProgress: tasks.filter(task => task.in_progress === true),
    notStarted: tasks.filter(task => task.in_progress === false)
  };
}

// Get all tasks for today's view
export async function getTasksForDay(userId: string, date?: Date): Promise<{
  periodic: Task[];
  specific: Task[];
  whenPossible: {
    inProgress: Task[];
    notStarted: Task[];
  };
}> {
  const allTasks = await getTasks(userId);
  const { periodic, specific, whenPossible } = filterTasksByType(allTasks);
  
  const today = date ? date : new Date();
  const iso = formatDateLocal(today);
  const workMode = (await getWorkday(userId, iso)) ?? 'Présentiel';

  const filterByMode = (tasks: Task[]): Task[] => {
    if (workMode === 'Congé') return [];
    const remote = workMode === 'Distanciel';
    return tasks.filter(t => (remote ? t.is_remote === true : t.is_remote === false));
  };
  
  return {
    periodic: filterByMode(getPeriodicTasksForDate(periodic, today)),
    specific: filterByMode(getSpecificTasksForDate(specific, today)),
    whenPossible: {
      inProgress: filterByMode(getWhenPossibleTasks(whenPossible).inProgress),
      notStarted: filterByMode(getWhenPossibleTasks(whenPossible).notStarted),
    }
  };
}

// Get tasks for a date range (week/month view)
export async function getTasksForDateRange(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<CalendarTask[]> {
  const allTasks = await getTasks(userId);
  const { periodic, specific } = filterTasksByType(allTasks);
  
  const tasks: CalendarTask[] = [];
  
  // Add periodic tasks (weekly and monthly only for week/month view)
  // Keep only periodic tasks that have at least one occurrence within [start, end]
  const periodicForView = periodic.filter(task => {
    if (task.frequency !== 'hebdomadaire' && task.frequency !== 'mensuel') return false;
    if (!task.day) return false;

    // Iterate through the date range to detect at least one matching occurrence
    const cursor = new Date(startDate);
    while (cursor <= endDate) {
      if (task.frequency === 'hebdomadaire') {
        if (getDayName(cursor) === task.day) return true;
      } else if (task.frequency === 'mensuel') {
        // Include only if the first occurrence of the task's weekday in its month falls within the range
        if (getDayName(cursor) === task.day && cursor.getDate() <= 7) return true;
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    return false;
  });
  
  // Add specific date tasks
  const specificForRange = specific.filter(task => {
    if (!task.due_on) return false;
    const taskDate = new Date(task.due_on);
    return taskDate >= startDate && taskDate <= endDate;
  });
  
  // Convert to CalendarTask format
  [...periodicForView, ...specificForRange].forEach(task => {
    tasks.push({
      id: task.id,
      title: task.title,
      description: task.description,
      type: task.frequency ? 'periodic' : 'specific',
      frequency: task.frequency,
      day: task.day,
      due_on: task.due_on,
      in_progress: task.in_progress,
      is_remote: task.is_remote
    });
  });
  
  return tasks;
}

// Get tasks for a specific date (legacy function for compatibility)
export function getTasksForDate(tasks: CalendarTask[], date: Date): CalendarTask[] {
  const dayName = getDayName(date);
  
  return tasks.filter(task => {
    if (task.type === 'specific') {
      return task.due_on === formatDateLocal(date);
    }
    
    if (task.type === 'periodic' && task.frequency && task.day) {
      switch (task.frequency) {
        case 'hebdomadaire':
          return task.day === dayName;
        case 'mensuel':
          return task.day === dayName && date.getDate() <= 7;
        default:
          return false;
      }
    }
    
    return false;
  });
}