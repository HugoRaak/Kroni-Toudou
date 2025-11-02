import { supabaseServer, supabaseServerReadOnly } from "../supabase-server";
import { getDefaultWorkMode } from "../workday-defaults";

export type WorkMode = 'Présentiel' | 'Distanciel' | 'Congé';

export async function getWorkday(userId: string, workDate: string): Promise<WorkMode> {
  const supabase = await supabaseServerReadOnly();
  const { data, error } = await supabase
    .from('workdays')
    .select('work_mode')
    .eq('user_id', userId)
    .eq('work_date', workDate)
    .maybeSingle();

  if (error) {
    console.error('Error fetching workday:', error);
    return await getDefaultWorkMode(workDate);
  }

  return (data?.work_mode as WorkMode) ?? await getDefaultWorkMode(workDate);
}

export async function getWorkdaysInRange(
  userId: string,
  startDate: string,
  endDate: string
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
    const dateStr = row.work_date as string;
    map[dateStr] = row.work_mode as WorkMode;
    dbWorkdays.add(dateStr);
  }

  // Fill missing dates with defaults
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  const current = new Date(start);
  
  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0];
    if (!dbWorkdays.has(dateStr)) {
      map[dateStr] = await getDefaultWorkMode(current);
    }
    current.setDate(current.getDate() + 1);
  }
  
  return map;
}

export async function upsertWorkday(
  userId: string,
  workDate: string,
  workMode: WorkMode
): Promise<boolean> {
  const supabase = await supabaseServer();
  const { error } = await supabase
    .from('workdays')
    .upsert(
      {
        user_id: userId,
        work_date: workDate,
        work_mode: workMode,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,work_date' }
    );

  if (error) {
    console.error('Error upserting workday:', error);
    return false;
  }
  return true;
}


