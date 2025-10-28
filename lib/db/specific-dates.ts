import { supabase } from '../supabase';
import { SpecificDate } from '../types';

export async function getSpecificDates(userId: string): Promise<SpecificDate[]> {
  const { data, error } = await supabase
    .from('specific_dates')
    .select('*')
    .eq('user_id', userId)
    .order('due_on', { ascending: true });

  if (error) {
    console.error('Error fetching specific dates:', error);
    return [];
  }

  return data || [];
}

export async function getSpecificDatesByDateRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<SpecificDate[]> {
  const { data, error } = await supabase
    .from('specific_dates')
    .select('*')
    .eq('user_id', userId)
    .gte('due_on', startDate)
    .lte('due_on', endDate)
    .order('due_on', { ascending: true });

  if (error) {
    console.error('Error fetching specific dates by range:', error);
    return [];
  }

  return data || [];
}

export async function createSpecificDate(
  userId: string,
  task: string,
  dueOn: string,
  description: string = '',
  postponedDays: number = 0
): Promise<SpecificDate | null> {
  const { data, error } = await supabase
    .from('specific_dates')
    .insert({
      user_id: userId,
      task,
      description,
      due_on: dueOn,
      postponed_days: postponedDays,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating specific date:', error);
    return null;
  }

  return data;
}

export async function updateSpecificDate(
  id: string,
  updates: Partial<Pick<SpecificDate, 'task' | 'description' | 'due_on' | 'postponed_days'>>
): Promise<SpecificDate | null> {
  const { data, error } = await supabase
    .from('specific_dates')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating specific date:', error);
    return null;
  }

  return data;
}

export async function deleteSpecificDate(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('specific_dates')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting specific date:', error);
    return false;
  }

  return true;
}
