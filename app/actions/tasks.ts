"use server";

import { getTasksForDay, getTasksForDateRange } from "@/lib/calendar-utils";
import { supabaseServer } from "@/lib/supabase-server";
import { Task, Frequency, DayOfWeek } from "@/lib/types";
import { parseTaskFormData } from "@/lib/task-form-parser";

export async function getTasksForDayAction(userId: string, date: Date) {
  return await getTasksForDay(userId, date);
}

export async function getTasksForDateRangeAction(
  userId: string,
  startDate: Date,
  endDate: Date
) {
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
  
  // Verify authenticated user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.warn('Security: user not authenticated');
    return null;
  }

  // Verify task ownership
  const { data: existingTask } = await supabase
    .from('tasks')
    .select('user_id')
    .eq('id', id)
    .single();
  
  if (!existingTask || existingTask.user_id !== user.id) {
    console.warn('Security: task ownership mismatch');
    return null;
  }
  
  const { data, error } = await supabase
    .from('tasks')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)
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
  
  // Verify authenticated user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.warn('Security: user not authenticated');
    return false;
  }

  // Verify task ownership
  const { data: existingTask } = await supabase
    .from('tasks')
    .select('user_id')
    .eq('id', id)
    .single();
  
  if (!existingTask || existingTask.user_id !== user.id) {
    console.warn('Security: task ownership mismatch');
    return false;
  }
  
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error deleting task:', error);
    return false;
  }

  return true;
}

export async function createTaskFromForm(userId: string, formData: FormData): Promise<Task | null> {
  // Verify authenticated user
  const supabase = await supabaseServer();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user || user.id !== userId) {
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
