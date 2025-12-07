/**
 * Calcule la clé de tri pour une tâche réordonnée
 */
export function calculateReorderedSortKey(
  newPosition: number
): number {
  return newPosition;
}

/**
 * Calcule la clé de tri pour une tâche non réordonnée
 */
export function calculateNonReorderedSortKey(
  oldPosition: number,
  _reorderedBeforeCount: number,
  maxReorderedBeforeNewPos: number,
  totalTasks: number
): number {
  const basePos = maxReorderedBeforeNewPos === -1 ? -1 : maxReorderedBeforeNewPos + 1;
  const fractionalOffset = oldPosition / (totalTasks + 1);
  return basePos + fractionalOffset;
}

/**
 * Compte les tâches réordonnées qui doivent venir avant une position donnée
 */
export function countReorderedBefore(
  taskIds: string[],
  oldOrderMap: Map<string, number>,
  newPositionMap: Map<string, number>,
  targetOldPos: number
): number {
  let count = 0;
  for (const reorderedId of taskIds) {
    const reorderedOldPos = oldOrderMap.get(reorderedId) ?? Infinity;
    const reorderedNewPos = newPositionMap.get(reorderedId) ?? Infinity;
    
    if (reorderedOldPos < targetOldPos) {
      count++;
    } else if (reorderedOldPos > targetOldPos && reorderedNewPos < targetOldPos) {
      count++;
    }
  }
  return count;
}

