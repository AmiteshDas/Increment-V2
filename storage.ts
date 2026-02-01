
import { Arc, Increment, DailyNote, UserProfile, EffortLevel, Habit, Program } from './types';

const STORAGE_KEY = 'increment_app_arcs_v1';

interface DB {
  userProfile: UserProfile;
  arcs: Arc[];
  increments: Increment[];
  dailyNotes: DailyNote[];
  habits: Habit[];
  programs: Program[];
}

const getDB = (): DB => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    return { 
      userProfile: { onboarded: false }, 
      arcs: [], 
      increments: [], 
      dailyNotes: [],
      habits: [],
      programs: []
    };
  }
  const parsed = JSON.parse(data);
  // Ensure new fields exist for existing users
  return {
    ...parsed,
    habits: parsed.habits || [],
    programs: parsed.programs || []
  };
};

const saveDB = (db: DB) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
};

const calculateFriction = (effort: EffortLevel, repeat: boolean): number => {
  let base = 1;
  if (effort === 'Medium') base = 2;
  if (effort === 'Hard') base = 3;
  
  const modifier = repeat ? 0.9 : 1.3;
  return Number((base * modifier).toFixed(2));
};

// Simulation Logic
export const seedIfEmpty = () => {
  const skipSeed = localStorage.getItem('increment_skip_seed');
  if (skipSeed === 'true') {
    localStorage.removeItem('increment_skip_seed');
    saveDB({ userProfile: { onboarded: false }, arcs: [], increments: [], dailyNotes: [], habits: [], programs: [] });
    return;
  }

  const db = getDB();
  if (db.arcs.length > 0) return;

  const today = new Date();
  
  // 1. Create Arcs
  const arc1: Arc = { id: 'arc-1', name: 'Reader', stage: 'Early', archived: false, createdAt: new Date().toISOString() };
  const arc2: Arc = { id: 'arc-2', name: 'Runner', stage: 'Middle', archived: false, createdAt: new Date().toISOString() };
  const arc3: Arc = { id: 'arc-3', name: 'Clear Thinker', stage: 'Mature', archived: false, createdAt: new Date().toISOString() };

  // 2. Generate 14 Days of Increments
  const increments: Increment[] = [];
  
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];

    // Reader (Early): Low effort, consistent
    if (Math.random() > 0.1) {
       const effort = i > 7 ? 'Medium' : 'Easy'; // Getting harder
       const repeat = true;
       increments.push({
         id: `inc-1-${i}`, arcId: arc1.id, date: dateStr,
         description: i > 7 ? 'Read 20 pages' : 'Read 5 pages',
         effort, repeat,
         effectiveFriction: calculateFriction(effort, repeat)
       });
    }

    // Runner (Middle): Volatile, High Effort
    if (i % 2 === 0) { // Every other day
       const effort = Math.random() > 0.5 ? 'Hard' : 'Medium';
       const repeat = Math.random() > 0.7; // Often not repeatable
       increments.push({
         id: `inc-2-${i}`, arcId: arc2.id, date: dateStr,
         description: effort === 'Hard' ? '10k Tempo' : '5k Jog',
         effort, repeat,
         effectiveFriction: calculateFriction(effort, repeat)
       });
    }

    // Clear Thinker (Mature): Maintenance, Medium/Hard but stable
    if (Math.random() > 0.3) {
      const effort = 'Medium';
      const repeat = true;
      increments.push({
        id: `inc-3-${i}`, arcId: arc3.id, date: dateStr,
        description: 'Journaling',
        effort, repeat,
        effectiveFriction: calculateFriction(effort, repeat)
       });
    }
  }

  saveDB({
    userProfile: { onboarded: true, ageRange: '25-34', busyness: 'Medium', optimizationFocus: 'Health' },
    arcs: [arc1, arc2, arc3],
    increments,
    dailyNotes: [],
    habits: [],
    programs: []
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
       db.arcs = []; 
       db.increments = [];
       db.dailyNotes = [];
       db.habits = [];
       db.programs = [];
       saveDB(db);
    }
  },
  arc: {
    findMany: () => getDB().arcs,
    create: (name: string) => {
      const db = getDB();
      const newArc: Arc = {
        id: Math.random().toString(36).substr(2, 9),
        name,
        stage: 'Early',
        archived: false,
        createdAt: new Date().toISOString()
      };
      db.arcs.push(newArc);
      saveDB(db);
      return newArc;
    }
  },
  increment: {
    findMany: (date?: string) => {
      const db = getDB();
      if (date) return db.increments.filter(inc => inc.date === date);
      return db.increments;
    },
    findByArc: (arcId: string) => {
       const db = getDB();
       return db.increments.filter(inc => inc.arcId === arcId);
    },
    create: (arcId: string, description: string, effort: EffortLevel, repeat: boolean, date: string) => {
      const db = getDB();
      const friction = calculateFriction(effort, repeat);
      const newInc: Increment = {
        id: Math.random().toString(36).substr(2, 9),
        arcId,
        date,
        description,
        effort,
        repeat,
        effectiveFriction: friction
      };
      db.increments.push(newInc);
      saveDB(db);
      return newInc;
    }
  },
  dailyNote: {
    findUnique: (date: string) => getDB().dailyNotes.find(n => n.date === date),
    findMany: (startDate?: string, endDate?: string) => {
      const db = getDB();
      if (startDate && endDate) {
        return db.dailyNotes.filter(n => n.date >= startDate && n.date <= endDate);
      }
      return db.dailyNotes;
    },
    upsert: (date: string, text: string) => {
      const db = getDB();
      const idx = db.dailyNotes.findIndex(n => n.date === date);
      if (idx > -1) db.dailyNotes[idx].text = text;
      else db.dailyNotes.push({ id: Math.random().toString(36).substr(2, 9), date, text });
      saveDB(db);
    }
  },
  habit: {
    findMany: (includeArchived: boolean = false) => {
      const db = getDB();
      if (includeArchived) return db.habits;
      return db.habits.filter(h => !h.archived);
    },
    create: (name: string, minVersion: string, programId?: string) => {
      const db = getDB();
      const newHabit: Habit = {
        id: Math.random().toString(36).substr(2, 9),
        name,
        minVersion,
        archived: false,
        programId,
        createdAt: new Date().toISOString()
      };
      db.habits.push(newHabit);
      saveDB(db);
      return newHabit;
    },
    update: (id: string, data: Partial<Habit>) => {
      const db = getDB();
      const idx = db.habits.findIndex(h => h.id === id);
      if (idx > -1) {
        db.habits[idx] = { ...db.habits[idx], ...data };
        saveDB(db);
      }
    }
  },
  program: {
    find: (id: string) => getDB().programs.find(p => p.id === id),
    create: (program: Program) => {
      const db = getDB();
      db.programs.push(program);
      saveDB(db);
      return program;
    },
    update: (id: string, data: Partial<Program>) => {
      const db = getDB();
      const idx = db.programs.findIndex(p => p.id === id);
      if (idx > -1) {
        db.programs[idx] = { ...db.programs[idx], ...data };
        saveDB(db);
      }
    }
  }
};
