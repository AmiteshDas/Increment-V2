
import React, { useState, useEffect } from 'react';
import { dbService } from '../storage';
import { Arc, Increment, DailyNote } from '../types';

interface WeekData {
  id: string;
  start: Date;
  end: Date;
  label: string;
}

const Review: React.FC = () => {
  const [weeks, setWeeks] = useState<WeekData[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<WeekData | null>(null);
  const [arcs, setArcs] = useState<Arc[]>([]);
  const [increments, setIncrements] = useState<Increment[]>([]);
  const [notes, setNotes] = useState<DailyNote[]>([]);

  useEffect(() => {
    const weekList: WeekData[] = [];
    const today = new Date();
    const currentDay = today.getDay();
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
    setArcs(dbService.arc.findMany());
  }, []);

  useEffect(() => {
    if (selectedWeek) {
      const startStr = selectedWeek.start.toISOString().split('T')[0];
      const endStr = selectedWeek.end.toISOString().split('T')[0];
      
      const allIncrements = dbService.increment.findMany();
      const filtered = allIncrements.filter(c => c.date >= startStr && c.date <= endStr);
      setIncrements(filtered);

      const filteredNotes = dbService.dailyNote.findMany(startStr, endStr);
      if (filteredNotes) {
           setNotes(filteredNotes.sort((a, b) => b.date.localeCompare(a.date)));
      }
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

  if (!selectedWeek) return null;

  const days = getWeekDays(selectedWeek);

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
            <h3 className="text-xl font-bold mb-6">Increment Grid</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr>
                    <th className="pb-4 text-xs font-bold text-gray-400 uppercase tracking-widest pl-2 min-w-[150px]">Arc</th>
                    {days.map(d => (
                      <th key={d} className="pb-4 text-center">
                        <span className="block text-xs font-bold text-gray-400 uppercase">{new Date(d).toLocaleDateString('en-US', { weekday: 'short' }).charAt(0)}</span>
                        <span className="text-sm font-bold text-gray-900">{new Date(d).getDate()}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {arcs.map(arc => (
                    <tr key={arc.id} className="group hover:bg-gray-50 transition-colors">
                      <td className="py-4 pl-2 pr-4">
                        <div className="flex flex-col items-start gap-1">
                          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded uppercase tracking-wide">
                            {arc.name}
                          </span>
                        </div>
                      </td>
                      {days.map(d => {
                        const inc = increments.find(c => c.arcId === arc.id && c.date === d);
                        return (
                          <td key={d} className="py-4 text-center">
                            <div className="flex justify-center">
                              {inc ? (
                                  <div className={`w-6 h-6 rounded-md shadow-sm ${inc.effectiveFriction > 2.5 ? 'bg-red-500' : inc.effectiveFriction > 1.5 ? 'bg-yellow-400' : 'bg-green-500'}`}>
                                  </div>
                              ) : (
                                  <div className="w-6 h-6 rounded-md border-2 border-gray-50"></div>
                              )}
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
      </div>
    </div>
  );
};

export default Review;
