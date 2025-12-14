import { supabaseServer, supabaseServerReadOnly } from '@/lib/supabase/supabase-server';
import { getDefaultWorkMode, getFrenchPublicHolidays } from '@/lib/workday-defaults';
import { addDays, formatDateLocal, normalizeToMidnight, parseDateLocal } from '@/lib/utils';

export type WorkMode = 'Présentiel' | 'Distanciel' | 'Congé';

export async function getWorkday(userId: string, workDate: string): Promise<WorkMode> {
  const supabase = await supabaseServerReadOnly();
  const { data, error } = await supabase
    .from('workdays')
    .select('work_mode')
    .eq('user_id', userId)
    .eq('work_date', workDate)
    .maybeSingle();

  const holidays = await getFrenchPublicHolidays(parseDateLocal(workDate).getFullYear());
  if (error) {
    console.error('Error fetching workday:', error);
    return getDefaultWorkMode(workDate, holidays);
  }
  return (data?.work_mode as WorkMode) ?? getDefaultWorkMode(workDate, holidays);
}

export async function getWorkdaysInRange(
  userId: string,
  startDate: string,
  endDate: string,
): Promise<Record<string, WorkMode>> {
  const supabase = await supabaseServerReadOnly();
  const { data, error } = await supabase
    .from('workdays')
    .select('work_date, work_mode')
    .eq('user_id', userId)
    .gte('work_date', startDate)
    .lte('work_date', endDate);

  if (error) {
    console.error('Error fetching workdays range:', error);
  }

  const map: Record<string, WorkMode> = {};
  const dbWorkdays = new Set<string>();

  // Fill with database values
  for (const row of data ?? []) {
    // Normalize date format to YYYY-MM-DD to ensure consistency
    // Supabase may return dates in different formats, so we parse and reformat
    let dateStr: string;
    if (typeof row.work_date === 'string') {
      // If it's already a string, parse and reformat to ensure YYYY-MM-DD format
      dateStr = formatDateLocal(parseDateLocal(row.work_date));
    } else if (row.work_date instanceof Date) {
      // If it's a Date object, format it
      dateStr = formatDateLocal(row.work_date);
    } else {
      // Fallback: try to convert to string and parse
      dateStr = formatDateLocal(parseDateLocal(String(row.work_date)));
    }
    map[dateStr] = row.work_mode as WorkMode;
    dbWorkdays.add(dateStr);
  }

  // Fill missing dates with defaults
  const start = parseDateLocal(startDate);
  const end = parseDateLocal(endDate);

  // Iterate through dates using constructor to guarantee midnight local time
  let current = normalizeToMidnight(start);
  const endDateObj = normalizeToMidnight(end);

  const holidays = await getFrenchPublicHolidays(current.getFullYear());

  while (current <= endDateObj) {
    const dateStr = formatDateLocal(current);
    if (!dbWorkdays.has(dateStr)) {
      map[dateStr] = getDefaultWorkMode(current, holidays);
    }
    current = addDays(current, 1);
  }

  return map;
}

export async function upsertWorkday(
  userId: string,
  workDate: string,
  workMode: WorkMode,
): Promise<boolean> {
  const supabase = await supabaseServer();
  const { error } = await supabase.from('workdays').upsert(
    {
      user_id: userId,
      work_date: workDate,
      work_mode: workMode,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,work_date' },
  );

  if (error) {
    console.error('Error upserting workday:', error);
    return false;
  }
  return true;
}

export async function upsertWorkdaysBatch(
  userId: string,
  workdays: Array<{ workDate: string; workMode: WorkMode }>,
): Promise<boolean> {
  if (workdays.length === 0) return true;

  const supabase = await supabaseServer();
  const now = new Date().toISOString();
  const { error } = await supabase.from('workdays').upsert(
    workdays.map(({ workDate, workMode }) => ({
      user_id: userId,
      work_date: workDate,
      work_mode: workMode,
      updated_at: now,
    })),
    { onConflict: 'user_id,work_date' },
  );

  if (error) {
    console.error('Error upserting workdays batch:', error);
    return false;
  }
  return true;
}

export async function getWorkdaysMap(
  userId: string,
  startDate: Date,
  maxDays: number = 45,
): Promise<Record<string, WorkMode>> {
  const current = normalizeToMidnight(startDate);
  const endDate = addDays(current, maxDays);
  const startDateStr = formatDateLocal(current);
  const endDateStr = formatDateLocal(endDate);
  return await getWorkdaysInRange(userId, startDateStr, endDateStr);
}
