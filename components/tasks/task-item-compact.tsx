"use client";

import { Task } from "@/lib/types";
import { TaskWithShift } from "@/lib/calendar/calendar-utils";
import { TaskEditDialog } from "./task-edit-dialog";
import { parseDateLocal } from "@/lib/utils";

type TaskItemCompactProps = {
  task: Task | TaskWithShift | Partial<Task> & { id: string; title: string; description?: string; shiftInfo?: TaskWithShift['shiftInfo'] };
  className?: string;
  onSubmit: (formData: FormData) => Promise<boolean>;
  onDelete?: (id: string) => Promise<boolean>;
  onSuccess?: () => void;
};

export function TaskItemCompact({ 
  task, 
  className, 
  onSubmit, 
  onDelete,
  onSuccess 
}: TaskItemCompactProps) {
  const shiftInfo = 'shiftInfo' in task ? task.shiftInfo : undefined;
  
  const formatDateShort = (dateStr: string): string => {
    const date = parseDateLocal(dateStr);
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  };
  
  return (
    <TaskEditDialog
      task={task}
      onSubmit={onSubmit}
      onDelete={onDelete}
      onSuccess={onSuccess}
      trigger={
        <div className={`rounded-lg border p-3 cursor-pointer hover:opacity-80 transition-opacity ${className || ''}`}>
          <div className="font-medium text-foreground">{task.title}</div>
          {task.description && (
            <div className="text-sm text-muted-foreground max-w-[90%]">{task.description}</div>
          )}
          {shiftInfo && shiftInfo.originalDate && (
            <div className="text-xs text-amber-600 dark:text-amber-500 italic mt-1">
              Décalé depuis {shiftInfo.originalDay} {formatDateShort(shiftInfo.originalDate)}
            </div>
          )}
        </div>
      }
    />
  );
}

