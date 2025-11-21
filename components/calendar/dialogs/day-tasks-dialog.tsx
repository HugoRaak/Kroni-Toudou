"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CalendarTask, calendarTaskToTaskLike } from "@/lib/calendar/calendar-utils";
import { TaskSectionSpecific } from "@/components/calendar/tasks/task-section-specific";
import { DraggableTaskSection } from "@/components/calendar/tasks/draggable-task-section";
import { WorkModeBadge } from "@/components/calendar/ui/workmode-badge";
import type { ModeConflictError } from "@/app/actions/tasks";

type DayTasksDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date;
  tasks: CalendarTask[];
  workMode: "Présentiel" | "Distanciel" | "Congé";
  onUpdateTask: (formData: FormData) => Promise<boolean | ModeConflictError>;
  onDeleteTask: (id: string) => Promise<boolean>;
  onSaved?: () => void;
};

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
  const monthRaw = date.toLocaleDateString("fr-FR", { month: "long" });
  const month = monthRaw.charAt(0).toUpperCase() + monthRaw.slice(1);
  const year = date.getFullYear();
  const dayNameRaw = date.toLocaleDateString("fr-FR", { weekday: "long" });
  const dayName = dayNameRaw.charAt(0).toUpperCase() + dayNameRaw.slice(1);

  // Only specific date tasks are passed to this dialog (from week/month views)
  const specific = tasks
    .filter((t) => t.type === "specific")
    .map(calendarTaskToTaskLike)
    .filter((t): t is import("@/lib/types").Task => t.id !== undefined);

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
              {workMode === "Congé" ? "Là c'est repos !" : "Aucune tâche à date précise pour ce jour"}
            </p>
          ) : (
            <DraggableTaskSection
              title="Tâches à date précise"
              icon={(
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
              )}
              titleClassName="text-violet-800"
              tasks={specific}
              taskClassName="bg-violet-500/10 border-violet-500/20"
              onUpdateTask={onUpdateTask}
              onDeleteTask={onDeleteTask}
              onSuccess={onSaved}
              accentColor="violet"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

