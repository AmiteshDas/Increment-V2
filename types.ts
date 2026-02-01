
export type EffortLevel = 'Easy' | 'Medium' | 'Hard';

export interface Arc {
  id: string;
  name: string; // e.g. "Runner", "Reader"
  stage: 'Early' | 'Middle' | 'Mature';
  archived: boolean;
  createdAt: string;
}

export interface Increment {
  id: string;
  arcId: string;
  date: string; // YYYY-MM-DD
  description: string; // "Run 5k"
  effort: EffortLevel;
  repeat: boolean; // Yes (sustainable) or No (unsustainable)
  effectiveFriction: number; // Calculated
}

export interface DailyNote {
  id: string;
  date: string; // YYYY-MM-DD
  text: string;
}

export interface ArcWithStats extends Arc {
  recentFriction: number; // For sorting/prioritization
  totalIncrements: number;
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

export interface Habit {
  id: string;
  name: string;
  minVersion: string;
  archived: boolean;
  programId?: string;
  createdAt: string;
}
