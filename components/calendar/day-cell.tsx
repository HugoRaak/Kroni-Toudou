"use client";

import { CalendarTask } from "@/lib/calendar-utils";

type WorkMode = "Présentiel" | "Distanciel" | "Congé";

export function DayCell({
  titleTop,
  titleMain,
  mode,
  loading,
  editing,
  isToday,
  isCurrentMonth = true,
  tasks,
  onClick,
  taskLimit = 3,
  minContentHeight = 60,
}: {
  titleTop?: string;
  titleMain: string | number;
  mode: WorkMode;
  loading: boolean;
  editing: boolean;
  isToday?: boolean;
  isCurrentMonth?: boolean;
  tasks: CalendarTask[];
  onClick?: () => void;
  taskLimit?: number;
  minContentHeight?: number;
}) {
  const baseContainerClasses = (() => {
    if (loading || !editing) {
      return isToday ? "border-primary bg-primary/10" : (isCurrentMonth ? "border-border bg-card" : "border-transparent bg-muted/30");
    }
    switch (mode) {
      case 'Congé':
        return 'bg-red-100 border-red-200';
      case 'Distanciel':
        return 'bg-blue-100 border-blue-200';
      default:
        return 'bg-emerald-100 border-emerald-200';
    }
  })();

  const modeDotClass = mode === 'Congé' ? 'bg-red-500' : mode === 'Distanciel' ? 'bg-blue-500' : 'bg-emerald-500';
  const modeTextClass = mode === 'Congé' ? 'text-red-700' : mode === 'Distanciel' ? 'text-blue-700' : 'text-emerald-700';

  return (
    <div
      className={`relative rounded-lg border p-2 text-center ${editing ? 'cursor-pointer select-none' : ''} ${baseContainerClasses}`}
      onClick={onClick}
    >
      {!editing && !loading && (
        <span className={`absolute right-2 top-2 h-2 w-2 rounded-full ${modeDotClass}`} aria-label={`Mode: ${mode}`} title={mode} />
      )}
      {titleTop && (
        <div className="text-sm font-medium text-muted-foreground">{titleTop}</div>
      )}
      <div className="text-lg font-semibold text-foreground">{titleMain}</div>

      {editing && !loading ? (
        <div className="mt-2 flex items-center justify-center" style={{ minHeight: `${minContentHeight}px` }}>
          <span className={`${modeTextClass} text-sm font-semibold`}>{mode}</span>
        </div>
      ) : (
        <div className="mt-2 space-y-1" style={{ minHeight: `${minContentHeight}px` }}>
          {loading ? (
            <>
              <div className="h-3 w-3/4 rounded bg-accent/70 animate-pulse" />
              <div className="h-3 w-2/3 rounded bg-accent/60 animate-pulse" />
              <div className="h-3 w-1/2 rounded bg-accent/50 animate-pulse" />
            </>
          ) : tasks.length === 0 ? (
            <div className="text-xs text-muted-foreground">-</div>
          ) : (
            tasks.slice(0, taskLimit).map(task => (
              <div key={task.id} className="rounded bg-secondary/50 p-1 text-xs">
                <div className="truncate font-medium">{task.title}</div>
              </div>
            ))
          )}
          {tasks.length > taskLimit && (
            <div className="text-xs text-muted-foreground">+{tasks.length - taskLimit}{taskLimit === 3 ? ' autres' : ''}</div>
          )}
        </div>
      )}
    </div>
  );
}

export default DayCell;


