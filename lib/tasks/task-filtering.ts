import { Task } from '@/lib/types';

export function groupTasksByType(tasks: Task[]): {
  periodic: Task[];
  specificDate: Task[];
  whenPossible: Task[];
} {
  return {
    periodic: tasks.filter(t => !!t.frequency),
    specificDate: tasks
      .filter(t => !t.frequency && !!t.due_on)
      .sort((a, b) => {
        // Sort by date ascending (oldest to newest)
        if (!a.due_on || !b.due_on) return 0;
        return a.due_on.localeCompare(b.due_on);
      }),
    whenPossible: tasks
      .filter(t => !t.frequency && !t.due_on)
      .sort((a, b) => {
        // Sort: in progress first, then others
        if (a.in_progress === b.in_progress) return 0;
        if (a.in_progress) return -1; // in progress comes first
        return 1; // other comes first
      }),
  };
}

