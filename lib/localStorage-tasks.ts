import { DayTasksData } from "@/components/calendar/day-view";
import { formatDateLocal } from "./utils";

const STORAGE_PREFIX = "kroni-today-tasks-";

function getTodayKey(): string {
  const today = new Date();
  return `${STORAGE_PREFIX}${formatDateLocal(today)}`;
}

function getAllTaskKeys(): string[] {
  if (typeof window === 'undefined') return [];
  
  const keys: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key?.startsWith(STORAGE_PREFIX)) {
      keys.push(key);
    }
  }
  return keys;
}

export function getTodayTasksFromStorage(): DayTasksData | null {
  if (typeof window === 'undefined') return null;
  
  const todayKey = getTodayKey();
  const stored = window.localStorage.getItem(todayKey);
  
  if (!stored) return null;
  
  try {
    return JSON.parse(stored) as DayTasksData;
  } catch {
    return null;
  }
}

export function saveTodayTasksToStorage(tasks: DayTasksData): void {
  if (typeof window === 'undefined') return;
  
  const todayKey = getTodayKey();
  
  // Clean up old keys before saving new one
  const allKeys = getAllTaskKeys();
  allKeys.forEach(key => {
    if (key !== todayKey) {
      window.localStorage.removeItem(key);
    }
  });
  
  window.localStorage.setItem(todayKey, JSON.stringify(tasks));
}

export function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

const ORDER_KEY_PREFIX = "kroni-today-order-";

function getTodayOrderKey(): string {
  const today = new Date();
  return `${ORDER_KEY_PREFIX}${formatDateLocal(today)}`;
}

export function getTodayTaskOrder(): string[] {
  if (typeof window === 'undefined') return [];
  
  const orderKey = getTodayOrderKey();
  const stored = window.localStorage.getItem(orderKey);
  
  if (!stored) return [];
  
  try {
    return JSON.parse(stored) as string[];
  } catch {
    return [];
  }
}

export function saveTodayTaskOrder(order: string[]): void {
  if (typeof window === 'undefined') return;
  
  const orderKey = getTodayOrderKey();
  
  // Clean up old order keys
  const allKeys: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key?.startsWith(ORDER_KEY_PREFIX) && key !== orderKey) {
      allKeys.push(key);
    }
  }
  allKeys.forEach(key => window.localStorage.removeItem(key));
  
  window.localStorage.setItem(orderKey, JSON.stringify(order));
}

const HIDDEN_KEY_PREFIX = "kroni-today-hidden-";

function getTodayHiddenKey(): string {
  const today = new Date();
  return `${HIDDEN_KEY_PREFIX}${formatDateLocal(today)}`;
}

export function getTodayHiddenTaskIds(): string[] {
  if (typeof window === 'undefined') return [];
  
  const hiddenKey = getTodayHiddenKey();
  const stored = window.localStorage.getItem(hiddenKey);
  
  if (!stored) return [];
  
  try {
    return JSON.parse(stored) as string[];
  } catch {
    return [];
  }
}

export function hideTodayTask(taskId: string): void {
  if (typeof window === 'undefined') return;
  
  const hiddenKey = getTodayHiddenKey();
  const hidden = getTodayHiddenTaskIds();
  
  if (!hidden.includes(taskId)) {
    const updated = [...hidden, taskId];
    window.localStorage.setItem(hiddenKey, JSON.stringify(updated));
    
    // Also remove from order if present
    const order = getTodayTaskOrder();
    const updatedOrder = order.filter(id => id !== taskId);
    if (updatedOrder.length !== order.length) {
      saveTodayTaskOrder(updatedOrder);
    }
  }
  
  // Clean up old hidden keys
  const allKeys: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key?.startsWith(HIDDEN_KEY_PREFIX) && key !== hiddenKey) {
      allKeys.push(key);
    }
  }
  allKeys.forEach(key => window.localStorage.removeItem(key));
}

// Temporary tasks (only for today, stored in localStorage)
const TEMP_TASKS_PREFIX = "kroni-temp-tasks-";

function getTodayTempTasksKey(): string {
  const today = new Date();
  return `${TEMP_TASKS_PREFIX}${formatDateLocal(today)}`;
}

