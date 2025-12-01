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
import { sanitizeServer } from "@/lib/sanitize-server";

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
  custom_days?: number,
  max_shifting_days?: number,
  start_date?: string,
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
  
  // Determine task category and calculate display_order
  // Category logic matches updateTasksDisplayOrderAction
  let categoryFilter: (task: { frequency?: string | null; due_on?: string | null }) => boolean;
  
  if (frequency) {
    // Periodic tasks: have frequency
    categoryFilter = (task) => !!task.frequency;
  } else if (due_on) {
    // Specific tasks: have due_on but no frequency
    categoryFilter = (task) => !!task.due_on && !task.frequency;
  } else {
    // When possible tasks: no frequency and no due_on
    categoryFilter = (task) => !task.frequency && !task.due_on;
  }
  
  // Get all tasks in the same category to find max display_order
  const { data: categoryTasks } = await supabase
    .from('tasks')
    .select('display_order, frequency, due_on')
    .eq('user_id', userId);
  
  const tasksInCategory = categoryTasks?.filter(categoryFilter) || [];
  const maxDisplayOrder = tasksInCategory
    .map(t => t.display_order)
    .filter((order): order is number => typeof order === 'number')
    .reduce((max, order) => Math.max(max, order), 0);
  
  const display_order = maxDisplayOrder + 1;
  
  // Sanitize description HTML before saving
  const sanitizedDescription = sanitizeServer(description);
  
  const { data, error } = await supabase
    .from('tasks')
    .insert({
        user_id: userId,
        title,
        description: sanitizedDescription,
        frequency,
        day,
        custom_days,
        max_shifting_days,
        start_date,
        due_on,
        in_progress,
        mode,
        postponed_days,
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

// Helper function to determine task category
function getTaskCategory(frequency: Frequency | null | undefined, due_on: string | null | undefined): 'periodic' | 'specific' | 'when-possible' {
  if (frequency) {
    return 'periodic';
  } else if (due_on) {
    return 'specific';
  } else {
    return 'when-possible';
  }
}

export async function updateTaskAction(
  id: string,
  updates: Partial<Pick<Task, 'title' | 'description' | 'frequency' | 'day' | 'custom_days' | 'max_shifting_days' | 'start_date' | 'due_on' | 'postponed_days' | 'in_progress' | 'mode' | 'display_order'>>
): Promise<TaskActionResult> {
  const supabase = await supabaseServer();
  
  const verification = await verifyTaskOwnership(supabase, id);
  if (!verification) {
    return null;
  }
  
  // Get current task to check category and for mode conflict check
  const { data: currentTask } = await supabase
    .from('tasks')
    .select('frequency, due_on, mode')
    .eq('id', id)
    .single();
  
  if (!currentTask) {
    return null;
  }
  
  // Check mode conflict if due_on or mode is being updated
  if (updates.due_on !== undefined || updates.mode !== undefined) {
    const due_on = updates.due_on ?? currentTask.due_on;
    const mode = updates.mode ?? currentTask.mode;
    
    const modeConflict = await checkModeConflict(verification.user.id, due_on, mode);
    if (modeConflict) {
      return modeConflict;
    }
  }
  
  // Determine if task category is changing
  // Check if fields are being explicitly cleared (set to undefined/null) vs not being updated
  // If a field is in the updates object, it's being updated (even if undefined means clear it)
  // If a field is not in the updates object, it's not being updated (use current value)
  const frequencyIsBeingUpdated = 'frequency' in updates;
  const dueOnIsBeingUpdated = 'due_on' in updates;
  
  const currentFrequency = frequencyIsBeingUpdated 
    ? (updates.frequency ?? null) // undefined or null means clear it
    : currentTask.frequency;
  const currentDueOn = dueOnIsBeingUpdated 
    ? (updates.due_on ?? null) // undefined or null means clear it
    : currentTask.due_on;
  
  const oldCategory = getTaskCategory(currentTask.frequency, currentTask.due_on);
  const newCategory = getTaskCategory(currentFrequency, currentDueOn);
  
  // If category changed, reinitialize display_order at the end of the new category
  if (oldCategory !== newCategory) {
    // Determine category filter for the new category
    let categoryFilter: (task: { frequency?: string | null; due_on?: string | null }) => boolean;
    
    if (newCategory === 'periodic') {
      categoryFilter = (task) => !!task.frequency;
    } else if (newCategory === 'specific') {
      categoryFilter = (task) => !!task.due_on && !task.frequency;
    } else {
      categoryFilter = (task) => !task.frequency && !task.due_on;
    }
    
    // Get all tasks in the new category to find max display_order
    const { data: categoryTasks } = await supabase
      .from('tasks')
      .select('display_order, frequency, due_on')
      .eq('user_id', verification.user.id)
      .neq('id', id); // Exclude current task
    
    const tasksInCategory = categoryTasks?.filter(categoryFilter) || [];
    const maxDisplayOrder = tasksInCategory
      .map(t => t.display_order)
      .filter((order): order is number => typeof order === 'number')
      .reduce((max, order) => Math.max(max, order), 0);
    
    updates.display_order = maxDisplayOrder + 1;
  }
  
  // Convert undefined to null for Supabase (undefined is ignored, null removes fields)
  // Sanitize description if it's being updated
  const cleanedUpdates: any = {};
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
    parsed.custom_days,
    parsed.max_shifting_days,
    parsed.start_date,
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
  const reorderedTasksForVerification = allUserTasks.filter(t => taskIds.includes(t.id));
  if (reorderedTasksForVerification.length !== taskIds.length) {
    console.error('Error: some tasks not found or not owned by user');
    return false;
  }

  // Determine category from first reordered task
  const firstTask = reorderedTasksForVerification[0];
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

  // Create sets and maps for efficient lookup
  const reorderedIdsSet = new Set(taskIds);
  const oldOrderMap = new Map<string, number>(); // taskId -> position in old order (0-based)
  categoryTasks.forEach((task, index) => {
    oldOrderMap.set(task.id, index);
  });

  // Create a map of new positions for reordered tasks (0-based indices from taskIds)
  const newPositionMap = new Map<string, number>();
  taskIds.forEach((id, index) => {
    newPositionMap.set(id, index);
  });

  // Build final order by properly merging reordered and non-reordered tasks
  // Strategy: Assign sort keys that correctly position tasks while preserving relative order
  
  // For each task, calculate its sort key
  const tasksWithSortKey = categoryTasks.map(task => {
    const oldPos = oldOrderMap.get(task.id) ?? Infinity;
    
    if (reorderedIdsSet.has(task.id)) {
      // Reordered task: use its new position directly as sort key
      const newPos = newPositionMap.get(task.id) ?? Infinity;
      return {
        id: task.id,
        sortKey: newPos,
        oldPos, // Keep for tiebreaker
        isReordered: true,
      };
    } else {
      // Non-reordered task: calculate where it should be inserted
      // It should come after all reordered tasks that were before it in old order
      // and before all reordered tasks that were after it in old order (unless they moved)
      
      // Count reordered tasks that should come before this non-reordered task
      let reorderedBeforeCount = 0;
      for (const reorderedId of taskIds) {
        const reorderedOldPos = oldOrderMap.get(reorderedId) ?? Infinity;
        const reorderedNewPos = newPositionMap.get(reorderedId) ?? Infinity;
        
        if (reorderedOldPos < oldPos) {
          // Was before in old order, should stay before
          reorderedBeforeCount++;
        } else if (reorderedOldPos > oldPos && reorderedNewPos < oldPos) {
          // Was after in old order but moved before this task's position
          reorderedBeforeCount++;
        }
      }
      
      // The sort key should place this task after the reordered tasks that come before it
      // Use the maximum new position of reordered tasks that come before it, plus a fraction
      // to ensure it comes after those reordered tasks but before any that come after
      let maxReorderedBeforeNewPos = -1;
      for (const reorderedId of taskIds) {
        const reorderedOldPos = oldOrderMap.get(reorderedId) ?? Infinity;
        const reorderedNewPos = newPositionMap.get(reorderedId) ?? Infinity;
        
        if ((reorderedOldPos < oldPos) || (reorderedOldPos > oldPos && reorderedNewPos < oldPos)) {
          maxReorderedBeforeNewPos = Math.max(maxReorderedBeforeNewPos, reorderedNewPos);
        }
      }
      
      // Sort key: use max position of reordered tasks before it, plus a small offset based on old position
      // This ensures non-reordered tasks maintain their relative order
      // If maxReorderedBeforeNewPos is -1, no reordered tasks come before, so use -1 as base
      // Otherwise, offset from maxReorderedBeforeNewPos + 1 to place after those reordered tasks
      // The fractional offset ensures non-reordered tasks maintain their relative order
      const basePos = maxReorderedBeforeNewPos === -1 ? -1 : maxReorderedBeforeNewPos + 1;
      const fractionalOffset = oldPos / (categoryTasks.length + 1); // Normalize to (0, 1)
      const sortKey = basePos + fractionalOffset;
      
      return {
        id: task.id,
        sortKey,
        oldPos, // Keep for tiebreaker
        isReordered: false,
      };
    }
  });
  
  // Sort by sort key, with tiebreaker to maintain relative order
  tasksWithSortKey.sort((a, b) => {
    if (a.sortKey !== b.sortKey) {
      return a.sortKey - b.sortKey;
    }
    // Tiebreaker: maintain relative order
    if (a.isReordered && b.isReordered) {
      // Both reordered: shouldn't happen (new positions should be unique)
      return a.oldPos - b.oldPos;
    }
    if (!a.isReordered && !b.isReordered) {
      // Both non-reordered: maintain their relative order
      return a.oldPos - b.oldPos;
    }
    // Mixed: reordered task comes first (shouldn't happen with correct sort keys)
    return a.isReordered ? -1 : 1;
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
