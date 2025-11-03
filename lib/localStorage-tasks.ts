import { DayTasksData } from "@/components/calendar/day-view";

const STORAGE_PREFIX = "kroni-today-tasks-";

function getTodayKey(): string {
  const today = new Date();
  return `${STORAGE_PREFIX}${today.toISOString().split('T')[0]}`;
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
  return `${ORDER_KEY_PREFIX}${today.toISOString().split('T')[0]}`;
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
  return `${HIDDEN_KEY_PREFIX}${today.toISOString().split('T')[0]}`;
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

