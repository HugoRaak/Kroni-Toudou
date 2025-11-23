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

  // Get all tasks to determine category and get all tasks in that category
  const { data: allUserTasks, error: fetchAllError } = await supabase
    .from('tasks')
    .select('id, frequency, due_on, display_order')
    .eq('user_id', user.id)
    .order('display_order', { ascending: true, nullsFirst: false });

  if (fetchAllError || !allUserTasks) {
    console.error('Error fetching all tasks:', fetchAllError);
    return false;
  }

  // Verify all reordered tasks belong to the user
  const reorderedTasks = allUserTasks.filter(t => taskIds.includes(t.id));
  if (reorderedTasks.length !== taskIds.length) {
    console.error('Error: some tasks not found or not owned by user');
    return false;
  }

  // Determine category from first reordered task
  const firstTask = reorderedTasks[0];
  let categoryFilter: (task: { frequency?: string | null; due_on?: string | null }) => boolean;
  
  if (firstTask.frequency) {
    // Periodic tasks: have frequency
    categoryFilter = (task) => !!task.frequency;
  } else if (firstTask.due_on) {
    // Specific tasks: have due_on but no frequency
    categoryFilter = (task) => !!task.due_on && !task.frequency;
  } else {
    // When possible tasks: no frequency and no due_on
    categoryFilter = (task) => !task.frequency && !task.due_on;
  }

  // Get all tasks in the same category, sorted by current display_order
  const categoryTasks = allUserTasks
    .filter(categoryFilter)
    .sort((a, b) => {
      const aOrder = a.display_order ?? Infinity;
      const bOrder = b.display_order ?? Infinity;
      return aOrder - bOrder;
    });

  // Create maps for positions
  const reorderedIdsSet = new Set(taskIds);
  const oldOrderMap = new Map<string, number>(); // taskId -> position in old order (0-based)
  categoryTasks.forEach((task, index) => {
    oldOrderMap.set(task.id, index);
  });

  const newOrderMap = new Map<string, number>(); // taskId -> position in new order (0-based, for reordered tasks)
  taskIds.forEach((id, index) => {
    newOrderMap.set(id, index);
  });

  // Build final order: merge reordered tasks (in new order) with non-reordered tasks (preserving relative order)
  // Algorithm: for each task, calculate its effective sort key
  const tasksWithSortKey = categoryTasks.map(task => {
    if (reorderedIdsSet.has(task.id)) {
      // Reordered task: use new position as sort key
      return {
        id: task.id,
        sortKey: newOrderMap.get(task.id) ?? Infinity,
      };
    } else {
      // Non-reordered task: calculate sort key based on relative position
      const oldPos = oldOrderMap.get(task.id) ?? Infinity;
      
      // Count reordered tasks that come before this task in old order
      let reorderedBefore = 0;
      for (const reorderedId of taskIds) {
        const reorderedOldPos = oldOrderMap.get(reorderedId) ?? Infinity;
        if (reorderedOldPos < oldPos) {
          reorderedBefore++;
        }
      }
      
      // The sort key is: old position minus reordered tasks that were before,
      // but we need to account for where reordered tasks are now
      // Simple approach: use old position, but adjust by counting reordered tasks
      // that now come before this position
      let adjustment = 0;
      for (const reorderedId of taskIds) {
        const reorderedOldPos = oldOrderMap.get(reorderedId) ?? Infinity;
        const reorderedNewPos = newOrderMap.get(reorderedId) ?? Infinity;
        // If a reordered task moved from after to before this position, adjust
        if (reorderedOldPos > oldPos && reorderedNewPos <= oldPos - reorderedBefore) {
          adjustment++;
        }
      }
      
      return {
        id: task.id,
        sortKey: oldPos - reorderedBefore + adjustment,
      };
    }
  });
  
  // Sort by sort key, using old position as tiebreaker for stability
  tasksWithSortKey.sort((a, b) => {
    const aTask = categoryTasks.find(t => t.id === a.id)!;
    const bTask = categoryTasks.find(t => t.id === b.id)!;
    if (a.sortKey !== b.sortKey) {
      return a.sortKey - b.sortKey;
    }
    // Tiebreaker: use old position to preserve relative order
    return (oldOrderMap.get(a.id) ?? Infinity) - (oldOrderMap.get(b.id) ?? Infinity);
  });
  
  const finalOrderIds = tasksWithSortKey.map(t => t.id);

  // Build updates with new display_order (1-based)
  const updates = finalOrderIds.map((id, index) => ({
    id,
    display_order: index + 1,
  }));

  // Update all tasks in the category with new display_order
  const updatePromises = updates.map(({ id, display_order }) =>
    supabase
      .from('tasks')
      .update({ display_order, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
  );

  const results = await Promise.all(updatePromises);
  const hasError = results.some(result => result.error);

  if (hasError) {
    console.error('Error updating display_order');
    return false;
  }

  revalidatePath('/mes-taches');
  return true;
}
