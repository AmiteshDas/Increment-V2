
export type HabitStatus = 'DONE' | 'PARTIAL' | 'SKIP' | 'PENDING';

export interface Habit {
  id: string;
  programId?: string; // Link to the detailed training plan
  name: string;
  minVersion: string;
  archived: boolean;
  createdAt: string;
}

export interface CheckIn {
  id: string;
  habitId: string;
  date: string; // YYYY-MM-DD
  status: HabitStatus;
}

export interface DailyNote {
  id: string;
  date: string; // YYYY-MM-DD
  text: string;
}

export interface HabitWithStatus extends Habit {
  status: HabitStatus;
}

export interface UserProfile {
  onboarded: boolean;
  ageRange?: string;
  busyness?: 'Low' | 'Medium' | 'High';
  optimizationFocus?: 'Work' | 'Health' | 'Learning' | 'General';
}

export interface ProgramWeek {
  weekNumber: number;
  title: string;
  bullets: string[];
}

export interface Program {
  id: string;
  title: string;
  intensity: string;
  why: string;
  weeks: ProgramWeek[];
  createdAt: string;
}
