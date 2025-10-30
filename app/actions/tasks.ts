"use server";

import { getTasksForToday, getTasksForDateRange } from "@/lib/calendar-utils";
import { supabaseServer } from "@/lib/supabase-server";
import { Task, Frequency, DayOfWeek } from "@/lib/types";

export async function getTasksForTodayAction(userId: string, date: Date) {
  return await getTasksForToday(userId, date);
}

export async function getTasksForDateRangeAction(
  userId: string,
  startDate: string,
  endDate: string
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
  is_remote?: boolean,
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
        is_remote,
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
  updates: Partial<Pick<Task, 'title' | 'description' | 'frequency' | 'day' | 'due_on' | 'postponed_days' | 'in_progress' | 'is_remote'>>
): Promise<Task | null> {
  const supabase = await supabaseServer();
  
  const { data, error } = await supabase
    .from('tasks')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
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
  
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting task:', error);
    return false;
  }

  return true;
}
