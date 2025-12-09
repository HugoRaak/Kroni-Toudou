import { SupabaseClient } from '@supabase/supabase-js';
import { TaskCategory, getCategoryFilter } from '@/lib/tasks/processing/task-metadata';
import {
  calculateReorderedSortKey,
  calculateNonReorderedSortKey,
  countReorderedBefore
} from './task-sorting-helpers';

export async function updateTasksDisplayOrder(
  supabase: SupabaseClient,
  userId: string,
  taskIds: string[],
  category: TaskCategory
): Promise<boolean> {
  if (taskIds.length === 0) return true;

  const { data: allUserTasks, error: fetchAllError } = await supabase
    .from('tasks')
    .select('id, frequency, due_on, display_order')
    .eq('user_id', userId)
    .order('display_order', { ascending: true, nullsFirst: false });

  if (fetchAllError || !allUserTasks) {
    console.error('Error fetching all tasks:', fetchAllError);
    return false;
  }

  const reorderedTasksForVerification = allUserTasks.filter(t => taskIds.includes(t.id));
  if (reorderedTasksForVerification.length !== taskIds.length) {
    console.error('Error: some tasks not found or not owned by user');
    return false;
  }

  const categoryFilter = getCategoryFilter(category);
  const categoryTasks = allUserTasks
    .filter(categoryFilter)
    .sort((a, b) => {
      const aOrder = a.display_order ?? Infinity;
      const bOrder = b.display_order ?? Infinity;
      return aOrder - bOrder;
    });

  const reorderedIdsSet = new Set(taskIds);
  const oldOrderMap = new Map<string, number>();
  categoryTasks.forEach((task, index) => {
    oldOrderMap.set(task.id, index);
  });

  const newPositionMap = new Map<string, number>();
  taskIds.forEach((id, index) => {
    newPositionMap.set(id, index);
  });

  // Calculer les clés de tri en utilisant les helpers
  const tasksWithSortKey = categoryTasks.map(task => {
    const oldPos = oldOrderMap.get(task.id) ?? Infinity;
    
    if (reorderedIdsSet.has(task.id)) {
      const newPos = newPositionMap.get(task.id) ?? Infinity;
      return {
        id: task.id,
        sortKey: calculateReorderedSortKey(newPos),
        oldPos,
        isReordered: true,
      };
    } else {
      const reorderedBeforeCount = countReorderedBefore(
        taskIds,
        oldOrderMap,
        newPositionMap,
        oldPos
      );
      
      // Calculer maxReorderedBeforeNewPos
      let maxReorderedBeforeNewPos = -1;
      for (const reorderedId of taskIds) {
        const reorderedOldPos = oldOrderMap.get(reorderedId) ?? Infinity;
        const reorderedNewPos = newPositionMap.get(reorderedId) ?? Infinity;
        
        if ((reorderedOldPos < oldPos) || (reorderedOldPos > oldPos && reorderedNewPos < oldPos)) {
          maxReorderedBeforeNewPos = Math.max(maxReorderedBeforeNewPos, reorderedNewPos);
        }
      }
      
      return {
        id: task.id,
        sortKey: calculateNonReorderedSortKey(
          oldPos,
          reorderedBeforeCount,
          maxReorderedBeforeNewPos,
          categoryTasks.length
        ),
        oldPos,
        isReordered: false,
      };
    }
  });
  
  tasksWithSortKey.sort((a, b) => {
    if (a.sortKey !== b.sortKey) {
      return a.sortKey - b.sortKey;
    }
    return a.oldPos - b.oldPos;
  });
  
  const finalOrderIds = tasksWithSortKey.map(t => t.id);

  const updatePromises = finalOrderIds.map((id, index) =>
    supabase
      .from('tasks')
      .update({ display_order: index + 1, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
  );

  const results = await Promise.all(updatePromises);
  const hasError = results.some(result => result.error);

  if (hasError) {
    console.error('Error updating display_order');
    return false;
  }

  return true;
}

