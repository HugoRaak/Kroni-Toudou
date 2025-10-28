import { getSpecificDatesByDateRange } from '@/lib/db/specific-dates';
import { getPeriodics } from '@/lib/db/periodics';
import { getWhenPossible } from '@/lib/db/when-possible';

export interface CalendarTask {
  id: string;
  task: string;
  description: string;
  type: 'specific' | 'periodic' | 'when_possible';
  dueDate?: string;
  frequency?: string;
  day?: string;
  inProgress?: boolean;
  postponedDays?: number;
}

export async function getTasksForDateRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<CalendarTask[]> {
  const [specificDates, periodics, whenPossible] = await Promise.all([
    getSpecificDatesByDateRange(userId, startDate, endDate),
    getPeriodics(userId),
    getWhenPossible(userId),
  ]);

  const tasks: CalendarTask[] = [];

  // Ajouter les tâches avec dates spécifiques
  specificDates.forEach((task) => {
    tasks.push({
      id: task.id,
      task: task.task,
      description: task.description,
      type: 'specific',
      dueDate: task.due_on,
      postponedDays: task.postponed_days,
    });
  });

  // Ajouter les tâches périodiques (logique simplifiée pour l'instant)
  periodics.forEach((task) => {
    // Pour l'instant, on ajoute toutes les tâches périodiques
    // Plus tard, on pourra calculer les dates exactes selon la fréquence
    tasks.push({
      id: task.id,
      task: task.task,
      description: task.description,
      type: 'periodic',
      frequency: task.frequency,
      day: task.day,
    });
  });

  // Ajouter les tâches "quand possible"
  whenPossible.forEach((task) => {
    tasks.push({
      id: task.id,
      task: task.task,
      description: task.description,
      type: 'when_possible',
      inProgress: task.in_progress,
    });
  });

  return tasks;
}

export function getTasksForDate(tasks: CalendarTask[], date: string): CalendarTask[] {
  return tasks.filter((task) => {
    if (task.type === 'specific') {
      return task.dueDate === date;
    }
    // Pour les autres types, on peut ajouter une logique plus complexe plus tard
    return false;
  });
}
