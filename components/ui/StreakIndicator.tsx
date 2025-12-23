import React from 'react';

interface Props {
  streak: number;
  className?: string;
}

export const StreakIndicator: React.FC<Props> = ({ streak, className = '' }) => {
  if (!streak || streak < 2) return null;

  return (
    <div className={`inline-flex items-center gap-1 bg-gradient-to-r from-orange-600 via-red-500 to-orange-600 text-white px-2 py-0.5 rounded-full border border-yellow-400/50 shadow-[0_0_15px_rgba(234,88,12,0.6)] animate-pulse z-20 select-none ${className}`}>
      <span className="text-sm animate-[bounce_1.5s_infinite]">🔥</span>
      <span className="text-[10px] font-black italic tracking-widest leading-none drop-shadow-md font-mono">{streak}连胜</span>
    </div>
  );
};