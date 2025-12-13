'use client';

import { useState, useEffect } from 'react';
import DayView from '@/components/calendar/views/day-view';
import ViewSwitcher from '@/components/calendar/ui/view-switcher';
import WeekView from '@/components/calendar/views/week-view';
import MonthView from '@/components/calendar/views/month-view';
import { navigateCalendarDate, type CalendarView } from '@/lib/calendar/calendar-navigation';
import { normalizeToMidnight } from '@/lib/utils';
import { isToday } from '@/lib/storage/localStorage-tasks';
import type { ModeConflictError } from '@/app/actions/tasks';
import { useCalendarData } from '@/lib/hooks/calendar/use-calendar-data';
import { useCalendarHandlers } from '@/lib/hooks/calendar/use-calendar-handlers';
import type { DayTasksData } from '@/components/calendar/views/day-view';

export function Calendar({
  userId,
  initialDayData,
  initialWorkMode,
  initialDayDate,
  onUpdateTask,
  onDeleteTask,
  onViewChange,
}: {
  userId: string;
  initialDayData?: DayTasksData;
  initialWorkMode?: 'Présentiel' | 'Distanciel' | 'Congé';
  initialDayDate?: Date;
  onUpdateTask: (formData: FormData) => Promise<boolean | ModeConflictError>;
  onDeleteTask: (id: string) => Promise<boolean>;
  onViewChange?: (isViewingToday: boolean, currentView: CalendarView, dayDate?: Date) => void;
}) {
  const [currentView, setCurrentView] = useState<CalendarView>('day');
  // Independent anchors per view (normalized to midnight local time to avoid timezone issues)
  const [dayDate, setDayDate] = useState<Date>(() => normalizeToMidnight(new Date()));
  const [weekDate, setWeekDate] = useState<Date>(() => normalizeToMidnight(new Date()));
  const [monthDate, setMonthDate] = useState<Date>(() => normalizeToMidnight(new Date()));

  const {
    tasks,
    dayTasks,
    loading,
    dayWorkMode,
    workdaysMap,
    loadTasks,
    setDayTasks,
    setDayWorkMode,
  } = useCalendarData({
    userId,
    currentView,
    dayDate,
    weekDate,
    monthDate,
    initialDayData,
    initialWorkMode,
    initialDayDate,
  });

  // Notify parent when viewing today changes
  useEffect(() => {
    if (onViewChange) {
      const viewingToday = currentView === 'today' || (currentView === 'day' && isToday(dayDate));
      const viewDate =
        currentView === 'today'
          ? normalizeToMidnight(new Date())
          : currentView === 'day'
            ? dayDate
            : undefined;
      onViewChange(viewingToday, currentView, viewDate);
    }
  }, [currentView, dayDate, onViewChange]);

  const { handleModeSaved, handleUpdateTask, handleDeleteTask } = useCalendarHandlers({
    userId,
    currentView,
    dayDate,
    loadTasks,
    setDayTasks,
    setDayWorkMode,
    onUpdateTask,
    onDeleteTask,
  });

  // Navigation functions
  const navigate = (direction: 'prev' | 'next') => {
    if (currentView === 'today') {
      return;
    }

    if (currentView === 'day') {
      setDayDate(navigateCalendarDate(dayDate, direction, 'day'));
    } else if (currentView === 'week') {
      setWeekDate(navigateCalendarDate(weekDate, direction, 'week'));
    } else if (currentView === 'month') {
      setMonthDate(navigateCalendarDate(monthDate, direction, 'month'));
    }
  };

  const navigatePrevious = () => navigate('prev');
  const navigateNext = () => navigate('next');

  return (
    <div className="space-y-4">
      <ViewSwitcher value={currentView} onChange={setCurrentView} />

      <div className="rounded-lg border border-border bg-card p-6">
        {(currentView === 'day' || currentView === 'today') && (
          <DayView
            date={currentView === 'today' ? normalizeToMidnight(new Date()) : dayDate}
            loading={loading}
            tasks={dayTasks}
            workMode={dayWorkMode}
            onModeSaved={handleModeSaved}
            onPrev={navigatePrevious}
            onNext={navigateNext}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
            showNavigation={currentView !== 'today'}
          />
        )}
        {currentView === 'week' && (
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
        {currentView === 'month' && (
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
