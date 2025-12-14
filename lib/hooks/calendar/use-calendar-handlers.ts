'use client';

import { useCallback } from 'react';
import { normalizeToMidnight, formatDateLocal } from '@/lib/utils';
import { isToday, saveTodayTasksToStorage } from '@/lib/storage/localStorage-tasks';
import { getCalendarDayDataAction } from '@/app/actions/calendar';
import { showTaskShiftAlerts } from '@/lib/calendar/task-shift-alerts';
import type { ModeConflictError } from '@/app/actions/tasks';
import type { CalendarView } from '@/lib/calendar/calendar-navigation';
import type { DayTasksData } from '@/components/calendar/views/day-view';

type UseCalendarHandlersOptions = {
  userId: string;
  currentView: CalendarView;
  dayDate: Date;
  loadTasks: (forceReload?: boolean) => Promise<void>;
  setDayTasks: (tasks: DayTasksData) => void;
  setDayWorkMode: (mode: 'Présentiel' | 'Distanciel' | 'Congé') => void;
  onUpdateTask: (formData: FormData) => Promise<boolean | ModeConflictError>;
  onDeleteTask: (id: string) => Promise<boolean>;
};

type UseCalendarHandlersReturn = {
  handleModeSaved: () => Promise<void>;
  handleUpdateTask: (formData: FormData) => Promise<boolean | ModeConflictError>;
  handleDeleteTask: (id: string) => Promise<boolean>;
};

export function useCalendarHandlers({
  userId,
  currentView,
  dayDate,
  loadTasks,
  setDayTasks,
  setDayWorkMode,
  onUpdateTask,
  onDeleteTask,
}: UseCalendarHandlersOptions): UseCalendarHandlersReturn {
  const handleModeSaved = useCallback(async () => {
    await loadTasks(true);
  }, [loadTasks]);

  const handleUpdateTask = useCallback(
    async (formData: FormData): Promise<boolean | ModeConflictError> => {
      const result = await onUpdateTask(formData);
      const success = result === true;

      const isDayLikeView = currentView === 'day' || currentView === 'today';
      const activeDayDate = currentView === 'today' ? normalizeToMidnight(new Date()) : dayDate;

      if (success && isDayLikeView && isToday(activeDayDate)) {
        const { dayData, mode } = await getCalendarDayDataAction({
          userId,
          dateStr: formatDateLocal(activeDayDate),
        });
        saveTodayTasksToStorage(dayData);
        setDayTasks(dayData);
        setDayWorkMode(mode);

        if (dayData?.alerts) {
          showTaskShiftAlerts(dayData.alerts);
        }
      } else if (success && isDayLikeView) {
        await loadTasks();
      }

      return result;
    },
    [userId, currentView, dayDate, onUpdateTask, loadTasks, setDayTasks, setDayWorkMode],
  );

  const handleDeleteTask = useCallback(
    async (id: string): Promise<boolean> => {
      const result = await onDeleteTask(id);

      const isDayLikeView = currentView === 'day' || currentView === 'today';
      const activeDayDate = currentView === 'today' ? normalizeToMidnight(new Date()) : dayDate;

      if (result && isDayLikeView && isToday(activeDayDate)) {
        const { dayData, mode } = await getCalendarDayDataAction({
          userId,
          dateStr: formatDateLocal(activeDayDate),
        });
        saveTodayTasksToStorage(dayData);
        setDayTasks(dayData);
        setDayWorkMode(mode);
      } else if (result && isDayLikeView) {
        await loadTasks();
      }

      return result;
    },
    [userId, currentView, dayDate, onDeleteTask, loadTasks, setDayTasks, setDayWorkMode],
  );

  return {
    handleModeSaved,
    handleUpdateTask,
    handleDeleteTask,
  };
}
