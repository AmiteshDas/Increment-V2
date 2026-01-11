
import React, { useState, useEffect } from 'react';
import { dbService } from '../storage';
import { HabitWithStatus, HabitStatus, Program, CheckIn } from '../types';

const Dashboard: React.FC = () => {
  const [habits, setHabits] = useState<HabitWithStatus[]>([]);
  const [note, setNote] = useState('');
  const [streak, setStreak] = useState(0);
  const [selectedHabit, setSelectedHabit] = useState<HabitWithStatus | null>(null);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [selectedHabitHistory, setSelectedHabitHistory] = useState<CheckIn[]>([]);
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
      
      if (diff > currentStreak + 1) break;
      
      const dayCheckIns = allCheckIns.filter(c => c.date === uniqueDates[i]);
      const hasSuccess = dayCheckIns.some(c => c.status === 'DONE' || c.status === 'PARTIAL');
      
      if (hasSuccess) {
        currentStreak++;
      } else if (uniqueDates[i] !== today) {
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

  const handleReset = () => {
    if (confirm('Start fresh? This will clear all data and launch the Onboarding flow.')) {
      // Set a flag to tell the seeder to NOT seed demo data this time
      localStorage.setItem('increment_skip_seed', 'true');
      dbService.user.reset();
      window.location.reload();
    }
  };

  const openHabitDetail = (habit: HabitWithStatus) => {
    setSelectedHabit(habit);
    const checkIns = dbService.checkIn.findByHabit(habit.id);
    setSelectedHabitHistory(checkIns.sort((a, b) => b.date.localeCompare(a.date)));
    
    if (habit.programId) {
      const prog = dbService.program.find(habit.programId);
      setSelectedProgram(prog || null);
    } else {
      setSelectedProgram(null);
    }
  };

  const closeHabitDetail = () => {
    setSelectedHabit(null);
    setSelectedProgram(null);
  };

  const completedToday = habits.filter(h => h.status === 'DONE').length;
  const completionRate = habits.length > 0 ? Math.round((completedToday / habits.length) * 100) : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12 relative">
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
              <div className="space-y-1 cursor-pointer flex-1" onClick={() => openHabitDetail(habit)}>
                <span className="inline-block bg-indigo-50 text-indigo-600 text-xs px-2.5 py-1 rounded-md font-bold uppercase tracking-wider mb-1">
                  {habit.name}
                </span>
                <h4 className="font-bold text-lg text-gray-900 leading-tight">
                  {habit.minVersion}
                </h4>
                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1 group-hover:text-indigo-500">
                  View training plan <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                </p>
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

      {/* Dev Utils */}
      <footer className="pt-8 border-t border-gray-200 flex justify-center">
        <button 
          onClick={handleReset}
          className="text-xs text-red-300 hover:text-red-500 transition-colors uppercase tracking-widest font-bold"
        >
          Reset App & Onboarding
        </button>
      </footer>

      {/* Habit Detail Modal */}
      {selectedHabit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
             <div className="bg-indigo-600 p-8 text-white relative">
                <button onClick={closeHabitDetail} className="absolute top-6 right-6 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                <div className="inline-block px-3 py-1 bg-white/20 rounded-lg text-xs font-bold uppercase tracking-widest mb-3">{selectedHabit.name}</div>
                <h3 className="text-3xl font-bold mb-2">{selectedHabit.minVersion}</h3>
                {selectedProgram && (
                   <p className="text-indigo-100 italic">"{selectedProgram.why}"</p>
                )}
             </div>

             <div className="p-8 space-y-8">
               
               {/* Stats */}
               <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-4 rounded-xl text-center">
                    <div className="text-xs text-gray-500 font-bold uppercase">Total Done</div>
                    <div className="text-2xl font-black text-gray-900">{selectedHabitHistory.filter(c => c.status === 'DONE').length}</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl text-center">
                    <div className="text-xs text-gray-500 font-bold uppercase">Streak</div>
                    <div className="text-2xl font-black text-gray-900">
                      {/* Simple streak calc for this habit */}
                      {(() => {
                        let s = 0;
                        // Assuming sorted by date desc
                        for(const c of selectedHabitHistory) {
                           if(c.status === 'DONE' || c.status === 'PARTIAL') s++;
                           else break;
                        }
                        return s;
                      })()}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl text-center">
                    <div className="text-xs text-gray-500 font-bold uppercase">Success Rate</div>
                    <div className="text-2xl font-black text-gray-900">
                       {selectedHabitHistory.length > 0 
                          ? Math.round((selectedHabitHistory.filter(c => c.status === 'DONE' || c.status === 'PARTIAL').length / 20) * 100) 
                          : 0}%
                       <span className="text-[10px] text-gray-400 block font-normal">last 20 days</span>
                    </div>
                  </div>
               </div>

               {/* Training Plan */}
               {selectedProgram && (
                 <div>
                   <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                     <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                     Training Plan
                   </h4>
                   <div className="space-y-4">
                      {selectedProgram.weeks.map((week, idx) => (
                         <div key={week.weekNumber} className="flex gap-4 p-4 rounded-xl border border-gray-100 hover:border-indigo-100 transition-colors">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${idx === 0 ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                              {week.weekNumber}
                            </div>
                            <div>
                               <div className="font-bold text-gray-900">{week.title}</div>
                               <ul className="text-sm text-gray-500 mt-1 list-disc list-inside">
                                 {week.bullets.map((b, i) => <li key={i}>{b}</li>)}
                               </ul>
                            </div>
                         </div>
                      ))}
                   </div>
                 </div>
               )}

               {/* Recent History Grid */}
               <div>
                 <h4 className="font-bold text-gray-900 mb-4">Last 20 Days</h4>
                 <div className="flex flex-wrap gap-2">
                   {Array.from({length: 20}).map((_, i) => {
                      const d = new Date();
                      d.setDate(new Date().getDate() - (19 - i));
                      const dStr = d.toISOString().split('T')[0];
                      const check = selectedHabitHistory.find(c => c.date === dStr);
                      
                      let bgClass = 'bg-gray-100'; // Pending/Empty
                      if (check?.status === 'DONE') bgClass = 'bg-green-500';
                      if (check?.status === 'PARTIAL') bgClass = 'bg-yellow-400';
                      if (check?.status === 'SKIP') bgClass = 'bg-gray-300';

                      return (
                        <div key={i} className="group relative">
                          <div className={`w-8 h-8 rounded-md ${bgClass} transition-all hover:opacity-80`}></div>
                          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10">
                            {d.toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}: {check?.status || 'No Data'}
                          </div>
                        </div>
                      );
                   })}
                 </div>
               </div>
             </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
