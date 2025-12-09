import { supabaseServerReadOnly } from '@/lib/supabase/supabase-server';
import { Task } from '@/lib/types';

// Fonctions de lecture pour Server Components
export async function getTasks(userId: string): Promise<Task[]> {
  const supabase = await supabaseServerReadOnly();

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching tasks:', error);
    return [];
  }

  return data || [];
}
