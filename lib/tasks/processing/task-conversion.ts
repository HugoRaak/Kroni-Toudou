import { Task, TaskWithType, TempTask } from '@/lib/types';
import { TaskWithShift } from '@/lib/calendar/calendar-utils';

/**
 * Converts a TaskWithType to a Task-like object for TaskItemCompact.
 */
export function taskWithTypeToTaskLike(
  task: TaskWithType,
): (Partial<Task> & { id: string; title: string; description: string }) | TaskWithShift {
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
  // Preserve shiftInfo if it exists (for periodic tasks that were shifted)
  const taskWithShift = task as TaskWithShift & { taskType: 'periodic' | 'specific' };
  if ('shiftInfo' in taskWithShift && taskWithShift.shiftInfo) {
    return taskWithShift;
  }
  return task as Task & { taskType: 'periodic' | 'specific' };
}
