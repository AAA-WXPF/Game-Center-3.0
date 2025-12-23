import React, { useEffect, useState } from 'react';
import { Achievement } from '../../types';
import { playSound } from '../../utils/sound';

interface Props {
  achievement: Achievement;
  onComplete: () => void;
}

export const AchievementToast: React.FC<Props> = ({ achievement, onComplete }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Slight delay for animation entry
    setTimeout(() => {
        setVisible(true);
        playSound.achievement(); // Use specific achievement sound
    }, 100);

    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onComplete, 500); // Wait for exit animation
    }, 4000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  const rarityColors = {
      common: 'from-slate-700 to-slate-900 border-slate-500',
      rare: 'from-blue-700 to-blue-900 border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.4)]',
      epic: 'from-purple-700 to-purple-900 border-fuchsia-400 shadow-[0_0_20px_rgba(232,121,249,0.4)]',
      legendary: 'from-amber-600 to-yellow-800 border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.5)]'
  };

  return (
    <div className={`fixed top-8 left-1/2 -translate-x-1/2 z-[100] transition-all duration-500 transform ${visible ? 'translate-y-0 opacity-100' : '-translate-y-20 opacity-0'}`}>
      <div className={`relative flex items-center gap-4 px-6 py-4 rounded-xl border-2 bg-gradient-to-r ${rarityColors[achievement.rarity]} text-white min-w-[320px] overflow-hidden`}>
        {/* Shine Effect */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 translate-x-[-200%] animate-[shine_2s_infinite]"></div>
        
        <div className="text-4xl filter drop-shadow-lg animate-bounce">{achievement.icon}</div>
        
        <div className="flex-1">
            <div className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1">
                成就解锁!
            </div>
            <h3 className="text-lg font-black leading-none mb-1">{achievement.title}</h3>
            <p className="text-xs opacity-90">{achievement.description}</p>
        </div>
      </div>
    </div>
  );
};