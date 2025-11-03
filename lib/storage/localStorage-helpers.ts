import { formatDateLocal } from "@/lib/utils";
import { DayTasksData } from "@/components/calendar/views/day-view";
import { TempTask } from "@/lib/types";

/**
 * Generic helpers for localStorage operations
 */

function getStorageKey(prefix: string, date?: Date): string {
  const targetDate = date || new Date();
  return `${prefix}${formatDateLocal(targetDate)}`;
}

function getStorageItem<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  
  const stored = window.localStorage.getItem(key);
  if (!stored) return null;
  
  try {
    return JSON.parse(stored) as T;
  } catch {
    return null;
  }
}

function setStorageItem<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(data));
}

function getAllKeysWithPrefix(prefix: string): string[] {
  if (typeof window === 'undefined') return [];
  
  const keys: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key?.startsWith(prefix)) {
      keys.push(key);
    }
  }
  return keys;
}

function cleanupOldKeys(prefix: string, currentKey: string): void {
  if (typeof window === 'undefined') return;
  
  const allKeys = getAllKeysWithPrefix(prefix);
  allKeys.forEach(key => {
    if (key !== currentKey) {
      window.localStorage.removeItem(key);
    }
  });
}

/**
 * Storage API for tasks
 */
export const storage = {
  tasks: {
    get: (date?: Date): DayTasksData | null => {
      const key = getStorageKey('kroni-today-tasks-', date);
      return getStorageItem<DayTasksData>(key);
    },
    set: (data: DayTasksData, date?: Date): void => {
      const key = getStorageKey('kroni-today-tasks-', date);
      cleanupOldKeys('kroni-today-tasks-', key);
      setStorageItem(key, data);
    },
  },
  order: {
    get: (date?: Date): string[] => {
      const key = getStorageKey('kroni-today-order-', date);
      const result = getStorageItem<string[]>(key);
      return result || [];
    },
    set: (data: string[], date?: Date): void => {
      const key = getStorageKey('kroni-today-order-', date);
      cleanupOldKeys('kroni-today-order-', key);
      setStorageItem(key, data);
    },
  },
  hidden: {
    get: (date?: Date): string[] => {
      const key = getStorageKey('kroni-today-hidden-', date);
      const result = getStorageItem<string[]>(key);
      return result || [];
    },
    add: (taskId: string, date?: Date): void => {
      const key = getStorageKey('kroni-today-hidden-', date);
      const hidden = storage.hidden.get(date);
      if (!hidden.includes(taskId)) {
        const updated = [...hidden, taskId];
        setStorageItem(key, updated);
        cleanupOldKeys('kroni-today-hidden-', key);
      }
    },
  },
  tempTasks: {
    get: (date?: Date): TempTask[] => {
      const key = getStorageKey('kroni-temp-tasks-', date);
      storage.tempTasks.cleanup(date);
      const result = getStorageItem<TempTask[]>(key);
      return result || [];
    },
    set: (data: TempTask[], date?: Date): void => {
      const key = getStorageKey('kroni-temp-tasks-', date);
      storage.tempTasks.cleanup(date);
      setStorageItem(key, data);
    },
    cleanup: (date?: Date): void => {
      const key = getStorageKey('kroni-temp-tasks-', date);
      cleanupOldKeys('kroni-temp-tasks-', key);
    },
  },
  tempHidden: {
    get: (date?: Date): string[] => {
      const key = getStorageKey('kroni-temp-hidden-', date);
      const result = getStorageItem<string[]>(key);
      return result || [];
    },
    add: (taskId: string, date?: Date): void => {
      const key = getStorageKey('kroni-temp-hidden-', date);
      const hidden = storage.tempHidden.get(date);
      if (!hidden.includes(taskId)) {
        const updated = [...hidden, taskId];
        setStorageItem(key, updated);
        cleanupOldKeys('kroni-temp-hidden-', key);
      }
    },
  },
};

