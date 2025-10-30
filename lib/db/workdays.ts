import { supabaseServer, supabaseServerReadOnly } from "../supabase-server";

// One-line note: default work mode when absent is 'Présentiel'

export type WorkMode = 'Présentiel' | 'Distanciel' | 'Congé';

export async function getWorkday(userId: string, workDate: string): Promise<WorkMode | null> {
  const supabase = await supabaseServerReadOnly();
  const { data, error } = await supabase
    .from('workdays')
    .select('work_mode')
    .eq('user_id', userId)
    .eq('work_date', workDate)
    .maybeSingle();

  if (error) {
    console.error('Error fetching workday:', error);
    return null;
  }

  return (data?.work_mode as WorkMode) ?? null;
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
    return {};
  }

  const map: Record<string, WorkMode> = {};
  for (const row of data ?? []) {
    map[row.work_date as string] = row.work_mode as WorkMode;
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


