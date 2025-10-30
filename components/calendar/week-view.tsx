"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CalendarTask, getTasksForDate } from "@/lib/calendar-utils";
import { setWorkdayForUserAction } from "@/app/actions/workdays";

export function WeekView({
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
      const startOfWeek = new Date(anchorDate);
      startOfWeek.setDate(anchorDate.getDate() - anchorDate.getDay() + 1);
      const promises: Promise<boolean>[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
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
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={onPrev} className="cursor-pointer hover:bg-primary/10 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Button>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground">Semaine</h2>
          <p className="text-sm text-muted-foreground">
            {startOfWeek.getDate()} {startOfWeek.toLocaleDateString("fr-FR", { month: "long" }).slice(0, 3)} - {endOfWeek.getDate()} {endOfWeek.toLocaleDateString("fr-FR", { month: "long" }).slice(0, 3)} {endOfWeek.getFullYear()}
          </p>
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
            <div
              key={index}
              className={`relative rounded-lg border p-3 text-center ${
                editing
                  ? (mode === 'Congé'
                      ? 'bg-red-100 border-red-200'
                      : mode === 'Distanciel'
                      ? 'bg-blue-100 border-blue-200'
                      : 'bg-emerald-100 border-emerald-200')
                  : (day.isToday ? "border-primary bg-primary/10" : "border-border bg-card")
              } ${editing ? 'cursor-pointer select-none' : ''}`}
              onClick={() => handleDayClick(dayDate)}
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
              <div className="text-sm font-medium text-muted-foreground">{day.dayName}</div>
              <div className="text-lg font-semibold text-foreground">{day.date}</div>
              {editing ? (
                <div className="mt-2 min-h-[60px] flex items-center justify-center">
                  <span className={`${
                    mode === 'Congé'
                      ? 'text-red-700'
                      : mode === 'Distanciel'
                      ? 'text-blue-700'
                      : 'text-emerald-700'
                  } text-sm font-semibold`}>{mode}</span>
                </div>
              ) : (
                <div className="mt-2 min-h-[60px] space-y-1">
                  {loading ? (
                    <div className="text-xs text-muted-foreground">...</div>
                  ) : dayTasks.length === 0 ? (
                    <div className="text-xs text-muted-foreground">-</div>
                  ) : (
                    dayTasks.slice(0, 3).map((task) => (
                      <div key={task.id} className="rounded bg-secondary/50 p-1 text-xs">
                        <div className="truncate font-medium">{task.title}</div>
                      </div>
                    ))
                  )}
                  {dayTasks.length > 3 && (
                    <div className="text-xs text-muted-foreground">+{dayTasks.length - 3} autres</div>
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

export default WeekView;


