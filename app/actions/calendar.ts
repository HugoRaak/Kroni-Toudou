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
  const [dayData, modeValue] = await Promise.all([
    getTasksForDay(userId, date),
    getWorkday(userId, formatDateLocal(date)),
  ]);
  return { view: "day" as const, dayData, mode: modeValue };
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
