
import React from 'react';
import { GameType } from '../types';

interface Props {
  onSelectGame: (game: GameType) => void;
  userScore: number;
  onShowRanking: () => void;
}

const colorStyles: Record<string, { gradient: string, shadow: string, text: string, border: string }> = {
    indigo: { 
        gradient: 'from-indigo-600/20 via-violet-600/10 to-transparent',
        shadow: 'hover:shadow-indigo-500/20',
        text: 'text-indigo-400',
        border: 'group-hover:border-indigo-500/50'
    },
    pink: { 
        gradient: 'from-pink-600/20 via-rose-600/10 to-transparent',
        shadow: 'hover:shadow-pink-500/20',
        text: 'text-pink-400',
        border: 'group-hover:border-pink-500/50'
    },
    emerald: { 
        gradient: 'from-emerald-600/20 via-teal-600/10 to-transparent',
        shadow: 'hover:shadow-emerald-500/20',
        text: 'text-emerald-400',
        border: 'group-hover:border-emerald-500/50'
    },
    amber: { 
        gradient: 'from-amber-600/20 via-orange-600/10 to-transparent',
        shadow: 'hover:shadow-amber-500/20',
        text: 'text-amber-400',
        border: 'group-hover:border-amber-500/50'
    },
    cyan: { 
        gradient: 'from-cyan-600/20 via-blue-600/10 to-transparent',
        shadow: 'hover:shadow-cyan-500/20',
        text: 'text-cyan-400',
        border: 'group-hover:border-cyan-500/50'
    }
};

const GameCard: React.FC<{ 
  title: string; 
  icon: string; 
  color: string; 
  tags: string[];
  onClick: () => void;
  isNew?: boolean;
  delay?: number;
}> = ({ title, icon, color, tags, onClick, isNew, delay = 0 }) => {
  
  const style = colorStyles[color] || colorStyles.indigo;

  return (
    <button 
      onClick={onClick}
      className={`group relative h-64 w-full rounded-[2rem] overflow-hidden transition-all duration-500 hover:-translate-y-2 border border-white/5 bg-slate-900/50 backdrop-blur-sm ${style.shadow} hover:shadow-2xl ${style.border} text-left flex flex-col animate-slide-up`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Background Gradients */}
      <div className={`absolute inset-0 bg-gradient-to-br ${style.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-700 ease-out`} />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
      
      {/* Top Section */}
      <div className="relative p-8 flex justify-between items-start z-10 w-full">
        <div className="relative">
            <div className={`w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-4xl shadow-inner backdrop-blur-md group-hover:scale-110 transition-transform duration-500`}>
                {icon}
            </div>
            {isNew && (
                <span className="absolute -top-2 -right-2 bg-gradient-to-r from-red-500 to-pink-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg animate-pulse">
                    NEW
                </span>
            )}
        </div>
        
        <div className={`w-10 h-10 rounded-full border border-white/10 flex items-center justify-center transition-all duration-300 group-hover:bg-white group-hover:text-black group-hover:border-transparent -mr-2 -mt-2 opacity-50 group-hover:opacity-100`}>
            <svg className="w-4 h-4 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
        </div>
      </div>

      {/* Content Section */}
      <div className="relative p-8 pt-0 mt-auto z-10 w-full">
        <div className="flex gap-2 mb-3 flex-wrap">
            {tags.map((tag, i) => (
                <span key={i} className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded bg-white/5 border border-white/5 ${style.text}`}>
                    {tag}
                </span>
            ))}
        </div>
        
        <h3 className="text-3xl font-black text-white mb-1 tracking-tight group-hover:tracking-wide transition-all duration-300">
            {title}
        </h3>
      </div>
    </button>
  );
};

export const Dashboard: React.FC<Props> = ({ onSelectGame, userScore, onShowRanking }) => {
  return (
    <div className="h-full overflow-y-auto relative z-10 scrollbar-hide">
      <div className="max-w-[1600px] mx-auto p-4 sm:p-8 lg:p-12">
        
        {/* Hero Section */}
        <header className="mb-12 lg:mb-16 relative">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
            <div className="relative z-10 animate-slide-up">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-widest mb-4">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"/>
                游戏平台
              </div>
              <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black text-white tracking-tighter">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">PLAY</span>
                <span className="opacity-20 ml-4">WIN</span>
              </h1>
            </div>

            <div className="animate-slide-up" style={{ animationDelay: '100ms' }}>
               <button 
                  onClick={onShowRanking}
                  className="bg-slate-900/80 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-2xl min-w-[280px] text-left hover:scale-105 transition-transform active:scale-95 group cursor-pointer"
               >
                   <div className="flex justify-between items-center mb-2">
                       <span className="text-xs font-bold text-slate-500 uppercase tracking-wider group-hover:text-indigo-400 transition-colors">我的积分</span>
                       <span className="text-xl">💎</span>
                   </div>
                   <div className="text-4xl font-black text-white font-mono tracking-tight group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-indigo-400 group-hover:to-pink-400 transition-all">
                       {userScore.toLocaleString()}
                   </div>
                   <div className="w-full bg-slate-800 h-1.5 mt-4 rounded-full overflow-hidden">
                       <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 w-[70%] animate-pulse"/>
                   </div>
                   <div className="mt-2 text-[10px] text-slate-500 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                       点击查看段位 >
                   </div>
               </button>
            </div>
          </div>
        </header>

        {/* Game Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 lg:gap-8 pb-24">
          
          <GameCard
            title="台球大师"
            icon="🎱"
            color="cyan"
            tags={['竞技', '物理', '多人']}
            isNew
            delay={100}
            onClick={() => onSelectGame(GameType.BILLIARDS)}
          />

          <GameCard
            title="贪吃蛇"
            icon="🐍"
            color="emerald"
            tags={['反应', '经典', '生存']}
            delay={200}
            onClick={() => onSelectGame(GameType.SNAKE)}
          />

          <GameCard
            title="国际象棋"
            icon="♟️"
            color="indigo"
            tags={['策略', '棋牌', '烧脑']}
            delay={300}
            onClick={() => onSelectGame(GameType.CHESS)}
          />

          <GameCard
            title="中国象棋"
            icon="🏮"
            color="amber"
            tags={['国粹', '战术', '博弈']}
            delay={400}
            onClick={() => onSelectGame(GameType.XIANGQI)}
          />

          <GameCard
            title="猜数字"
            icon="🔢"
            color="indigo"
            tags={['益智', '推理', '休闲']}
            delay={500}
            onClick={() => onSelectGame(GameType.GUESS_NUMBER)}
          />
          
          <GameCard
            title="猜拳对决"
            icon="✌️"
            color="pink"
            tags={['运气', '心理', '快速']}
            delay={600}
            onClick={() => onSelectGame(GameType.RPS)}
          />
        </div>
      </div>
    </div>
  );
};
