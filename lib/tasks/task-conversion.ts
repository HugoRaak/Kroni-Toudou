import { Task, TaskWithType, TempTask } from "@/lib/types";

/**
 * Converts a TaskWithType to a Task-like object for TaskItemCompact.
 */
export function taskWithTypeToTaskLike(
  task: TaskWithType
): Partial<Task> & { id: string; title: string; description: string } {
  if (task.taskType === 'temp') {
    const tempTask = task as TempTask & { taskType: 'temp' };
    return {
      id: tempTask.id,
      title: tempTask.title,
      description: tempTask.description,
      mode: tempTask.mode,
      in_progress: tempTask.in_progress,
      created_at: tempTask.created_at,
      updated_at: tempTask.created_at,
    };
  }
  return task as Task & { taskType: 'periodic' | 'specific' };
}

