import { Task, Frequency, DayOfWeek } from './types';
import { getTasks } from './db/tasks';

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

// Helper function to check if a date is the first occurrence of a day in the month
function isFirstDayOfMonth(date: Date, targetDay: DayOfWeek): boolean {
  const dayName = getDayName(date);
  if (dayName !== targetDay) return false;
  
  // Check if it's the first occurrence of this day in the month
  const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const firstTargetDay = new Date(firstDayOfMonth);
  
  // Find the first occurrence of the target day
  while (getDayName(firstTargetDay) !== targetDay) {
    firstTargetDay.setDate(firstTargetDay.getDate() + 1);
  }
  
  return date.getDate() === firstTargetDay.getDate();
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
  const dateString = date.toISOString().split('T')[0];
  
  return tasks.filter(task => {
    if (!task.frequency) return false;
    
    switch (task.frequency) {
      case 'quotidien':
        return true;
      
      case 'hebdomadaire':
        return task.day === dayName;
      
      case 'mensuel':
        return task.day === dayName && isFirstDayOfMonth(date, task.day);
      
      case 'annuel':
        // For annual tasks, we could implement more complex logic
        // For now, we'll consider them as monthly for simplicity
        return task.day === dayName && isFirstDayOfMonth(date, task.day);
      
      default:
        return false;
    }
  });
}

// Get specific date tasks for a specific date
export function getSpecificTasksForDate(tasks: Task[], date: Date): Task[] {
  const dateString = date.toISOString().split('T')[0];
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
export async function getTasksForToday(userId: string): Promise<{
  periodic: Task[];
  specific: Task[];
  whenPossible: {
    inProgress: Task[];
    notStarted: Task[];
  };
}> {
  const allTasks = await getTasks(userId);
  const { periodic, specific, whenPossible } = filterTasksByType(allTasks);
  
  const today = new Date();
  
  return {
    periodic: getPeriodicTasksForDate(periodic, today),
    specific: getSpecificTasksForDate(specific, today),
    whenPossible: getWhenPossibleTasks(whenPossible)
  };
}

// Get tasks for a date range (week/month view)
export async function getTasksForDateRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<CalendarTask[]> {
  const allTasks = await getTasks(userId);
  const { periodic, specific } = filterTasksByType(allTasks);
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  const tasks: CalendarTask[] = [];
  
  // Add periodic tasks (weekly and monthly only for week/month view)
  const periodicForView = periodic.filter(task => 
    task.frequency === 'hebdomadaire' || task.frequency === 'mensuel'
  );
  
  // Add specific date tasks
  const specificForRange = specific.filter(task => {
    if (!task.due_on) return false;
    const taskDate = new Date(task.due_on);
    return taskDate >= start && taskDate <= end;
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
export function getTasksForDate(tasks: CalendarTask[], dateString: string): CalendarTask[] {
  const date = new Date(dateString);
  const dayName = getDayName(date);
  
  return tasks.filter(task => {
    if (task.type === 'specific') {
      return task.due_on === dateString;
    }
    
    if (task.type === 'periodic' && task.frequency && task.day) {
      switch (task.frequency) {
        case 'hebdomadaire':
          return task.day === dayName;
        case 'mensuel':
          return task.day === dayName && isFirstDayOfMonth(date, task.day);
        default:
          return false;
      }
    }
    
    return false;
  });
}