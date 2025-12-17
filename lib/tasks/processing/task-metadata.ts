import { SupabaseClient } from '@supabase/supabase-js';
import { Frequency } from '@/lib/types';

export type TaskCategory = 'periodic' | 'specific' | 'when-possible';

/**
 * Détermine la catégorie d'une tâche
 * Rules:
 * - periodic: frequency != null
 * - whenPossible: frequency == null && in_progress != null (boolean)
 * - specific: frequency == null && due_on != null && in_progress == null
 */
export function getTaskCategory(
  frequency: Frequency | null | undefined,
  due_on: string | null | undefined,
  in_progress: boolean | null | undefined,
): TaskCategory {
  if (frequency) return 'periodic';
  // Check in_progress before due_on to prioritize when-possible
  // Use != null to catch both true and false (but not null/undefined)
  if (in_progress != null) return 'when-possible';
  if (due_on) return 'specific';
  return 'when-possible';
}

/**
 * Retourne un filtre pour identifier les tâches d'une catégorie
 */
export function getCategoryFilter(
  category: TaskCategory,
): (task: { frequency?: string | null; due_on?: string | null; in_progress?: boolean | null }) => boolean {
  if (category === 'periodic') {
    return (task) => !!task.frequency;
  } else if (category === 'specific') {
    return (task) => !!task.due_on && !task.frequency && task.in_progress == null;
  } else {
    // when-possible: frequency == null && in_progress != null
    return (task) => !task.frequency && task.in_progress != null;
  }
}

/**
 * Extrait la catégorie depuis les données d'un formulaire
 */
export function getCategoryFromFormData(
  frequency?: Frequency,
  due_on?: string,
  in_progress?: boolean | null,
): TaskCategory {
  return getTaskCategory(frequency ?? null, due_on ?? null, in_progress ?? null);
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
    .select('id, display_order, frequency, due_on, in_progress')
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
  oldInProgress: boolean | null | undefined,
  newFrequency: Frequency | null | undefined,
  newDueOn: string | null | undefined,
  newInProgress: boolean | null | undefined,
): boolean {
  const oldCategory = getTaskCategory(oldFrequency, oldDueOn, oldInProgress);
  const newCategory = getTaskCategory(newFrequency, newDueOn, newInProgress);
  return oldCategory !== newCategory;
}
