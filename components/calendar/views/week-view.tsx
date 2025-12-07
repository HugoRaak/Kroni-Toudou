"use client";

import DayCell from "@/components/calendar/ui/day-cell";
import CalendarHeader from "@/components/calendar/ui/calendar-header";
import { CalendarTask, getTasksForDate, filterTasksByWorkMode } from "@/lib/calendar/calendar-utils";
import { formatDateLocal, normalizeToMidnight, isPastDate } from "@/lib/utils";
import { useWorkdaysEditor } from "@/lib/hooks/workdays/use-workdays-editor";
import { getWeekDateRange } from "@/lib/calendar/calendar-date-utils";
import { useMemo, memo, useCallback } from "react";
import type { ModeConflictError } from "@/app/actions/tasks";
import { WorkModeLegend } from "@/components/calendar/ui/workmode-legend";
import { CalendarDialogs } from "@/components/calendar/ui/calendar-dialogs";

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

  const isPast = useMemo(() => isPastDate(dayDate), [dayDate]);
  
  const handleClick = useCallback(() => {
    // Only prevent clicks when editing past dates; allow viewing past dates
    if (editing && isPast) {
      return;
    }
    onDayClick(dayDate);
  }, [onDayClick, dayDate, isPast, editing]);

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
        disabled={editing && isPast}
      />
    </div>
  );
});

WeekDayCellWrapper.displayName = "WeekDayCellWrapper";

function WeekView({
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
  onUpdateTask: (formData: FormData) => Promise<boolean | ModeConflictError>;
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
    modeConflict,
    modeConflicts,
    currentConflictIndex,
    totalConflicts,
    userId,
    handleDateChange,
    handleConfirmAnyway,
    handleCancelConflict,
    handleConflictResolved,
  } = useWorkdaysEditor(workdays, onSaved);
  
  const { start: startOfWeek, end: endOfWeek } = useMemo(
    () => getWeekDateRange(anchorDate),
    [anchorDate]
  );

  const weekDates = useMemo(() => {
    const today = normalizeToMidnight(new Date());
    const todayStr = formatDateLocal(today);
    const normalizedStart = normalizeToMidnight(startOfWeek);
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(normalizedStart.getFullYear(), normalizedStart.getMonth(), normalizedStart.getDate() + i);
      return {
        date: date.getDate(),
        dayName: date.toLocaleDateString("fr-FR", { weekday: "short" }),
        isToday: formatDateLocal(date) === todayStr,
        dateObj: date,
      };
    });
  }, [startOfWeek]);

  const subtitle = useMemo(() => {
    const startMonth = startOfWeek.toLocaleDateString("fr-FR", { month: "short" });
    const endMonth = endOfWeek.toLocaleDateString("fr-FR", { month: "short" });
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
      <WorkModeLegend loading={loading} />
      <CalendarDialogs
        selectedDate={selectedDate}
        dialogOpen={dialogOpen}
        setDialogOpen={setDialogOpen}
        tasks={tasks}
        workdays={workdays}
        onUpdateTask={onUpdateTask}
        onDeleteTask={onDeleteTask}
        onSaved={onSaved}
        modeConflict={modeConflict}
        modeConflicts={modeConflicts}
        userId={userId}
        currentConflictIndex={currentConflictIndex}
        totalConflicts={totalConflicts}
        handleDateChange={handleDateChange}
        handleCancelConflict={handleCancelConflict}
        handleConfirmAnyway={handleConfirmAnyway}
        handleConflictResolved={handleConflictResolved}
      />
    </div>
  );
}

export default WeekView;


