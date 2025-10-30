"use client";

import { Button } from "@/components/ui/button";
import { CalendarTask, getTasksForDate } from "@/lib/calendar-utils";

export function WeekView({
  anchorDate,
  tasks,
  loading,
  onPrev,
  onNext,
}: {
  anchorDate: Date;
  tasks: CalendarTask[];
  loading: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
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
        <Button variant="outline" size="sm" onClick={onNext} className="cursor-pointer hover:bg-primary/10 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {weekDates.map((day, index) => {
          const dayDate = new Date(startOfWeek);
          dayDate.setDate(startOfWeek.getDate() + index);
          const dayTasks = getTasksForDate(tasks, dayDate);

          return (
            <div
              key={index}
              className={`rounded-lg border p-3 text-center ${
                day.isToday ? "border-primary bg-primary/10" : "border-border bg-card"
              }`}
            >
              <div className="text-sm font-medium text-muted-foreground">{day.dayName}</div>
              <div className="text-lg font-semibold text-foreground">{day.date}</div>
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
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default WeekView;


