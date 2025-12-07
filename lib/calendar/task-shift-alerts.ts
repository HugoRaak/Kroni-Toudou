import { toast } from 'sonner';
import { parseDateLocal } from '@/lib/utils';
import type { TaskShiftAlert } from './calendar-utils';

export function showTaskShiftAlerts(alerts: TaskShiftAlert[]): void {
  if (alerts.length === 0) return;
  
  // Group alerts by taskId
  const alertsByTask = new Map<string, TaskShiftAlert[]>();
  alerts.forEach(alert => {
    if (!alertsByTask.has(alert.taskId)) {
      alertsByTask.set(alert.taskId, []);
    }
    alertsByTask.get(alert.taskId)!.push(alert);
  });
  
  // Sort tasks by first alert date (descending for display order)
  const sortedTasks = Array.from(alertsByTask.entries()).sort((a, b) => {
    const aFirstDate = a[1][0].originalDate;
    const bFirstDate = b[1][0].originalDate;
    return bFirstDate.localeCompare(aFirstDate);
  });

  // Show one toast per task with all dates
  sortedTasks.forEach(([_, taskAlerts]) => {
    const firstAlert = taskAlerts[0];
    const frequencyLabel = firstAlert.frequency === 'annuel' ? 'annuelle' : 'personnalisée';
    
    // Sort dates for this task (ascending)
    const sortedDates = taskAlerts
      .map(alert => ({
        date: alert.originalDate,
        isFuture: alert.isFutureShift ?? false
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    // Format dates
    const formattedDates = sortedDates.map(({ date, isFuture }) => {
      const dateStr = parseDateLocal(date).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      return isFuture ? dateStr : `${dateStr} (passée)`;
    });
    
    const datesList = formattedDates.length === 1
      ? formattedDates[0]
      : formattedDates.join(', ');
    
    const datesCount = formattedDates.length;
    const datesText = datesCount === 1 ? 'date' : 'dates';
    
    toast.warning(
      `Tâche "${firstAlert.taskTitle}" non décalable`,
      {
        description: `La tâche ${frequencyLabel} prévue ${datesCount > 1 ? `aux ${datesText}` : `à la ${datesText}`} ${datesList} ${firstAlert.taskMode === "Tous" ? "pour tous les modes" : `en ${firstAlert.taskMode}`} n'a pas pu être décalée à une date compatible.`,
        duration: Infinity,
      }
    );
  });
}

