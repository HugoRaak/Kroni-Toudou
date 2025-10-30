"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CalendarTask, getTasksForDate } from "@/lib/calendar-utils";
import { setWorkdayForUserAction } from "@/app/actions/workdays";

export function MonthView({
  anchorDate,
  tasks,
  workdays,
  loading,
  onPrev,
  onNext,
}: {
  anchorDate: Date;
  tasks: CalendarTask[];
  workdays: Record<string, "Présentiel" | "Distanciel" | "Congé">;
  loading: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [localWorkdays, setLocalWorkdays] = useState<Record<string, "Présentiel" | "Distanciel" | "Congé">>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) setLocalWorkdays(workdays);
  }, [workdays, editing]);

  const cycleMode = (mode: "Présentiel" | "Distanciel" | "Congé") => {
    if (mode === 'Présentiel') return 'Distanciel' as const;
    if (mode === 'Distanciel') return 'Congé' as const;
    return 'Présentiel' as const;
  };

  const handleDayClick = (dateObj: Date) => {
    if (!editing) return;
    const iso = dateObj.toISOString().split('T')[0];
    const current = (localWorkdays[iso] ?? 'Présentiel');
    const next = cycleMode(current);
    setLocalWorkdays((prev: Record<string, "Présentiel" | "Distanciel" | "Congé">) => ({ ...prev, [iso]: next }));
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
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={onPrev} className="cursor-pointer hover:bg-primary/10 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Button>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground">{monthName}</h2>
        </div>
        <div className="flex items-center gap-2">
          {!editing ? (
            <Button variant="outline" size="sm" onClick={handleStartEdit} className="cursor-pointer">Modifier la présence</Button>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={handleCancel} className="cursor-pointer" disabled={saving}>Annuler</Button>
              <Button size="sm" onClick={handleSave} className="cursor-pointer" disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={onNext} className="cursor-pointer hover:bg-primary/10 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {["L", "M", "M", "J", "V", "S", "D"].map((day, index) => (
          <div key={index} className="p-2 text-center text-sm font-medium text-muted-foreground">
            {day}
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
            <div
              key={index}
              className={`relative min-h-[80px] rounded-lg border p-2 ${
                editing
                  ? (mode === 'Congé'
                      ? 'bg-red-100 border-red-200'
                      : mode === 'Distanciel'
                      ? 'bg-blue-100 border-blue-200'
                      : 'bg-emerald-100 border-emerald-200')
                  : (date.isToday
                      ? "border-primary bg-primary/10"
                      : date.isCurrentMonth
                      ? "border-border bg-card"
                      : "border-transparent bg-muted/30")
              } ${editing ? 'cursor-pointer select-none' : ''}`}
              onClick={() => handleDayClick(dayDateObj)}
            >
              {!editing && (
                <span
                  className={`absolute right-2 top-2 h-2 w-2 rounded-full ${
                    mode === 'Congé'
                      ? 'bg-red-500'
                      : mode === 'Distanciel'
                      ? 'bg-blue-500'
                      : 'bg-emerald-500'
                  }`}
                  aria-label={`Mode: ${mode}`}
                  title={mode}
                />
              )}
              <div className="text-sm font-medium text-foreground">{date.date}</div>
              {editing ? (
                <div className="mt-1 min-h-[50px] flex items-center justify-center">
                  <span className={`${
                    mode === 'Congé'
                      ? 'text-red-700'
                      : mode === 'Distanciel'
                      ? 'text-blue-700'
                      : 'text-emerald-700'
                  } text-xs font-semibold`}>{mode}</span>
                </div>
              ) : (
                <div className="mt-1 space-y-1">
                  {loading ? (
                    <div className="text-xs text-muted-foreground">...</div>
                  ) : dayTasks.length === 0 ? (
                    <div className="text-xs text-muted-foreground">-</div>
                  ) : (
                    dayTasks.slice(0, 2).map((task) => (
                      <div key={task.id} className="rounded bg-secondary/50 p-1 text-xs">
                        <div className="truncate font-medium">{task.title}</div>
                      </div>
                    ))
                  )}
                  {dayTasks.length > 2 && (
                    <div className="text-xs text-muted-foreground">+{dayTasks.length - 2}</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Présentiel</div>
        <div className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" /> Distanciel</div>
        <div className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> Congé</div>
      </div>
    </div>
  );
}

export default MonthView;


