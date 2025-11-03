export type Frequency = 'quotidien' | 'hebdomadaire' | 'mensuel' | 'annuel';
export type DayOfWeek = 'Lundi' | 'Mardi' | 'Mercredi' | 'Jeudi' | 'Vendredi' | 'Samedi' | 'Dimanche';

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string;
  frequency?: Frequency;
  day?: DayOfWeek;
  due_on?: string;
  postponed_days?: number;
  in_progress?: boolean;
  mode?: 'Tous' | 'Présentiel' | 'Distanciel';
  created_at: string;
  updated_at: string;
}
