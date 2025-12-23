import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { playSound } from '../../utils/sound';
import { User, GameType, MatchDetails } from '../../types';

interface Props {
  user: User;
  onGameEnd: (points: number, isWin?: boolean, details?: MatchDetails) => void;
}

type Choice = 'ROCK' | 'PAPER' | 'SCISSORS' | null;

export const RockPaperScissors: React.FC<Props> = ({ user, onGameEnd }) => {
  const [playerChoice, setPlayerChoice] = useState<Choice>(null);
  const [computerChoice, setComputerChoice] = useState<Choice>(null);
  const [result, setResult] = useState<string>('请出招！');
  const [streak, setStreak] = useState(0);
  const [lastWinPoints, setLastWinPoints] = useState<number>(0);

  // Initialize streak from storage
  useEffect(() => {
    const savedStreak = user.stats?.[GameType.RPS]?.streak || 0;
    setStreak(savedStreak);
  }, [user.stats]);

  const choices: Choice[] = ['ROCK', 'PAPER', 'SCISSORS'];
  const icons = { ROCK: '✊', PAPER: '✋', SCISSORS: '✌️' };

  const play = (choice: Choice) => {
    if (!choice) return;
    
    const cpuChoice = choices[Math.floor(Math.random() * choices.length)];
    
    setPlayerChoice(choice);
    setComputerChoice(cpuChoice);

    if (choice === cpuChoice) {
      playSound.click(); 
      setResult("平局！");
      setLastWinPoints(0);
      onGameEnd(0, undefined, {
          opponent: 'Computer',
          opponentAvatar: '🤖',
          score: 'Draw'
      });
    } else if (
      (choice === 'ROCK' && cpuChoice === 'SCISSORS') ||
      (choice === 'PAPER' && cpuChoice === 'ROCK') ||
      (choice === 'SCISSORS' && cpuChoice === 'PAPER')
    ) {
      playSound.win();
      // Win Logic:
      // Base score 10.
      // If Streak > 0, it doubles: 1 win=10, 2 wins=20, 3 wins=40, 4 wins=80...
      // Calculation: 10 * (2 ^ streak)
      const points = 10 * Math.pow(2, streak); 
      
      const newStreak = streak + 1;
      setResult('你赢了！');
      setStreak(newStreak);
      setLastWinPoints(points);
      onGameEnd(points, true, {
          opponent: 'Computer',
          opponentAvatar: '🤖',
          score: 'Win'
      });
    } else {
      playSound.lose();
      setResult('你输了！');
      setStreak(0);
      setLastWinPoints(0);
      // Lose Logic: Fixed -10 points regardless of context
      onGameEnd(-10, false, {
          opponent: 'Computer',
          opponentAvatar: '🤖',
          score: 'Lose'
      });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full max-w-lg mx-auto p-4">
      <div className="bg-slate-900/60 backdrop-blur-xl p-8 rounded-2xl shadow-xl border border-white/5 w-full text-center relative overflow-hidden">
        
        {/* Streak Background Effect */}
        {streak > 1 && (
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-yellow-500 via-red-500 to-yellow-500 animate-pulse" />
        )}

        <h2 className="text-3xl font-bold mb-2 text-pink-400">石头剪刀布</h2>
        <p className="text-slate-400 mb-2 text-xs">
          规则：初始10分。连胜翻倍 (10, 20, 40...)，输局仅扣10分。
        </p>

        {/* Dynamic Streak Badge */}
        <div className="h-14 mb-4 flex flex-col items-center justify-center">
            {streak > 0 ? (
                <div key={streak} className="flex flex-col items-center animate-bounce">
                    <div className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-orange-500 text-white px-4 py-1 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.6)]">
                        <span className="text-lg">🔥</span>
                        <span className="font-bold text-lg italic">{streak} 连胜!</span>
                    </div>
                    <div className="text-xs text-orange-300 mt-1 font-mono">
                        下局获胜奖励: {10 * Math.pow(2, streak)} 分
                    </div>
                </div>
            ) : (
                <p className="text-indigo-400 text-sm font-bold">
                  保持连胜以获得双倍积分！
                </p>
            )}
        </div>

        <div className="flex justify-center items-center gap-8 mb-8 h-32 bg-black/20 rounded-xl p-4 border border-white/5">
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-indigo-600 border border-white/20 overflow-hidden mb-2">
                 {user.avatar?.startsWith('data:') ? <img src={user.avatar} className="w-full h-full object-cover"/> : (user.avatar || '👤')}
            </div>
            <div className={`text-6xl transition-transform duration-300 ${playerChoice ? 'scale-110' : ''}`}>
              {playerChoice ? icons[playerChoice] : '❓'}
            </div>
          </div>
          
          <div className="text-2xl font-bold text-slate-500">VS</div>
          
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-slate-700 border border-white/20 flex items-center justify-center mb-2">
                 🤖
            </div>
            <div className={`text-6xl transition-transform duration-300 ${computerChoice ? 'scale-110' : ''}`}>
              {computerChoice ? icons[computerChoice] : '❓'}
            </div>
          </div>
        </div>

        <div className="mb-8 min-h-[4rem]">
          <h3 className={`text-3xl font-bold transition-all duration-300 ${
            result.includes('赢') ? 'text-green-400 scale-110 drop-shadow-lg' : 
            result.includes('输') ? 'text-red-400' : 'text-slate-200'
          }`}>
            {result}
          </h3>
          {lastWinPoints > 0 && result.includes('赢') && (
              <div className="text-yellow-400 font-bold text-xl animate-slide-up">+{lastWinPoints} 分</div>
          )}
          {result.includes('输') && (
              <div className="text-red-400 font-bold text-sm animate-slide-up">-10 分</div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4">
          {(['ROCK', 'PAPER', 'SCISSORS'] as const).map((c) => (
            <button
              key={c}
              onClick={() => play(c)}
              className="bg-slate-800/80 hover:bg-slate-700/80 border-b-4 border-slate-950 active:border-b-0 active:translate-y-1 transition-all p-4 rounded-xl text-4xl shadow-lg border border-white/5"
            >
              {icons[c]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};