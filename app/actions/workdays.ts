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
): Promise<ModeConflictError[]> {
  // Get all tasks for the user
  const allTasks = await getTasks(userId);
  
  // Filter to get only specific date tasks for this date
  const specificTasksForDate = allTasks.filter(task => task.due_on === dateStr);

  const conflicts: ModeConflictError[] = [];
  
  // Check each task for conflicts
  for (const task of specificTasksForDate) {
    const taskMode = task.mode ?? 'Tous';
    
    // If new work mode is Congé, all tasks conflict (including "Tous")
    if (newWorkMode === 'Congé') {
      conflicts.push({
        type: 'MODE_CONFLICT',
        taskDate: dateStr,
        taskMode: taskMode,
        workMode: 'Congé'
      });
      continue;
    }
    
    // Task mode "Tous" is compatible with Présentiel and Distanciel, but not Congé (already handled above)
    if (taskMode === 'Tous') continue;
    
    // Check if task mode doesn't match new work mode
    if (taskMode !== newWorkMode) {
      conflicts.push({
        type: 'MODE_CONFLICT',
        taskDate: dateStr,
        taskMode: taskMode,
        workMode: newWorkMode
      });
    }
  }
  
  return conflicts;
}

export type SetWorkdayResult = boolean | ModeConflictError | ModeConflictError[];

export async function setWorkdayForUserAction(dateStr: string, mode: WorkMode): Promise<SetWorkdayResult> {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  
  // Check for conflicts with specific date tasks
  const conflicts = await checkTasksForWorkModeConflict(user.id, dateStr, mode);
  if (conflicts.length > 0) {
    // Return first conflict for backward compatibility, or all conflicts
    return conflicts.length === 1 ? conflicts[0] : conflicts;
  }
  
  return await upsertWorkday(user.id, dateStr, mode);
}

// Check for conflicts without saving (used to detect conflicts before saving)
export async function checkWorkdayConflictForUserAction(dateStr: string, mode: WorkMode): Promise<ModeConflictError[]> {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  return await checkTasksForWorkModeConflict(user.id, dateStr, mode);
}

// Force set workday without checking conflicts (used when user confirms anyway)
export async function setWorkdayForUserActionForce(dateStr: string, mode: WorkMode): Promise<boolean> {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  return await upsertWorkday(user.id, dateStr, mode);
}


