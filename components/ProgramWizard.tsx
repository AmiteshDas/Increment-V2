
import React, { useState, useEffect } from 'react';
import { dbService } from '../storage';
import { Program, ProgramWeek, Habit } from '../types';

const PRE_MADE_PROGRAMS = [
  { id: 'reading', title: 'Reading Pro', desc: 'Build a consistent reading habit.', icon: '📚' },
  { id: 'c25k', title: 'Couch to 5K', desc: 'From zero to running 5km.', icon: '🏃' },
  { id: 'journal', title: 'Journaling Pro', desc: 'Clear your mind daily.', icon: '✍️' },
  { id: 'lang', title: 'Learn Language', desc: '15 mins a day to fluency.', icon: '🗣️' },
];

const INTENSITIES = [
  { id: 'tiny', label: '< 5 min/day', minVersion: '2 minutes' },
  { id: 'small', label: '> 10 min/day', minVersion: '10 minutes' },
  { id: 'medium', label: '> 30 min/day', minVersion: '30 minutes' },
  { id: 'large', label: 'Max 45 min/day', minVersion: '45 minutes' },
];

interface Props {
  onComplete: () => void;
  onCancel: () => void;
  existingHabit?: Habit | null;
}

const ProgramWizard: React.FC<Props> = ({ onComplete, onCancel, existingHabit }) => {
  const [step, setStep] = useState(1);
  const [path, setPath] = useState<'A' | 'B'>('B');
  
  // Data State
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [customHabitName, setCustomHabitName] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [intensity, setIntensity] = useState('');
  const [why, setWhy] = useState('');
  
  // If editing, we load the program
  const [editingProgramId, setEditingProgramId] = useState<string | null>(null);

  useEffect(() => {
    if (existingHabit) {
      setCustomHabitName(existingHabit.name);
      
      if (existingHabit.programId) {
        const prog = dbService.program.find(existingHabit.programId);
        if (prog) {
          setEditingProgramId(prog.id);
          setIntensity(prog.intensity);
          setWhy(prog.why);
          setPath('B'); // Treat edits as custom path to allow full flexibility
          setStep(2); // Skip straight to definition
        }
      } else {
        // Legacy habit without program
        setStep(2);
        setPath('B');
      }
    }
  }, [existingHabit]);

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const generatePlan = (): ProgramWeek[] => {
    let title = path === 'A' 
      ? PRE_MADE_PROGRAMS.find(p => p.id === selectedProgramId)?.title 
      : customHabitName;

    const isLight = intensity === 'tiny' || intensity === 'small';
    
    return [
      {
        weekNumber: 1,
        title: 'Foundation',
        bullets: isLight 
          ? ['Start small: Do the minimum version 3x this week', 'Set up your environment']
          : ['Complete 4 sessions', 'Focus on showing up, not quality']
      },
      {
        weekNumber: 2,
        title: 'Consistency',
        bullets: ['Try to hit 5 days in a row', 'Track immediately after finishing']
      },
      {
        weekNumber: 3,
        title: 'Expansion',
        bullets: ['Increase duration by 10% if feeling good', 'Review your "Why"']
      },
      {
        weekNumber: 4,
        title: 'Lock-in',
        bullets: ['Aim for a perfect week', 'Schedule your first monthly review']
      }
    ];
  };

  const handleSave = () => {
    // 1. Determine Habit Name & Min Version
    let habitName = '';
    let minVersion = '';

    if (path === 'A') {
      const prog = PRE_MADE_PROGRAMS.find(p => p.id === selectedProgramId);
      habitName = prog?.title || 'Habit';
      // Simple mapping
      if (selectedProgramId === 'reading') minVersion = 'Read 1 page';
      else if (selectedProgramId === 'c25k') minVersion = 'Walk/Run 10 mins';
      else if (selectedProgramId === 'journal') minVersion = 'Write 1 line';
      else minVersion = INTENSITIES.find(i => i.id === intensity)?.minVersion || 'Just show up';
    } else {
      habitName = customHabitName;
      minVersion = INTENSITIES.find(i => i.id === intensity)?.minVersion || 'Just show up';
    }

    const plan = generatePlan();

    if (existingHabit && editingProgramId) {
      // Update existing program and habit
      dbService.program.update(editingProgramId, {
        intensity,
        why,
        title: habitName,
        weeks: plan // Overwriting weeks logic for simplicity in MVP
      });
      dbService.habit.update(existingHabit.id, {
        name: habitName,
        minVersion
      });
    } else {
      // Create New
      const prog: Program = {
        id: Math.random().toString(36).substr(2, 9),
        title: habitName,
        intensity: intensity,
        why: why,
        weeks: plan,
        createdAt: new Date().toISOString()
      };
      dbService.program.create(prog);
      
      if (existingHabit) {
          // Attaching a program to an old habit that didn't have one
          dbService.habit.update(existingHabit.id, {
            name: habitName,
            minVersion,
            programId: prog.id
          });
      } else {
         dbService.habit.create(habitName, minVersion, prog.id);
      }
    }
    onComplete();
  };

  return (
    <div className="bg-white p-8 rounded-2xl border-2 border-indigo-100 shadow-xl animate-in fade-in zoom-in-95 duration-300">
      <div className="flex justify-between items-center mb-6">
         <h2 className="text-2xl font-bold">{existingHabit ? 'Edit Training Plan' : 'New Habit Wizard'}</h2>
         <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
         </button>
      </div>

      {/* Progress Dots */}
      <div className="flex gap-2 mb-8">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className={`h-2 rounded-full transition-all ${i <= step ? 'w-8 bg-indigo-600' : 'w-2 bg-gray-200'}`}></div>
        ))}
      </div>

      {step === 1 && (
         <div className="space-y-4">
            <h3 className="text-xl font-bold">Choose your approach</h3>
            <button 
                onClick={() => { setPath('A'); handleNext(); }}
                className="w-full text-left p-4 rounded-xl border border-gray-200 hover:border-indigo-600 hover:bg-indigo-50 transition-all flex items-center gap-4"
            >
                <span className="text-2xl">📦</span>
                <div>
                    <div className="font-bold">Pre-made Program</div>
                    <div className="text-sm text-gray-500">Best for beginners</div>
                </div>
            </button>
            <button 
                onClick={() => { setPath('B'); handleNext(); }}
                className="w-full text-left p-4 rounded-xl border border-gray-200 hover:border-indigo-600 hover:bg-indigo-50 transition-all flex items-center gap-4"
            >
                <span className="text-2xl">🛠️</span>
                <div>
                    <div className="font-bold">Build Custom</div>
                    <div className="text-sm text-gray-500">Fully flexible</div>
                </div>
            </button>
         </div>
      )}

      {step === 2 && (
          <div className="space-y-6">
             <h3 className="text-xl font-bold">{path === 'A' ? 'Select Program' : 'Define Habit'}</h3>
             
             {path === 'A' ? (
                <div className="grid grid-cols-1 gap-2">
                    {PRE_MADE_PROGRAMS.map(prog => (
                    <button
                        key={prog.id}
                        onClick={() => setSelectedProgramId(prog.id)}
                        className={`p-3 rounded-lg border text-left flex items-center gap-3 ${selectedProgramId === prog.id ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200'}`}
                    >
                        <span>{prog.icon}</span>
                        <div className="font-bold">{prog.title}</div>
                    </button>
                    ))}
                </div>
             ) : (
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Habit Name</label>
                        <input 
                            value={customHabitName}
                            onChange={(e) => setCustomHabitName(e.target.value)}
                            placeholder="e.g. Meditation"
                            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Category</label>
                        <div className="flex gap-2 flex-wrap">
                            {['Health', 'Work', 'Life'].map(c => (
                                <button key={c} onClick={() => setCustomCategory(c)} className={`px-3 py-1 rounded-full text-sm border ${customCategory === c ? 'bg-black text-white' : 'border-gray-200'}`}>{c}</button>
                            ))}
                        </div>
                    </div>
                </div>
             )}
             <div className="flex justify-between pt-4">
                 <button onClick={handleBack} className="text-gray-400 font-bold">Back</button>
                 <button onClick={handleNext} disabled={path === 'A' ? !selectedProgramId : !customHabitName} className="bg-black text-white px-6 py-2 rounded-xl font-bold disabled:opacity-50">Next</button>
             </div>
          </div>
      )}

      {step === 3 && (
          <div className="space-y-6">
              <h3 className="text-xl font-bold">Intensity & Why</h3>
              
              <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Intensity Level</label>
                  <div className="grid grid-cols-1 gap-2">
                    {INTENSITIES.map(opt => (
                        <button
                        key={opt.id}
                        onClick={() => setIntensity(opt.id)}
                        className={`p-3 rounded-lg border text-left flex justify-between items-center ${intensity === opt.id ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200'}`}
                        >
                        <span className="font-bold text-sm">{opt.label}</span>
                        <span className="text-xs text-gray-500">{opt.minVersion}</span>
                        </button>
                    ))}
                  </div>
              </div>

              <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Your "Why"</label>
                  <textarea 
                    value={why}
                    onChange={(e) => setWhy(e.target.value)}
                    placeholder="This matters because..."
                    className="w-full p-3 border border-gray-200 rounded-xl min-h-[80px]"
                  />
              </div>

              <div className="flex justify-between pt-4">
                 <button onClick={handleBack} className="text-gray-400 font-bold">Back</button>
                 <button onClick={handleNext} disabled={!intensity || !why} className="bg-black text-white px-6 py-2 rounded-xl font-bold disabled:opacity-50">Next</button>
             </div>
          </div>
      )}

      {step === 4 && (
          <div className="space-y-6">
              <h3 className="text-xl font-bold">Confirm Plan</h3>
              <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                  <h4 className="font-bold text-indigo-900 mb-2">4 Week Snapshot</h4>
                  <ul className="space-y-2 text-sm text-indigo-800">
                      <li>• Week 1: Foundation</li>
                      <li>• Week 2: Consistency</li>
                      <li>• Week 3: Expansion</li>
                      <li>• Week 4: Lock-in</li>
                  </ul>
              </div>
              <p className="text-sm text-gray-500">By clicking confirm, you update your habit and training plan.</p>

              <div className="flex justify-between pt-4">
                 <button onClick={handleBack} className="text-gray-400 font-bold">Back</button>
                 <button onClick={handleSave} className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-green-700">Confirm & Save</button>
             </div>
          </div>
      )}
    </div>
  );
};

export default ProgramWizard;
