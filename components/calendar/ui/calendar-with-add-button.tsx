'use client';

import { useState, useCallback } from 'react';
import { Calendar } from '@/components/calendar/views/calendar';
import { FloatingAddButton } from '@/components/tasks/ui/floating-add-button';
import type { CalendarView } from '@/lib/calendar/calendar-navigation';
import type { ModeConflictError, TaskActionResult } from '@/app/actions/tasks';
import type { DayTasksData } from '@/components/calendar/views/day-view';

interface CalendarWithAddButtonProps {
  userId: string;
  initialDayData?: DayTasksData;
  initialWorkMode?: 'Présentiel' | 'Distanciel' | 'Congé';
  initialDayDate?: Date;
  onUpdateTask: (formData: FormData) => Promise<boolean | ModeConflictError>;
  onDeleteTask: (id: string) => Promise<boolean>;
  onSubmit: (formData: FormData) => Promise<TaskActionResult>;
}

export function CalendarWithAddButton({
  userId,
  initialDayData,
  initialWorkMode,
  initialDayDate,
  onUpdateTask,
  onDeleteTask,
  onSubmit,
}: CalendarWithAddButtonProps) {
  const [isViewingToday, setIsViewingToday] = useState(false);
  const [currentView, setCurrentView] = useState<CalendarView>('day');
  const [dayDate, setDayDate] = useState<Date | undefined>(undefined);

  const handleViewChange = useCallback((viewingToday: boolean, view: CalendarView, date?: Date) => {
    setIsViewingToday(viewingToday);
    setCurrentView(view);
    setDayDate((previous) => {
      if (!date) {
        return previous;
      }

      if (!previous) {
        return date;
      }

      return previous.getTime() === date.getTime() ? previous : date;
    });
  }, []);

  return (
    <>
      <Calendar
        userId={userId}
        initialDayData={initialDayData}
        initialWorkMode={initialWorkMode}
        initialDayDate={initialDayDate}
        onUpdateTask={onUpdateTask}
        onDeleteTask={onDeleteTask}
        onViewChange={handleViewChange}
      />
      <FloatingAddButton
        userId={userId}
        onSubmit={onSubmit}
        isViewingToday={isViewingToday}
        currentView={currentView}
        dayDate={dayDate}
      />
    </>
  );
}
