import type { SupabaseClient } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';

export interface TaskOwnershipVerification {
  user: User;
  taskUserId: string;
}

/**
 * Verifies that the current user is authenticated and owns the task.
 * Returns null if verification fails, otherwise returns user and task owner ID.
 */
export async function verifyTaskOwnership(
  supabase: SupabaseClient,
  taskId: string
): Promise<TaskOwnershipVerification | null> {
  // Verify authenticated user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.warn('Security: user not authenticated');
    return null;
  }

  // Verify task ownership
  const { data: task } = await supabase
    .from('tasks')
    .select('user_id')
    .eq('id', taskId)
    .single();
  
  if (!task || task.user_id !== user.id) {
    console.warn('Security: task ownership mismatch');
    return null;
  }
  
  return { user, taskUserId: task.user_id };
}

/**
 * Verifies that the current user is authenticated.
 * Returns null if verification fails, otherwise returns user.
 */
export async function verifyAuthenticated(
  supabase: SupabaseClient
): Promise<User | null> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.warn('Security: user not authenticated');
    return null;
  }
  return user;
}

