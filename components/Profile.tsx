
import React, { useMemo, useState, useRef } from 'react';
import { User, GameType, GameStats, GameHistoryItem } from '../types';
import { Button } from './ui/Button';
import { storage } from '../utils/storage';
import { playSound } from '../utils/sound';
import { ACHIEVEMENTS } from '../utils/achievements';
import { getRank } from '../utils/rank';

interface Props {
  user: User;
  onLogout: () => void;
  onClose: () => void;
  onUpdateUser: (user: User) => void;
}

const getGameName = (type: GameType) => {
    switch (type) {
        case GameType.GUESS_NUMBER: return '猜数字';
        case GameType.RPS: return '石头剪刀布';
        case GameType.CHESS: return '国际象棋';
        case GameType.XIANGQI: return '中国象棋';
        case GameType.BILLIARDS: return '台球大师';
        case GameType.SNAKE: return '贪吃蛇';
        default: return '未知游戏';
    }
};

const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return '刚刚';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}小时前`;
    const days = Math.floor(hours / 24);
    return `${days}天前`;
};

const formatFullDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN');
};

export const Profile: React.FC<Props> = ({ user, onLogout, onClose, onUpdateUser }) => {
  const [selectedMatch, setSelectedMatch] = useState<GameHistoryItem | null>(null);
  const [activeTab, setActiveTab] = useState<'stats' | 'achievements'>('stats');
  
  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [editUsername, setEditUsername] = useState(user.username);
  const [editAvatar, setEditAvatar] = useState(user.avatar || '👤');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const rank = getRank(user.totalScore);

  const statsSummary = useMemo(() => {
      let totalPlayed = 0;
      let totalWins = 0;
      let maxStreak = 0;
      
      if (user.stats) {
          Object.values(user.stats).forEach((stat) => {
              const s = stat as GameStats;
              totalPlayed += s.played;
              totalWins += s.wins;
              maxStreak = Math.max(maxStreak, s.maxStreak);
          });
      }

      const winRate = totalPlayed > 0 ? Math.round((totalWins / totalPlayed) * 100) : 0;
      return { totalPlayed, winRate, maxStreak, totalWins };
  }, [user.stats]);

  const unlockedCount = user.achievements?.length || 0;
  const totalAchievements = ACHIEVEMENTS.length;
  const completionRate = Math.round((unlockedCount / totalAchievements) * 100);

  const handleSave = () => {
      if (!editUsername.trim()) return;
      
      const res = storage.updateProfile(user.username, editUsername.trim(), editAvatar);
      
      if (res.success && res.user) {
          playSound.win();
          setIsEditing(false);
          // Update the parent state directly
          onUpdateUser(res.user);
      } else {
          playSound.wrong();
          alert(res.message);
      }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        if (file.size > 2 * 1024 * 1024) {
            alert("图片大小不能超过 2MB");
            return;
        }
        const reader = new FileReader();
        reader.onload = (readerEvent) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_SIZE = 150; 
                let width = img.width;
                let height = img.height;
                if (width > height) { if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; } } 
                else { if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; } }
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                setEditAvatar(canvas.toDataURL('image/jpeg', 0.8));
            };
            img.src = readerEvent.target?.result as string;
        };
        reader.readAsDataURL(file);
    }
  };

  return (
    <div className="h-full w-full bg-transparent overflow-y-auto relative z-20 flex flex-col items-center">
      {/* Top Navigation */}
      <div className="w-full max-w-6xl p-6 flex justify-between items-center z-30">
          <Button variant="ghost" onClick={onClose} className="text-slate-400 hover:text-white flex items-center gap-2">
              <span className="text-xl">‹</span> 返回大厅
          </Button>
          <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-500 tracking-widest uppercase">
              玩家名片
          </h2>
          <Button variant="danger" onClick={onLogout} className="px-6 bg-red-900/20 text-red-400 border border-red-900/50 hover:bg-red-900/40">
              退出登录
          </Button>
      </div>

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 p-4 md:p-8 animate-slide-up">
          
          {/* Identity Card (Left) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
              <div className="relative group perspective-container">
                  <div className="relative bg-slate-900/60 backdrop-blur-xl border border-white/5 p-8 rounded-2xl overflow-hidden shadow-2xl">
                      
                      <div className="flex flex-col items-center text-center">
                          {/* Avatar Section */}
                          <div className="relative mb-6">
                              <div className={`w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-slate-800 p-1 relative z-10 overflow-hidden bg-slate-950 ${isEditing ? 'cursor-pointer hover:border-cyan-500 transition-colors' : ''}`}
                                   onClick={() => isEditing && fileInputRef.current?.click()}>
                                  {editAvatar.startsWith('data:') ? (
                                      <img src={editAvatar} className="w-full h-full object-cover rounded-full" alt="avatar"/>
                                  ) : (
                                      <div className="w-full h-full flex items-center justify-center text-6xl select-none">{editAvatar}</div>
                                  )}
                                  
                                  {isEditing && (
                                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-xs text-white font-bold uppercase tracking-widest opacity-0 hover:opacity-100 transition-opacity">
                                          更换头像
                                      </div>
                                  )}
                              </div>
                              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                          </div>

                          {/* Username Section */}
                          <div className="mb-2 w-full">
                              {isEditing ? (
                                  <input 
                                    value={editUsername}
                                    onChange={(e) => setEditUsername(e.target.value)}
                                    className="bg-black/40 border border-cyan-500/50 text-white text-center text-2xl font-black rounded-lg py-1 w-full focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                    autoFocus
                                  />
                              ) : (
                                  <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">{user.username}</h1>
                              )}
                          </div>
                          
                          <div className={`text-xs font-mono px-3 py-1 rounded-full border mb-6 ${isEditing ? 'hidden' : 'block'} ${rank.color} border-current bg-opacity-10 bg-black`}>
                              {rank.title}
                          </div>

                          {/* Stats Grid in Card */}
                          <div className="grid grid-cols-3 gap-2 w-full mb-6">
                              <div className="bg-white/5 rounded-lg p-2 flex flex-col items-center">
                                  <span className="text-[10px] text-slate-400 uppercase">积分</span>
                                  <span className="text-lg font-bold text-cyan-400">{user.totalScore}</span>
                              </div>
                              <div className="bg-white/5 rounded-lg p-2 flex flex-col items-center">
                                  <span className="text-[10px] text-slate-400 uppercase">胜率</span>
                                  <span className="text-lg font-bold text-emerald-400">{statsSummary.winRate}%</span>
                              </div>
                              <div className="bg-white/5 rounded-lg p-2 flex flex-col items-center">
                                  <span className="text-[10px] text-slate-400 uppercase">成就</span>
                                  <span className="text-lg font-bold text-purple-400">{completionRate}%</span>
                              </div>
                          </div>

                          {/* Action Button */}
                          {isEditing ? (
                              <div className="flex gap-2 w-full">
                                  <Button onClick={() => setIsEditing(false)} className="flex-1 bg-slate-700 text-xs">取消</Button>
                                  <Button onClick={handleSave} className="flex-1 bg-green-600 hover:bg-green-500 text-xs shadow-[0_0_15px_rgba(34,197,94,0.4)]">保存修改</Button>
                              </div>
                          ) : (
                              <Button onClick={() => setIsEditing(true)} className="w-full bg-slate-800 hover:bg-slate-700 border border-white/10 text-xs tracking-widest font-bold py-3">
                                  编辑资料
                              </Button>
                          )}
                      </div>
                  </div>
              </div>
          </div>

          {/* Right Column: Stats & Achievements Tabs */}
          <div className="lg:col-span-7">
              <div className="flex gap-4 mb-6 border-b border-white/10">
                  <button 
                    onClick={() => setActiveTab('stats')}
                    className={`pb-3 px-4 text-sm font-bold uppercase tracking-wider transition-all ${activeTab === 'stats' ? 'text-white border-b-2 border-cyan-500' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                      数据概览
                  </button>
                  <button 
                    onClick={() => setActiveTab('achievements')}
                    className={`pb-3 px-4 text-sm font-bold uppercase tracking-wider transition-all ${activeTab === 'achievements' ? 'text-white border-b-2 border-purple-500' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                      成就系统 ({unlockedCount}/{totalAchievements})
                  </button>
              </div>

              {activeTab === 'stats' ? (
                  <div className="space-y-6 animate-slide-up">
                      <div className="grid grid-cols-2 gap-4">
                          <div className="bg-slate-900/60 border border-white/10 p-5 rounded-2xl relative overflow-hidden group">
                              <div className="absolute top-0 right-0 p-2 opacity-10 text-6xl group-hover:scale-110 transition-transform">🔥</div>
                              <div className="relative z-10">
                                  <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">最高连胜</div>
                                  <div className="text-4xl font-black text-white">{statsSummary.maxStreak}</div>
                              </div>
                              <div className="absolute bottom-0 left-0 h-1 bg-orange-500 w-full transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500"></div>
                          </div>
                          <div className="bg-slate-900/60 border border-white/10 p-5 rounded-2xl relative overflow-hidden group">
                              <div className="absolute top-0 right-0 p-2 opacity-10 text-6xl group-hover:scale-110 transition-transform">👑</div>
                              <div className="relative z-10">
                                  <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">总胜场</div>
                                  <div className="text-4xl font-black text-white">{statsSummary.totalWins}</div>
                              </div>
                              <div className="absolute bottom-0 left-0 h-1 bg-yellow-500 w-full transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500"></div>
                          </div>
                      </div>

                      {/* Match History */}
                      <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-6 h-[400px] flex flex-col">
                          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
                              对战记录
                          </h3>
                          
                          <div className="flex-1 overflow-y-auto scrollbar-hide space-y-2 pr-2">
                              {user.history && user.history.length > 0 ? (
                                  user.history.map((item, i) => (
                                      <div 
                                        key={i} 
                                        onClick={() => setSelectedMatch(item)}
                                        className="group flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 hover:border-cyan-500/30 transition-all cursor-pointer"
                                      >
                                          <div className="flex items-center gap-3">
                                              <div className={`w-1 h-8 rounded-full ${item.result === 'WIN' ? 'bg-green-500' : item.result === 'LOSS' ? 'bg-red-500' : 'bg-slate-500'}`}></div>
                                              <div>
                                                  <div className="font-bold text-slate-200 text-sm">{getGameName(item.gameType)}</div>
                                                  <div className="text-[10px] text-slate-500 font-mono">{formatTimeAgo(item.timestamp)}</div>
                                              </div>
                                          </div>
                                          <div className="text-right">
                                              <div className={`font-black font-mono ${item.points > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                  {item.points > 0 ? '+' : ''}{item.points}
                                              </div>
                                              <div className="text-[10px] text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                  查看详情
                                              </div>
                                          </div>
                                      </div>
                                  ))
                              ) : (
                                  <div className="flex flex-col items-center justify-center h-full text-slate-600">
                                      <span className="text-4xl mb-2">📂</span>
                                      <span className="text-xs uppercase tracking-widest">暂无数据</span>
                                  </div>
                              )}
                          </div>
                      </div>
                  </div>
              ) : (
                  <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-6 h-[520px] overflow-y-auto scrollbar-hide animate-slide-up">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {ACHIEVEMENTS.map((ach) => {
                              const unlocked = user.achievements?.includes(ach.id);
                              
                              let borderColor = 'border-white/5';
                              let iconBg = 'bg-slate-800 text-slate-600';
                              
                              if (unlocked) {
                                  if (ach.rarity === 'legendary') { borderColor = 'border-yellow-500/50 bg-yellow-900/10'; iconBg = 'bg-yellow-500 text-black'; }
                                  else if (ach.rarity === 'epic') { borderColor = 'border-purple-500/50 bg-purple-900/10'; iconBg = 'bg-purple-500 text-white'; }
                                  else if (ach.rarity === 'rare') { borderColor = 'border-blue-500/50 bg-blue-900/10'; iconBg = 'bg-blue-500 text-white'; }
                                  else { borderColor = 'border-slate-500/50 bg-slate-800/50'; iconBg = 'bg-slate-600 text-white'; }
                              }

                              return (
                                  <div key={ach.id} className={`relative flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${borderColor} ${!unlocked ? 'opacity-50 grayscale' : 'shadow-lg bg-opacity-40'}`}>
                                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${iconBg} shadow-inner`}>
                                          {ach.icon}
                                      </div>
                                      <div>
                                          <h4 className={`font-bold ${unlocked ? 'text-white' : 'text-slate-500'}`}>{ach.title}</h4>
                                          <p className="text-[10px] text-slate-400">{ach.description}</p>
                                      </div>
                                      {unlocked ? (
                                          <div className="ml-auto text-green-400 text-xl animate-pulse">✓</div>
                                      ) : (
                                          <div className="ml-auto text-slate-700 text-xl">🔒</div>
                                      )}
                                  </div>
                              );
                          })}
                      </div>
                  </div>
              )}
          </div>
      </div>

      {/* Match Details Modal */}
      {selectedMatch && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-zoom-in" onClick={() => setSelectedMatch(null)}>
                <div className="bg-slate-900 border border-cyan-500/30 p-1 rounded-2xl max-w-sm w-full shadow-[0_0_50px_rgba(6,182,212,0.2)]" onClick={e => e.stopPropagation()}>
                    <div className="bg-slate-950 rounded-xl p-6 relative overflow-hidden">
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-cyan-500/20 rounded-full blur-3xl"></div>
                        <h3 className="text-center text-xs font-bold text-slate-500 uppercase tracking-[0.2em] mb-6">战报</h3>
                        <div className="flex justify-between items-center mb-8 relative z-10">
                             <div className="flex flex-col items-center">
                                 <div className="w-14 h-14 rounded-xl overflow-hidden border-2 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.4)] mb-2 bg-slate-800">
                                    {user.avatar?.startsWith('data:') ? <img src={user.avatar} className="w-full h-full object-cover"/> : (
                                        <div className="w-full h-full flex items-center justify-center text-2xl">{user.avatar || '👤'}</div>
                                    )}
                                 </div>
                                 <span className="text-[10px] font-bold text-indigo-400">我方</span>
                             </div>
                             <div className="flex flex-col items-center">
                                <div className="text-3xl font-black text-white font-mono italic">{selectedMatch.details?.score || '-'}</div>
                                <div className={`text-[10px] font-bold px-2 py-0.5 rounded ${selectedMatch.result === 'WIN' ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'}`}>
                                    {selectedMatch.result}
                                </div>
                             </div>
                             <div className="flex flex-col items-center">
                                 <div className="w-14 h-14 rounded-xl overflow-hidden border-2 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)] mb-2 bg-slate-800">
                                    <div className="w-full h-full flex items-center justify-center text-2xl">
                                        {selectedMatch.details?.opponentAvatar || (selectedMatch.details?.opponent === 'System' ? '🤖' : '👤')}
                                    </div>
                                 </div>
                                 <span className="text-[10px] font-bold text-red-400">{selectedMatch.details?.opponent || '对手'}</span>
                             </div>
                        </div>
                        <div className="space-y-3 mb-6 bg-white/5 p-4 rounded-lg border border-white/5">
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-400">游戏</span>
                                <span className="text-white font-bold">{getGameName(selectedMatch.gameType)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-400">积分变动</span>
                                <span className={`font-mono font-bold ${selectedMatch.points >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {selectedMatch.points > 0 ? '+' : ''}{selectedMatch.points}
                                </span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-400">日期</span>
                                <span className="text-slate-300">{formatFullDate(selectedMatch.timestamp)}</span>
                            </div>
                        </div>
                        <Button onClick={() => setSelectedMatch(null)} className="w-full bg-slate-800 hover:bg-slate-700 text-xs py-3">关闭战报</Button>
                    </div>
                </div>
            </div>
      )}
    </div>
  );
};
