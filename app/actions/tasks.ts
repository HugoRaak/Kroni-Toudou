"use server";

import { getTasksForDay, getTasksForDateRange } from "@/lib/calendar/calendar-utils";
import { supabaseServer, supabaseServerReadOnly } from "@/lib/supabase/supabase-server";
import { Task, Frequency, DayOfWeek } from "@/lib/types";
import { parseTaskFormData, parsedDataToTaskUpdates } from "@/lib/tasks/task-form-parser";
import { revalidatePath } from "next/cache";
import { verifyTaskOwnership, verifyAuthenticated } from "@/lib/auth/auth-helpers";
import { parseDateLocal } from "@/lib/utils";
import { getWorkday } from "@/lib/db/workdays";
import { TASK_TYPES } from "@/lib/tasks/task-constants";

export type ModeConflictError = {
  type: 'MODE_CONFLICT';
  taskDate: string;
  taskMode: 'Tous' | 'Présentiel' | 'Distanciel';
  workMode: 'Présentiel' | 'Distanciel' | 'Congé';
};

export type TaskActionResult = Task | null | ModeConflictError;

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

export async function getTasksForDateRangeAction(
  userId: string,
  startDateStr: string,
  endDateStr: string
) {
  const supabase = await supabaseServer();
  const user = await verifyAuthenticated(supabase);
  if (!user || user.id !== userId) {
    console.warn('Security: userId mismatch or user not authenticated');
    return [];
  }
  const startDate = parseDateLocal(startDateStr);
  const endDate = parseDateLocal(endDateStr);
  return await getTasksForDateRange(userId, startDate, endDate);
}

// Check if task mode matches work mode for specific date tasks
async function checkModeConflict(
  userId: string,
  due_on: string | undefined,
  mode: 'Tous' | 'Présentiel' | 'Distanciel' | undefined
): Promise<ModeConflictError | null> {
  // Only check for specific date tasks
  if (!due_on) return null;
  
  const workMode = await getWorkday(userId, due_on);
  
  // Congé (holiday) doesn't match any task mode (including "Tous")
  if (workMode === 'Congé') {
    const taskMode = mode ?? 'Tous';
    return {
      type: 'MODE_CONFLICT',
      taskDate: due_on,
      taskMode: taskMode,
      workMode: 'Congé'
    };
  }
  
  
  // Mode "Tous" is compatible with Présentiel and Distanciel, but not Congé (already handled above)
  if (!mode || mode === 'Tous') return null;
  
  // Check if modes match
  if (mode !== workMode) {
    return {
      type: 'MODE_CONFLICT',
      taskDate: due_on,
      taskMode: mode,
      workMode: workMode
    };
  }
  
  return null;
}

// Server Actions pour les mutations
export async function createTaskAction(
  userId: string,
  title: string,
  description: string = '',
  frequency?: Frequency,
  day?: DayOfWeek,
  due_on?: string,
  postponed_days?: number,
  in_progress?: boolean,
  mode?: 'Tous' | 'Présentiel' | 'Distanciel',
): Promise<TaskActionResult> {
  const supabase = await supabaseServer();
  
  // Verify authenticated user and userId match
  const user = await verifyAuthenticated(supabase);
  if (!user || user.id !== userId) {
    console.warn('Security: userId mismatch or user not authenticated');
    return null;
  }
  
  // Check mode conflict for specific date tasks
  const modeConflict = await checkModeConflict(userId, due_on, mode);
  if (modeConflict) {
    return modeConflict;
  }
  
  const { data, error } = await supabase
    .from('tasks')
    .insert({
        user_id: userId,
        title,
        description,
        frequency,
        day,
        due_on,
        in_progress,
        mode,
        postponed_days,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating task:', error);
    return null;
  }

  return data;
}

export async function updateTaskAction(
  id: string,
  updates: Partial<Pick<Task, 'title' | 'description' | 'frequency' | 'day' | 'due_on' | 'postponed_days' | 'in_progress' | 'mode'>>
): Promise<TaskActionResult> {
  const supabase = await supabaseServer();
  
  const verification = await verifyTaskOwnership(supabase, id);
  if (!verification) {
    return null;
  }
  
  // Check mode conflict if due_on or mode is being updated
  if (updates.due_on !== undefined || updates.mode !== undefined) {
    // Get current task to check if it's a specific date task
    const { data: currentTask } = await supabase
      .from('tasks')
      .select('due_on, mode')
      .eq('id', id)
      .single();
    
    if (currentTask) {
      const due_on = updates.due_on ?? currentTask.due_on;
      const mode = updates.mode ?? currentTask.mode;
      
      const modeConflict = await checkModeConflict(verification.user.id, due_on, mode);
      if (modeConflict) {
        return modeConflict;
      }
    }
  }
  
  // Convert undefined to null for Supabase (undefined is ignored, null removes fields)
  const cleanedUpdates: any = {};
  for (const [key, value] of Object.entries(updates)) {
    cleanedUpdates[key] = value === undefined ? null : value;
  }
  
  const { data, error } = await supabase
    .from('tasks')
    .update({
      ...cleanedUpdates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', verification.user.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating task:', error);
    return null;
  }

  return data;
}

export async function deleteTaskAction(id: string): Promise<boolean> {
  const supabase = await supabaseServer();
  
  const verification = await verifyTaskOwnership(supabase, id);
  if (!verification) {
    return false;
  }
  
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id)
    .eq('user_id', verification.user.id);

  if (error) {
    console.error('Error deleting task:', error);
    return false;
  }

  return true;
}

export async function createTaskFromForm(userId: string, formData: FormData): Promise<TaskActionResult> {
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
    parsed.due_on,
    parsed.postponed_days,
    parsed.in_progress,
    parsed.mode
  );
}

// Centralized server actions for form handling (with revalidation)
export async function updateTaskFromFormAction(formData: FormData): Promise<boolean | ModeConflictError> {
  'use server';
  const id = String(formData.get('id') || '');
  const parsed = parseTaskFormData(formData);
  
  if (!parsed) {
    return false;
  }

  const updates = parsedDataToTaskUpdates(parsed);
  const result = await updateTaskAction(id, updates);
  
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
