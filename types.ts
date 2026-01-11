
export type HabitStatus = 'DONE' | 'PARTIAL' | 'SKIP' | 'PENDING';

export interface Habit {
  id: string;
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
