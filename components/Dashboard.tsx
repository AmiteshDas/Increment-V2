
import React, { useState, useEffect } from 'react';
import { dbService } from '../storage';
import { HabitWithStatus, HabitStatus } from '../types';

const Dashboard: React.FC = () => {
  const [habits, setHabits] = useState<HabitWithStatus[]>([]);
  const [note, setNote] = useState('');
  const [streak, setStreak] = useState(0);
  const today = new Date().toISOString().split('T')[0];

  const fetchData = () => {
    const allHabits = dbService.habit.findMany();
    const todayCheckIns = dbService.checkIn.findMany(today);
    
    const habitsWithStatus = allHabits.map(h => {
      const checkIn = todayCheckIns.find(c => c.habitId === h.id);
      return { ...h, status: checkIn?.status || 'PENDING' };
    });

    setHabits(habitsWithStatus);

    const dailyNote = dbService.dailyNote.findUnique(today);
    setNote(dailyNote?.text || '');

    // Calculate Streak
    calculateStreak();
  };

  const calculateStreak = () => {
    const allCheckIns = dbService.checkIn.findMany();
    const uniqueDates = Array.from(new Set(allCheckIns.map(c => c.date))).sort((a, b) => b.localeCompare(a));
    
    let currentStreak = 0;
    const streakTodayDate = new Date();
    
    for (let i = 0; i < uniqueDates.length; i++) {
      const checkDate = new Date(uniqueDates[i]);
      const diff = Math.floor((streakTodayDate.getTime() - checkDate.getTime()) / (1000 * 3600 * 24));
      
      // If there's a gap more than 1 day from the last tracked day (allowing for today not yet tracked)
      if (diff > currentStreak + 1) break;
      
      // If at least one habit was DONE or PARTIAL on that day
      const dayCheckIns = allCheckIns.filter(c => c.date === uniqueDates[i]);
      const hasSuccess = dayCheckIns.some(c => c.status === 'DONE' || c.status === 'PARTIAL');
      
      if (hasSuccess) {
        currentStreak++;
      } else if (uniqueDates[i] !== today) {
        // If it's not today and no success, streak breaks
        break;
      }
    }
    setStreak(currentStreak);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleStatusChange = (habitId: string, status: HabitStatus) => {
    dbService.checkIn.upsert(habitId, today, status);
    fetchData();
  };

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setNote(text);
    dbService.dailyNote.upsert(today, text);
  };

  const completedToday = habits.filter(h => h.status === 'DONE').length;
  const completionRate = habits.length > 0 ? Math.round((completedToday / habits.length) * 100) : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <p className="text-sm font-medium text-indigo-600 uppercase tracking-wider">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        <h2 className="text-3xl font-bold mt-1">Daily Focus</h2>
      </header>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">Daily Completion</p>
            <p className="text-3xl font-bold text-gray-900">{completionRate}%</p>
          </div>
          <div className="w-16 h-16 rounded-full border-4 border-indigo-100 flex items-center justify-center relative">
             <div 
               className="absolute inset-0 rounded-full border-4 border-indigo-600" 
               style={{ clipPath: `inset(${100 - completionRate}% 0 0 0)` }}
             ></div>
             <span className="text-indigo-600 font-bold">{completedToday}/{habits.length}</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">Current Streak</p>
            <p className="text-3xl font-bold text-gray-900">{streak} Days</p>
          </div>
          <div className="bg-orange-50 p-3 rounded-xl text-orange-500">
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M17.66 11.2c-.23-.3-.51-.56-.77-.82-.67-.6-1.43-1.03-2.07-1.66C13.33 7.26 13 4.85 13.95 3c-.95.23-1.78.75-2.49 1.32-2.59 2.08-3.61 5.75-2.39 8.91.04.1.08.2.08.33 0 .22-.15.42-.35.5-.22.08-.47 0-.59-.22-.18-.3-.29-.61-.39-.92-.21-.65-.31-1.34-.35-2.03-.04-.52-.04-1.05.02-1.57-.14.07-.26.16-.38.25-1.55 1.25-2.55 3.12-2.73 5.1-.21 2.45.82 4.91 2.71 6.46 2.11 1.73 5.17 2.03 7.57 1.03 2.18-.91 3.75-3.05 4.04-5.38.21-1.74-.21-3.48-1.05-5zM14.51 18.17c-1.12 1.3-3.01 1.6-4.32.74-.21-.14-.39-.31-.55-.51-.55-.7-.66-1.6-.33-2.39.06-.14.14-.27.23-.4.22-.3.51-.57.76-.85.6-.68 1.15-1.4 1.51-2.21.06-.15.22-.24.38-.23.16.01.3.11.35.26.14.4.24.81.39 1.21.23.63.53 1.23.94 1.76.4.52.88 1.01 1.03 1.67.14.61-.01 1.24-.39 1.75z" /></svg>
          </div>
        </div>
      </div>

      {/* Habits List */}
      <section className="space-y-4">
        <h3 className="text-xl font-bold flex items-center gap-2">
          Your Habits
          <span className="text-xs font-normal bg-gray-200 px-2 py-0.5 rounded-full text-gray-600">Today</span>
        </h3>
        <div className="grid gap-3">
          {habits.map(habit => (
            <div key={habit.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:border-indigo-200 transition-colors">
              <div className="space-y-1">
                <span className="inline-block bg-indigo-50 text-indigo-600 text-xs px-2.5 py-1 rounded-md font-bold uppercase tracking-wider">
                  {habit.name}
                </span>
                <h4 className="font-bold text-lg text-gray-900 leading-tight">
                  {habit.minVersion}
                </h4>
              </div>
              <div className="flex gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-100">
                <button 
                  onClick={() => handleStatusChange(habit.id, 'DONE')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${habit.status === 'DONE' ? 'bg-green-600 text-white shadow-md' : 'text-gray-500 hover:bg-white'}`}
                >
                  Done
                </button>
                <button 
                  onClick={() => handleStatusChange(habit.id, 'PARTIAL')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${habit.status === 'PARTIAL' ? 'bg-yellow-500 text-white shadow-md' : 'text-gray-500 hover:bg-white'}`}
                >
                  Partial
                </button>
                <button 
                  onClick={() => handleStatusChange(habit.id, 'SKIP')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${habit.status === 'SKIP' ? 'bg-gray-400 text-white shadow-md' : 'text-gray-500 hover:bg-white'}`}
                >
                  Skip
                </button>
              </div>
            </div>
          ))}
          {habits.length === 0 && (
            <div className="text-center py-10 bg-white rounded-2xl border-2 border-dashed border-gray-200">
              <p className="text-gray-500">No active habits. Create one to get started!</p>
            </div>
          )}
        </div>
      </section>

      {/* Daily Note */}
      <section className="space-y-4">
        <h3 className="text-xl font-bold">Reflections</h3>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <textarea
            value={note}
            onChange={handleNoteChange}
            placeholder="How did today go? Any breakthroughs or struggles?"
            className="w-full min-h-[150px] p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none transition-all placeholder:text-gray-400 text-gray-700"
          />
          <div className="mt-3 flex justify-between items-center text-xs text-gray-400">
            <p>Auto-saving as you type...</p>
            <p>{note.length} characters</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
