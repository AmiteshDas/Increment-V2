
import { Habit, CheckIn, DailyNote, HabitStatus, UserProfile, Program } from './types';

const STORAGE_KEY = 'increment_app_data_v2';

interface DB {
  userProfile: UserProfile;
  habits: Habit[];
  checkIns: CheckIn[];
  dailyNotes: DailyNote[];
  programs: Program[];
}

const getDB = (): DB => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    return { 
      userProfile: { onboarded: false }, 
      habits: [], 
      checkIns: [], 
      dailyNotes: [],
      programs: []
    };
  }
  return JSON.parse(data);
};

const saveDB = (db: DB) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
};

// Seeding logic
export const seedIfEmpty = () => {
  // Check if we specifically requested to skip seeding (e.g. from Reset button)
  const skipSeed = localStorage.getItem('increment_skip_seed');
  if (skipSeed === 'true') {
    localStorage.removeItem('increment_skip_seed');
    // Force a clean slate
    saveDB({
      userProfile: { onboarded: false },
      habits: [],
      checkIns: [],
      dailyNotes: [],
      programs: []
    });
    return;
  }

  const db = getDB();
  
  // If we have habits, don't re-seed
  if (db.habits.length > 0) return;

  // If no data, creating a robust demo state
  const today = new Date();
  
  // 1. Create Programs
  const prog1: Program = {
    id: 'prog-1',
    title: 'Reading Pro',
    intensity: 'small',
    why: 'I want to regain my attention span and learn from the greats.',
    createdAt: new Date(today.getTime() - 25 * 24 * 60 * 60 * 1000).toISOString(),
    weeks: [
      { weekNumber: 1, title: 'Foundation', bullets: ['Read 5 pages', 'Set up reading nook'] },
      { weekNumber: 2, title: 'Consistency', bullets: ['Read every morning', 'No phone in bed'] },
      { weekNumber: 3, title: 'Expansion', bullets: ['Increase to 15 mins', 'Take notes'] },
      { weekNumber: 4, title: 'Lock-in', bullets: ['Join a book club', 'Review monthly'] }
    ]
  };

  const prog2: Program = {
    id: 'prog-2',
    title: 'Couch to 5K',
    intensity: 'medium',
    why: 'To feel alive and energetic for my kids.',
    createdAt: new Date(today.getTime() - 25 * 24 * 60 * 60 * 1000).toISOString(),
    weeks: [
      { weekNumber: 1, title: 'The Start', bullets: ['Walk 20 mins', 'Run 1 min intervals'] },
      { weekNumber: 2, title: 'Building', bullets: ['Run 3 min intervals', 'Stretch daily'] },
      { weekNumber: 3, title: 'Pushing', bullets: ['Run 1 mile continuous', 'Hydrate well'] },
      { weekNumber: 4, title: 'The 5K', bullets: ['Run full 5k', 'Celebrate!'] }
    ]
  };

  // 2. Create Habits
  const habit1: Habit = {
    id: 'habit-1',
    programId: prog1.id,
    name: 'Reading Pro',
    minVersion: 'Read 2 pages',
    archived: false,
    createdAt: prog1.createdAt
  };

  const habit2: Habit = {
    id: 'habit-2',
    programId: prog2.id,
    name: 'Couch to 5K',
    minVersion: '10 min jog',
    archived: false,
    createdAt: prog2.createdAt
  };

  // 3. Generate History (20 days)
  const checkIns: CheckIn[] = [];
  const notes: DailyNote[] = [];

  for (let i = 20; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];

    // Habit 1: Good consistency
    if (Math.random() > 0.2) {
      checkIns.push({
        id: `c1-${i}`,
        habitId: habit1.id,
        date: dateStr,
        status: Math.random() > 0.8 ? 'PARTIAL' : 'DONE'
      });
    } else if (Math.random() > 0.5) {
      checkIns.push({ id: `c1-${i}`, habitId: habit1.id, date: dateStr, status: 'SKIP' });
    }

    // Habit 2: Struggling a bit
    if (Math.random() > 0.4) {
      checkIns.push({
        id: `c2-${i}`,
        habitId: habit2.id,
        date: dateStr,
        status: Math.random() > 0.5 ? 'DONE' : 'PARTIAL'
      });
    }

    // Notes
    if (Math.random() > 0.7) {
      notes.push({
        id: `n-${i}`,
        date: dateStr,
        text: `Day ${i}: Felt ${Math.random() > 0.5 ? 'good' : 'tired'}. Consistency is key.`
      });
    }
  }

  saveDB({
    userProfile: { onboarded: true, ageRange: '25-34', busyness: 'Medium', optimizationFocus: 'Health' },
    habits: [habit1, habit2],
    programs: [prog1, prog2],
    checkIns,
    dailyNotes: notes
  });
};

