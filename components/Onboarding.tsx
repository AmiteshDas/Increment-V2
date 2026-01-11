
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dbService } from '../storage';
import { Program, ProgramWeek } from '../types';

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

const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [path, setPath] = useState<'A' | 'B' | null>(null);

  // Form Data
  const [age, setAge] = useState('');
  const [busyness, setBusyness] = useState('');
  const [focus, setFocus] = useState('');
  
  // Path A Data
  const [selectedProgramId, setSelectedProgramId] = useState('');
  
  // Path B Data
  const [customHabitName, setCustomHabitName] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [customMilestones, setCustomMilestones] = useState('');

  // Common Data
  const [intensity, setIntensity] = useState('');
  const [why, setWhy] = useState('');

  const totalSteps = 6;

  const handleNext = () => {
    setStep(s => s + 1);
  };

  const handleBack = () => {
    setStep(s => s - 1);
  };

  const generatePlan = (): ProgramWeek[] => {
    // Determine title
    let title = path === 'A' 
      ? PRE_MADE_PROGRAMS.find(p => p.id === selectedProgramId)?.title || 'Program'
      : customHabitName;

    // Determine bullets based on intensity/milestones
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

  const handleFinish = () => {
    // 1. Save Profile
    dbService.user.update({
      onboarded: true,
      ageRange: age,
      busyness: busyness as any,
      optimizationFocus: focus as any
    });

    // 2. Determine Habit details
    let habitName = '';
    let minVersion = '';

    if (path === 'A') {
      const prog = PRE_MADE_PROGRAMS.find(p => p.id === selectedProgramId);
      habitName = prog?.title || 'Habit';
      
      if (selectedProgramId === 'reading') minVersion = 'Read 1 page';
      else if (selectedProgramId === 'c25k') minVersion = 'Walk/Run 10 mins';
      else if (selectedProgramId === 'journal') minVersion = 'Write 1 line';
      else if (selectedProgramId === 'lang') minVersion = '1 lesson';
      else minVersion = INTENSITIES.find(i => i.id === intensity)?.minVersion || 'Just show up';

    } else {
      habitName = customHabitName;
      minVersion = INTENSITIES.find(i => i.id === intensity)?.minVersion || 'Just show up';
    }

    // 3. Create Program
    const plan = generatePlan();
    const progId = Math.random().toString(36).substr(2, 9);
    
    dbService.program.create({
      id: progId,
      title: habitName,
      intensity: intensity,
      why: why,
      weeks: plan,
      createdAt: new Date().toISOString()
    });

    // 4. Create Habit Linked to Program
    dbService.habit.create(habitName, minVersion, progId);

    navigate('/');
  };

  const renderProgressBar = () => (
    <div className="w-full bg-gray-200 h-1.5 rounded-full mb-8">
      <div 
        className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300" 
        style={{ width: `${(step / totalSteps) * 100}%` }}
      ></div>
    </div>
  );

  // STEP 1: Context
  if (step === 1) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4">
        {renderProgressBar()}
        <h2 className="text-3xl font-bold mb-2">Welcome to Increment.</h2>
        <p className="text-gray-500 mb-8">Let's tailor the experience to your life right now.</p>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Age Range</label>
            <div className="grid grid-cols-4 gap-2">
              {['18-24', '25-34', '35-44', '45+'].map(opt => (
                <button
                  key={opt}
                  onClick={() => setAge(opt)}
                  className={`py-3 rounded-xl border ${age === opt ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-gray-200 hover:border-indigo-300'}`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">How busy is your life?</label>
            <div className="grid grid-cols-3 gap-2">
              {['Low', 'Medium', 'High'].map(opt => (
                <button
                  key={opt}
                  onClick={() => setBusyness(opt)}
                  className={`py-3 rounded-xl border ${busyness === opt ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-gray-200 hover:border-indigo-300'}`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Optimizing for...</label>
            <div className="grid grid-cols-2 gap-2">
              {['Work', 'Health', 'Learning', 'General'].map(opt => (
                <button
                  key={opt}
                  onClick={() => setFocus(opt)}
                  className={`py-3 rounded-xl border ${focus === opt ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-gray-200 hover:border-indigo-300'}`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button 
          onClick={handleNext}
          disabled={!age || !busyness || !focus}
          className="w-full mt-8 bg-black text-white py-4 rounded-xl font-bold disabled:opacity-50 hover:bg-gray-900 transition-colors"
        >
          Next Step
        </button>
      </div>
    );
  }

  // STEP 2: Fork
  if (step === 2) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4">
        {renderProgressBar()}
        <h2 className="text-3xl font-bold mb-8">How would you like to start?</h2>
        
        <div className="space-y-4">
          <button 
            onClick={() => { setPath('A'); handleNext(); }}
            className="w-full text-left p-6 rounded-2xl border-2 border-gray-100 hover:border-indigo-600 hover:shadow-lg transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold text-gray-900">Choose a pre-made program</span>
              <span className="text-2xl">📦</span>
            </div>
            <p className="text-gray-500 mt-2">Proven paths for Reading, Fitness, and Learning.</p>
          </button>

          <button 
             onClick={() => { setPath('B'); handleNext(); }}
            className="w-full text-left p-6 rounded-2xl border-2 border-gray-100 hover:border-indigo-600 hover:shadow-lg transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold text-gray-900">Build my own path</span>
              <span className="text-2xl">🛠️</span>
            </div>
            <p className="text-gray-500 mt-2">Customize your habits and milestones from scratch.</p>
          </button>
        </div>

        <button onClick={handleBack} className="mt-8 text-gray-400 hover:text-gray-600">Back</button>
      </div>
    );
  }

  // STEP 3A (Custom) or 3B (Pre-made)
  if (step === 3) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 flex flex-col md:flex-row gap-10">
        <div className="flex-1">
          {renderProgressBar()}
          
          {path === 'A' ? (
            <>
              <h2 className="text-3xl font-bold mb-6">Select a Program</h2>
              <div className="grid grid-cols-1 gap-3">
                {PRE_MADE_PROGRAMS.map(prog => (
                  <button
                    key={prog.id}
                    onClick={() => setSelectedProgramId(prog.id)}
                    className={`p-4 rounded-xl border text-left flex items-center gap-4 transition-all ${selectedProgramId === prog.id ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600' : 'border-gray-200 hover:border-indigo-300'}`}
                  >
                    <span className="text-2xl">{prog.icon}</span>
                    <div>
                      <div className="font-bold text-gray-900">{prog.title}</div>
                      <div className="text-sm text-gray-500">{prog.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <h2 className="text-3xl font-bold mb-6">Define your Habit</h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">What habit do you want?</label>
                  <input 
                    value={customHabitName}
                    onChange={(e) => setCustomHabitName(e.target.value)}
                    placeholder="e.g. Morning Stretch"
                    className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Category</label>
                  <div className="flex flex-wrap gap-2">
                    {['Health', 'Productivity', 'Reflection', 'Coding', 'Learning'].map(cat => (
                      <button
                        key={cat}
                        onClick={() => setCustomCategory(cat)}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold border ${customCategory === cat ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200'}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Milestones Cadence</label>
                  <div className="grid grid-cols-2 gap-2">
                     {['Daily', 'Bi-weekly', 'Weekly', 'One-off'].map(m => (
                       <button
                         key={m}
                         onClick={() => setCustomMilestones(m)}
                         className={`py-3 rounded-lg text-sm font-semibold border ${customMilestones === m ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200'}`}
                       >
                         {m}
                       </button>
                     ))}
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="flex gap-4 mt-8">
            <button onClick={handleBack} className="px-6 py-3 text-gray-500 font-bold">Back</button>
            <button 
              onClick={handleNext}
              disabled={path === 'A' ? !selectedProgramId : (!customHabitName || !customCategory)}
              className="flex-1 bg-black text-white py-3 rounded-xl font-bold disabled:opacity-50 hover:bg-gray-900"
            >
              Next Step
            </button>
          </div>
        </div>

        {/* Side Panel */}
        <div className="w-full md:w-64 bg-gray-50 p-6 rounded-2xl h-fit border border-gray-100 hidden md:block">
          <h4 className="font-bold text-gray-900 mb-4 text-sm uppercase tracking-wide">Community Picks</h4>
          <div className="space-y-4">
             <div className="flex items-start gap-3">
               <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs">JD</div>
               <div>
                 <p className="text-xs font-bold text-gray-900">John started Reading</p>
                 <p className="text-xs text-gray-500">"Small steps everyday"</p>
               </div>
             </div>
             <div className="flex items-start gap-3">
               <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-xs">AS</div>
               <div>
                 <p className="text-xs font-bold text-gray-900">Sarah picked C25K</p>
                 <p className="text-xs text-gray-500">"Finally moving again"</p>
               </div>
             </div>
          </div>
        </div>
      </div>
    );
  }

  // STEP 4: Intensity
  if (step === 4) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4">
        {renderProgressBar()}
        <h2 className="text-3xl font-bold mb-6">Set the Intensity</h2>
        <p className="text-gray-500 mb-8">Consistency beats intensity. Start smaller than you think.</p>
        
        <div className="grid grid-cols-1 gap-3">
          {INTENSITIES.map(opt => (
            <button
              key={opt.id}
              onClick={() => setIntensity(opt.id)}
              className={`p-5 rounded-xl border text-left flex justify-between items-center transition-all ${intensity === opt.id ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600' : 'bg-white border-gray-200 hover:border-indigo-300'}`}
            >
              <span className="font-bold text-gray-900">{opt.label}</span>
              <span className="text-sm text-gray-500">{opt.minVersion}</span>
            </button>
          ))}
        </div>

        <div className="flex gap-4 mt-8">
            <button onClick={handleBack} className="px-6 py-3 text-gray-500 font-bold">Back</button>
            <button 
              onClick={handleNext}
              disabled={!intensity}
              className="flex-1 bg-black text-white py-3 rounded-xl font-bold disabled:opacity-50 hover:bg-gray-900"
            >
              Next Step
            </button>
        </div>
      </div>
    );
  }

  // STEP 5: Why
  if (step === 5) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4">
        {renderProgressBar()}
        <h2 className="text-3xl font-bold mb-4">Why does this matter?</h2>
        <p className="text-gray-500 mb-6">Connecting to a deeper reason helps when motivation fades.</p>
        
        <textarea
          value={why}
          onChange={(e) => setWhy(e.target.value)}
          placeholder="I want to do this because..."
          className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none min-h-[150px]"
          autoFocus
        />

        <div className="flex gap-4 mt-8">
            <button onClick={handleBack} className="px-6 py-3 text-gray-500 font-bold">Back</button>
            <button 
              onClick={handleNext}
              disabled={!why.trim()}
              className="flex-1 bg-black text-white py-3 rounded-xl font-bold disabled:opacity-50 hover:bg-gray-900"
            >
              Next Step
            </button>
        </div>
      </div>
    );
  }

  // STEP 6: Review & Confirm
  if (step === 6) {
    const plan = generatePlan();
    const title = path === 'A' 
      ? PRE_MADE_PROGRAMS.find(p => p.id === selectedProgramId)?.title 
      : customHabitName;

    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        {renderProgressBar()}
        <h2 className="text-3xl font-bold mb-2">Your Plan</h2>
        <p className="text-gray-500 mb-8">Here is your 4-week roadmap for <strong>{title}</strong>.</p>
        
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-8">
          <div className="bg-indigo-50 p-6 border-b border-indigo-100">
             <h3 className="font-bold text-indigo-900 text-lg">{title}</h3>
             <p className="text-indigo-600 text-sm mt-1">Intensity: {INTENSITIES.find(i => i.id === intensity)?.label}</p>
             <p className="text-indigo-600 text-sm italic mt-2">"{why}"</p>
          </div>
          <div className="p-6 space-y-6">
            {plan.map(week => (
              <div key={week.weekNumber} className="flex gap-4">
                 <div className="w-8 h-8 rounded-full bg-gray-100 flex-shrink-0 flex items-center justify-center font-bold text-gray-500 text-sm">
                   {week.weekNumber}
                 </div>
                 <div>
                   <h4 className="font-bold text-gray-900 mb-1">Week {week.weekNumber}: {week.title}</h4>
                   <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 ml-1">
                     {week.bullets.map((b, i) => <li key={i}>{b}</li>)}
                   </ul>
                 </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-4">
            <button onClick={handleBack} className="px-6 py-3 text-gray-500 font-bold">Back</button>
            <button 
              onClick={handleFinish}
              className="flex-1 bg-black text-white py-4 rounded-xl font-bold hover:bg-gray-900 shadow-lg"
            >
              Confirm & Start Journey
            </button>
        </div>
      </div>
    );
  }

  return null;
};

export default Onboarding;
