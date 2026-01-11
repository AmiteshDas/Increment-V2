
import { Habit, CheckIn, DailyNote, HabitStatus } from './types';

const STORAGE_KEY = 'increment_app_data_v1';

interface DB {
  habits: Habit[];
  checkIns: CheckIn[];
  dailyNotes: DailyNote[];
}

const getDB = (): DB => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    return { habits: [], checkIns: [], dailyNotes: [] };
  }
  return JSON.parse(data);
};

const saveDB = (db: DB) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
};

// Seeding logic
export const seedIfEmpty = () => {
  const db = getDB();
  if (db.habits.length > 0) return;

  const initialHabits: Habit[] = [
    { id: '1', name: 'Reading', minVersion: 'Read 1 paragraph', archived: false, createdAt: '2024-01-01' },
    { id: '2', name: 'Exercise', minVersion: '5 pushups', archived: false, createdAt: '2024-01-01' },
    { id: '3', name: 'Coding', minVersion: 'Write 1 line of code', archived: false, createdAt: '2024-01-01' },
    { id: '4', name: 'Meditation', minVersion: '1 minute breathwork', archived: false, createdAt: '2024-01-01' },
  ];

  const checkIns: CheckIn[] = [];
  const dailyNotes: DailyNote[] = [];
  
  const today = new Date();
  for (let i = 30; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];

    initialHabits.forEach(habit => {
      // Create some realistic gaps
      const random = Math.random();
      let status: HabitStatus = 'DONE';
      if (random < 0.1) status = 'SKIP';
      else if (random < 0.2) status = 'PARTIAL';
      else if (random < 0.3) return; // No check-in for some days

      checkIns.push({
        id: Math.random().toString(36).substr(2, 9),
        habitId: habit.id,
        date: dateStr,
        status
      });
    });

    if (Math.random() > 0.4) {
      dailyNotes.push({
        id: Math.random().toString(36).substr(2, 9),
        date: dateStr,
        text: `Reflected on progress for ${dateStr}. Small steps every day lead to big results. Feeling ${Math.random() > 0.5 ? 'great' : 'okay'} today.`
      });
    }
  }

  saveDB({ habits: initialHabits, checkIns, dailyNotes });
};

export const dbService = {
  habit: {
    findMany: (includeArchived = false) => {
      const db = getDB();
      return includeArchived ? db.habits : db.habits.filter(h => !h.archived);
    },
    create: (name: string, minVersion: string) => {
      const db = getDB();
      const newHabit: Habit = {
        id: Math.random().toString(36).substr(2, 9),
        name,
        minVersion,
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