export const dbService = {
  user: {
    get: () => getDB().userProfile,
    update: (data: Partial<UserProfile>) => {
      const db = getDB();
      db.userProfile = { ...db.userProfile, ...data };
      saveDB(db);
    },
    reset: () => {
       const db = getDB();
       db.userProfile.onboarded = false;
       db.habits = []; 
       db.programs = [];
       db.checkIns = [];
       db.dailyNotes = [];
       saveDB(db);
    }
  },
  program: {
    create: (program: Program) => {
      const db = getDB();
      db.programs.push(program);
      saveDB(db);
    },
    update: (id: string, data: Partial<Program>) => {
      const db = getDB();
      db.programs = db.programs.map(p => p.id === id ? { ...p, ...data } : p);
      saveDB(db);
    },
    find: (id: string) => {
      const db = getDB();
      return db.programs.find(p => p.id === id);
    },
    findLatest: () => {
      const db = getDB();
      return db.programs[db.programs.length - 1];
    }
  },
  habit: {
    findMany: (includeArchived = false) => {
      const db = getDB();
      return includeArchived ? db.habits : db.habits.filter(h => !h.archived);
    },
    create: (name: string, minVersion: string, programId?: string) => {
      const db = getDB();
      const newHabit: Habit = {
        id: Math.random().toString(36).substr(2, 9),
        name,
        minVersion,
        programId,
        archived: false,
        createdAt: new Date().toISOString().split('T')[0]
      };
      db.habits.push(newHabit);
      saveDB(db);
      return newHabit;
    },
    update: (id: string, data: Partial<Habit>) => {
      const db = getDB();
      db.habits = db.habits.map(h => h.id === id ? { ...h, ...data } : h);
      saveDB(db);
    }
  },
  checkIn: {
    findMany: (date?: string) => {
      const db = getDB();
      if (date) return db.checkIns.filter(c => c.date === date);
      return db.checkIns;
    },
    findByHabit: (habitId: string) => {
      const db = getDB();
      return db.checkIns.filter(c => c.habitId === habitId);
    },
    upsert: (habitId: string, date: string, status: HabitStatus) => {
      const db = getDB();
      const existingIdx = db.checkIns.findIndex(c => c.habitId === habitId && c.date === date);
      if (existingIdx > -1) {
        db.checkIns[existingIdx].status = status;
      } else {
        db.checkIns.push({
          id: Math.random().toString(36).substr(2, 9),
          habitId,
          date,
          status
        });
      }
      saveDB(db);
    }
  },
  dailyNote: {
    findUnique: (date: string) => {
      const db = getDB();
      return db.dailyNotes.find(n => n.date === date);
    },
    upsert: (date: string, text: string) => {
      const db = getDB();
      const existingIdx = db.dailyNotes.findIndex(n => n.date === date);
      if (existingIdx > -1) {
        db.dailyNotes[existingIdx].text = text;
      } else {
        db.dailyNotes.push({
          id: Math.random().toString(36).substr(2, 9),
          date,
          text
        });
      }
      saveDB(db);
    },
    findMany: (startDate: string, endDate: string) => {
      const db = getDB();
      return db.dailyNotes.filter(n => n.date >= startDate && n.date <= endDate);
    }
  }
};
