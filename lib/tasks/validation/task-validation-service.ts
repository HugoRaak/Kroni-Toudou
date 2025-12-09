import { getWorkday } from '@/lib/db/workdays';

export type ModeConflictError = {
  type: 'MODE_CONFLICT';
  taskDate: string;
  taskMode: 'Tous' | 'Présentiel' | 'Distanciel';
  workMode: 'Présentiel' | 'Distanciel' | 'Congé';
};

/**
 * Vérifie si le mode d'une tâche est compatible avec le mode de travail du jour
 */
export async function checkModeConflict(
  userId: string,
  due_on: string | undefined,
  mode: 'Tous' | 'Présentiel' | 'Distanciel' | undefined
): Promise<ModeConflictError | null> {
  if (!due_on) return null;
  
  const workMode = await getWorkday(userId, due_on);
  
  if (workMode === 'Congé') {
    const taskMode = mode ?? 'Tous';
    return {
      type: 'MODE_CONFLICT',
      taskDate: due_on,
      taskMode: taskMode,
      workMode: 'Congé'
    };
  }
  
  if (!mode || mode === 'Tous') return null;
  
  if (mode !== workMode) {
    return {
      type: 'MODE_CONFLICT',
      taskDate: due_on,
      taskMode: mode,
      workMode: workMode
    };
  }
  
  return null;
}

