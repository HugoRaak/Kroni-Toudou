"use client";

import DayCell from "@/components/calendar/ui/day-cell";
import CalendarHeader from "@/components/calendar/ui/calendar-header";
import { CalendarTask, getTasksForDate, filterTasksByWorkMode } from "@/lib/calendar/calendar-utils";
import { DayTasksDialog } from "@/components/calendar/dialogs/day-tasks-dialog";
import { formatDateLocal } from "@/lib/utils";
import { useWorkdaysEditor } from "@/lib/hooks/use-workdays-editor";
import { getMonthGridDates, getMonthGridDatesArray } from "@/lib/calendar/calendar-date-utils";

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
  } = useWorkdaysEditor(workdays, onSaved, () => getMonthGridDatesArray(anchorDate));
  
  const monthDates = getMonthGridDates(anchorDate);

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


