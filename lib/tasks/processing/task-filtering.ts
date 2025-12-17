import { Task } from '@/lib/types';
import { formatDateLocal, normalizeToMidnight } from '@/lib/utils';

export function groupInProgressTasksByDueDate(tasks: Task[]): {
  upcoming: Task[];
  overdue: Task[];
  noDue: Task[];
} {
  const today = formatDateLocal(normalizeToMidnight(new Date()));
  
  const upcoming: Task[] = [];
  const overdue: Task[] = [];
  const noDue: Task[] = [];

  for (const task of tasks) {
    if (!task.due_on) {
      noDue.push(task);
    } else if (task.due_on < today) {
      overdue.push(task);
    } else {
      upcoming.push(task);
    }
  }

  // Sort upcoming and overdue by due_on ascending, then display_order
  const sortByDueDate = (a: Task, b: Task) => {
    if (!a.due_on || !b.due_on) return 0;
    const dueDiff = a.due_on.localeCompare(b.due_on);
    if (dueDiff !== 0) return dueDiff;
    // Fallback to display_order
    if (a.display_order !== undefined && b.display_order !== undefined) {
      return a.display_order - b.display_order;
    }
    if (a.display_order !== undefined) return -1;
    if (b.display_order !== undefined) return 1;
    return 0;
  };

  // Sort noDue by display_order
  const sortByDisplayOrder = (a: Task, b: Task) => {
    if (a.display_order !== undefined && b.display_order !== undefined) {
      return a.display_order - b.display_order;
    }
    if (a.display_order !== undefined) return -1;
    if (b.display_order !== undefined) return 1;
    return 0;
  };

  upcoming.sort(sortByDueDate);
  overdue.sort(sortByDueDate);
  noDue.sort(sortByDisplayOrder);

  return { upcoming, overdue, noDue };
}

export function groupTasksByType(tasks: Task[]): {
  periodic: Task[];
  specificDate: Task[];
  whenPossible: Task[];
} {
  return {
    // PERIODIC: frequency != null
    periodic: tasks
      .filter((t) => !!t.frequency)
      .sort((a, b) => {
        // Sort by display_order ascending, then by updated_at descending
        if (a.display_order !== undefined && b.display_order !== undefined) {
          return a.display_order - b.display_order;
        }
        if (a.display_order !== undefined) return -1;
        if (b.display_order !== undefined) return 1;
        return 0;
      }),
    // SPECIFIC: frequency == null && due_on != null && in_progress == null
    specificDate: tasks
      .filter((t) => !t.frequency && !!t.due_on && t.in_progress == null)
      .sort((a, b) => {
        // Sort by due_on ascending (oldest to newest)
        if (!a.due_on || !b.due_on) return 0;
        return a.due_on.localeCompare(b.due_on);
      }),
    // WHEN_POSSIBLE: frequency == null && in_progress != null (boolean)
    whenPossible: tasks
      .filter((t) => !t.frequency && t.in_progress != null)
      .sort((a, b) => {
        // Sort by display_order ascending, then by in_progress
        if (a.display_order !== undefined && b.display_order !== undefined) {
          const orderDiff = a.display_order - b.display_order;
          if (orderDiff !== 0) return orderDiff;
        }
        if (a.display_order !== undefined) return -1;
        if (b.display_order !== undefined) return 1;
        // Secondary sort: in progress first, then others
        if (a.in_progress === b.in_progress) return 0;
        if (a.in_progress) return -1; // in progress comes first
        return 1; // other comes first
      }),
  };
}
