
import React, { useState, useEffect } from 'react';
import { dbService } from '../storage';
import { Arc, Increment, EffortLevel } from '../types';

const Dashboard: React.FC = () => {
  const [arcs, setArcs] = useState<Arc[]>([]);
  const [todayLoad, setTodayLoad] = useState(0);
  const [increments, setIncrements] = useState<Increment[]>([]);
  const today = new Date().toISOString().split('T')[0];

  // Form State for new Increment
  const [isLogging, setIsLogging] = useState<string | null>(null); // Arc ID being logged
  const [description, setDescription] = useState('');
  const [effort, setEffort] = useState<EffortLevel>('Easy');
  const [repeat, setRepeat] = useState(true);

  const fetchData = () => {
    const allArcs = dbService.arc.findMany();
    const allIncrements = dbService.increment.findMany();
    const todays = allIncrements.filter(i => i.date === today);
    
    // Prioritization Sort: Middle > Early > Mature
    const sortedArcs = allArcs.sort((a, b) => {
        const score = (stage: string) => stage === 'Middle' ? 3 : stage === 'Early' ? 2 : 1;
        return score(b.stage) - score(a.stage);
    });

    setArcs(sortedArcs);
    setIncrements(todays);
    
    // Calculate Daily Load
    const load = todays.reduce((acc, curr) => acc + curr.effectiveFriction, 0);
    setTodayLoad(Number(load.toFixed(2)));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLogSubmit = () => {
    if (isLogging && description) {
        dbService.increment.create(isLogging, description, effort, repeat, today);
        setIsLogging(null);
        setDescription('');
        setEffort('Easy');
        setRepeat(true);
        fetchData();
    }
  };

  const handleReset = () => {
    if (confirm('Start fresh? This will clear all data.')) {
      localStorage.setItem('increment_skip_seed', 'true');
      dbService.user.reset();
      window.location.reload();
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12 relative">
      <header>
        <p className="text-sm font-medium text-indigo-600 uppercase tracking-wider">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        <h2 className="text-3xl font-bold mt-1">Daily Load</h2>
      </header>

      {/* Daily Load Meter */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center">
          <div className="relative w-full max-w-md h-6 bg-gray-100 rounded-full overflow-hidden">
             <div 
                className={`absolute top-0 left-0 h-full transition-all duration-700 ${todayLoad > 5 ? 'bg-red-500' : todayLoad > 3 ? 'bg-yellow-400' : 'bg-green-500'}`} 
                style={{ width: `${Math.min((todayLoad / 8) * 100, 100)}%` }}
             ></div>
          </div>
          <div className="mt-4 text-center">
              <span className="text-5xl font-black text-gray-900">{todayLoad}</span>
              <p className="text-sm text-gray-500 font-medium uppercase tracking-widest mt-1">Effective Friction Units</p>
          </div>
          <p className="mt-4 text-sm text-gray-400 max-w-sm text-center">
             {todayLoad < 3 ? "Capacity available for growth." : todayLoad < 6 ? "Optimal strain zone." : "High load. Prioritize recovery."}
          </p>
      </div>

      {/* Arcs List */}
      <section className="space-y-6">
        <h3 className="text-xl font-bold text-gray-900">Today's Increments</h3>
        <div className="grid gap-4">
          {arcs.map(arc => {
            const hasDoneToday = increments.some(i => i.arcId === arc.id);
            const isMid = arc.stage === 'Middle';

            if (isLogging === arc.id) {
                return (
                    <div key={arc.id} className="bg-white p-6 rounded-2xl border-2 border-indigo-600 shadow-lg animate-in zoom-in-95">
                        <h4 className="font-bold text-lg mb-4">Log Increment: {arc.name}</h4>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Description</label>
                                <input 
                                    autoFocus
                                    className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200"
                                    placeholder="e.g. Read 10 pages"
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Effort</label>
                                    <div className="flex gap-1">
                                        {(['Easy', 'Medium', 'Hard'] as EffortLevel[]).map(l => (
                                            <button 
                                                key={l}
                                                onClick={() => setEffort(l)}
                                                className={`flex-1 py-2 text-xs font-bold rounded-lg border ${effort === l ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-200'}`}
                                            >
                                                {l}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Repeat?</label>
                                    <div className="flex gap-1">
                                         <button onClick={() => setRepeat(true)} className={`flex-1 py-2 text-xs font-bold rounded-lg border ${repeat ? 'bg-green-100 text-green-700 border-green-200' : 'bg-white text-gray-400 border-gray-200'}`}>Yes</button>
                                         <button onClick={() => setRepeat(false)} className={`flex-1 py-2 text-xs font-bold rounded-lg border ${!repeat ? 'bg-red-100 text-red-700 border-red-200' : 'bg-white text-gray-400 border-gray-200'}`}>No</button>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex gap-2 pt-2">
                                <button onClick={() => setIsLogging(null)} className="flex-1 py-3 text-gray-500 font-bold">Cancel</button>
                                <button onClick={handleLogSubmit} disabled={!description} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-md disabled:opacity-50">Save Increment</button>
                            </div>
                        </div>
                    </div>
                );
            }

            return (
                <div key={arc.id} className={`bg-white p-5 rounded-2xl border flex items-center justify-between gap-4 transition-all ${hasDoneToday ? 'opacity-50 border-gray-100' : isMid ? 'border-indigo-200 shadow-md ring-1 ring-indigo-50' : 'border-gray-100 hover:border-gray-200'}`}>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg font-bold text-gray-900">{arc.name}</span>
                            {isMid && <span className="w-2 h-2 rounded-full bg-indigo-500" title="Priority Arc"></span>}
                        </div>
                        <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">{arc.stage} Stage</span>
                    </div>

                    {!hasDoneToday ? (
                        <button 
                            onClick={() => setIsLogging(arc.id)}
                            className="w-10 h-10 rounded-full bg-gray-50 text-gray-400 hover:bg-black hover:text-white flex items-center justify-center transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                        </button>
                    ) : (
                        <div className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full">
                            Logged
                        </div>
                    )}
                </div>
            );
          })}
        </div>
      </section>

      {/* Dev Utils */}
      <footer className="pt-8 border-t border-gray-200 flex justify-center">
        <button 
          onClick={handleReset}
          className="text-xs text-red-300 hover:text-red-500 transition-colors uppercase tracking-widest font-bold opacity-50 hover:opacity-100"
        >
          Reset App
        </button>
      </footer>
    </div>
  );
};

export default Dashboard;
