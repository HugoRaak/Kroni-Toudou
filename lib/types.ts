export type Frequency = 'daily' | 'monthly' | 'annually';
export type DayOfWeek = 'Lundi' | 'Mardi' | 'Mercredi' | 'Jeudi' | 'Vendredi' | 'Samedi' | 'Dimanche';

export interface Periodic {
  id: string;
  user_id: string;
  task: string;
  description: string;
  frequency: Frequency;
  day?: DayOfWeek;
  created_at: string;
  updated_at: string;
}

export interface SpecificDate {
  id: string;
  user_id: string;
  task: string;
  description: string;
  due_on: string;
  postponed_days: number;
  created_at: string;
  updated_at: string;
}

export interface WhenPossible {
  id: string;
  user_id: string;
  task: string;
  description: string;
  in_progress: boolean;
  created_at: string;
  updated_at: string;
}
