import { DayTasksData } from "@/components/calendar/views/day-view";
import { TaskWithType, TempTask } from "@/lib/types";
import {
  getTodayTaskOrder,
  saveTodayTaskOrder,
} from "@/lib/storage/localStorage-tasks";

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
    // Sort by saved order
    const ordered = savedOrder
      .map(id => visibleTasks.find(t => t.id === id))
      .filter((t): t is TaskWithType => t !== undefined);
    
    // Add any new tasks not in the saved order at the end
    const orderedIds = new Set(ordered.map(t => t.id));
    const newTasks = visibleTasks.filter(t => !orderedIds.has(t.id));
    
    return [...ordered, ...newTasks];
  } else {
    // No saved order, use default order
    if (visibleTasks.length > 0) {
      saveTodayTaskOrder(visibleTasks.map(t => t.id));
    }
    return visibleTasks;
  }
}

