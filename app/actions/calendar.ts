'use server';

import {
  getTasksForDateRange,
  getTasksForDay,
  checkFutureTaskShifts,
} from '@/lib/calendar/calendar-utils';
import { supabaseServer } from '@/lib/supabase/supabase-server';
import { getWorkday, getWorkdaysInRange } from '@/lib/db/workdays';
import { parseDateLocal, normalizeToMidnight } from '@/lib/utils';

export async function getCalendarDayDataAction(params: {
  userId: string;
  dateStr: string; // YYYY-MM-DD format
}) {
  const { userId, dateStr } = params;
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.id !== userId) throw new Error('Unauthorized');
  // Parse date string to Date object using local timezone to avoid UTC shift
  const date = parseDateLocal(dateStr);
  const workMode = await getWorkday(userId, dateStr);
  const dayData = await getTasksForDay(userId, date, workMode);
  return { view: 'day' as const, dayData, mode: workMode };
}

export async function getCalendarRangeDataAction(params: {
  userId: string;
  startDateStr: string; // YYYY-MM-DD format
  endDateStr: string; // YYYY-MM-DD format
}) {
  const { userId, startDateStr, endDateStr } = params;
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.id !== userId) throw new Error('Unauthorized');

  // Parse date strings to Date objects using local timezone to avoid UTC shift
  const startDate = parseDateLocal(startDateStr);
  const endDate = parseDateLocal(endDateStr);

  const [tasksData, workdays] = await Promise.all([
    getTasksForDateRange(userId, startDate, endDate),
    getWorkdaysInRange(userId, startDateStr, endDateStr),
  ]);

  return { tasksData, workdays };
}

export async function checkFutureTaskShiftsAction(params: { userId: string }) {
  const { userId } = params;
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.id !== userId) throw new Error('Unauthorized');

  const today = normalizeToMidnight(new Date());
  const alerts = await checkFutureTaskShifts(userId, today);
  return { alerts };
}
