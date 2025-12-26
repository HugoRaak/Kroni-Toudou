'use server';

import { getTasksForDay } from '@/lib/calendar/calendar-utils';
import { supabaseServer, supabaseServerReadOnly } from '@/lib/supabase/supabase-server';
import { Task, Frequency, DayOfWeek } from '@/lib/types';
import {
  parseTaskFormData,
  parsedDataToTaskUpdates,
} from '@/lib/tasks/processing/task-form-parser';
import { revalidatePath } from 'next/cache';
import { verifyTaskOwnership, verifyAuthenticated } from '@/lib/auth/auth-helpers';
import { parseDateLocal } from '@/lib/utils';
import { getTaskCategory } from '@/lib/tasks/processing/task-metadata';
import { ModeConflictError } from '@/lib/tasks/validation/task-validation-service';
import { createTask, updateTask, deleteTask, TaskActionResult } from '@/lib/services/task-service';
import { updateTasksDisplayOrder } from '@/lib/tasks/sorting/task-sorting';

export type { ModeConflictError } from '@/lib/tasks/validation/task-validation-service';

export type { TaskActionResult };

// Accept YYYY-MM-DD strings instead of Date objects to avoid timezone serialization issues
export async function getTasksForDayAction(userId: string, dateStr: string) {
  const supabase = await supabaseServer();
  const user = await verifyAuthenticated(supabase);
  if (!user || user.id !== userId) {
    console.warn('Security: userId mismatch or user not authenticated');
    return null;
  }
  const date = parseDateLocal(dateStr);
  return await getTasksForDay(userId, date);
}

// Server Actions pour les mutations
async function createTaskAction(
  userId: string,
  title: string,
  description: string = '',
  frequency?: Frequency,
  day?: DayOfWeek,
  custom_days?: number,
  max_shifting_days?: number,
  start_date?: string,
  due_on?: string,
  in_progress?: boolean,
  mode?: 'Tous' | 'Présentiel' | 'Distanciel',
  ignoreConflict?: boolean,
): Promise<TaskActionResult> {
  const supabase = await supabaseServer();

  // Verify authenticated user and userId match
  const user = await verifyAuthenticated(supabase);
  if (!user || user.id !== userId) {
    console.warn('Security: userId mismatch or user not authenticated');
    return null;
  }

  return await createTask(
    supabase,
    {
      userId,
      title,
      description,
      frequency,
      day,
      custom_days,
      max_shifting_days,
      start_date,
      due_on,
      in_progress,
      mode,
    },
    { ignoreConflict },
  );
}

export async function updateTaskAction(
  id: string,
  updates: Partial<
    Pick<
      Task,
      | 'title'
      | 'description'
      | 'frequency'
      | 'day'
      | 'custom_days'
      | 'max_shifting_days'
      | 'start_date'
      | 'due_on'
      | 'in_progress'
      | 'mode'
      | 'display_order'
    >
  >,
): Promise<TaskActionResult> {
  const supabase = await supabaseServer();

  const verification = await verifyTaskOwnership(supabase, id);
  if (!verification) {
    return null;
  }

  // Get current task to check category and for mode conflict check
  const { data: currentTask } = await supabase
    .from('tasks')
    .select('frequency, due_on, in_progress, mode')
    .eq('id', id)
    .single();

  if (!currentTask) {
    return null;
  }

  // Remove ignoreConflict from updates before saving
  type UpdatesWithIgnoreConflict = typeof updates & { ignoreConflict?: boolean };
  const updatesWithIgnore = updates as UpdatesWithIgnoreConflict;
  const ignoreConflict = updatesWithIgnore.ignoreConflict === true;
  const { ignoreConflict: _, ...cleanUpdates } = updatesWithIgnore;

  return await updateTask(supabase, verification.user.id, id, cleanUpdates, currentTask, {
    ignoreConflict,
  });
}

async function deleteTaskAction(id: string): Promise<boolean> {
  const supabase = await supabaseServer();

  const verification = await verifyTaskOwnership(supabase, id);
  if (!verification) {
    return false;
  }

  return await deleteTask(supabase, verification.user.id, id);
}

