import { Task, Frequency, DayOfWeek } from '@/lib/types';
import { normalizeToMidnight, parseDateLocal, addDays } from '@/lib/utils';

/**
 * Retourne le nom du jour en français
 */
export function getDayName(date: Date): DayOfWeek {
  const days: DayOfWeek[] = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  return days[date.getDay()];
}

/**
 * Retourne l'index du jour (0 = Dimanche, 1 = Lundi, etc.)
 */
function getDayIndex(dayName: DayOfWeek): number {
  const days: DayOfWeek[] = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  return days.indexOf(dayName);
}

/**
 * Retourne le premier jour de la semaine (lundi) d'un mois donné
 */
function getFirstWeekday(year: number, month: number, targetDay: number): Date {
  const date = normalizeToMidnight(new Date(year, month, 1));
  const offset = (targetDay - date.getDay() + 7) % 7;
  return addDays(date, offset);
}

/**
 * Retourne le nombre de jours maximum de décalage par défaut selon la fréquence
 */
export function getDefaultMaxShiftingDays(
  frequency: Frequency | undefined,
  _customDays?: number
): number {
  if (frequency === 'hebdomadaire') return 7;
  if (frequency === 'mensuel') return 28;
  if (frequency === 'annuel') return 45;
  if (frequency === 'personnalisé') return 7;
  return 7;
}

/**
 * Calcule la date originale programmée pour une tâche périodique
 */
export function calculateOriginalScheduledDate(
  task: Task,
  targetDate: Date
): Date | null {
  const normalizedDate = normalizeToMidnight(targetDate);
  const dayName = getDayName(normalizedDate);
  const taskDayIndex = task.day ? getDayIndex(task.day) : null;
  const currentDayIndex = getDayIndex(dayName);
  const startDate = task.start_date ? parseDateLocal(task.start_date) : null;
  const normalizedStartDate = startDate ? normalizeToMidnight(startDate) : null;
  
  if (task.frequency === 'hebdomadaire') {
    return calculateWeeklyOriginalDate(task, normalizedDate, taskDayIndex, currentDayIndex, dayName);
  } else if (task.frequency === 'mensuel') {
    return calculateMonthlyOriginalDate(task, normalizedDate, taskDayIndex, dayName);
  } else if (task.frequency === 'annuel') {
    return calculateYearlyOriginalDate(task, normalizedDate, normalizedStartDate);
  } else if (task.frequency === 'personnalisé') {
    return calculateCustomOriginalDate(task, normalizedDate, normalizedStartDate);
  }
  
  return null;
}

function calculateWeeklyOriginalDate(
  task: Task,
  normalizedDate: Date,
  taskDayIndex: number | null,
  currentDayIndex: number,
  dayName: DayOfWeek
): Date | null {
  if (taskDayIndex === null) return null;
  if (task.day === dayName) return normalizedDate;
  
  if (currentDayIndex > taskDayIndex) {
    return addDays(normalizedDate, -(currentDayIndex - taskDayIndex));
  } else {
    return addDays(normalizedDate, -(7 - (taskDayIndex - currentDayIndex)));
  }
}

function calculateMonthlyOriginalDate(
  task: Task,
  normalizedDate: Date,
  taskDayIndex: number | null,
  dayName: DayOfWeek
): Date | null {
  if (taskDayIndex === null) return null;
  if (task.day === dayName && normalizedDate.getDate() <= 7) {
    return normalizedDate;
  }
  
  const candidateDate = getFirstWeekday(
    normalizedDate.getFullYear(),
    normalizedDate.getMonth(),
    taskDayIndex
  );
  
  if (candidateDate > normalizedDate) return null;
  return candidateDate;
}

function calculateYearlyOriginalDate(
  task: Task,
  normalizedDate: Date,
  normalizedStartDate: Date | null
): Date | null {
  if (!normalizedStartDate) return null;
  if (normalizedDate < normalizedStartDate) return null;
  
  const currentYear = normalizedDate.getFullYear();
  const startMonth = normalizedStartDate.getMonth();
  const startDay = normalizedStartDate.getDate();
  const candidateDate = normalizeToMidnight(new Date(currentYear, startMonth, startDay));
  const daysDifference = Math.floor(
    (normalizedDate.getTime() - candidateDate.getTime()) / 86400000
  );
  
  const maxDays = task.max_shifting_days ?? getDefaultMaxShiftingDays(task.frequency);
  if (candidateDate > normalizedDate || daysDifference > maxDays) return null;
  
  return candidateDate;
}

function calculateCustomOriginalDate(
  task: Task,
  normalizedDate: Date,
  normalizedStartDate: Date | null
): Date | null {
  if (!normalizedStartDate || !task.custom_days) return null;
  if (normalizedDate < normalizedStartDate) return null;
  
  const daysBetween = Math.floor(
    (normalizedDate.getTime() - normalizedStartDate.getTime()) / 86400000
  );
  
  if (daysBetween >= 0 && daysBetween % task.custom_days === 0) {
    return normalizedDate;
  }
  
  const k = Math.floor(daysBetween / task.custom_days);
  const previousOffset = k * task.custom_days;
  const candidateDate = normalizeToMidnight(
    new Date(normalizedStartDate.getTime() + previousOffset * 86400000)
  );
  
  // Return the candidate date (mode check will be done in shifting logic)
  return candidateDate;
}

