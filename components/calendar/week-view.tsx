"use client";

import { useEffect, useState } from "react";
import DayCell from "./day-cell";
import CalendarHeader from "./calendar-header";
import { CalendarTask, getTasksForDate } from "@/lib/calendar-utils";
import { setWorkdayForUserAction } from "@/app/actions/workdays";
import { DayTasksDialog } from "./day-tasks-dialog";

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
  const [editing, setEditing] = useState(false);
  const [localWorkdays, setLocalWorkdays] = useState<Record<string, "Présentiel" | "Distanciel" | "Congé">>({});
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (!editing) setLocalWorkdays(workdays);
  }, [workdays, editing]);

  const cycleMode = (mode: "Présentiel" | "Distanciel" | "Congé") => {
    if (mode === 'Présentiel') return 'Distanciel' as const;
    if (mode === 'Distanciel') return 'Congé' as const;
    return 'Présentiel' as const;
  };

  const handleDayClick = (dateObj: Date) => {
    if (editing) {
      const iso = dateObj.toISOString().split('T')[0];
      const current = (localWorkdays[iso] ?? 'Présentiel');
      const next = cycleMode(current);
      setLocalWorkdays((prev: Record<string, "Présentiel" | "Distanciel" | "Congé">) => ({ ...prev, [iso]: next }));
    } else {
      setSelectedDate(dateObj);
      setDialogOpen(true);
    }
  };

  const handleStartEdit = () => {
    setLocalWorkdays(workdays);
    setEditing(true);
  };

  const handleCancel = () => {
    setLocalWorkdays(workdays);
    setEditing(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const promises: Promise<boolean>[] = [];
      for (const [iso, to] of Object.entries(localWorkdays)) {
        const from = workdays[iso] ?? 'Présentiel';
        if (from !== to) {
          promises.push(setWorkdayForUserAction(new Date(iso), to));
        }
      }
      await Promise.all(promises);
      // Notify parent to reload data so UI reflects latest workdays
      onSaved();
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };
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
          const iso = dayDate.toISOString().split('T')[0];
          const mode = (editing ? localWorkdays[iso] : workdays[iso]) ?? 'Présentiel';
          const dayTasks = mode === 'Congé'
            ? []
            : dayTasksAll.filter(t => (mode === 'Distanciel' ? t.is_remote === true : t.is_remote === false));

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
      {selectedDate && (() => {
        const iso = selectedDate.toISOString().split('T')[0];
        const mode = (workdays[iso] ?? 'Présentiel');
        const dayTasksAll = getTasksForDate(tasks, selectedDate);
        const dayTasks = mode === 'Congé'
          ? []
          : dayTasksAll.filter(t => (mode === 'Distanciel' ? t.is_remote === true : t.is_remote === false));
        return (
          <DayTasksDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            date={selectedDate}
            tasks={dayTasks}
            workMode={mode}
            onUpdateTask={onUpdateTask}
            onDeleteTask={onDeleteTask}
            onSaved={onSaved}
          />
        );
      })()}
    </div>
  );
}

export default WeekView;


