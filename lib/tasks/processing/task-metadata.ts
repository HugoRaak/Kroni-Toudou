import { SupabaseClient } from '@supabase/supabase-js';
import { Frequency } from '@/lib/types';

export type TaskCategory = 'periodic' | 'specific' | 'when-possible';

/**
 * Détermine la catégorie d'une tâche
 */
export function getTaskCategory(
  frequency: Frequency | null | undefined,
  due_on: string | null | undefined,
): TaskCategory {
  if (frequency) return 'periodic';
  if (due_on) return 'specific';
  return 'when-possible';
}

/**
 * Retourne un filtre pour identifier les tâches d'une catégorie
 */
export function getCategoryFilter(
  category: TaskCategory,
): (task: { frequency?: string | null; due_on?: string | null }) => boolean {
  if (category === 'periodic') {
    return (task) => !!task.frequency;
  } else if (category === 'specific') {
    return (task) => !!task.due_on && !task.frequency;
  } else {
    return (task) => !task.frequency && !task.due_on;
  }
}

/**
 * Extrait la catégorie depuis les données d'un formulaire
 */
export function getCategoryFromFormData(frequency?: Frequency, due_on?: string): TaskCategory {
  return getTaskCategory(frequency ?? null, due_on ?? null);
}

/**
 * Calcule le prochain display_order pour une catégorie
 */
export async function calculateNextDisplayOrder(
  supabase: SupabaseClient,
  userId: string,
  category: TaskCategory,
  excludeTaskId?: string,
): Promise<number> {
  const categoryFilter = getCategoryFilter(category);

  const { data: categoryTasks } = await supabase
    .from('tasks')
    .select('id, display_order, frequency, due_on')
    .eq('user_id', userId);

  if (!categoryTasks) return 1;

  const tasksInCategory = categoryTasks.filter(categoryFilter);
  const filteredTasks = excludeTaskId
    ? tasksInCategory.filter((t) => t.id !== excludeTaskId)
    : tasksInCategory;

  const maxDisplayOrder = filteredTasks
    .map((t) => t.display_order)
    .filter((order): order is number => typeof order === 'number')
    .reduce((max, order) => Math.max(max, order), 0);

  return maxDisplayOrder + 1;
}

/**
 * Vérifie si une tâche change de catégorie lors d'une mise à jour
 */
export function hasCategoryChanged(
  oldFrequency: Frequency | null | undefined,
  oldDueOn: string | null | undefined,
  newFrequency: Frequency | null | undefined,
  newDueOn: string | null | undefined,
): boolean {
  const oldCategory = getTaskCategory(oldFrequency, oldDueOn);
  const newCategory = getTaskCategory(newFrequency, newDueOn);
  return oldCategory !== newCategory;
}
