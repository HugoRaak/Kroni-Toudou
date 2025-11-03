"use client";

import { Task } from "@/lib/types";
import { TaskEditDialog } from "./task-edit-dialog";

type TaskItemProps = {
  task: Task;
  onSubmit: (formData: FormData) => Promise<boolean>;
  onDelete?: (id: string) => Promise<boolean>;
  showProgressStatus?: boolean;
};

// Format date string as local date without timezone conversion
function formatDateDisplay(dateStr: string): string {
  const datePart = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const [year, month, day] = datePart.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export default function TaskItem({ task, onSubmit, onDelete, showProgressStatus = false }: TaskItemProps) {
  return (
    <TaskEditDialog
      task={task}
      onSubmit={onSubmit}
      onDelete={onDelete}
      trigger={
        <button
          type="button"
          className="w-full text-left rounded-md border p-4 bg-card/50 backdrop-blur-sm hover:bg-card transition-colors shadow-xs hover:shadow-sm cursor-pointer"
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-medium text-foreground">{task.title}</h3>
              {task.description ? (
                <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
              ) : null}
            </div>
          </div>
          <div className="text-xs text-muted-foreground mt-3 flex flex-wrap gap-2">
            {task.frequency ? (
              <span className="px-2 py-1 rounded border bg-muted/50">{task.frequency}</span>
            ) : null}
            {task.day ? (
              <span className="px-2 py-1 rounded border bg-muted/50">{task.day}</span>
            ) : null}
            {task.due_on ? (
              <span className="px-2 py-1 rounded border bg-muted/50">
                {formatDateDisplay(task.due_on)}
              </span>
            ) : null}
            {typeof task.postponed_days === "number" ? (
              <span className="px-2 py-1 rounded border bg-muted/50">à reporter dans {task.postponed_days} jours</span>
            ) : null}
            {showProgressStatus && task.in_progress && (
              <span className="px-2 py-1 rounded border bg-muted/50">En cours</span>
            )}
            {showProgressStatus && !task.in_progress && (
              <span className="px-2 py-1 rounded border bg-muted/50">Pas commencé</span>
            )}
            {(() => {
              const mode = task.mode ?? 'Tous';
              if (mode === 'Distanciel') {
                return <span className={"px-2 py-1 rounded border bg-blue-50 text-blue-700 border-blue-200"}>Distanciel</span>;
              }
              if (mode === 'Présentiel') {
                return <span className={"px-2 py-1 rounded border bg-pink-50 text-pink-700 border-pink-200"}>Présentiel</span>;
              }
              return <span className={"px-2 py-1 rounded border bg-gradient-to-r from-blue-50 to-pink-50 text-foreground border-blue-200/50"}>Tous</span>;
            })()}
          </div>
        </button>
      }
    />
  );
}


