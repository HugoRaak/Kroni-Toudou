"use client";

import { useEffect, useState } from "react";
import DayCell from "./day-cell";
import CalendarHeader from "./calendar-header";
import { CalendarTask, getTasksForDate } from "@/lib/calendar-utils";
import { setWorkdayForUserAction } from "@/app/actions/workdays";
import { DayTasksDialog } from "./day-tasks-dialog";

export function MonthView({
  anchorDate,
  tasks,
  workdays,
  loading,
  onPrev,
  onNext,
  onSaved,
}: {
  anchorDate: Date;
  tasks: CalendarTask[];
  workdays: Record<string, "Présentiel" | "Distanciel" | "Congé">;
  loading: boolean;
  onPrev: () => void;
  onNext: () => void;
  onSaved: () => void;
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
      const firstDay = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
      const startDate = new Date(firstDay);
      startDate.setDate(startDate.getDate() - firstDay.getDay() + 1);
      const promises: Promise<boolean>[] = [];
      for (let i = 0; i < 42; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        const iso = d.toISOString().split('T')[0];
        const from = workdays[iso] ?? 'Présentiel';
        const to = localWorkdays[iso] ?? 'Présentiel';
        if (from !== to) {
          promises.push(setWorkdayForUserAction(d, to));
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
          const iso = dayDateObj.toISOString().split('T')[0];
          const mode = (editing ? localWorkdays[iso] : workdays[iso]) ?? 'Présentiel';
          const dayTasks = mode === 'Congé'
            ? []
            : dayTasksAll.filter(t => (mode === 'Distanciel' ? t.is_remote === true : t.is_remote === false));
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
        <div className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Présentiel</div>
        <div className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" /> Distanciel</div>
        <div className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> Congé</div>
      </div>
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
          />
        );
      })()}
    </div>
  );
}

export default MonthView;


