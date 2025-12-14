'use client';

import { useState, useEffect, useRef } from 'react';
import { CalendarTask } from '@/lib/calendar/calendar-utils';
import { DayTasksData } from '@/components/calendar/views/day-view';
import { getWorkdayAction } from '@/app/actions/workdays';
import {
  getTodayTasksFromStorage,
  saveTodayTasksToStorage,
  isToday,
} from '@/lib/storage/localStorage-tasks';
import { normalizeToMidnight, formatDateLocal, getRangeForView } from '@/lib/utils';
import {
  getCalendarDayDataAction,
  getCalendarRangeDataAction,
  checkFutureTaskShiftsAction,
} from '@/app/actions/calendar';
import { showTaskShiftAlerts } from '@/lib/calendar/task-shift-alerts';
import type { CalendarView } from '@/lib/calendar/calendar-navigation';

type UseCalendarDataOptions = {
  userId: string;
  currentView: CalendarView;
  dayDate: Date;
  weekDate: Date;
  monthDate: Date;
  initialDayData?: DayTasksData;
  initialWorkMode?: 'Présentiel' | 'Distanciel' | 'Congé';
  initialDayDate?: Date;
};

type UseCalendarDataReturn = {
  tasks: CalendarTask[];
  dayTasks: DayTasksData;
  loading: boolean;
  dayWorkMode: 'Présentiel' | 'Distanciel' | 'Congé';
  workdaysMap: Record<string, 'Présentiel' | 'Distanciel' | 'Congé'>;
  loadTasks: (forceReload?: boolean) => Promise<void>;
  setDayTasks: (tasks: DayTasksData) => void;
  setDayWorkMode: (mode: 'Présentiel' | 'Distanciel' | 'Congé') => void;
};

export function useCalendarData({
  userId,
  currentView,
  dayDate,
  weekDate,
  monthDate,
  initialDayData,
  initialWorkMode,
  initialDayDate,
}: UseCalendarDataOptions): UseCalendarDataReturn {
  const [tasks, setTasks] = useState<CalendarTask[]>([]);
  const [dayTasks, setDayTasks] = useState<DayTasksData>(initialDayData ?? null);
  const [loading, setLoading] = useState(!initialDayData);
  const [dayWorkMode, setDayWorkMode] = useState<'Présentiel' | 'Distanciel' | 'Congé'>(
    initialWorkMode ?? 'Présentiel',
  );
  const [workdaysMap, setWorkdaysMap] = useState<
    Record<string, 'Présentiel' | 'Distanciel' | 'Congé'>
  >({});

  const loadRequestIdRef = useRef(0);
  const isLoadingRef = useRef(false);
  const isInitialMountRef = useRef(true);
  const hasUsedInitialDataRef = useRef(false);

  const loadTasks = async (forceReload = false) => {
    loadRequestIdRef.current += 1;
    const currentRequestId = loadRequestIdRef.current;

    isLoadingRef.current = true;
    setLoading(true);

    try {
      const isDayLikeView = currentView === 'day' || currentView === 'today';
      const activeDayDate = currentView === 'today' ? normalizeToMidnight(new Date()) : dayDate;

      if (isDayLikeView) {
        // Check localStorage cache for today
        if (isToday(activeDayDate) && !forceReload && !isInitialMountRef.current) {
          const storedTasks = getTodayTasksFromStorage();

          if (storedTasks) {
            const mode = await getWorkdayAction(userId, formatDateLocal(activeDayDate));
            if (currentRequestId !== loadRequestIdRef.current) {
              isLoadingRef.current = false;
              return;
            }
            setDayTasks(storedTasks);
            setDayWorkMode(mode);
            isLoadingRef.current = false;
            setLoading(false);
            return;
          }
        }

        const { dayData, mode } = await getCalendarDayDataAction({
          userId,
          dateStr: formatDateLocal(activeDayDate),
        });

        if (currentRequestId !== loadRequestIdRef.current) return;

        isInitialMountRef.current = false;

        if (isToday(activeDayDate)) {
          if (getTodayTasksFromStorage() === null) {
            checkFutureTaskShiftsAction({ userId })
              .then(({ alerts }) => {
                if (alerts.length > 0) {
                  showTaskShiftAlerts(alerts);
                }
              })
              .catch((error) => {
                console.error('Error checking future task shifts:', error);
              });
          }
          saveTodayTasksToStorage(dayData);
        }

        setDayTasks(dayData);
        setDayWorkMode(mode);

        if (dayData?.alerts) {
          showTaskShiftAlerts(dayData.alerts);
        }
      } else {
        const anchor = normalizeToMidnight(currentView === 'week' ? weekDate : monthDate);
        const { start, end } = getRangeForView(currentView, anchor);

        const { tasksData, workdays } = await getCalendarRangeDataAction({
          userId,
          startDateStr: formatDateLocal(start),
          endDateStr: formatDateLocal(end),
        });

        if (currentRequestId !== loadRequestIdRef.current) return;

        setTasks(tasksData);
        setWorkdaysMap(workdays);
      }
    } catch (error) {
      if (currentRequestId !== loadRequestIdRef.current) return;
      console.error('Error loading tasks:', error);
    } finally {
      if (currentRequestId === loadRequestIdRef.current) {
        isLoadingRef.current = false;
        setLoading(false);
      } else {
        isLoadingRef.current = false;
      }
    }
  };

  // Debounced load on view/date changes
  useEffect(() => {
    // Skip initial load if we have initial data and are viewing today
    if (
      isInitialMountRef.current &&
      initialDayData &&
      initialDayDate &&
      isToday(dayDate) &&
      (currentView === 'day' || currentView === 'today')
    ) {
      // Check if we're viewing the same day as initial data
      const viewingToday = normalizeToMidnight(dayDate).getTime() === initialDayDate.getTime();
      if (viewingToday) {
        isInitialMountRef.current = false;
        hasUsedInitialDataRef.current = true;
        // Save to localStorage if viewing today
        if (isToday(dayDate)) {
          saveTodayTasksToStorage(initialDayData);
        }
        return;
      }
    }

    const timeoutId = setTimeout(() => {
      loadTasks();
    }, 250);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [currentView, dayDate, weekDate, monthDate, initialDayData, initialDayDate]);

  // Refresh on task events
  useEffect(() => {
    const handler = () => {
      loadTasks(true);
    };
    window.addEventListener('task-created', handler);
    window.addEventListener('task-updated', handler);
    window.addEventListener('task-deleted', handler);
    return () => {
      window.removeEventListener('task-created', handler);
      window.removeEventListener('task-updated', handler);
      window.removeEventListener('task-deleted', handler);
    };
  }, [dayDate, weekDate, monthDate, currentView]);

  return {
    tasks,
    dayTasks,
    loading,
    dayWorkMode,
    workdaysMap,
    loadTasks,
    setDayTasks,
    setDayWorkMode,
  };
}
