import { DayTasksData } from "@/components/calendar/views/day-view";
import { TempTask } from "@/lib/types";
import { storage } from "./localStorage-helpers";

/**
 * Re-export TempTask interface for backward compatibility
 */
export type { TempTask };

/**
 * Check if a date is today
 */
export function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

// ===== Tasks Storage =====

export function getTodayTasksFromStorage(): DayTasksData | null {
  return storage.tasks.get();
}

export function saveTodayTasksToStorage(tasks: DayTasksData): void {
  storage.tasks.set(tasks);
}

// ===== Task Order Storage =====

export function getTodayTaskOrder(): string[] {
  return storage.order.get();
}

export function saveTodayTaskOrder(order: string[]): void {
  storage.order.set(order);
}

// ===== Hidden Tasks Storage =====

export function getTodayHiddenTaskIds(): string[] {
  return storage.hidden.get();
}

export function hideTodayTask(taskId: string): void {
  storage.hidden.add(taskId);
  
  // Also remove from order if present
  const order = storage.order.get();
  const updatedOrder = order.filter(id => id !== taskId);
  if (updatedOrder.length !== order.length) {
    storage.order.set(updatedOrder);
  }
}

// ===== Temporary Tasks Storage =====

export function getTodayTempTasks(): TempTask[] {
  return storage.tempTasks.get();
}

export function createTodayTempTask(
  title: string,
  description: string = '',
  mode: 'Tous' | 'Présentiel' | 'Distanciel' = 'Tous',
  in_progress: boolean = false
): TempTask {
  if (typeof window === 'undefined') {
    throw new Error('localStorage is not available');
  }
  
  const tasks = storage.tempTasks.get();
  const newTask: TempTask = {
    id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title,
    description,
    mode,
    in_progress,
    created_at: new Date().toISOString(),
  };
  
  storage.tempTasks.set([...tasks, newTask]);
  return newTask;
}

export function updateTodayTempTask(
  id: string,
  updates: Partial<Pick<TempTask, 'title' | 'description' | 'mode' | 'in_progress'>>
): TempTask | null {
  const tasks = storage.tempTasks.get();
  const index = tasks.findIndex(t => t.id === id);
  
  if (index === -1) return null;
  
  const updated = tasks.map((task, i) => 
    i === index ? { ...task, ...updates } : task
  );
  
  storage.tempTasks.set(updated);
  return updated[index];
}

export function deleteTodayTempTask(id: string): boolean {
  const tasks = storage.tempTasks.get();
  const filtered = tasks.filter(t => t.id !== id);
  
  if (filtered.length === tasks.length) return false;
  
  storage.tempTasks.set(filtered);
  return true;
}

// ===== Temporary Hidden Tasks Storage =====

export function getTodayHiddenTempTaskIds(): string[] {
  return storage.tempHidden.get();
}

export function hideTodayTempTask(taskId: string): void {
  storage.tempHidden.add(taskId);
  
  // Also remove from order if present
  const order = storage.order.get();
  const updatedOrder = order.filter(id => id !== taskId);
  if (updatedOrder.length !== order.length) {
    storage.order.set(updatedOrder);
  }
}
