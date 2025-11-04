"use client";

import DayCell from "@/components/calendar/ui/day-cell";
import CalendarHeader from "@/components/calendar/ui/calendar-header";
import { CalendarTask, getTasksForDate, filterTasksByWorkMode } from "@/lib/calendar/calendar-utils";
import { DayTasksDialog } from "@/components/calendar/dialogs/day-tasks-dialog";
import { formatDateLocal } from "@/lib/utils";
import { useWorkdaysEditor } from "@/lib/hooks/use-workdays-editor";
import { getWeekDateRange } from "@/lib/calendar/calendar-date-utils";
import { useMemo, memo, useCallback } from "react";

// Memoized wrapper component for DayCell in week view
const WeekDayCellWrapper = memo(({
  dayDate,
  dayName,
  dayNumber,
  isToday,
  tasks,
  workdays,
  localWorkdays,
  editing,
  loading,
  onDayClick,
}: {
  dayDate: Date;
  dayName: string;
  dayNumber: number;
  isToday: boolean;
  tasks: CalendarTask[];
  workdays: Record<string, "Présentiel" | "Distanciel" | "Congé">;
  localWorkdays: Record<string, "Présentiel" | "Distanciel" | "Congé">;
  editing: boolean;
  loading: boolean;
  onDayClick: (date: Date) => void;
}) => {
  const dayTasksAll = useMemo(
    () => getTasksForDate(tasks, dayDate),
    [tasks, dayDate]
  );
  const iso = useMemo(() => formatDateLocal(dayDate), [dayDate]);
  const mode = useMemo(
    () => (editing ? localWorkdays[iso] : workdays[iso]) ?? 'Présentiel',
    [editing, localWorkdays, workdays, iso]
  );
  const dayTasks = useMemo(
    () => filterTasksByWorkMode(dayTasksAll, mode),
    [dayTasksAll, mode]
  );

  const handleClick = useCallback(() => {
    onDayClick(dayDate);
  }, [onDayClick, dayDate]);

  return (
    <div onClick={handleClick}>
      <DayCell
        titleTop={dayName}
        titleMain={dayNumber}
        mode={mode}
        loading={loading}
        editing={editing}
        isToday={isToday}
        isCurrentMonth={true}
        tasks={dayTasks}
        taskLimit={3}
        minContentHeight={60}
      />
    </div>
  );
});

WeekDayCellWrapper.displayName = "WeekDayCellWrapper";

export function WeekView({
  anchorDate,
  tasks,
  workdays,
  loading,
  onPrev,
  onNext,
  onSaved,
  onUpdateTask,
  onDeleteTask,
}: {
  anchorDate: Date;
  tasks: CalendarTask[];
  workdays: Record<string, "Présentiel" | "Distanciel" | "Congé">;
  loading: boolean;
  onPrev: () => void;
  onNext: () => void;
  onSaved: () => void;
  onUpdateTask: (formData: FormData) => Promise<boolean>;
  onDeleteTask: (id: string) => Promise<boolean>;
}) {
  const {
    editing,
    localWorkdays,
    saving,
    selectedDate,
    dialogOpen,
    setSelectedDate,
    setDialogOpen,
    handleDayClick,
    handleStartEdit,
    handleCancel,
    handleSave,
  } = useWorkdaysEditor(workdays, onSaved);
  
  const { start: startOfWeek, end: endOfWeek } = useMemo(
    () => getWeekDateRange(anchorDate),
    [anchorDate]
  );

  const weekDates = useMemo(() => {
    const today = new Date();
    const todayStr = formatDateLocal(today);
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      return {
        date: date.getDate(),
        dayName: date.toLocaleDateString("fr-FR", { weekday: "short" }),
        isToday: formatDateLocal(date) === todayStr,
        dateObj: date,
      };
    });
  }, [startOfWeek]);

  const subtitle = useMemo(() => {
    const startMonth = startOfWeek.toLocaleDateString("fr-FR", { month: "long" });
    const endMonth = endOfWeek.toLocaleDateString("fr-FR", { month: "long" });
    // Capitalize first letter of month names
    const startMonthCap = startMonth.charAt(0).toUpperCase() + startMonth.slice(1);
    const endMonthCap = endMonth.charAt(0).toUpperCase() + endMonth.slice(1);
    return `${startOfWeek.getDate()} ${startMonthCap} - ${endOfWeek.getDate()} ${endMonthCap} ${endOfWeek.getFullYear()}`;
  }, [startOfWeek, endOfWeek]);

  return (
    <div className="space-y-4">
      <CalendarHeader
        title={"Semaine"}
        subtitle={subtitle}
        loading={loading}
        editing={editing}
        saving={saving}
        onPrev={onPrev}
        onNext={onNext}
        onStartEdit={handleStartEdit}
        onCancel={handleCancel}
        onSave={handleSave}
      />
      <div className="grid grid-cols-7 gap-2">
        {weekDates.map((day, index) => (
          <WeekDayCellWrapper
            key={`${day.dateObj.getTime()}`}
            dayDate={day.dateObj}
            dayName={day.dayName}
            dayNumber={day.date}
            isToday={day.isToday}
            tasks={tasks}
            workdays={workdays}
            localWorkdays={localWorkdays}
            editing={editing}
            loading={loading}
            onDayClick={handleDayClick}
          />
        ))}
      </div>
      {!loading && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-pink-300" /> Présentiel</div>
          <div className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" /> Distanciel</div>
          <div className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Congé</div>
        </div>
      )}
      {selectedDate && (
        <DayTasksDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          date={selectedDate}
          tasks={filterTasksByWorkMode(getTasksForDate(tasks, selectedDate), workdays[formatDateLocal(selectedDate)] ?? 'Présentiel')}
          workMode={workdays[formatDateLocal(selectedDate)] ?? 'Présentiel'}
          onUpdateTask={onUpdateTask}
          onDeleteTask={onDeleteTask}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}

export default WeekView;


