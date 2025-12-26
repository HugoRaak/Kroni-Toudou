import { SupabaseClient } from '@supabase/supabase-js';
import { Task, Frequency, DayOfWeek } from '@/lib/types';
import {
  getCategoryFromFormData,
  calculateNextDisplayOrder,
  getTaskCategory,
  hasCategoryChanged,
} from '@/lib/tasks/processing/task-metadata';
import {
  checkModeConflict,
  ModeConflictError,
} from '@/lib/tasks/validation/task-validation-service';
import { sanitizeServer } from '@/lib/sanitize-server';

export type TaskActionResult = Task | null | ModeConflictError;

interface CreateTaskData {
  userId: string;
  title: string;
  description: string;
  frequency?: Frequency;
  day?: DayOfWeek;
  custom_days?: number;
  max_shifting_days?: number;
  start_date?: string;
  due_on?: string;
  in_progress?: boolean;
  mode?: 'Tous' | 'Présentiel' | 'Distanciel';
}

interface UpdateTaskData {
  title?: string;
  description?: string;
  frequency?: Frequency | null;
  day?: DayOfWeek | null;
  custom_days?: number | null;
  max_shifting_days?: number | null;
  start_date?: string | null;
  due_on?: string | null;
  in_progress?: boolean | null | undefined;
  mode?: 'Tous' | 'Présentiel' | 'Distanciel' | null;
  display_order?: number | null;
}

export async function createTask(
  supabase: SupabaseClient,
  taskData: CreateTaskData,
  options?: { ignoreConflict?: boolean },
): Promise<TaskActionResult> {
  if (!options?.ignoreConflict) {
    const modeConflict = await checkModeConflict(
      taskData.userId,
      taskData.due_on ?? undefined,
      taskData.mode,
    );
    if (modeConflict) return modeConflict;
  }

  const category = getCategoryFromFormData(taskData.frequency, taskData.due_on, taskData.in_progress);
  const display_order = await calculateNextDisplayOrder(supabase, taskData.userId, category);

  const sanitizedDescription = sanitizeServer(taskData.description);

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      user_id: taskData.userId,
      title: taskData.title,
      description: sanitizedDescription,
      frequency: taskData.frequency,
      day: taskData.day,
      custom_days: taskData.custom_days,
      max_shifting_days: taskData.max_shifting_days,
      start_date: taskData.start_date,
      due_on: taskData.due_on,
      in_progress: taskData.in_progress,
      mode: taskData.mode,
      display_order,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating task:', error);
    return null;
  }

  return data;
}

export async function updateTask(
  supabase: SupabaseClient,
  userId: string,
  taskId: string,
  updates: UpdateTaskData,
  currentTask: {
    frequency?: Frequency | null;
    due_on?: string | null;
    in_progress?: boolean | null;
    mode?: 'Tous' | 'Présentiel' | 'Distanciel' | null;
  },
  options?: { ignoreConflict?: boolean },
): Promise<TaskActionResult> {
  if (!options?.ignoreConflict && (updates.due_on !== undefined || updates.mode !== undefined)) {
    const due_on = updates.due_on ?? currentTask.due_on;
    const mode = updates.mode ?? currentTask.mode;
    const modeConflict = await checkModeConflict(userId, due_on ?? undefined, mode ?? undefined);
    if (modeConflict) return modeConflict;
  }

  // Determine if category is changing
  const frequencyIsBeingUpdated = 'frequency' in updates;
  const dueOnIsBeingUpdated = 'due_on' in updates;
  const inProgressIsBeingUpdated = 'in_progress' in updates;

  const currentFrequency = frequencyIsBeingUpdated
    ? (updates.frequency ?? null)
    : currentTask.frequency;
  const currentDueOn = dueOnIsBeingUpdated ? (updates.due_on ?? null) : currentTask.due_on;
  const currentInProgress = inProgressIsBeingUpdated
    ? (updates.in_progress ?? null)
    : currentTask.in_progress ?? null;

  // Get old in_progress from currentTask (need to fetch it if not available)
  const oldInProgress = currentTask.in_progress ?? null;

  if (
    hasCategoryChanged(
      currentTask.frequency,
      currentTask.due_on,
      oldInProgress,
      currentFrequency,
      currentDueOn,
      currentInProgress,
    )
  ) {
    const newCategory = getTaskCategory(currentFrequency, currentDueOn, currentInProgress);
    const newDisplayOrder = await calculateNextDisplayOrder(supabase, userId, newCategory, taskId);
    updates.display_order = newDisplayOrder;
  }

  const cleanedUpdates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (key === 'description' && value !== undefined && value !== null) {
      cleanedUpdates[key] = sanitizeServer(String(value));
    } else {
      cleanedUpdates[key] = value === undefined ? null : value;
    }
  }

  const { data, error } = await supabase
    .from('tasks')
    .update({
      ...cleanedUpdates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating task:', error);
    return null;
  }

  return data;
}

export async function deleteTask(
  supabase: SupabaseClient,
  userId: string,
  taskId: string,
): Promise<boolean> {
  const { error } = await supabase.from('tasks').delete().eq('id', taskId).eq('user_id', userId);

  if (error) {
    console.error('Error deleting task:', error);
    return false;
  }

  return true;
}
