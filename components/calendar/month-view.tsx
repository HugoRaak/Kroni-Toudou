"use client";

import DayCell from "./day-cell";
import CalendarHeader from "./calendar-header";
import { CalendarTask, getTasksForDate, filterTasksByWorkMode } from "@/lib/calendar-utils";
import { DayTasksDialog } from "./day-tasks-dialog";
import { formatDateLocal } from "@/lib/utils";
import { useWorkdaysEditor } from "@/lib/hooks/use-workdays-editor";

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
  } = useWorkdaysEditor(workdays, onSaved, () => {
    // Get dates to save for month view (42 days grid)
    const firstDay = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay() + 1);
    const dates: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      dates.push(d);
    }
    return dates;
  });
  const year = anchorDate.getFullYear();
  const month = anchorDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay() + 1);

  const monthDates = (() => {
    const dates: { date: number; month: number; year: number; isCurrentMonth: boolean; isToday: boolean }[] = [];
    const dateIterator = new Date(startDate);
    const today = new Date();
    for (let i = 0; i < 42; i++) {
      dates.push({
        date: dateIterator.getDate(),
        month: dateIterator.getMonth(),
        year: dateIterator.getFullYear(),
        isCurrentMonth: dateIterator.getMonth() === month,
        isToday: dateIterator.toDateString() === today.toDateString(),
      });
      dateIterator.setDate(dateIterator.getDate() + 1);
    }
    return dates;
  })();

  const monthName = anchorDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

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
        {["L", "M", "M", "J", "V", "S", "D"].map((day, index) => (
          <div key={index} className="p-2 text-center text-sm font-medium text-muted-foreground">
            {loading ? <div className="mx-auto h-3 w-6 rounded bg-accent animate-pulse" /> : day}
          </div>
        ))}
        {monthDates.map((date, index) => {
          const dayDateObj = new Date(date.year, date.month, date.date);
          const dayTasksAll = getTasksForDate(tasks, dayDateObj);
          const iso = formatDateLocal(dayDateObj);
          const mode = (editing ? localWorkdays[iso] : workdays[iso]) ?? 'Présentiel';
          const dayTasks = filterTasksByWorkMode(dayTasksAll, mode);
          return (
            <div key={index} onClick={() => handleDayClick(dayDateObj)}>
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
              />
            </div>
          );
        })}
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
    </div>
  );
}

export default MonthView;


