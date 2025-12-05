"use client";

import { useState, useEffect, useRef } from "react";
import DayView, { DayTasksData } from "@/components/calendar/views/day-view";
import ViewSwitcher from "@/components/calendar/ui/view-switcher";
import { CalendarTask } from "@/lib/calendar/calendar-utils";
import WeekView from "@/components/calendar/views/week-view";
import MonthView from "@/components/calendar/views/month-view";
import { getWorkdayAction } from "@/app/actions/workdays";
import { getTodayTasksFromStorage, saveTodayTasksToStorage, isToday } from "@/lib/storage/localStorage-tasks";
import { navigateCalendarDate, type CalendarView } from "@/lib/calendar/calendar-navigation";
import { formatDateLocal, getRangeForView, normalizeToMidnight, parseDateLocal } from "@/lib/utils";
import type { ModeConflictError } from "@/app/actions/tasks";
import { getCalendarDayDataAction, getCalendarRangeDataAction, checkFutureTaskShiftsAction } from "@/app/actions/calendar";
import { toast } from "sonner";
import type { TaskShiftAlert } from "@/lib/calendar/calendar-utils";

export function Calendar({ 
  userId, 
  onUpdateTask, 
  onDeleteTask,
  onViewChange
}: { 
  userId: string;
  onUpdateTask: (formData: FormData) => Promise<boolean | ModeConflictError>;
  onDeleteTask: (id: string) => Promise<boolean>;
  onViewChange?: (isViewingToday: boolean, currentView: CalendarView, dayDate?: Date) => void;
  }) {
  const [currentView, setCurrentView] = useState<CalendarView>("day");
  // Independent anchors per view (normalized to midnight local time to avoid timezone issues)
  const [dayDate, setDayDate] = useState<Date>(() => normalizeToMidnight(new Date()));
  const [weekDate, setWeekDate] = useState<Date>(() => normalizeToMidnight(new Date()));
  const [monthDate, setMonthDate] = useState<Date>(() => normalizeToMidnight(new Date()));
  const [tasks, setTasks] = useState<CalendarTask[]>([]);
  const [dayTasks, setDayTasks] = useState<DayTasksData>(null);
  const [loading, setLoading] = useState(true);
  const [dayWorkMode, setDayWorkMode] = useState<"Présentiel" | "Distanciel" | "Congé">("Présentiel");
  const [workdaysMap, setWorkdaysMap] = useState<Record<string, "Présentiel" | "Distanciel" | "Congé">>({});
  
  // Track the latest load request to ignore stale responses
  const loadRequestIdRef = useRef(0);
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLoadingRef = useRef(false);
  const isInitialMountRef = useRef(true);

  // Helper function to show alerts for tasks that couldn't be shifted
  const showTaskShiftAlerts = (alerts: TaskShiftAlert[]) => {
    if (alerts.length === 0) return;
    
    // Group alerts by taskId
    const alertsByTask = new Map<string, TaskShiftAlert[]>();
    alerts.forEach(alert => {
      if (!alertsByTask.has(alert.taskId)) {
        alertsByTask.set(alert.taskId, []);
      }
      alertsByTask.get(alert.taskId)!.push(alert);
    });
    
    // Sort tasks by first alert date (descending for display order)
    const sortedTasks = Array.from(alertsByTask.entries()).sort((a, b) => {
      const aFirstDate = a[1][0].originalDate;
      const bFirstDate = b[1][0].originalDate;
      return bFirstDate.localeCompare(aFirstDate);
    });

    // Show one toast per task with all dates
    sortedTasks.forEach(([_, taskAlerts]) => {
      const firstAlert = taskAlerts[0];
      const frequencyLabel = firstAlert.frequency === 'annuel' ? 'annuelle' : 'personnalisée';
      
      // Sort dates for this task (ascending)
      const sortedDates = taskAlerts
        .map(alert => ({
          date: alert.originalDate,
          isFuture: alert.isFutureShift ?? false
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
      
      // Format dates
      const formattedDates = sortedDates.map(({ date, isFuture }) => {
        const dateStr = parseDateLocal(date).toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
        return isFuture ? dateStr : `${dateStr} (passée)`;
      });
      
      const datesList = formattedDates.length === 1
        ? formattedDates[0]
        : formattedDates.join(', ');
      
      const datesCount = formattedDates.length;
      const datesText = datesCount === 1 ? 'date' : 'dates';
      
      toast.warning(
        `Tâche "${firstAlert.taskTitle}" non décalable`,
        {
          description: `La tâche ${frequencyLabel} prévue ${datesCount > 1 ? `aux ${datesText}` : `à la ${datesText}`} ${datesList} ${firstAlert.taskMode === "Tous" ? "pour tous les modes" : `en ${firstAlert.taskMode}`} n'a pas pu être décalée à une date compatible.`,
          duration: Infinity,
        }
      );
    });
  };

  useEffect(() => {
    // Clear any pending timeout - this ensures only the last change triggers a load
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }
    
    // Debounce: wait 250ms before loading to avoid multiple requests on rapid clicks
    // If user clicks multiple times, only the last click will trigger a load
    loadTimeoutRef.current = setTimeout(() => {
      loadTimeoutRef.current = null;
      loadTasks();
    }, 250);
    
    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }
    };
  }, [currentView, dayDate, weekDate, monthDate]);

  // Refresh tasks when a task is created/updated/deleted from any view
  useEffect(() => {
    const handler = () => {
      // Force reload to bypass localStorage cache for today
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

  // Notify parent when viewing today changes
  useEffect(() => {
    if (onViewChange) {
      const viewingToday = currentView === "today" || (currentView === "day" && isToday(dayDate));
      const viewDate = currentView === "today" ? normalizeToMidnight(new Date()) : currentView === "day" ? dayDate : undefined;
      onViewChange(viewingToday, currentView, viewDate);
    }
  }, [currentView, dayDate, onViewChange]);

  const loadTasks = async (forceReload = false) => {
    // Increment request ID to mark this as the latest request
    loadRequestIdRef.current += 1;
    const currentRequestId = loadRequestIdRef.current;

    // Mark as loading
    isLoadingRef.current = true;
    setLoading(true);
    try {
      const isDayLikeView = currentView === "day" || currentView === "today";
      const activeDayDate = currentView === "today" ? normalizeToMidnight(new Date()) : dayDate;

      if (isDayLikeView) {
        // Check if viewing today and load from localStorage first (unless forcing reload or page reload)
        if (isToday(activeDayDate) && !forceReload && !isInitialMountRef.current) {
          const storedTasks = getTodayTasksFromStorage();
          
          if (storedTasks) {
            // Load from localStorage
            const mode = await getWorkdayAction(userId, formatDateLocal(activeDayDate));
            // Ignore if a newer request has started
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
        console.log('isInitialMountRef.current', isInitialMountRef.current);

        const { dayData, mode } = await getCalendarDayDataAction({
          userId,
          dateStr: formatDateLocal(activeDayDate),
        });

        if (currentRequestId !== loadRequestIdRef.current) return;

        // Mark initial mount as complete after successful DB load
        isInitialMountRef.current = false;

        if (isToday(activeDayDate)) {
          // Check if this is the first load of the day (no data in localStorage)
          if (getTodayTasksFromStorage() === null) {
            // Check for future task shifts and show alerts
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

        // Show non-invasive alerts for tasks that couldn't be shifted
        if (dayData?.alerts) {
          showTaskShiftAlerts(dayData.alerts);
        }

      } else {
        const anchor = normalizeToMidnight(currentView === "week" ? weekDate : monthDate);
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
      // Ignore errors from stale requests
      if (currentRequestId !== loadRequestIdRef.current) return;
      console.error('Error loading tasks:', error);
    } finally {
      // Only update loading state if this is still the latest request
      if (currentRequestId === loadRequestIdRef.current) {
        isLoadingRef.current = false;
        setLoading(false);
      } else {
        // If this request was superseded, still mark as not loading for this request
        isLoadingRef.current = false;
      }
    }
  };

  // Wrapper for onModeSaved to reload from DB when workMode changes (filters tasks differently)
  const handleModeSaved = async () => {
    // When workMode changes, always reload from DB to apply correct filters
    await loadTasks(true);
  };

  // Wrapper functions to update localStorage when modifying today's tasks
  const handleUpdateTask = async (formData: FormData): Promise<boolean | ModeConflictError> => {
    const result = await onUpdateTask(formData);
    
    // Only reload if task was successfully updated (not a mode conflict)
    const success = result === true;
    
    const isDayLikeView = currentView === "day" || currentView === "today";
    const activeDayDate = currentView === "today" ? normalizeToMidnight(new Date()) : dayDate;

    // If viewing today in day view, reload from DB and update localStorage
    if (success && isDayLikeView && isToday(activeDayDate)) {
      const { dayData, mode } = await getCalendarDayDataAction({
        userId,
        dateStr: formatDateLocal(activeDayDate),
      });
      saveTodayTasksToStorage(dayData);
      setDayTasks(dayData);
      setDayWorkMode(mode);
      
      // Show non-invasive alerts for tasks that couldn't be shifted
      if (dayData?.alerts) {
        showTaskShiftAlerts(dayData.alerts);
      }
    } else if (success && isDayLikeView) {
      // Not today, reload normally
      await loadTasks();
    }
    
    return result;
  };

  const handleDeleteTask = async (id: string): Promise<boolean> => {
    const result = await onDeleteTask(id);
    
    // If viewing today in day view, reload from DB and update localStorage
    const isDayLikeView = currentView === "day" || currentView === "today";
    const activeDayDate = currentView === "today" ? normalizeToMidnight(new Date()) : dayDate;

    if (result && isDayLikeView && isToday(activeDayDate)) {
      const { dayData, mode } = await getCalendarDayDataAction({
        userId,
        dateStr: formatDateLocal(activeDayDate),
      });
      saveTodayTasksToStorage(dayData);
      setDayTasks(dayData);
      setDayWorkMode(mode);
    } else if (result && isDayLikeView) {
      // Not today, reload normally
      await loadTasks();
    }
    
    return result;
  };

  // Navigation functions
  const navigate = (direction: 'prev' | 'next') => {
    if (currentView === "today") {
      return;
    }

    if (currentView === "day") {
      setDayDate(navigateCalendarDate(dayDate, direction, 'day'));
    } else if (currentView === "week") {
      setWeekDate(navigateCalendarDate(weekDate, direction, 'week'));
    } else if (currentView === "month") {
      setMonthDate(navigateCalendarDate(monthDate, direction, 'month'));
    }
  };

  const navigatePrevious = () => navigate('prev');
  const navigateNext = () => navigate('next');

  return (
    <div className="space-y-4">
      <ViewSwitcher value={currentView} onChange={setCurrentView} />

      <div className="rounded-lg border border-border bg-card p-6">
        {(currentView === "day" || currentView === "today") && (
          <DayView
            date={currentView === "today" ? normalizeToMidnight(new Date()) : dayDate}
            loading={loading}
            tasks={dayTasks}
            workMode={dayWorkMode}
            onModeSaved={handleModeSaved}
            onPrev={navigatePrevious}
            onNext={navigateNext}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
            showNavigation={currentView !== "today"}
          />
        )}
        {currentView === "week" && (
          <WeekView
            anchorDate={weekDate}
            tasks={tasks}
            workdays={workdaysMap}
            loading={loading}
            onPrev={navigatePrevious}
            onNext={navigateNext}
            onSaved={loadTasks}
            onUpdateTask={onUpdateTask}
            onDeleteTask={onDeleteTask}
          />
        )}
        {currentView === "month" && (
          <MonthView
            anchorDate={monthDate}
            tasks={tasks}
            workdays={workdaysMap}
            loading={loading}
            onPrev={navigatePrevious}
            onNext={navigateNext}
            onSaved={loadTasks}
            onUpdateTask={onUpdateTask}
            onDeleteTask={onDeleteTask}
          />
        )}
      </div>
    </div>
  );
}
