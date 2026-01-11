
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { dbService } from '../storage';

const Welcome: React.FC = () => {
  const navigate = useNavigate();

  const handleStartOnboarding = () => {
    navigate('/onboarding');
  };

  const handleSkipToApp = () => {
    // Mark as onboarded even if they skip the wizard, so they don't get stuck in the welcome loop
    dbService.user.update({ onboarded: true });
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white animate-in fade-in duration-700">
      <div className="max-w-md w-full text-center space-y-10">
        
        {/* Logo / Brand */}
        <div className="space-y-4">
          <div className="w-20 h-20 bg-indigo-600 rounded-2xl mx-auto flex items-center justify-center text-white shadow-xl shadow-indigo-200">
             <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
          </div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Increment</h1>
          <p className="text-gray-500 text-lg">Build habits. Track progress.<br/>Review your growth.</p>
        </div>

        {/* Actions */}
        <div className="space-y-4 pt-4">
          <button 
            onClick={handleStartOnboarding}
            className="w-full py-4 px-6 bg-black text-white rounded-xl font-bold text-lg hover:bg-gray-900 transition-transform hover:scale-[1.02] shadow-lg flex items-center justify-center gap-3"
          >
            <span>Start a New Habit</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
          </button>

          <button 
            onClick={handleSkipToApp}
            className="w-full py-4 px-6 bg-white text-gray-600 border-2 border-gray-100 rounded-xl font-bold text-lg hover:border-gray-300 hover:text-gray-900 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>

        {/* Footer */}
        <p className="text-xs text-gray-400 uppercase tracking-widest pt-8">
          Simple • Focused • Private
        </p>
      </div>
    </div>
  );
};

export default Welcome;
