import { DayTasksData } from "@/components/calendar/views/day-view";
import { TaskWithType, TempTask } from "@/lib/types";
import {
  getTodayTaskOrder,
  saveTodayTaskOrder,
} from "@/lib/storage/localStorage-tasks";

// Sort tasks by display_order (ascending), with tasks without display_order at the end
function sortByDisplayOrder(tasks: TaskWithType[]): TaskWithType[] {
  return [...tasks].sort((a, b) => {
    // Check if task has display_order (only Task has it, TempTask doesn't)
    const aOrder = 'display_order' in a && typeof (a as { display_order?: number }).display_order === 'number'
      ? (a as { display_order: number }).display_order
      : undefined;
    const bOrder = 'display_order' in b && typeof (b as { display_order?: number }).display_order === 'number'
      ? (b as { display_order: number }).display_order
      : undefined;
    
    if (aOrder !== undefined && bOrder !== undefined) {
      return aOrder - bOrder;
    }
    if (aOrder !== undefined) return -1;
    if (bOrder !== undefined) return 1;
    return 0;
  });
}

export function prepareTasksForToday(
  tasks: DayTasksData,
  tempTasks: TempTask[],
  hiddenIds: string[],
  hiddenTempIds: string[],
  isTodayView: boolean,
  loading: boolean
): TaskWithType[] {
  if (!tasks || !isTodayView || loading) return [];

  // Merge periodic, specific, and temp tasks with their types
  const allTasks: TaskWithType[] = [
    ...tasks.periodic.map(t => ({ ...t, taskType: 'periodic' as const })),
    ...tasks.specific.map(t => ({ ...t, taskType: 'specific' as const })),
    ...tempTasks.map(t => ({ ...t, taskType: 'temp' as const })),
  ];

  // Filter out hidden tasks
  const allHiddenIds = [...hiddenIds, ...hiddenTempIds];
  const visibleTasks = allTasks.filter(t => !allHiddenIds.includes(t.id));

  // Get saved order from localStorage
  const savedOrder = getTodayTaskOrder();
  
  if (savedOrder.length > 0) {
    // Sort by saved order (localStorage takes priority)
    const ordered = savedOrder
      .map(id => visibleTasks.find(t => t.id === id))
      .filter((t): t is TaskWithType => t !== undefined);
    
    // Add any new tasks not in the saved order at the end, sorted by display_order
    const orderedIds = new Set(ordered.map(t => t.id));
    const newTasks = visibleTasks.filter(t => !orderedIds.has(t.id));
    const sortedNewTasks = sortByDisplayOrder(newTasks);
    
    return [...ordered, ...sortedNewTasks];
  } else {
    // No saved order, use display_order
    const sortedTasks = sortByDisplayOrder(visibleTasks);
    if (sortedTasks.length > 0) {
      saveTodayTaskOrder(sortedTasks.map(t => t.id));
    }
    return sortedTasks;
  }
}

