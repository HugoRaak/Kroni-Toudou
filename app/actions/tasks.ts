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

  const title = String(formData.get('title') || '').trim();
  const description = String(formData.get('description') || '');
  const taskType = String(formData.get('taskType') || '');
  const frequencyRaw = String(formData.get('frequency') || '');
  const dayRaw = String(formData.get('day') || '');
  const due_onRaw = String(formData.get('due_on') || '');
  const postponed_daysRaw = String(formData.get('postponed_days') || '');
  const modeRaw = String(formData.get('mode') || '');
  const mode: 'Tous' | 'Présentiel' | 'Distanciel' = (modeRaw === 'Présentiel' || modeRaw === 'Distanciel') ? modeRaw : 'Tous';

  // Basic validation: title length
  if (!title || title.length > 100) {
    console.warn('Validation failed: title');
    return null;
  }
  if (description.length > 3000) {
    console.warn('Validation failed: description');
    return null;
  }
  // taskType whitelist
  const validTaskTypes = new Set(['periodic', 'specific', 'when-possible']);
  if (!validTaskTypes.has(taskType)) {
    console.warn('Validation failed: taskType');
    return null;
  }

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
    const validFrequencies: Frequency[] = ['quotidien','hebdomadaire','mensuel','annuel'] as any;
    if (frequencyRaw) {
      if (!validFrequencies.includes(frequencyRaw as Frequency)) {
        console.warn('Validation failed: frequency');
        return null;
      }
      taskData.frequency = frequencyRaw as Frequency;
    }
    if (dayRaw) {
      const validDays: DayOfWeek[] = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'] as any;
      if (!validDays.includes(dayRaw as DayOfWeek)) {
        console.warn('Validation failed: day');
        return null;
      }
      taskData.day = dayRaw as DayOfWeek;
    }
  } else if (taskType === 'specific') {
    if (due_onRaw) {
      const ts = Date.parse(due_onRaw);
      if (Number.isNaN(ts)) {
        console.warn('Validation failed: due_on');
        return null;
      }
      taskData.due_on = due_onRaw;
    }
    if (postponed_daysRaw) {
      const parsed = Number(postponed_daysRaw);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        console.warn('Validation failed: postponed_days');
        return null;
      }
      taskData.postponed_days = parsed;
    }
  } else if (taskType === 'when-possible') {
    taskData.in_progress = formData.get('in_progress') != null;
    if (typeof taskData.in_progress !== 'boolean') {
      console.warn('Validation failed: in_progress');
      return null;
    }
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
