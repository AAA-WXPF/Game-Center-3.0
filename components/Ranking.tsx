
import React, { useEffect, useState } from 'react';
import { User } from '../types';
import { Button } from './ui/Button';
import { getRank, RANKS } from '../utils/rank';
import { storage } from '../utils/storage';

interface Props {
  currentUser: User;
  onClose: () => void;
}

export const Ranking: React.FC<Props> = ({ currentUser, onClose }) => {
  const [leaderboard, setLeaderboard] = useState<User[]>([]);

  useEffect(() => {
    // Fetch and sort users from storage
    const allUsersMap = storage.getUsers();
    const sortedUsers = Object.values(allUsersMap).map((u: any, index) => {
        // Map stored user to User type if needed, assume structure matches mostly
        // Specifically need to handle the fact storage returns an object keyed by username
        // We need to reconstruct the username from the key if it's not in the object, 
        // but `storage.getUsers` returns objects with passwords etc.
        // We iterate keys to be safe.
        return {
            username: Object.keys(allUsersMap).find(key => allUsersMap[key] === u) || 'Unknown',
            totalScore: u.score,
            avatar: u.avatar || '👤',
            stats: u.stats
        } as User;
    }).sort((a, b) => b.totalScore - a.totalScore);

    setLeaderboard(sortedUsers);
  }, []);

  const currentRank = getRank(currentUser.totalScore);
  const nextRank = RANKS.find(r => r.min >= currentRank.max);
  
  // Calculate Progress
  const progressBase = currentRank.min;
  const progressTarget = currentRank.max;
  const currentProgress = currentUser.totalScore;
  const percent = Math.min(100, Math.max(0, ((currentProgress - progressBase) / (progressTarget - progressBase)) * 100));

  return (
    <div className="h-full w-full overflow-y-auto relative z-20 flex flex-col items-center animate-zoom-in">
       {/* Header */}
       <div className="w-full max-w-4xl p-6 flex justify-between items-center z-30">
          <Button variant="ghost" onClick={onClose} className="text-slate-400 hover:text-white flex items-center gap-2">
              <span className="text-xl">‹</span> 返回大厅
          </Button>
          <h2 className="text-2xl font-black text-white tracking-widest uppercase">
              段位榜单
          </h2>
          <div className="w-20"></div> {/* Spacer */}
      </div>

      <div className="w-full max-w-4xl p-4 space-y-8 pb-20">
          
          {/* My Rank Card */}
          <div className="relative bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 overflow-hidden shadow-2xl">
              {/* Background Glow */}
              <div className={`absolute top-0 right-0 w-64 h-64 ${currentRank.bg} opacity-10 blur-[80px] rounded-full -mr-16 -mt-16`}></div>
              
              <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                  <div className={`w-32 h-32 md:w-40 md:h-40 rounded-full border-4 ${currentRank.border} flex items-center justify-center text-6xl shadow-[0_0_30px_rgba(0,0,0,0.5)] bg-slate-950`}>
                      {currentRank.icon}
                  </div>
                  
                  <div className="flex-1 text-center md:text-left">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">当前段位</div>
                      <h1 className={`text-4xl md:text-5xl font-black ${currentRank.color} mb-4 tracking-tight drop-shadow-sm`}>
                          {currentRank.title}
                      </h1>
                      
                      <div className="relative pt-2">
                          <div className="flex justify-between text-xs font-bold mb-2">
                              <span className="text-white">积分: {currentUser.totalScore}</span>
                              {nextRank ? (
                                  <span className="text-slate-400">距离 {nextRank.title} 还差 {nextRank.min - currentUser.totalScore} 分</span>
                              ) : (
                                  <span className="text-cyan-400">已达最高段位</span>
                              )}
                          </div>
                          <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden border border-white/5">
                              <div 
                                className={`h-full ${currentRank.bg} transition-all duration-1000 ease-out relative`}
                                style={{ width: `${nextRank ? percent : 100}%` }}
                              >
                                  <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Leaderboard */}
              <div className="md:col-span-2 bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-3xl p-6">
                  <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                      <span className="text-yellow-400">🏆</span> 全服排行榜
                  </h3>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto scrollbar-hide pr-2">
                      {leaderboard.map((u, index) => {
                          const rankInfo = getRank(u.totalScore);
                          const isMe = u.username === currentUser.username;
                          return (
                              <div key={u.username} className={`flex items-center gap-4 p-3 rounded-xl border ${isMe ? 'bg-white/10 border-indigo-500/50' : 'bg-black/20 border-white/5'}`}>
                                  <div className={`w-8 h-8 flex items-center justify-center font-black text-lg ${index === 0 ? 'text-yellow-400' : index === 1 ? 'text-slate-300' : index === 2 ? 'text-orange-400' : 'text-slate-600'}`}>
                                      {index + 1}
                                  </div>
                                  <div className="w-10 h-10 rounded-full bg-slate-800 overflow-hidden border border-white/10">
                                      {u.avatar?.startsWith('data:') ? <img src={u.avatar} className="w-full h-full object-cover"/> : (u.avatar || '👤')}
                                  </div>
                                  <div className="flex-1">
                                      <div className={`font-bold ${isMe ? 'text-white' : 'text-slate-300'}`}>{u.username}</div>
                                      <div className={`text-[10px] font-bold ${rankInfo.color}`}>{rankInfo.title}</div>
                                  </div>
                                  <div className="font-mono font-bold text-white">
                                      {u.totalScore}
                                  </div>
                              </div>
                          );
                      })}
                  </div>
              </div>

              {/* Tier Rules */}
              <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-3xl p-6">
                   <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                      <span className="text-slate-400">ℹ️</span> 段位规则
                  </h3>
                  <div className="space-y-4">
                      {RANKS.map((r) => (
                          <div key={r.title} className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-lg ${r.bg} bg-opacity-10 border ${r.border} flex items-center justify-center text-xl`}>
                                  {r.icon}
                              </div>
                              <div>
                                  <div className={`font-bold ${r.color}`}>{r.title}</div>
                                  <div className="text-xs text-slate-400">{r.min} - {r.max > 50000 ? '∞' : r.max} 积分</div>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};
