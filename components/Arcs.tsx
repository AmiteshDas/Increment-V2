
import React, { useState, useEffect } from 'react';
import { dbService } from '../storage';
import { Arc, Increment } from '../types';

const Arcs: React.FC = () => {
  const [arcs, setArcs] = useState<Arc[]>([]);
  const [increments, setIncrements] = useState<Increment[]>([]);
  const [showData, setShowData] = useState(false);

  useEffect(() => {
    setArcs(dbService.arc.findMany());
    setIncrements(dbService.increment.findMany());
  }, []);

  const getArcIncrements = (arcId: string) => {
    return increments
      .filter(i => i.arcId === arcId)
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  // Helper to draw SVG curve
  const renderCurve = (arcData: Increment[]) => {
    if (arcData.length < 2) return null;
    
    // Normalize dates to X (0 to 300)
    // Normalize friction to Y (0 to 100)
    const points = arcData.map((inc, i) => {
       const x = (i / (13)) * 300; // Assuming ~14 days window for sim
       const y = 100 - (inc.effectiveFriction * 20); // Scale friction (max ~4.0)
       return `${x},${y}`;
    });

    // Simple bezier smoothing
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
         {/* Gradient Def */}
         <defs>
            <linearGradient id="fade" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.1" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="1" />
            </linearGradient>
         </defs>
         {/* The Line */}
         <path d={pathData} fill="none" stroke="url(#fade)" strokeWidth="3" strokeLinecap="round" className="text-indigo-600" />
         {/* The Points */}
         {points.map((p, i) => {
             const [cx, cy] = p.split(',');
             const friction = arcData[i].effectiveFriction;
             const r = 2 + (friction * 1.5); // Bigger dot for harder effort
             return <circle key={i} cx={cx} cy={cy} r={r} className="fill-indigo-600 opacity-50" />
         })}
      </svg>
    );
  };

  // Calculate stats for prioritization display
  const getArcStats = (arc: Arc) => {
      const arcIncs = getArcIncrements(arc.id);
      const totalFriction = arcIncs.reduce((sum, i) => sum + i.effectiveFriction, 0);
      return { count: arcIncs.length, load: totalFriction.toFixed(1) };
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <header className="flex justify-between items-end">
         <div>
            <h2 className="text-4xl font-black tracking-tight text-gray-900">Your Arcs</h2>
            <p className="text-gray-500 mt-2 text-lg">Visualizing your trajectory of becoming.</p>
         </div>
         <button onClick={() => setShowData(!showData)} className="text-xs font-bold uppercase tracking-widest text-indigo-600 border border-indigo-200 px-3 py-1 rounded-full hover:bg-indigo-50">
            {showData ? 'Hide Data' : 'View Simulation Data'}
         </button>
      </header>
      
      {/* Horizontal Scroll Landscape */}
      <div className="flex overflow-x-auto gap-6 pb-8 -mx-4 px-4 snap-x no-scrollbar">
        {arcs.map(arc => {
           const arcIncs = getArcIncrements(arc.id);
           const stats = getArcStats(arc);
           const isMid = arc.stage === 'Middle';
           
           return (
            <div key={arc.id} className={`snap-center flex-shrink-0 w-[85vw] md:w-[400px] bg-white rounded-3xl p-8 flex flex-col justify-between shadow-xl shadow-indigo-100 border-2 transition-transform hover:scale-[1.01] ${isMid ? 'border-indigo-600 ring-4 ring-indigo-50' : 'border-gray-100'}`}>
                
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="text-2xl font-black text-gray-900">{arc.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${isMid ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                {arc.stage} Stage
                            </span>
                            <span className="text-xs text-gray-400 font-medium">{stats.count} increments</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-black text-gray-900">{stats.load}</div>
                        <div className="text-[10px] uppercase font-bold text-gray-400">Total Load</div>
                    </div>
                </div>

                {/* Graph Container */}
                <div className="h-32 w-full mb-6 relative">
                    {/* Grid lines */}
                    <div className="absolute inset-0 border-b border-gray-100"></div>
                    <div className="absolute inset-0 border-t border-gray-100 opacity-50" style={{ top: '50%' }}></div>
                    {renderCurve(arcIncs)}
                </div>

                <div className="bg-gray-50 rounded-xl p-4">
                    <h4 className="text-xs font-bold uppercase text-gray-400 mb-3">Recent Increments</h4>
                    <div className="space-y-2">
                        {arcIncs.slice(-3).reverse().map(inc => (
                            <div key={inc.id} className="flex justify-between items-center text-sm">
                                <span className="text-gray-700 font-medium">{inc.description}</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-400">{inc.effort}</span>
                                    <span className={`w-2 h-2 rounded-full ${inc.repeat ? 'bg-green-400' : 'bg-red-400'}`} title={inc.repeat ? 'Repeatable' : 'High Friction'} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
           );
        })}
      </div>

      {/* Simulation Data Table */}
      {showData && (
        <section className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm animate-in slide-in-from-bottom-10">
            <h3 className="text-xl font-bold mb-6">Simulation Data (14 Days)</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b border-gray-100">
                            <th className="pb-3 font-bold text-gray-400">Date</th>
                            <th className="pb-3 font-bold text-gray-400">Arc</th>
                            <th className="pb-3 font-bold text-gray-400">Description</th>
                            <th className="pb-3 font-bold text-gray-400">Input</th>
                            <th className="pb-3 font-bold text-gray-900 text-right">Effective Friction</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {increments.sort((a,b) => b.date.localeCompare(a.date)).map(inc => {
                             const arcName = arcs.find(a => a.id === inc.arcId)?.name;
                             return (
                                <tr key={inc.id}>
                                    <td className="py-3 text-gray-500 font-mono text-xs">{inc.date}</td>
                                    <td className="py-3 font-bold text-gray-900">{arcName}</td>
                                    <td className="py-3 text-gray-600">{inc.description}</td>
                                    <td className="py-3">
                                        <span className="inline-block px-2 py-0.5 rounded bg-gray-100 text-xs font-medium mr-2">{inc.effort}</span>
                                        <span className={`text-xs ${inc.repeat ? 'text-green-600' : 'text-red-500'}`}>{inc.repeat ? 'Repeat: Yes' : 'Repeat: No'}</span>
                                    </td>
                                    <td className="py-3 text-right font-mono font-bold text-indigo-600">{inc.effectiveFriction}</td>
                                </tr>
                             );
                        })}
                    </tbody>
                </table>
            </div>
        </section>
      )}

      <div className="max-w-xl mx-auto text-center py-8">
          <p className="text-gray-400 text-sm">
              The system prioritizes <strong>Middle Stage</strong> arcs (highlighted) where friction is volatile. 
              Early arcs need less attention, and Mature arcs are in maintenance.
          </p>
      </div>
    </div>
  );
};

export default Arcs;
