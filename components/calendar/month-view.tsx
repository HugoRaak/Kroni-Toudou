"use client";

import { Button } from "@/components/ui/button";
import { CalendarTask, getTasksForDate } from "@/lib/calendar-utils";

export function MonthView({
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
  const year = anchorDate.getFullYear();
  const month = anchorDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay() + 1);

  const monthDates = (() => {
    const dates: { date: number; month: number; isCurrentMonth: boolean; isToday: boolean }[] = [];
    const dateIterator = new Date(startDate);
    const today = new Date();
    for (let i = 0; i < 42; i++) {
      dates.push({
        date: dateIterator.getDate(),
        month: dateIterator.getMonth(),
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
        <Button variant="outline" size="sm" onClick={onNext} className="cursor-pointer hover:bg-primary/10 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {["L", "M", "M", "J", "V", "S", "D"].map((day, index) => (
          <div key={index} className="p-2 text-center text-sm font-medium text-muted-foreground">
            {day}
          </div>
        ))}
        {monthDates.map((date, index) => {
          const dayTasks = getTasksForDate(tasks, new Date(year, date.month, date.date));
          return (
            <div
              key={index}
              className={`min-h-[80px] rounded-lg border p-2 ${
                date.isToday
                  ? "border-primary bg-primary/10"
                  : date.isCurrentMonth
                  ? "border-border bg-card"
                  : "border-transparent bg-muted/30"
              }`}
            >
              <div className="text-sm font-medium text-foreground">{date.isCurrentMonth ? date.date : ""}</div>
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
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default MonthView;


