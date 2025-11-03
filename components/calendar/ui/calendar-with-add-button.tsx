"use client";

import { useState } from "react";
import { Calendar } from "@/components/calendar/views/calendar";
import { FloatingAddButton } from "@/components/tasks/floating-add-button";

interface CalendarWithAddButtonProps {
  userId: string;
  onUpdateTask: (formData: FormData) => Promise<boolean>;
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

  return (
    <>
      <Calendar
        userId={userId}
        onUpdateTask={onUpdateTask}
        onDeleteTask={onDeleteTask}
        onViewChange={setIsViewingToday}
      />
      <FloatingAddButton
        userId={userId}
        onSubmit={onSubmit}
        isViewingToday={isViewingToday}
      />
    </>
  );
}
