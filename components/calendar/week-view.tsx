"use client";

import DayCell from "./day-cell";
import CalendarHeader from "./calendar-header";
import { CalendarTask, getTasksForDate, filterTasksByWorkMode } from "@/lib/calendar-utils";
import { DayTasksDialog } from "./day-tasks-dialog";
import { formatDateLocal } from "@/lib/utils";
import { useWorkdaysEditor } from "@/lib/hooks/use-workdays-editor";

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
  const startOfWeek = new Date(anchorDate);
  startOfWeek.setDate(anchorDate.getDate() - anchorDate.getDay() + 1);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  const weekDates = (() => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      return {
        date: date.getDate(),
        dayName: date.toLocaleDateString("fr-FR", { weekday: "short" }),
        isToday: date.toDateString() === today.toDateString(),
      };
    });
  })();

  return (
    <div className="space-y-4">
      <CalendarHeader
        title={"Semaine"}
        subtitle={`${startOfWeek.getDate()} ${startOfWeek.toLocaleDateString("fr-FR", { month: "long" }).slice(0, 3)} - ${endOfWeek.getDate()} ${endOfWeek.toLocaleDateString("fr-FR", { month: "long" }).slice(0, 3)} ${endOfWeek.getFullYear()}`}
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
        {weekDates.map((day, index) => {
          const dayDate = new Date(startOfWeek);
          dayDate.setDate(startOfWeek.getDate() + index);
          const dayTasksAll = getTasksForDate(tasks, dayDate);
          const iso = formatDateLocal(dayDate);
          const mode = (editing ? localWorkdays[iso] : workdays[iso]) ?? 'Présentiel';
          const dayTasks = filterTasksByWorkMode(dayTasksAll, mode);

          return (
            <div key={index} onClick={() => handleDayClick(dayDate)}>
              <DayCell
                titleTop={day.dayName}
                titleMain={day.date}
                mode={mode}
                loading={loading}
                editing={editing}
                isToday={day.isToday}
                isCurrentMonth={true}
                tasks={dayTasks}
                taskLimit={3}
                minContentHeight={60}
              />
            </div>
          );
        })}
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


