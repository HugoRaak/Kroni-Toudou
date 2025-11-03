"use server";

import { getWorkday, getWorkdaysInRange, upsertWorkday, WorkMode } from "@/lib/db/workdays";
import { supabaseServer } from "@/lib/supabase/supabase-server";
import { formatDateLocal } from "@/lib/utils";
import { verifyAuthenticated } from "@/lib/auth/auth-helpers";

export async function getWorkdayAction(userId: string, date: Date): Promise<WorkMode> {
  const supabase = await supabaseServer();
  const user = await verifyAuthenticated(supabase);
  if (!user || user.id !== userId) {
    console.warn('Security: userId mismatch or user not authenticated');
    return 'Présentiel'; // Default fallback
  }
  const iso = formatDateLocal(date);
  return await getWorkday(userId, iso);
}

export async function getWorkdaysForRangeAction(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<Record<string, WorkMode>> {
  const supabase = await supabaseServer();
  const user = await verifyAuthenticated(supabase);
  if (!user || user.id !== userId) {
    console.warn('Security: userId mismatch or user not authenticated');
    return {};
  }
  const start = formatDateLocal(startDate);
  const end = formatDateLocal(endDate);
  return await getWorkdaysInRange(userId, start, end);
}

export async function setWorkdayAction(userId: string, date: Date, mode: WorkMode): Promise<boolean> {
  const supabase = await supabaseServer();
  const user = await verifyAuthenticated(supabase);
  if (!user || user.id !== userId) {
    console.warn('Security: userId mismatch or user not authenticated');
    return false;
  }
  const iso = formatDateLocal(date);
  return await upsertWorkday(userId, iso, mode);
}

export async function setWorkdayForUserAction(date: Date, mode: WorkMode): Promise<boolean> {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const iso = formatDateLocal(date);
  return await upsertWorkday(user.id, iso, mode);
}


