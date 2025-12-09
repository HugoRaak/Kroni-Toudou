'use client';

import { Task } from '@/lib/types';
import { TaskEditDialog } from '../dialogs/task-edit-dialog';
import { TaskDescriptionView } from '../description/task-description-view';
import { useMemo } from 'react';
import { parseDateLocal } from '@/lib/utils';
import type { ModeConflictError } from '@/app/actions/tasks';

type TaskItemProps = {
  task: Task;
  onSubmit: (formData: FormData) => Promise<boolean | ModeConflictError>;
  onDelete?: (id: string) => Promise<boolean>;
  showProgressStatus?: boolean;
};

// Format date string as local date without timezone conversion
function formatDateDisplay(dateStr: string): string {
  const datePart = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const date = parseDateLocal(datePart); // Reuses utility function for consistency
  const formatted = date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  // Capitalize first letter of month name
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

// Mode badge component to avoid recreating JSX on each render
function ModeBadge({ mode }: { mode: string }) {
  if (mode === 'Distanciel') {
    return (
      <span className="px-2 py-1 rounded border bg-blue-50 text-blue-700 border-blue-200">
        Distanciel
      </span>
    );
  }
  if (mode === 'Présentiel') {
    return (
      <span className="px-2 py-1 rounded border bg-pink-50 text-pink-700 border-pink-200">
        Présentiel
      </span>
    );
  }
  return (
    <span className="px-2 py-1 rounded border bg-gradient-to-r from-blue-50 to-pink-50 text-foreground border-blue-200/50">
      Tous
    </span>
  );
}

export default function TaskItem({
  task,
  onSubmit,
  onDelete,
  showProgressStatus = false,
}: TaskItemProps) {
  const formattedDueOn = useMemo(() => {
    return task.due_on ? formatDateDisplay(task.due_on) : null;
  }, [task.due_on]);

  const taskMode = useMemo(() => task.mode ?? 'Tous', [task.mode]);

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
                <TaskDescriptionView description={task.description} className="mt-1" />
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
            {formattedDueOn && (
              <span className="px-2 py-1 rounded border bg-muted/50">{formattedDueOn}</span>
            )}
            {typeof task.postponed_days === 'number' ? (
              <span className="px-2 py-1 rounded border bg-muted/50">
                à reporter dans {task.postponed_days} jours
              </span>
            ) : null}
            {showProgressStatus && task.in_progress && (
              <span className="px-2 py-1 rounded border bg-muted/50">En cours</span>
            )}
            {showProgressStatus && !task.in_progress && (
              <span className="px-2 py-1 rounded border bg-muted/50">Pas commencé</span>
            )}
            <ModeBadge mode={taskMode} />
          </div>
        </button>
      }
    />
  );
}
