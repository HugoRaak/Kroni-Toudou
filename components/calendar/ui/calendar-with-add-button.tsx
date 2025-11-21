"use client";

import { useState, useCallback } from "react";
import { Calendar } from "@/components/calendar/views/calendar";
import { FloatingAddButton } from "@/components/tasks/floating-add-button";
import type { CalendarView } from "@/lib/calendar/calendar-navigation";
import type { ModeConflictError } from "@/app/actions/tasks";

interface CalendarWithAddButtonProps {
  userId: string;
  onUpdateTask: (formData: FormData) => Promise<boolean | ModeConflictError>;
  onDeleteTask: (id: string) => Promise<boolean>;
  onSubmit: (formData: FormData) => Promise<any>;
}

export function CalendarWithAddButton({
  userId,
  onUpdateTask,
  onDeleteTask,
  onSubmit,
}: CalendarWithAddButtonProps) {
  const [isViewingToday, setIsViewingToday] = useState(false);
  const [currentView, setCurrentView] = useState<CalendarView>("day");
  const [dayDate, setDayDate] = useState<Date | undefined>(undefined);

  const handleViewChange = useCallback(
    (viewingToday: boolean, view: CalendarView, date?: Date) => {
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
    },
    [],
  );

  return (
    <>
      <Calendar
        userId={userId}
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
