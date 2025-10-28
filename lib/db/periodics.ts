import { supabase } from '../supabase';
import { Periodic, Frequency, DayOfWeek } from '../types';

export async function getPeriodics(userId: string): Promise<Periodic[]> {
  const { data, error } = await supabase
    .from('periodics')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching periodics:', error);
    return [];
  }

  return data || [];
}

export async function createPeriodic(
  userId: string,
  task: string,
  frequency: Frequency,
  description: string = '',
  day?: DayOfWeek
): Promise<Periodic | null> {
  const { data, error } = await supabase
    .from('periodics')
    .insert({
      user_id: userId,
      task,
      description,
      frequency,
      day,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating periodic:', error);
    return null;
  }

  return data;
}

export async function updatePeriodic(
  id: string,
  updates: Partial<Pick<Periodic, 'task' | 'description' | 'frequency' | 'day'>>
): Promise<Periodic | null> {
  const { data, error } = await supabase
    .from('periodics')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating periodic:', error);
    return null;
  }

  return data;
}

export async function deletePeriodic(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('periodics')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting periodic:', error);
    return false;
  }

  return true;
}
