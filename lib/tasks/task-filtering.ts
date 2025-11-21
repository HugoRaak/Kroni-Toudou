import { Task } from '@/lib/types';

export function groupTasksByType(tasks: Task[]): {
  periodic: Task[];
  specificDate: Task[];
  whenPossible: Task[];
} {
  return {
    periodic: tasks
      .filter(t => !!t.frequency)
      .sort((a, b) => {
        // Sort by display_order ascending, then by updated_at descending
        if (a.display_order !== undefined && b.display_order !== undefined) {
          return a.display_order - b.display_order;
        }
        if (a.display_order !== undefined) return -1;
        if (b.display_order !== undefined) return 1;
        return 0;
      }),
    specificDate: tasks
      .filter(t => !t.frequency && !!t.due_on)
      .sort((a, b) => {
        // Sort by display_order ascending, then by date ascending
        if (a.display_order !== undefined && b.display_order !== undefined) {
          const orderDiff = a.display_order - b.display_order;
          if (orderDiff !== 0) return orderDiff;
        }
        if (a.display_order !== undefined) return -1;
        if (b.display_order !== undefined) return 1;
        // Secondary sort: by date ascending (oldest to newest)
        if (!a.due_on || !b.due_on) return 0;
        return a.due_on.localeCompare(b.due_on);
      }),
    whenPossible: tasks
      .filter(t => !t.frequency && !t.due_on)
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