function getAllTempTaskKeys(): string[] {
  if (typeof window === 'undefined') return [];
  
  const keys: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key?.startsWith(TEMP_TASKS_PREFIX)) {
      keys.push(key);
    }
  }
  return keys;
}

export interface TempTask {
  id: string;
  title: string;
  description: string;
  mode?: 'Tous' | 'Présentiel' | 'Distanciel';
  in_progress?: boolean;
  created_at: string;
}

export function getTodayTempTasks(): TempTask[] {
  if (typeof window === 'undefined') return [];
  
  // Clean up old temp tasks from previous days
  cleanupOldTempTasks();
  
  const todayKey = getTodayTempTasksKey();
  const stored = window.localStorage.getItem(todayKey);
  
  if (!stored) return [];
  
  try {
    return JSON.parse(stored) as TempTask[];
  } catch {
    return [];
  }
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
  
  cleanupOldTempTasks();
  
  const tasks = getTodayTempTasks();
  const newTask: TempTask = {
    id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title,
    description,
    mode,
    in_progress,
    created_at: new Date().toISOString(),
  };
  
  const updated = [...tasks, newTask];
  const todayKey = getTodayTempTasksKey();
  window.localStorage.setItem(todayKey, JSON.stringify(updated));
  
  return newTask;
}

export function updateTodayTempTask(
  id: string,
  updates: Partial<Pick<TempTask, 'title' | 'description' | 'mode' | 'in_progress'>>
): TempTask | null {
  if (typeof window === 'undefined') return null;
  
  cleanupOldTempTasks();
  
  const tasks = getTodayTempTasks();
  const index = tasks.findIndex(t => t.id === id);
  
  if (index === -1) return null;
  
  const updated = tasks.map((task, i) => 
    i === index ? { ...task, ...updates } : task
  );
  
  const todayKey = getTodayTempTasksKey();
  window.localStorage.setItem(todayKey, JSON.stringify(updated));
  
  return updated[index];
}

export function deleteTodayTempTask(id: string): boolean {
  if (typeof window === 'undefined') return false;
  
  cleanupOldTempTasks();
  
  const tasks = getTodayTempTasks();
  const filtered = tasks.filter(t => t.id !== id);
  
  if (filtered.length === tasks.length) return false;
  
  const todayKey = getTodayTempTasksKey();
  window.localStorage.setItem(todayKey, JSON.stringify(filtered));
  
  return true;
}

function cleanupOldTempTasks(): void {
  if (typeof window === 'undefined') return;
  
  const todayKey = getTodayTempTasksKey();
  const allKeys = getAllTempTaskKeys();
  
  // Remove all temp task keys except today's
  allKeys.forEach(key => {
    if (key !== todayKey) {
      window.localStorage.removeItem(key);
    }
  });
}

const TEMP_HIDDEN_KEY_PREFIX = "kroni-temp-hidden-";

function getTodayTempHiddenKey(): string {
  const today = new Date();
  return `${TEMP_HIDDEN_KEY_PREFIX}${formatDateLocal(today)}`;
}

export function getTodayHiddenTempTaskIds(): string[] {
  if (typeof window === 'undefined') return [];
  
  const hiddenKey = getTodayTempHiddenKey();
  const stored = window.localStorage.getItem(hiddenKey);
  
  if (!stored) return [];
  
  try {
    return JSON.parse(stored) as string[];
  } catch {
    return [];
  }
}

export function hideTodayTempTask(taskId: string): void {
  if (typeof window === 'undefined') return;
  
  const hiddenKey = getTodayTempHiddenKey();
  const hidden = getTodayHiddenTempTaskIds();
  
  if (!hidden.includes(taskId)) {
    const updated = [...hidden, taskId];
    window.localStorage.setItem(hiddenKey, JSON.stringify(updated));
    
    // Also remove from order if present
    const order = getTodayTaskOrder();
    const updatedOrder = order.filter(id => id !== taskId);
    if (updatedOrder.length !== order.length) {
      saveTodayTaskOrder(updatedOrder);
    }
  }
  
  // Clean up old hidden keys
  const allKeys: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key?.startsWith(TEMP_HIDDEN_KEY_PREFIX) && key !== hiddenKey) {
      allKeys.push(key);
    }
  }
  allKeys.forEach(key => window.localStorage.removeItem(key));
}

