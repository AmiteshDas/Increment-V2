
import React, { useState, useEffect } from 'react';
import { dbService } from '../storage';
import { Habit, CheckIn, DailyNote, HabitStatus } from '../types';

interface WeekData {
  id: string;
  start: Date;
  end: Date;
  label: string;
}

const Review: React.FC = () => {
  const [weeks, setWeeks] = useState<WeekData[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<WeekData | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [notes, setNotes] = useState<DailyNote[]>([]);

  useEffect(() => {
    // Generate last 6 weeks
    const weekList: WeekData[] = [];
    const today = new Date();
    // Move to the end of the current week (Saturday)
    const currentDay = today.getDay(); // 0 is Sunday, 6 is Saturday
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + (6 - currentDay));

    for (let i = 0; i < 6; i++) {
      const end = new Date(endOfWeek);
      end.setDate(endOfWeek.getDate() - (i * 7));
      const start = new Date(end);
      start.setDate(end.getDate() - 6);
      
      weekList.push({
        id: `week-${i}`,
        start,
        end,
        label: `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
      });
    }
    setWeeks(weekList);
    setSelectedWeek(weekList[0]);
    setHabits(dbService.habit.findMany(true));
  }, []);

  useEffect(() => {
    if (selectedWeek) {
      const startStr = selectedWeek.start.toISOString().split('T')[0];
      const endStr = selectedWeek.end.toISOString().split('T')[0];
      
      const allCheckIns = dbService.checkIn.findMany();
      const filteredCheckIns = allCheckIns.filter(c => c.date >= startStr && c.date <= endStr);
      setCheckIns(filteredCheckIns);

      const filteredNotes = dbService.dailyNote.findMany(startStr, endStr).sort((a, b) => b.date.localeCompare(a.date));
      setNotes(filteredNotes);
    }
  }, [selectedWeek]);

  const getWeekDays = (week: WeekData) => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(week.start);
      d.setDate(week.start.getDate() + i);
      days.push(d.toISOString().split('T')[0]);
    }
    return days;
  };

  const calculateWeekScore = () => {
    if (checkIns.length === 0) return 0;
    const successes = checkIns.filter(c => c.status === 'DONE').length;
    const partials = checkIns.filter(c => c.status === 'PARTIAL').length;
    // Score: Done = 1, Partial = 0.5, Skip = 0
    const score = successes + (partials * 0.5);
    const totalPossible = habits.length * 7;
    return Math.round((score / totalPossible) * 100);
  };

  if (!selectedWeek) return null;

  const days = getWeekDays(selectedWeek);
  const weekScore = calculateWeekScore();

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
      <header>
        <h2 className="text-3xl font-bold">Review Your Growth</h2>
        <p className="text-gray-500 mt-1">Reflect on the past weeks to identify patterns and wins.</p>
      </header>

      {/* Week Selector Tabs */}
      <div className="flex overflow-x-auto pb-4 gap-3 no-scrollbar">
        {weeks.map(week => (
          <button
            key={week.id}
            onClick={() => setSelectedWeek(week)}
            className={`flex-shrink-0 px-6 py-3 rounded-2xl font-bold transition-all border ${
              selectedWeek.id === week.id 
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' 
                : 'bg-white text-gray-500 border-gray-100 hover:border-indigo-200'
            }`}
          >
            {week.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Completion Grid */}
          <section className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <h3 className="text-xl font-bold mb-6">Weekly Grid</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr>
                    <th className="pb-4 text-xs font-bold text-gray-400 uppercase tracking-widest pl-2 min-w-[150px]">Habit</th>
                    {days.map(d => (
                      <th key={d} className="pb-4 text-center">
                        <span className="block text-xs font-bold text-gray-400 uppercase">{new Date(d).toLocaleDateString('en-US', { weekday: 'short' }).charAt(0)}</span>
                        <span className="text-sm font-bold text-gray-900">{new Date(d).getDate()}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {habits.map(habit => (
                    <tr key={habit.id} className="group hover:bg-gray-50 transition-colors">
                      <td className="py-4 pl-2 pr-4">
                        <div className="flex flex-col items-start gap-1">
                          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded uppercase tracking-wide">
                            {habit.name}
                          </span>
                          <span className={`font-bold text-sm leading-tight ${habit.archived ? 'text-gray-400' : 'text-gray-900'}`}>
                            {habit.minVersion}
                          </span>
                        </div>
                      </td>
                      {days.map(d => {
                        const check = checkIns.find(c => c.habitId === habit.id && c.date === d);
                        return (
                          <td key={d} className="py-4 text-center">
                            <div className="flex justify-center">
                              {check?.status === 'DONE' && <div className="w-6 h-6 rounded-md bg-green-500 flex items-center justify-center text-white"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg></div>}
                              {check?.status === 'PARTIAL' && <div className="w-6 h-6 rounded-md bg-yellow-400"></div>}
                              {check?.status === 'SKIP' && <div className="w-6 h-6 rounded-md bg-gray-200"></div>}
                              {!check && <div className="w-6 h-6 rounded-md border-2 border-gray-100"></div>}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Weekly Notes */}
          <section className="space-y-4">
            <h3 className="text-xl font-bold">Weekly Reflections</h3>
            <div className="space-y-4">
              {notes.map(note => (
                <div key={note.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                  <p className="text-xs font-bold text-indigo-600 uppercase mb-2">
                    {new Date(note.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                  </p>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{note.text}</p>
                </div>
              ))}
              {notes.length === 0 && (
                <div className="text-center py-10 bg-white rounded-3xl border border-gray-100">
                  <p className="text-gray-400 italic">No notes captured this week.</p>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Sidebar Summary */}
        <div className="space-y-8">
          <section className="bg-indigo-600 p-8 rounded-3xl text-white shadow-xl shadow-indigo-100">
            <h3 className="text-lg font-bold opacity-80">Consistency Score</h3>
            <div className="mt-6 flex items-baseline gap-2">
              <span className="text-6xl font-black">{weekScore}%</span>
              <span className="text-indigo-200 font-bold uppercase tracking-widest text-sm">Target 80%</span>
            </div>
            <div className="mt-8 bg-indigo-500 rounded-full h-3 overflow-hidden">
              <div className="bg-white h-full" style={{ width: `${weekScore}%` }}></div>
            </div>
            <p className="mt-6 text-indigo-100 text-sm leading-relaxed">
              {weekScore > 80 
                ? "Phenomenal consistency! You're building powerful momentum. Keep pushing." 
                : weekScore > 50 
                  ? "Good progress. Focus on closing those small gaps next week." 
                  : "A tough week, but every new day is a fresh start. Scale back if needed."}
            </p>
          </section>

          <section className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="text-lg font-bold mb-4">Quick Legend</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded bg-green-500"></div>
                <span className="text-sm font-medium text-gray-600">Done (Full consistency)</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded bg-yellow-400"></div>
                <span className="text-sm font-medium text-gray-600">Partial (Minimum met)</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded bg-gray-200"></div>
                <span className="text-sm font-medium text-gray-600">Skipped (Intentional break)</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded border-2 border-gray-100"></div>
                <span className="text-sm font-medium text-gray-600">Missed (Action required)</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Review;
