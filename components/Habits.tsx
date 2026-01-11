
import React, { useState, useEffect } from 'react';
import { dbService } from '../storage';
import { Habit } from '../types';

const Habits: React.FC = () => {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMin, setNewMin] = useState('');
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);

  const fetchHabits = () => {
    const data = dbService.habit.findMany(true); // Include archived
    setHabits(data);
  };

  useEffect(() => {
    fetchHabits();
  }, []);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    dbService.habit.create(newName, newMin || 'Just show up');
    setNewName('');
    setNewMin('');
    setIsAdding(false);
    fetchHabits();
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHabit) return;
    dbService.habit.update(editingHabit.id, { 
      name: newName, 
      minVersion: newMin 
    });
    setEditingHabit(null);
    setNewName('');
    setNewMin('');
    fetchHabits();
  };

  const toggleArchive = (habit: Habit) => {
    dbService.habit.update(habit.id, { archived: !habit.archived });
    fetchHabits();
  };

  const startEdit = (habit: Habit) => {
    setEditingHabit(habit);
    setNewName(habit.name);
    setNewMin(habit.minVersion);
    setIsAdding(true);
  };

  const cancelAdd = () => {
    setIsAdding(false);
    setEditingHabit(null);
    setNewName('');
    setNewMin('');
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Your Habit Stack</h2>
          <p className="text-gray-500 mt-1">Design your routine with sustainable minimum versions.</p>
        </div>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
            Add Habit
          </button>
        )}
      </header>

      {isAdding && (
        <form 
          onSubmit={editingHabit ? handleUpdate : handleCreate}
          className="bg-white p-8 rounded-2xl border-2 border-indigo-100 shadow-lg space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Category / Tag</label>
              <input 
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., Reading, Coding, Health"
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Daily Action (Minimum Version)</label>
              <input 
                value={newMin}
                onChange={(e) => setNewMin(e.target.value)}
                placeholder="e.g., Read 1 paragraph, 1 min breathwork"
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button 
              type="button"
              onClick={cancelAdd}
              className="px-6 py-2.5 rounded-xl font-semibold text-gray-500 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-8 py-2.5 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-shadow shadow-md"
            >
              {editingHabit ? 'Save Changes' : 'Create Habit'}
            </button>
          </div>
        </form>
      )}

      <div className="grid gap-4">
        {habits.map(habit => (
          <div 
            key={habit.id} 
            className={`bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all ${habit.archived ? 'opacity-60 bg-gray-50' : 'hover:shadow-md'}`}
          >
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <span className="inline-block bg-indigo-50 text-indigo-600 text-xs px-2.5 py-1 rounded-md font-bold uppercase tracking-wider">
                  {habit.name}
                </span>
                {habit.archived && <span className="text-[10px] uppercase font-bold bg-gray-200 px-2 py-0.5 rounded tracking-widest text-gray-500">Archived</span>}
              </div>
              <h4 className="font-bold text-xl text-gray-900 leading-tight">
                {habit.minVersion}
              </h4>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={() => startEdit(habit)}
                className="p-3 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                title="Edit"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-5M16.138 2.976a2.121 2.121 0 013 3L11.832 12.91a1 1 0 01-.393.287l-4.223 1.408a1 1 0 01-1.213-1.213l1.408-4.223a1 1 0 01.287-.393L16.138 2.976z" /></svg>
              </button>
              <button 
                onClick={() => toggleArchive(habit)}
                className={`p-3 rounded-xl transition-all ${habit.archived ? 'text-green-500 hover:bg-green-50' : 'text-gray-400 hover:text-amber-600 hover:bg-amber-50'}`}
                title={habit.archived ? 'Unarchive' : 'Archive'}
              >
                {habit.archived ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                )}
              </button>
            </div>
          </div>
        ))}
        {habits.length === 0 && !isAdding && (
          <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200">
            <p className="text-gray-400 text-lg">Your habit list is empty. Start building your future today.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Habits;
