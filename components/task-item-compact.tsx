"use client";

import { Task } from "@/lib/types";
import { TaskEditDialog } from "./task-edit-dialog";

type TaskItemCompactProps = {
  task: Task | Partial<Task> & { id: string; title: string; description?: string };
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
        </div>
      }
    />
  );
}

