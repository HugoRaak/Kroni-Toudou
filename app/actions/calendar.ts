"use server";

import { getTasksForDateRange, getTasksForDay } from "@/lib/calendar/calendar-utils";
import { supabaseServer } from "@/lib/supabase/supabase-server";
import { getWorkday, getWorkdaysInRange } from "@/lib/db/workdays";
import { formatDateLocal } from "@/lib/utils";

export async function getCalendarDayDataAction(params: {
  userId: string;
  date: Date;
}) {
  const { userId, date } = params;
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== userId) throw new Error("Unauthorized");
  const workMode = await getWorkday(userId, formatDateLocal(date));
  const dayData = await getTasksForDay(userId, date, workMode);
  return { view: "day" as const, dayData, mode: workMode };
}

export async function getCalendarRangeDataAction(params: {
  userId: string;
  startDate: Date;
  endDate: Date;
}) {
  const { userId, startDate, endDate } = params;
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== userId) throw new Error("Unauthorized");

  const [tasksData, workdays] = await Promise.all([
    getTasksForDateRange(userId, startDate, endDate),
    getWorkdaysInRange(userId, formatDateLocal(startDate), formatDateLocal(endDate)),
  ]);

  return { tasksData, workdays };
}