export async function createTaskFromForm(
  userId: string,
  formData: FormData,
  ignoreConflict?: boolean,
): Promise<TaskActionResult> {
  const supabase = await supabaseServer();
  const user = await verifyAuthenticated(supabase);

  if (!user || user.id !== userId) {
    console.warn('Security: userId mismatch');
    return null;
  }

  const parsed = parseTaskFormData(formData);
  if (!parsed) {
    return null;
  }

  return await createTaskAction(
    userId,
    parsed.title,
    parsed.description,
    parsed.frequency,
    parsed.day,
    parsed.custom_days,
    parsed.max_shifting_days,
    parsed.start_date,
    parsed.due_on,
    parsed.in_progress,
    parsed.mode,
    ignoreConflict,
  );
}

// Centralized server actions for form handling (with revalidation)
export async function updateTaskFromFormAction(
  formData: FormData,
  ignoreConflict?: boolean,
): Promise<boolean | ModeConflictError> {
  'use server';
  const id = String(formData.get('id') || '');
  const parsed = parseTaskFormData(formData);

  if (!parsed) {
    return false;
  }

  const updates = parsedDataToTaskUpdates(parsed);
  type UpdatesWithIgnoreConflict = typeof updates & { ignoreConflict?: boolean };
  const updatesWithIgnore: UpdatesWithIgnoreConflict = updates;
  if (ignoreConflict) {
    updatesWithIgnore.ignoreConflict = true;
  }
  const result = await updateTaskAction(id, updatesWithIgnore);

  // Return mode conflict error if present
  if (result && typeof result === 'object' && 'type' in result && result.type === 'MODE_CONFLICT') {
    return result;
  }

  if (result && typeof result === 'object' && 'id' in result) {
    revalidatePath('/home');
    revalidatePath('/mes-taches');
    return true;
  }

  return false;
}

export async function deleteTaskActionWrapper(id: string): Promise<boolean> {
  'use server';
  const result = await deleteTaskAction(id);
  if (result) {
    revalidatePath('/home');
    revalidatePath('/mes-taches');
  }
  return result;
}

export async function createTaskFromFormAction(formData: FormData): Promise<TaskActionResult> {
  'use server';
  const supabase = await supabaseServerReadOnly();
  const user = await verifyAuthenticated(supabase);

  if (!user) {
    return null;
  }

  const result = await createTaskFromForm(user.id, formData);

  // Only revalidate if task was created successfully (not a mode conflict)
  if (result && typeof result === 'object' && 'id' in result) {
    revalidatePath('/home');
    revalidatePath('/mes-taches');
  }

  return result;
}

export async function getCurrentUserIdAction(): Promise<string | null> {
  'use server';
  const supabase = await supabaseServerReadOnly();
  const user = await verifyAuthenticated(supabase);
  return user?.id ?? null;
}

export async function updateTasksDisplayOrderAction(taskIds: string[]): Promise<boolean> {
  'use server';
  const supabase = await supabaseServer();
  const user = await verifyAuthenticated(supabase);

  if (!user) {
    console.warn('Security: user not authenticated');
    return false;
  }

  if (taskIds.length === 0) {
    return true;
  }

  // Get all tasks to determine category
  const { data: allUserTasks, error: fetchAllError } = await supabase
    .from('tasks')
    .select('id, frequency, due_on, in_progress, display_order')
    .eq('user_id', user.id)
    .order('display_order', { ascending: true, nullsFirst: false });

  if (fetchAllError || !allUserTasks) {
    console.error('Error fetching all tasks:', fetchAllError);
    return false;
  }

  // Verify all reordered tasks belong to the user
  const reorderedTasksForVerification = allUserTasks.filter((t) => taskIds.includes(t.id));
  if (reorderedTasksForVerification.length !== taskIds.length) {
    console.error('Error: some tasks not found or not owned by user');
    return false;
  }

  // Determine category from first reordered task
  const firstTask = reorderedTasksForVerification[0];
  const category = getTaskCategory(
    firstTask.frequency,
    firstTask.due_on,
    firstTask.in_progress ?? null,
  );

  const success = await updateTasksDisplayOrder(supabase, user.id, taskIds, category);

  if (success) {
    revalidatePath('/mes-taches');
  }

  return success;
}
