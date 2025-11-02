"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CalendarTask } from "@/lib/calendar-utils";
import { TaskItemCompact } from "@/components/task-item-compact";
import { WorkModeBadge } from "@/components/calendar/workmode-badge";

type DayTasksDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date;
  tasks: CalendarTask[];
  workMode: "Présentiel" | "Distanciel" | "Congé";
  onUpdateTask: (formData: FormData) => Promise<boolean>;
  onDeleteTask: (id: string) => Promise<boolean>;
  onSaved?: () => void;
};

// Convert CalendarTask to Task (partial, missing some fields but enough for editing)
function calendarTaskToTask(calendarTask: CalendarTask): Partial<import("@/lib/types").Task> & { id: string; title: string; description?: string } {
  return {
    id: calendarTask.id,
    title: calendarTask.title,
    description: calendarTask.description,
    frequency: calendarTask.frequency,
    day: calendarTask.day,
    due_on: calendarTask.due_on,
    in_progress: calendarTask.in_progress,
    is_remote: calendarTask.is_remote,
    postponed_days: undefined, // Not available in CalendarTask
  };
}

export function DayTasksDialog({
  open,
  onOpenChange,
  date,
  tasks,
  workMode,
  onUpdateTask,
  onDeleteTask,
  onSaved,
}: DayTasksDialogProps) {
  const day = date.getDate();
  const month = date.toLocaleDateString("fr-FR", { month: "long" });
  const year = date.getFullYear();
  const dayName = date.toLocaleDateString("fr-FR", { weekday: "long" });

  const periodic = tasks.filter((t) => t.type === "periodic");
  const specific = tasks.filter((t) => t.type === "specific");

  const isEmpty = tasks.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-foreground">{dayName}</h2>
              <p className="text-lg text-muted-foreground">
                {day} {month} {year}
              </p>
              <div className="mt-2">
                <WorkModeBadge
                  workMode={workMode}
                  date={date}
                  onSaved={onSaved}
                />
              </div>
            </div>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Tâches prévues pour le {day} {month} {year} en mode {workMode}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto space-y-6 mt-4">
          {isEmpty ? (
            <p className="text-center text-muted-foreground">
              {workMode === "Congé" ? "Là c'est repos !" : "Aucune tâche pour ce jour"}
            </p>
          ) : (
            <>
              {periodic.length > 0 && (
                <div>
                  <h3 className="mb-3 text-lg font-semibold text-yellow-900 flex items-center gap-2">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      className="text-yellow-700"
                    >
                      <circle cx="12" cy="12" r="10" strokeWidth="2" />
                      <path d="M12 6v6l4 2" strokeWidth="2" />
                    </svg>
                    Tâches périodiques
                  </h3>
                  <div className="space-y-2">
                    {periodic.map((task) => (
                      <TaskItemCompact 
                        key={task.id} 
                        task={calendarTaskToTask(task)} 
                        className="border-yellow-400/30 bg-yellow-100/50"
                        onSubmit={onUpdateTask}
                        onDelete={onDeleteTask}
                        onSuccess={onSaved}
                      />
                    ))}
                  </div>
                </div>
              )}

              {specific.length > 0 && (
                <div>
                  <h3 className="mb-3 text-lg font-semibold text-violet-800 flex items-center gap-2">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      className="text-violet-700"
                    >
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="2" />
                      <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2" />
                      <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2" />
                      <line x1="3" y1="10" x2="21" y2="10" strokeWidth="2" />
                    </svg>
                    Tâches à date précise
                  </h3>
                  <div className="space-y-2">
                    {specific.map((task) => (
                      <TaskItemCompact 
                        key={task.id} 
                        task={calendarTaskToTask(task)} 
                        className="border-violet-500/20 bg-violet-500/10"
                        onSubmit={onUpdateTask}
                        onDelete={onDeleteTask}
                        onSuccess={onSaved}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

