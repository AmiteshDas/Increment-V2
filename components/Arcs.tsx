
import React, { useState, useEffect } from 'react';
import { dbService } from '../storage';
import { Arc, Increment } from '../types';

const Arcs: React.FC = () => {
  const [arcs, setArcs] = useState<Arc[]>([]);
  const [increments, setIncrements] = useState<Increment[]>([]);
  const [selectedArcId, setSelectedArcId] = useState<string | null>(null);

  useEffect(() => {
    const allArcs = dbService.arc.findMany();
    // Sort priority: Middle first
    const sorted = allArcs.sort((a, b) => {
        const score = (stage: string) => stage === 'Middle' ? 3 : stage === 'Early' ? 2 : 1;
        return score(b.stage) - score(a.stage);
    });
    setArcs(sorted);
    if (sorted.length > 0) setSelectedArcId(sorted[0].id);
    setIncrements(dbService.increment.findMany());
  }, []);

  const getArcIncrements = (arcId: string) => {
    return increments
      .filter(i => i.arcId === arcId)
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  // Helper to draw SVG curve
  const renderCurve = (arcData: Increment[], colorClass: string) => {
    if (arcData.length < 2) return null;
    
    const points = arcData.map((inc, i) => {
       const x = (i / (Math.max(arcData.length - 1, 1))) * 300; 
       const y = 100 - (inc.effectiveFriction * 20); 
       return `${x},${y}`;
    });

    const pathData = points.reduce((acc, point, i, a) => {
      if (i === 0) return `M ${point}`;
      const [x, y] = point.split(',').map(Number);
      const [prevX, prevY] = a[i - 1].split(',').map(Number);
      const cp1X = prevX + (x - prevX) / 2;
      const cp1Y = prevY;
      const cp2X = prevX + (x - prevX) / 2;
      const cp2Y = y;
      return `${acc} C ${cp1X},${cp1Y} ${cp2X},${cp2Y} ${x},${y}`;
    }, '');

    return (
      <svg viewBox="0 0 300 120" className="w-full h-full overflow-visible">
         <defs>
            <linearGradient id={`fade-${colorClass}`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.1" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="1" />
            </linearGradient>
         </defs>
         <path d={pathData} fill="none" stroke={`url(#fade-${colorClass})`} strokeWidth="3" strokeLinecap="round" className={colorClass} />
         {points.map((p, i) => {
             const [cx, cy] = p.split(',');
             const friction = arcData[i].effectiveFriction;
             const r = 2 + (friction * 1.5);
             return <circle key={i} cx={cx} cy={cy} r={r} className={`${colorClass} opacity-50 fill-current`} />
         })}
      </svg>
    );
  };

  const getArcStats = (arc: Arc) => {
      const arcIncs = getArcIncrements(arc.id);
      const totalFriction = arcIncs.reduce((sum, i) => sum + i.effectiveFriction, 0);
      return { count: arcIncs.length, load: totalFriction.toFixed(1) };
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <header>
         <div>
            <h2 className="text-4xl font-black tracking-tight text-gray-900">Your Arcs</h2>
            <p className="text-gray-500 mt-2 text-lg">Visualizing your trajectory of becoming.</p>
         </div>
      </header>
      
      {/* Horizontal Scroll Landscape */}
      <div className="flex overflow-x-auto gap-6 pb-8 -mx-4 px-4 snap-x no-scrollbar">
        {arcs.map(arc => {
           const arcIncs = getArcIncrements(arc.id);
           const stats = getArcStats(arc);
           const isPriority = arc.stage === 'Middle';
           const isSelected = selectedArcId === arc.id;
           
           // Priority (Middle) -> Orange
           // Maintenance/Early -> Green
           const colorTheme = isPriority 
                ? 'border-orange-500 bg-orange-50 ring-orange-200 text-orange-600' 
                : 'border-green-500 bg-green-50 ring-green-200 text-green-600';

           return (
            <button 
                key={arc.id} 
                onClick={() => setSelectedArcId(arc.id)}
                className={`text-left snap-center flex-shrink-0 w-[85vw] md:w-[400px] rounded-3xl p-8 flex flex-col justify-between shadow-xl transition-all duration-300 relative overflow-hidden ${
                    isSelected ? 'scale-[1.02] ring-4' : 'opacity-80 hover:opacity-100 scale-100'
                } ${colorTheme} border-2`}
            >
                {/* Selection Indicator */}
                {isSelected && (
                    <div className="absolute top-4 right-4">
                        <span className={`flex h-3 w-3 relative`}>
                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-current`}></span>
                            <span className={`relative inline-flex rounded-full h-3 w-3 bg-current`}></span>
                        </span>
                    </div>
                )}

                <div className="flex justify-between items-start mb-6 w-full">
                    <div>
                        <h3 className="text-2xl font-black text-gray-900">{arc.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/50 text-gray-700`}>
                                {arc.stage} Stage
                            </span>
                            <span className="text-xs text-gray-500 font-medium">{stats.count} increments</span>
                        </div>
                    </div>
                    <div className="text-right pr-4">
                        <div className="text-3xl font-black text-gray-900">{stats.load}</div>
                        <div className="text-[10px] uppercase font-bold text-gray-400">Total Load</div>
                    </div>
                </div>

                {/* Graph Container */}
                <div className="h-32 w-full mb-6 relative">
                    <div className="absolute inset-0 border-b border-gray-900/5"></div>
                    <div className="absolute inset-0 border-t border-gray-900/5 opacity-50" style={{ top: '50%' }}></div>
                    {renderCurve(arcIncs, isPriority ? 'text-orange-500' : 'text-green-600')}
                </div>
            </button>
           );
        })}
      </div>

      {/* Selected Arc Data Table */}
      {selectedArcId && (
        <section className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm animate-in slide-in-from-bottom-10">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                Data Stream: 
                <span className="text-indigo-600">{arcs.find(a => a.id === selectedArcId)?.name}</span>
            </h3>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b border-gray-100">
                            <th className="pb-3 font-bold text-gray-400">Date</th>
                            <th className="pb-3 font-bold text-gray-400">Description</th>
                            <th className="pb-3 font-bold text-gray-400">Input</th>
                            <th className="pb-3 font-bold text-gray-900 text-right">Effective Friction</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {getArcIncrements(selectedArcId).slice().reverse().map(inc => {
                             return (
                                <tr key={inc.id}>
                                    <td className="py-3 text-gray-500 font-mono text-xs">{inc.date}</td>
                                    <td className="py-3 text-gray-600 font-medium">{inc.description}</td>
                                    <td className="py-3">
                                        <span className="inline-block px-2 py-0.5 rounded bg-gray-100 text-xs font-medium mr-2">{inc.effort}</span>
                                        <span className={`text-xs ${inc.repeat ? 'text-green-600' : 'text-red-500'}`}>{inc.repeat ? 'Repeat: Yes' : 'Repeat: No'}</span>
                                    </td>
                                    <td className="py-3 text-right font-mono font-bold text-indigo-600">{inc.effectiveFriction}</td>
                                </tr>
                             );
                        })}
                        {getArcIncrements(selectedArcId).length === 0 && (
                            <tr>
                                <td colSpan={4} className="py-8 text-center text-gray-400 italic">No increments recorded yet.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </section>
      )}
    </div>
  );
};

export default Arcs;
