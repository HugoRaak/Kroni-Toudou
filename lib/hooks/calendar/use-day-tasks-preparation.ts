import { useMemo, useState, useEffect } from 'react';
import { DayTasksData } from '@/components/calendar/views/day-view';
import { TempTask } from '@/lib/types';
import { prepareTasksForToday } from '@/lib/tasks/processing/task-preparation';
import { getTodayHiddenTaskIds } from '@/lib/storage/localStorage-tasks';

export function useDayTasksPreparation(
  tasks: DayTasksData,
  tempTasks: TempTask[],
  isTodayView: boolean,
  loading: boolean,
  orderVersion: number,
  getHiddenTempTaskIds: () => string[],
  layout?: 'single' | 'three-column',
) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
  }, []);

  const preparedTasks = useMemo(() => {
    // Return empty array during SSR or before mount to avoid hydration mismatch
    if (!isMounted || !tasks || !isTodayView || loading) return [];

    const hiddenIds = getTodayHiddenTaskIds();
    const hiddenTempTaskIds = getHiddenTempTaskIds();

    return prepareTasksForToday(
      tasks,
      tempTasks,
      hiddenIds,
      hiddenTempTaskIds,
      isTodayView,
      loading,
    );
  }, [isMounted, tasks, tempTasks, loading, isTodayView, orderVersion, getHiddenTempTaskIds]);

  const groupedPreparedTasks = useMemo(() => {
    if (!isTodayView || layout !== 'three-column' || !preparedTasks.length) return null;

    return {
      periodic: preparedTasks.filter((t) => t.taskType === 'periodic' || t.taskType === 'temp'),
      specific: preparedTasks.filter((t) => t.taskType === 'specific'),
      temp: [],
    };
  }, [preparedTasks, isTodayView, layout]);

  return {
    preparedTasks,
    groupedPreparedTasks,
  };
}
