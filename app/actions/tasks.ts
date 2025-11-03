"use server";

import { getTasksForDay, getTasksForDateRange } from "@/lib/calendar/calendar-utils";
import { supabaseServer, supabaseServerReadOnly } from "@/lib/supabase/supabase-server";
import { Task, Frequency, DayOfWeek } from "@/lib/types";
import { parseTaskFormData, parsedDataToTaskUpdates } from "@/lib/tasks/task-form-parser";
import { revalidatePath } from "next/cache";
import { verifyTaskOwnership, verifyAuthenticated } from "@/lib/auth/auth-helpers";

export async function getTasksForDayAction(userId: string, date: Date) {
  const supabase = await supabaseServer();
  const user = await verifyAuthenticated(supabase);
  if (!user || user.id !== userId) {
    console.warn('Security: userId mismatch or user not authenticated');
    return null;
  }
  return await getTasksForDay(userId, date);
}

export async function getTasksForDateRangeAction(
  userId: string,
  startDate: Date,
  endDate: Date
) {
  const supabase = await supabaseServer();
  const user = await verifyAuthenticated(supabase);
  if (!user || user.id !== userId) {
    console.warn('Security: userId mismatch or user not authenticated');
    return [];
  }
  return await getTasksForDateRange(userId, startDate, endDate);
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
): Promise<Task | null> {
  const supabase = await supabaseServer();
  
  // Verify authenticated user and userId match
  const user = await verifyAuthenticated(supabase);
  if (!user || user.id !== userId) {
    console.warn('Security: userId mismatch or user not authenticated');
    return null;
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
): Promise<Task | null> {
  const supabase = await supabaseServer();
  
  const verification = await verifyTaskOwnership(supabase, id);
  if (!verification) {
    return null;
  }
  
  const { data, error } = await supabase
    .from('tasks')
    .update({
      ...updates,
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

export async function createTaskFromForm(userId: string, formData: FormData): Promise<Task | null> {
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
export async function updateTaskFromFormAction(formData: FormData): Promise<boolean> {
  'use server';
  const id = String(formData.get('id') || '');
  const parsed = parseTaskFormData(formData);
  
  if (!parsed) {
    return false;
  }

  const updates = parsedDataToTaskUpdates(parsed);
  const result = await updateTaskAction(id, updates);
  
  if (result) {
    revalidatePath('/home');
    revalidatePath('/mes-taches');
  }
  return !!result;
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

export async function createTaskFromFormAction(formData: FormData): Promise<Task | null> {
  'use server';
  const supabase = await supabaseServerReadOnly();
  const user = await verifyAuthenticated(supabase);
  
  if (!user) {
    return null;
  }
  
  const result = await createTaskFromForm(user.id, formData);
  if (result) {
    revalidatePath('/home');
    revalidatePath('/mes-taches');
  }
  return result;
}
