"use client";

import { useState, useEffect } from "react";
import DayView, { DayTasksData } from "@/components/calendar/views/day-view";
import ViewSwitcher from "@/components/calendar/ui/view-switcher";
import { CalendarTask } from "@/lib/calendar/calendar-utils";
import WeekView from "@/components/calendar/views/week-view";
import MonthView from "@/components/calendar/views/month-view";
import { getTasksForDayAction, getTasksForDateRangeAction } from "@/app/actions/tasks";
import { getWorkdayAction, getWorkdaysForRangeAction } from "@/app/actions/workdays";
import { getTodayTasksFromStorage, saveTodayTasksToStorage, isToday } from "@/lib/storage/localStorage-tasks";
import { navigateCalendarDate, type CalendarView } from "@/lib/calendar/calendar-navigation";
import { getWeekDateRange } from "@/lib/calendar/calendar-date-utils";

export function Calendar({ 
  userId, 
  onUpdateTask, 
  onDeleteTask,
  onViewChange
}: { 
  userId: string;
  onUpdateTask: (formData: FormData) => Promise<boolean>;
  onDeleteTask: (id: string) => Promise<boolean>;
  onViewChange?: (isViewingToday: boolean, currentView: CalendarView, dayDate?: Date) => void;
}) {
  const [currentView, setCurrentView] = useState<CalendarView>("day");
  // Independent anchors per view
  const [dayDate, setDayDate] = useState<Date>(new Date());
  const [weekDate, setWeekDate] = useState<Date>(new Date());
  const [monthDate, setMonthDate] = useState<Date>(new Date());
  const [tasks, setTasks] = useState<CalendarTask[]>([]);
  const [dayTasks, setDayTasks] = useState<DayTasksData>(null);
  const [loading, setLoading] = useState(true);
  const [dayWorkMode, setDayWorkMode] = useState<"Présentiel" | "Distanciel" | "Congé">("Présentiel");
  const [workdaysMap, setWorkdaysMap] = useState<Record<string, "Présentiel" | "Distanciel" | "Congé">>({});

  useEffect(() => {
    loadTasks();
  }, [currentView, dayDate, weekDate, monthDate]);

  // Refresh tasks when a task is created via the floating button
  useEffect(() => {
    const handler = () => {
      // Force reload to bypass localStorage cache for today
      loadTasks(true);
    };
    window.addEventListener('task-created', handler);
    return () => window.removeEventListener('task-created', handler);
  }, [dayDate, weekDate, monthDate, currentView]);

  // Notify parent when viewing today changes
  useEffect(() => {
    if (onViewChange) {
      const viewingToday = currentView === "day" && isToday(dayDate);
      onViewChange(viewingToday, currentView, currentView === "day" ? dayDate : undefined);
    }
  }, [currentView, dayDate, onViewChange]);

  const loadTasks = async (forceReload = false) => {
    setLoading(true);
    try {
      if (currentView === "day") {
        // Check if viewing today and load from localStorage first (unless forcing reload)
        if (isToday(dayDate) && !forceReload) {
          const storedTasks = getTodayTasksFromStorage();
          
          if (storedTasks) {
            // Load from localStorage
            const mode = await getWorkdayAction(userId, dayDate);
            setDayTasks(storedTasks);
            setDayWorkMode(mode);
            setLoading(false);
            return;
          }
        }
        
        // Load from DB (for today, when no localStorage or forceReload; for other days, always)
        if (isToday(dayDate)) {
          // Today: load from DB and save to localStorage
          const [dayData, mode] = await Promise.all([
            getTasksForDayAction(userId, dayDate),
            getWorkdayAction(userId, dayDate),
          ]);
          saveTodayTasksToStorage(dayData);
          setDayTasks(dayData);
          setDayWorkMode(mode);
        } else {
          // Not today, load normally from DB
          const [dayData, mode] = await Promise.all([
            getTasksForDayAction(userId, dayDate),
            getWorkdayAction(userId, dayDate),
          ]);
          setDayTasks(dayData);
          setDayWorkMode(mode);
        }
      } else {
        const anchor = currentView === "week" ? weekDate : monthDate;
        let startDate: Date;
        let endDate: Date;

        if (currentView === "week") {
          const range = getWeekDateRange(anchor);
          startDate = range.start;
          endDate = range.end;
        } else if (currentView === "month") {
          startDate = new Date(anchor.getFullYear(), anchor.getMonth(), 1); // Premier du mois
          endDate = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0); // Dernier du mois
        } else {
          startDate = new Date(anchor);
          endDate = new Date(anchor);
        }

        const [tasksData, workdays] = await Promise.all([
          getTasksForDateRangeAction(userId, startDate, endDate),
          getWorkdaysForRangeAction(userId, startDate, endDate),
        ]);
        setTasks(tasksData);
        setWorkdaysMap(workdays);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  // Wrapper for onModeSaved to reload from DB when workMode changes (filters tasks differently)
  const handleModeSaved = async () => {
    // When workMode changes, always reload from DB to apply correct filters
    await loadTasks(true);
  };

  // Wrapper functions to update localStorage when modifying today's tasks
  const handleUpdateTask = async (formData: FormData): Promise<boolean> => {
    const result = await onUpdateTask(formData);
    
    // If viewing today in day view, reload from DB and update localStorage
    if (result && currentView === "day" && isToday(dayDate)) {
      const [dayData, mode] = await Promise.all([
        getTasksForDayAction(userId, dayDate),
        getWorkdayAction(userId, dayDate),
      ]);
      saveTodayTasksToStorage(dayData);
      setDayTasks(dayData);
      setDayWorkMode(mode);
    } else if (result && currentView === "day") {
      // Not today, reload normally
      await loadTasks();
    }
    
    return result;
  };

  const handleDeleteTask = async (id: string): Promise<boolean> => {
    const result = await onDeleteTask(id);
    
    // If viewing today in day view, reload from DB and update localStorage
    if (result && currentView === "day" && isToday(dayDate)) {
      const [dayData, mode] = await Promise.all([
        getTasksForDayAction(userId, dayDate),
        getWorkdayAction(userId, dayDate),
      ]);
      saveTodayTasksToStorage(dayData);
      setDayTasks(dayData);
      setDayWorkMode(mode);
    } else if (result && currentView === "day") {
      // Not today, reload normally
      await loadTasks();
    }
    
    return result;
  };

  // Navigation functions
  const navigate = (direction: 'prev' | 'next') => {
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
        {currentView === "day" && (
          <DayView
            date={dayDate}
            loading={loading}
            tasks={dayTasks}
            workMode={dayWorkMode}
            onModeSaved={handleModeSaved}
            onPrev={navigatePrevious}
            onNext={navigateNext}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
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
