import { useState, useEffect, useCallback } from 'react';
import {
  getTodayTempTasks,
  getTodayHiddenTempTaskIds,
  TempTask,
} from '@/lib/storage/localStorage-tasks';
import { filterTasksByWorkMode } from '@/lib/calendar/calendar-utils';

export function useTempTasks(
  isTodayView: boolean,
  workMode: 'Présentiel' | 'Distanciel' | 'Congé'
) {
  const [tempTasks, setTempTasks] = useState<TempTask[]>([]);

  const loadTempTasks = useCallback(() => {
    if (!isTodayView) {
      setTempTasks([]);
      return;
    }

    const allTempTasks = getTodayTempTasks();
    const filtered = filterTasksByWorkMode(allTempTasks, workMode);
    setTempTasks(filtered);
  }, [isTodayView, workMode]);

  // Load tasks on mount and when dependencies change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTempTasks();
  }, [loadTempTasks]);

  // Listen for temp task updates
  useEffect(() => {
    if (!isTodayView) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTempTasks([]);
      return;
    }

    const handleTempTaskUpdate = () => {
      const allTempTasks = getTodayTempTasks();
      const filtered = filterTasksByWorkMode(allTempTasks, workMode);
      setTempTasks(filtered);
    };
    
    window.addEventListener('temp-task-updated', handleTempTaskUpdate);
    return () => {
      window.removeEventListener('temp-task-updated', handleTempTaskUpdate);
    };
  }, [isTodayView, workMode]);

  const getHiddenTempTaskIds = () => {
    if (!isTodayView) return [];
    return getTodayHiddenTempTaskIds();
  };

  return {
    tempTasks,
    loadTempTasks,
    getHiddenTempTaskIds,
  };
}

