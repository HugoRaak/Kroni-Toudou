"use server";

import { getWorkday, getWorkdaysInRange, upsertWorkday, WorkMode } from "@/lib/db/workdays";
import { supabaseServer } from "@/lib/supabase/supabase-server";
import { verifyAuthenticated } from "@/lib/auth/auth-helpers";

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

export async function setWorkdayForUserAction(dateStr: string, mode: WorkMode): Promise<boolean> {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  return await upsertWorkday(user.id, dateStr, mode);
}


