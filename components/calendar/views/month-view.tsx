"use client";

import DayCell from "@/components/calendar/ui/day-cell";
import CalendarHeader from "@/components/calendar/ui/calendar-header";
import { CalendarTask, getTasksForDate, filterTasksByWorkMode } from "@/lib/calendar/calendar-utils";
import { DayTasksDialog } from "@/components/calendar/dialogs/day-tasks-dialog";
import { formatDateLocal, normalizeToMidnight, isPastDate } from "@/lib/utils";
import { useWorkdaysEditor } from "@/lib/hooks/use-workdays-editor";
import { getMonthGridDates, getMonthGridDatesArray } from "@/lib/calendar/calendar-date-utils";
import { useMemo, useCallback, memo } from "react";
import { WorkModeConflictDialog } from "@/components/calendar/workmode-conflict-dialog";

// Constants extracted outside component
const WEEK_DAYS = ["L", "M", "M", "J", "V", "S", "D"] as const;

// Memoized wrapper component for DayCell to avoid unnecessary rerenders
const DayCellWrapper = memo(({
  date,
  tasks,
  workdays,
  localWorkdays,
  editing,
  loading,
  onDayClick,
}: {
  date: { year: number; month: number; date: number; isToday: boolean; isCurrentMonth: boolean };
  tasks: CalendarTask[];
  workdays: Record<string, "Présentiel" | "Distanciel" | "Congé">;
  localWorkdays: Record<string, "Présentiel" | "Distanciel" | "Congé">;
  editing: boolean;
  loading: boolean;
  onDayClick: (date: Date) => void;
}) => {
  const dayDateObj = useMemo(
    () => normalizeToMidnight(new Date(date.year, date.month, date.date)),
    [date.year, date.month, date.date]
  );
  const dayTasksAll = useMemo(
    () => getTasksForDate(tasks, dayDateObj),
    [tasks, dayDateObj]
  );
  const iso = useMemo(() => formatDateLocal(dayDateObj), [dayDateObj]);
  const mode = useMemo(
    () => (editing ? localWorkdays[iso] : workdays[iso]) ?? 'Présentiel',
    [editing, localWorkdays, workdays, iso]
  );
  const dayTasks = useMemo(
    () => filterTasksByWorkMode(dayTasksAll, mode),
    [dayTasksAll, mode]
  );
  
  const isPast = useMemo(() => isPastDate(dayDateObj), [dayDateObj]);
  
  const handleClick = useCallback(() => {
    // Only prevent clicks when editing past dates; allow viewing past dates
    if (editing && isPast) {
      return;
    }
    onDayClick(dayDateObj);
  }, [onDayClick, dayDateObj, isPast, editing]);

  return (
    <div onClick={handleClick}>
      <DayCell
        titleMain={date.date}
        mode={mode}
        loading={loading}
        editing={editing}
        isToday={date.isToday}
        isCurrentMonth={date.isCurrentMonth}
        tasks={dayTasks}
        taskLimit={2}
        minContentHeight={50}
        disabled={editing && isPast}
      />
    </div>
  );
});

DayCellWrapper.displayName = "DayCellWrapper";

export function MonthView({
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
  const getDatesToSave = useCallback(() => getMonthGridDatesArray(anchorDate), [anchorDate]);
  
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
    currentConflictIndex,
    totalConflicts,
    userId,
    handleDateChange,
    handleConfirmAnyway,
    handleCancelConflict,
    handleConflictResolved,
  } = useWorkdaysEditor(workdays, onSaved, getDatesToSave);
  
  const monthDates = useMemo(() => getMonthGridDates(anchorDate), [anchorDate]);

  const monthName = useMemo(() => {
    const monthStr = anchorDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    // Capitalize first letter of month name
    return monthStr.charAt(0).toUpperCase() + monthStr.slice(1);
  }, [anchorDate]);

  return (
    <div className="space-y-4">
      <CalendarHeader
        title={monthName}
        loading={loading}
        editing={editing}
        saving={saving}
        onPrev={onPrev}
        onNext={onNext}
        onStartEdit={handleStartEdit}
        onCancel={handleCancel}
        onSave={handleSave}
      />
      <div className="grid grid-cols-7 gap-1">
        {WEEK_DAYS.map((day, index) => (
          <div key={index} className="p-2 text-center text-sm font-medium text-muted-foreground">
            {loading ? <div className="mx-auto h-3 w-6 rounded bg-accent animate-pulse" /> : day}
          </div>
        ))}
        {monthDates.map((date, index) => (
          <DayCellWrapper
            key={`${date.year}-${date.month}-${date.date}`}
            date={date}
            tasks={tasks}
            workdays={workdays}
            localWorkdays={localWorkdays}
            editing={editing}
            loading={loading}
            onDayClick={handleDayClick}
          />
        ))}
      </div>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-pink-300" /> Présentiel</div>
        <div className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" /> Distanciel</div>
        <div className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Congé</div>
      </div>
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
      {modeConflict && userId && (
        <WorkModeConflictDialog
          open={!!modeConflict}
          onOpenChange={(open) => !open && handleCancelConflict()}
          conflict={modeConflict.conflict}
          userId={userId}
          onDateChange={handleDateChange}
          onCancel={handleCancelConflict}
          onConfirm={handleConfirmAnyway}
          onConflictResolved={handleConflictResolved}
          conflictIndex={currentConflictIndex}
          totalConflicts={totalConflicts}
        />
      )}
    </div>
  );
}

export default MonthView;


