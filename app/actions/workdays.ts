"use server";

import { getWorkday, getWorkdaysInRange, upsertWorkday, WorkMode } from "@/lib/db/workdays";
import { supabaseServer } from "@/lib/supabase-server";

export async function getWorkdayAction(userId: string, date: Date): Promise<WorkMode> {
  const iso = date.toISOString().split('T')[0];
  return await getWorkday(userId, iso);
}

export async function getWorkdaysForRangeAction(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<Record<string, WorkMode>> {
  const start = startDate.toISOString().split('T')[0];
  const end = endDate.toISOString().split('T')[0];
  return await getWorkdaysInRange(userId, start, end);
}

export async function setWorkdayAction(userId: string, date: Date, mode: WorkMode): Promise<boolean> {
  const iso = date.toISOString().split('T')[0];
  return await upsertWorkday(userId, iso, mode);
}

export async function setWorkdayForUserAction(date: Date, mode: WorkMode): Promise<boolean> {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const iso = date.toISOString().split('T')[0];
  return await upsertWorkday(user.id, iso, mode);
}


