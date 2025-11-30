export type Frequency = 'quotidien' | 'hebdomadaire' | 'mensuel' | 'annuel' | 'personnalisé';
export type DayOfWeek = 'Lundi' | 'Mardi' | 'Mercredi' | 'Jeudi' | 'Vendredi' | 'Samedi' | 'Dimanche';

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string;
  frequency?: Frequency;
  day?: DayOfWeek;
  custom_days?: number;
  start_date?: string;
  due_on?: string;
  postponed_days?: number;
  in_progress?: boolean;
  mode?: 'Tous' | 'Présentiel' | 'Distanciel';
  display_order?: number;
  created_at: string;
  updated_at: string;
}

export interface TempTask {
  id: string;
  title: string;
  description: string;
  mode?: 'Tous' | 'Présentiel' | 'Distanciel';
  in_progress?: boolean;
  created_at: string;
}

export type TaskWithType = (Task & { taskType: 'periodic' | 'specific' | 'temp' }) | (TempTask & { taskType: 'temp' });
