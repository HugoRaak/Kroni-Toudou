import { supabase } from '../supabase';
import { WhenPossible } from '../types';

export async function getWhenPossible(userId: string): Promise<WhenPossible[]> {
  const { data, error } = await supabase
    .from('when_possible')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching when possible tasks:', error);
    return [];
  }

  return data || [];
}

export async function createWhenPossible(
  userId: string,
  task: string,
  description: string = '',
  inProgress: boolean = true
): Promise<WhenPossible | null> {
  const { data, error } = await supabase
    .from('when_possible')
    .insert({
      user_id: userId,
      task,
      description,
      in_progress: inProgress,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating when possible task:', error);
    return null;
  }

  return data;
}

export async function updateWhenPossible(
  id: string,
  updates: Partial<Pick<WhenPossible, 'task' | 'description' | 'in_progress'>>
): Promise<WhenPossible | null> {
  const { data, error } = await supabase
    .from('when_possible')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating when possible task:', error);
    return null;
  }

  return data;
}

export async function deleteWhenPossible(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('when_possible')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting when possible task:', error);
    return false;
  }

  return true;
}
