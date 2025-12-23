import React, { useState, useEffect, useRef } from 'react';

interface Props {
  currentTrack: string;
}

export const MusicPlayer: React.FC<Props> = ({ currentTrack }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.3);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize Audio
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.loop = true;
    }
  }, []);

  // Handle Track Changes
  useEffect(() => {
    const audio = audioRef.current;
    if (audio && currentTrack) {
      // Only change if source is different
      if (!audio.src.includes(currentTrack)) {
        const wasPlaying = !audio.paused;
        audio.src = currentTrack;
        audio.volume = isMuted ? 0 : volume;
        if (wasPlaying || isPlaying) {
          audio.play().catch(e => console.log("Auto-play prevented:", e));
        }
      }
    } else if (audio && !currentTrack) {
        audio.pause();
    }
  }, [currentTrack]);

  // Handle Volume/Mute Changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(e => console.error("Playback failed:", e));
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-full px-4 py-2 shadow-2xl transition-all duration-300 hover:scale-105 group">
      {/* Visualizer Animation */}
      <div className={`flex items-end gap-[2px] h-4 w-6 ${isPlaying ? '' : 'opacity-50'}`}>
        {[1, 2, 3, 4].map((i) => (
           <div 
             key={i} 
             className={`w-1 bg-gradient-to-t from-indigo-500 to-cyan-400 rounded-t-sm transition-all duration-300 ${isPlaying ? 'animate-music-bar' : 'h-1'}`}
             style={{ animationDelay: `${i * 0.1}s`, height: isPlaying ? '100%' : '20%' }}
           ></div>
        ))}
      </div>

      {/* Info */}
      <div className="hidden md:block overflow-hidden w-0 group-hover:w-24 transition-all duration-500">
          <div className="text-[10px] text-slate-400 font-bold whitespace-nowrap">
              BACKGROUND MUSIC
          </div>
      </div>

      {/* Controls */}
      <button 
        onClick={togglePlay}
        className="text-white hover:text-cyan-400 transition-colors focus:outline-none"
      >
        {isPlaying ? (
           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        ) : (
           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        )}
      </button>

      {/* Volume Slider (Hidden by default, shown on hover) */}
      <div className="w-0 overflow-hidden group-hover:w-20 transition-all duration-300 flex items-center">
        <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.01" 
            value={isMuted ? 0 : volume}
            onChange={(e) => {
                setVolume(parseFloat(e.target.value));
                setIsMuted(false);
            }}
            className="w-16 h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-cyan-500"
        />
      </div>

      <style>{`
        @keyframes music-bar {
          0%, 100% { height: 20%; }
          50% { height: 100%; }
        }
        .animate-music-bar {
          animation: music-bar 0.8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};
