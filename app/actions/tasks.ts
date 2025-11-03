"use server";

import { getTasksForDay, getTasksForDateRange } from "@/lib/calendar-utils";
import { supabaseServer } from "@/lib/supabase-server";
import { Task, Frequency, DayOfWeek } from "@/lib/types";

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

export async function createTaskFromForm(userId: string, formData: FormData): Promise<Task | null> {
  const title = String(formData.get('title') || '');
  const description = String(formData.get('description') || '');
  const taskType = String(formData.get('taskType') || '');
  const frequencyRaw = String(formData.get('frequency') || '');
  const dayRaw = String(formData.get('day') || '');
  const due_onRaw = String(formData.get('due_on') || '');
  const postponed_daysRaw = String(formData.get('postponed_days') || '');
  const modeRaw = String(formData.get('mode') || '');
  const mode: 'Tous' | 'Présentiel' | 'Distanciel' = (modeRaw === 'Présentiel' || modeRaw === 'Distanciel') ? modeRaw : 'Tous';

  // Préparer les données selon le type de tâche
  let taskData = {
    userId,
    title,
    description,
    frequency: undefined as Frequency | undefined,
    day: undefined as DayOfWeek | undefined,
    due_on: undefined as string | undefined,
    postponed_days: undefined as number | undefined,
    in_progress: undefined as boolean | undefined,
    mode,
  };

  // Adapter les données selon le type
  if (taskType === 'periodic') {
    taskData.frequency = frequencyRaw ? (frequencyRaw as Frequency) : undefined;
    taskData.day = dayRaw ? (dayRaw as DayOfWeek) : undefined;
  } else if (taskType === 'specific') {
    taskData.due_on = due_onRaw || undefined;
    taskData.postponed_days = postponed_daysRaw ? Number(postponed_daysRaw) : undefined;
  } else if (taskType === 'when-possible') {
    taskData.in_progress = formData.get('in_progress') != null;
  }

  return await createTaskAction(
    taskData.userId,
    taskData.title,
    taskData.description,
    taskData.frequency,
    taskData.day,
    taskData.due_on,
    taskData.postponed_days,
    taskData.in_progress,
    taskData.mode
  );
}
