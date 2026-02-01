
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { dbService } from '../storage';
import { Arc, Increment, EffortLevel } from '../types';

const Dashboard: React.FC = () => {
  const [arcs, setArcs] = useState<Arc[]>([]);
  const [todayLoad, setTodayLoad] = useState(0);
  const [increments, setIncrements] = useState<Increment[]>([]);
  const [recentIncrements, setRecentIncrements] = useState<Increment[]>([]);
  const today = new Date().toISOString().split('T')[0];

  // AI State
  const [suggestions, setSuggestions] = useState<{arcName: string, description: string, reasoning: string}[]>([]);
  const [isLoadingAI, setIsLoadingAI] = useState(false);

  // Form State for new Increment
  const [isLogging, setIsLogging] = useState<string | null>(null); // Arc ID being logged
  const [description, setDescription] = useState('');
  const [effort, setEffort] = useState<EffortLevel>('Easy');
  const [repeat, setRepeat] = useState(true);

  const fetchData = () => {
    const allArcs = dbService.arc.findMany();
    const allIncrements = dbService.increment.findMany();
    const todays = allIncrements.filter(i => i.date === today);
    
    // Sort logic: Middle > Early > Mature
    const sortedArcs = allArcs.sort((a, b) => {
        const score = (stage: string) => stage === 'Middle' ? 3 : stage === 'Early' ? 2 : 1;
        return score(b.stage) - score(a.stage);
    });

    setArcs(sortedArcs);
    setIncrements(todays);

    // Get unique recent increments for "Quick Repeat"
    // Sort by date desc, then uniq by description
    const recent = allIncrements
        .sort((a, b) => b.date.localeCompare(a.date))
        .filter((inc, index, self) => 
            index === self.findIndex((t) => (
                t.description === inc.description && t.arcId === inc.arcId
            ))
        )
        .slice(0, 5); // Top 5 recent unique activities
    setRecentIncrements(recent);
    
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

  const handleQuickRepeat = (inc: Increment) => {
      // Pre-fill form
      setIsLogging(inc.arcId);
      setDescription(inc.description);
      setEffort(inc.effort);
      setRepeat(inc.repeat);
      // We don't auto-submit so the user can adjust effort if today feels different
  };

  const generateAISuggestions = async () => {
    setIsLoadingAI(true);
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        // Prepare context for AI
        const context = {
            arcs: arcs.map(a => ({ name: a.name, stage: a.stage })),
            recentHistory: recentIncrements.map(i => ({ 
                arc: arcs.find(a => a.id === i.arcId)?.name, 
                desc: i.description, 
                effort: i.effort 
            })),
            currentLoad: todayLoad
        };

        const prompt = `
            You are an expert performance coach. Based on the user's data below, suggest 3 specific increments for today.
            Focus on "Middle" stage arcs as they are priority.
            Considering the current daily load is ${todayLoad} (Scale: 0-3 is Low, 3-6 is Optimal, 6+ is High).
            
            User Data: ${JSON.stringify(context)}
            
            Return JSON only: { "suggestions": [{ "arcName": "string", "description": "string", "reasoning": "short string" }] }
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });

        const text = response.text;
        if (text) {
            const data = JSON.parse(text);
            if (data.suggestions) {
                setSuggestions(data.suggestions);
            }
        }
    } catch (e) {
        console.error("AI Error", e);
        alert("Could not generate suggestions. Check API Key configuration.");
    } finally {
        setIsLoadingAI(false);
    }
  };

  const applySuggestion = (s: { arcName: string, description: string }) => {
      const arc = arcs.find(a => a.name === s.arcName);
      if (arc) {
          setIsLogging(arc.id);
          setDescription(s.description);
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

      {/* AI Coach Section */}
      <section className="bg-gradient-to-br from-indigo-900 to-indigo-700 rounded-3xl p-6 text-white shadow-xl">
          <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                    ✨ AI Coach
                </h3>
                <p className="text-indigo-200 text-sm">Personalized suggestions based on your Arcs.</p>
              </div>
              <button 
                onClick={generateAISuggestions} 
                disabled={isLoadingAI}
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
              >
                {isLoadingAI ? 'Generating...' : 'Refresh'}
              </button>
          </div>

          {suggestions.length === 0 && !isLoadingAI && (
              <div className="text-center py-6 text-indigo-300 border-2 border-dashed border-indigo-500/30 rounded-xl">
                  Tap refresh to analyze your data and get suggestions.
              </div>
          )}

          <div className="grid gap-3">
              {suggestions.map((s, i) => (
                  <div key={i} className="bg-white/10 p-4 rounded-xl border border-white/10 hover:bg-white/20 transition-colors cursor-pointer" onClick={() => applySuggestion(s)}>
                      <div className="flex justify-between items-start">
                          <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-indigo-200 bg-indigo-900/50 px-2 py-0.5 rounded">{s.arcName}</span>
                            <p className="font-bold text-lg mt-1">{s.description}</p>
                            <p className="text-xs text-indigo-200 mt-1">{s.reasoning}</p>
                          </div>
                          <div className="bg-white text-indigo-900 p-2 rounded-full">
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                          </div>
                      </div>
                  </div>
              ))}
          </div>
      </section>

      {/* Quick Repeat Section */}
      {recentIncrements.length > 0 && !isLogging && (
          <section className="space-y-4">
              <h3 className="text-xl font-bold text-gray-900">Quick Repeat</h3>
              <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                  {recentIncrements.map(inc => {
                      const arc = arcs.find(a => a.id === inc.arcId);
                      return (
                        <button 
                            key={inc.id}
                            onClick={() => handleQuickRepeat(inc)}
                            className="flex-shrink-0 bg-white border border-gray-200 p-4 rounded-xl text-left hover:border-indigo-300 hover:shadow-md transition-all min-w-[160px]"
                        >
                            <div className="text-xs font-bold text-gray-400 uppercase mb-1">{arc?.name}</div>
                            <div className="font-bold text-gray-900">{inc.description}</div>
                            <div className="flex gap-2 mt-2">
                                <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{inc.effort}</span>
                            </div>
                        </button>
                      );
                  })}
              </div>
          </section>
      )}

      {/* Manual Log / Arcs List */}
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
