"use server";

import { getWorkday, getWorkdaysInRange, upsertWorkday, WorkMode } from "@/lib/db/workdays";
import { supabaseServer } from "@/lib/supabase/supabase-server";
import { verifyAuthenticated } from "@/lib/auth/auth-helpers";
import { getTasks } from "@/lib/db/tasks";
import { ModeConflictError } from "@/app/actions/tasks";

// Accept YYYY-MM-DD strings instead of Date objects to avoid timezone serialization issues
export async function getWorkdayAction(userId: string, dateStr: string): Promise<WorkMode> {
  const supabase = await supabaseServer();
  const user = await verifyAuthenticated(supabase);
  if (!user || user.id !== userId) {
    console.warn('Security: userId mismatch or user not authenticated');
    return 'Présentiel'; // Default fallback
  }
  return await getWorkday(userId, dateStr);
}

export async function getWorkdaysForRangeAction(
  userId: string,
  startDateStr: string,
  endDateStr: string
): Promise<Record<string, WorkMode>> {
  const supabase = await supabaseServer();
  const user = await verifyAuthenticated(supabase);
  if (!user || user.id !== userId) {
    console.warn('Security: userId mismatch or user not authenticated');
    return {};
  }
  return await getWorkdaysInRange(userId, startDateStr, endDateStr);
}

export async function setWorkdayAction(userId: string, dateStr: string, mode: WorkMode): Promise<boolean> {
  const supabase = await supabaseServer();
  const user = await verifyAuthenticated(supabase);
  if (!user || user.id !== userId) {
    console.warn('Security: userId mismatch or user not authenticated');
    return false;
  }
  return await upsertWorkday(userId, dateStr, mode);
}

// Check if changing work mode creates conflicts with specific date tasks
async function checkTasksForWorkModeConflict(
  userId: string,
  dateStr: string,
  newWorkMode: WorkMode
): Promise<ModeConflictError | null> {
  // Get all tasks for the user
  const allTasks = await getTasks(userId);
  
  // Filter to get only specific date tasks for this date
  const specificTasksForDate = allTasks.filter(task => task.due_on === dateStr);
  
  // Check each task for conflicts
  for (const task of specificTasksForDate) {
    const taskMode = task.mode ?? 'Tous';
    
    // Skip if task mode is "Tous" (always compatible)
    if (taskMode === 'Tous') continue;
    
    // If new work mode is Congé, all tasks conflict
    if (newWorkMode === 'Congé') {
      return {
        type: 'MODE_CONFLICT',
        taskDate: dateStr,
        taskMode: taskMode,
        workMode: 'Congé'
      };
    }
    
    // Check if task mode doesn't match new work mode
    if (taskMode !== newWorkMode) {
      return {
        type: 'MODE_CONFLICT',
        taskDate: dateStr,
        taskMode: taskMode,
        workMode: newWorkMode
      };
    }
  }
  
  return null;
}

export type SetWorkdayResult = boolean | ModeConflictError;

export async function setWorkdayForUserAction(dateStr: string, mode: WorkMode): Promise<SetWorkdayResult> {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  
  // Check for conflicts with specific date tasks
  const conflict = await checkTasksForWorkModeConflict(user.id, dateStr, mode);
  if (conflict) {
    return conflict;
  }
  
  return await upsertWorkday(user.id, dateStr, mode);
}

// Check for conflicts without saving (used to detect conflicts before saving)
export async function checkWorkdayConflictForUserAction(dateStr: string, mode: WorkMode): Promise<ModeConflictError | null> {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return await checkTasksForWorkModeConflict(user.id, dateStr, mode);
}

// Force set workday without checking conflicts (used when user confirms anyway)
export async function setWorkdayForUserActionForce(dateStr: string, mode: WorkMode): Promise<boolean> {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  return await upsertWorkday(user.id, dateStr, mode);
}


