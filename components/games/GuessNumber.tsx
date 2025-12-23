import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import { playSound } from '../../utils/sound';
import { User, GameType, MatchDetails } from '../../types';
import { StreakIndicator } from '../ui/StreakIndicator';

interface Props {
  user: User;
  onGameEnd: (points: number, isWin?: boolean, details?: MatchDetails) => void;
  player2?: User | null;
  onOpenP2Login?: () => void;
}

type GameMode = 'PVE' | 'PVP';
type GameState = 'SETUP' | 'PLAYING' | 'FINISHED';

export const GuessNumber: React.FC<Props> = ({ user, onGameEnd, player2, onOpenP2Login }) => {
  // --- Config State ---
  const [gameState, setGameState] = useState<GameState>('SETUP');
  const [mode, setMode] = useState<GameMode>('PVE');
  const [config, setConfig] = useState({ min: 1, max: 100 });

  // --- Game State ---
  const [target, setTarget] = useState<number>(0);
  const [currentRange, setCurrentRange] = useState({ min: 1, max: 100 });
  const [guess, setGuess] = useState<string>('');
  const [attempts, setAttempts] = useState<number>(0);
  const [history, setHistory] = useState<string[]>([]);
  const [turn, setTurn] = useState<1 | 2>(1); // For PVP
  const [message, setMessage] = useState<string>('');
  const [winner, setWinner] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when game starts or turn changes
  useEffect(() => {
    if (gameState === 'PLAYING' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [gameState, turn]);

  const startGame = () => {
    if (mode === 'PVP' && user.username !== '测试玩家' && !player2 && onOpenP2Login) {
        onOpenP2Login();
        return;
    }

    if (config.min >= config.max) {
      setMessage('最小值必须小于最大值！');
      playSound.wrong();
      return;
    }

    const newTarget = Math.floor(Math.random() * (config.max - config.min + 1)) + config.min;
    setTarget(newTarget);
    setCurrentRange({ min: config.min, max: config.max });
    setAttempts(0);
    setHistory([]);
    setTurn(1);
    setWinner(null);
    setGuess('');
    setMessage(mode === 'PVE' ? '游戏开始！' : 'P1 回合，请开始猜测！');
    setGameState('PLAYING');
    playSound.click();
  };

  const handleGuess = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(guess);

    if (isNaN(num)) return;
    
    // Validate Range
    if (num < currentRange.min || num > currentRange.max) {
      setMessage(`请输入 ${currentRange.min} 到 ${currentRange.max} 之间的数字`);
      playSound.wrong();
      return;
    }

    playSound.click();
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);

    // --- Correct Guess ---
    if (num === target) {
      playSound.win();
      
      let points = 0;
      let winMsg = '';

      if (mode === 'PVE') {
        // PVE Scoring: Less attempts = more points
        const rangeSize = config.max - config.min;
        const difficultyMultiplier = rangeSize > 100 ? 1.5 : 1;
        const maxPoints = 100 * difficultyMultiplier;
        points = Math.floor(Math.max(maxPoints - (newAttempts * 5), 10));
        winMsg = `恭喜！你猜对了！数字是 ${target}。获得 ${points} 分。`;
        // Only count PVE as a "Stat Win"
        onGameEnd(points, true, {
            opponent: 'System',
            opponentAvatar: '🤖',
            score: `${newAttempts} 次尝试`
        });
      } else {
        // PVP Scoring: Winner takes fixed points, Loser deducts
        const winnerName = turn === 1 ? 'P1' : 'P2';
        setWinner(winnerName);
        
        if (turn === 1) {
            // P1 (User) Wins
            points = 50;
            winMsg = `🎉 ${user.username} 获胜！数字是 ${target}。获得 50 分。`;
            onGameEnd(50, true, {
                opponent: player2 ? player2.username : 'Player 2',
                opponentAvatar: player2?.avatar || '👤',
                score: '胜利',
                matchTags: ['PVP']
            });
        } else {
            // P2 (Opponent) Wins -> User Loses
            winMsg = `🎉 ${player2 ? player2.username : 'Player 2'} 获胜！数字是 ${target}。${user.username} 扣除 50 分。`;
            onGameEnd(-50, false, {
                opponent: player2 ? player2.username : 'Player 2',
                opponentAvatar: player2?.avatar || '👤',
                score: '失败',
                matchTags: ['PVP']
            });
        }
      }

      setMessage(winMsg);
      setHistory(prev => [`🏆 ${target}: 正确！(${mode === 'PVP' ? (turn === 1 ? user.username : (player2?.username || 'Player 2')) : ''})`, ...prev]);
      setGameState('FINISHED');
      return;
    }

    // --- Wrong Guess ---
    playSound.move();
    let newRange = { ...currentRange };
    let hint = '';

    if (num < target) {
      hint = '太小了';
      newRange.min = num + 1;
    } else {
      hint = '太大了';
      newRange.max = num - 1;
    }

    setCurrentRange(newRange);
    
    // Update History
    const currentPlayerName = mode === 'PVP' ? (turn === 1 ? user.username : (player2?.username || 'P2')) : '';
    setHistory(prev => [`${currentPlayerName} ${num}: ${hint}`, ...prev]);

    // Switch Turn (PVP) or Update Message (PVE)
    if (mode === 'PVP') {
      const nextTurn = turn === 1 ? 2 : 1;
      setTurn(nextTurn);
      const nextName = nextTurn === 1 ? user.username : (player2?.username || 'P2');
      setMessage(`${hint}！ 轮到 ${nextName} (${newRange.min}-${newRange.max})`);
    } else {
      setMessage(`${hint}！ 范围缩小为 ${newRange.min} - ${newRange.max}`);
    }

    setGuess('');
  };

  // --- Render: Setup Screen ---
  if (gameState === 'SETUP') {
    return (
      <div className="flex flex-col items-center justify-center h-full max-w-lg mx-auto p-4">
        <div className="bg-slate-900/60 backdrop-blur-xl p-8 rounded-2xl shadow-xl border border-white/5 w-full animate-zoom-in">
          <h2 className="text-3xl font-bold text-center mb-6 text-indigo-400">游戏设置</h2>
          
          {/* Mode Selection */}
          <div className="mb-6">
            <label className="block text-slate-300 text-sm font-bold mb-2">选择模式</label>
            <div className="flex gap-4">
              <button
                onClick={() => setMode('PVE')}
                className={`flex-1 py-3 rounded-xl border-2 transition-all ${mode === 'PVE' ? 'border-indigo-500 bg-indigo-500/20 text-white' : 'border-slate-600 bg-black/20 text-slate-400'}`}
              >
                👤 单人挑战
              </button>
              <button
                onClick={() => setMode('PVP')}
                className={`flex-1 py-3 rounded-xl border-2 transition-all ${mode === 'PVP' ? 'border-pink-500 bg-pink-500/20 text-white' : 'border-slate-600 bg-black/20 text-slate-400'}`}
              >
                👥 双人对战
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-2 h-4">
              {mode === 'PVE' ? '挑战最少次数猜出数字，范围越大分数越高。' : '两名玩家轮流猜测，猜中者获胜！'}
            </p>
          </div>

          {/* Range Configuration */}
          <div className="mb-8">
            <label className="block text-slate-300 text-sm font-bold mb-2">数字范围</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={config.min}
                onChange={(e) => setConfig({ ...config, min: parseInt(e.target.value) || 0 })}
                className="w-full bg-black/40 border border-slate-600 rounded-lg px-3 py-2 text-center text-white focus:border-indigo-500 focus:outline-none"
                placeholder="最小"
              />
              <span className="text-slate-500">至</span>
              <input
                type="number"
                value={config.max}
                onChange={(e) => setConfig({ ...config, max: parseInt(e.target.value) || 100 })}
                className="w-full bg-black/40 border border-slate-600 rounded-lg px-3 py-2 text-center text-white focus:border-indigo-500 focus:outline-none"
                placeholder="最大"
              />
            </div>
          </div>

          {mode === 'PVP' && (
              <div className="mb-6 pt-4 border-t border-white/5">
                  <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">对手 (P2)</span>
                      <span className={`font-bold ${player2 ? 'text-white' : 'text-slate-500'}`}>
                          {player2 ? player2.username : (user.username === '测试玩家' ? '测试路人' : '未登录')}
                      </span>
                  </div>
              </div>
          )}

          {message && <p className="text-red-400 text-sm text-center mb-4">{message}</p>}

          <Button onClick={startGame} className="w-full py-3 text-lg">
              {mode === 'PVP' && user.username !== '测试玩家' && !player2 ? '登录 2P 并开始' : '开始游戏'}
          </Button>
        </div>
      </div>
    );
  }

  // --- Render: Playing & Finished ---
  return (
    <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto p-4">
      <div className="bg-slate-900/60 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-white/5 w-full animate-zoom-in relative overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2 relative">
          <Button variant="ghost" onClick={() => setGameState('SETUP')} className="text-xs px-2 py-1">⚙️ 设置</Button>
          
          <div className="flex flex-col items-center">
              <div className="flex items-center gap-2 relative">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 overflow-hidden border border-white/20 relative">
                     {user.avatar?.startsWith('data:') ? <img src={user.avatar} className="w-full h-full object-cover"/> : (user.avatar || '👤')}
                  </div>
                  <span className="text-xs text-slate-400">vs</span>
                  <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs border border-white/20 overflow-hidden">
                     {mode === 'PVE' ? '🤖' : (player2?.avatar?.startsWith('data:') ? <img src={player2.avatar} className="w-full h-full object-cover"/> : (player2?.avatar || '👤'))}
                  </div>
              </div>
              <StreakIndicator streak={user.stats?.[GameType.GUESS_NUMBER]?.streak || 0} className="absolute -bottom-4 scale-75" />
          </div>

          <div className="text-xs text-slate-400">范围: {config.min}-{config.max}</div>
        </div>

        {/* Turn Indicator for PVP */}
        {mode === 'PVP' && gameState === 'PLAYING' && (
           <div className="flex mb-4 bg-black/40 rounded-full p-1 relative">
             <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-indigo-600 rounded-full transition-all duration-300 ${turn === 1 ? 'left-1' : 'left-[calc(50%+2px)]'}`} />
             <div className={`flex-1 text-center text-sm font-bold z-10 transition-colors ${turn === 1 ? 'text-white' : 'text-slate-500'}`}>{user.username}</div>
             <div className={`flex-1 text-center text-sm font-bold z-10 transition-colors ${turn === 2 ? 'text-white' : 'text-slate-500'}`}>{player2 ? player2.username : 'P2'}</div>
           </div>
        )}

        {/* Message Area */}
        <div className={`mb-6 p-4 rounded-lg text-center min-h-[60px] flex items-center justify-center transition-colors ${
          gameState === 'FINISHED' ? 'bg-green-500/10 text-green-400' : 'bg-black/20 text-slate-200'
        }`}>
          <p className="text-lg font-medium">{message}</p>
        </div>

        {/* Current Range Visualization */}
        {gameState === 'PLAYING' && (
           <div className="mb-4 text-center">
             <p className="text-sm text-slate-400 mb-1">有效范围</p>
             <div className="text-3xl font-mono font-bold text-white tracking-widest">
               {currentRange.min} <span className="text-slate-600">~</span> {currentRange.max}
             </div>
           </div>
        )}

        {/* Input Area */}
        {gameState === 'PLAYING' ? (
          <form onSubmit={handleGuess} className="flex gap-2 mb-6">
            <input
              ref={inputRef}
              type="number"
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              className="flex-1 bg-black/40 border-2 border-slate-600 rounded-lg px-4 py-2 text-white text-lg focus:border-indigo-500 focus:outline-none transition-colors"
              placeholder={`输入 ${currentRange.min}-${currentRange.max}`}
              autoFocus
            />
            <Button type="submit" className="px-6">猜!</Button>
          </form>
        ) : (
          <div className="flex gap-3 mb-6">
             <Button onClick={startGame} className="flex-1">
                 {mode === 'PVP' && user.username !== '测试玩家' && !player2 ? '登录 2P 并重来' : '再来一局'}
             </Button>
             <Button onClick={() => setGameState('SETUP')} variant="secondary" className="flex-1 bg-white/10">修改设置</Button>
          </div>
        )}

        {/* History Log */}
        <div className="border-t border-white/10 pt-4">
          <p className="text-sm text-slate-400 mb-2 flex justify-between">
            <span>历史记录</span>
            <span>猜测次数: {attempts}</span>
          </p>
          <div className="h-32 overflow-y-auto space-y-2 scrollbar-hide">
            {history.map((h, i) => (
              <div key={i} className={`text-sm px-3 py-1.5 rounded flex justify-between animate-slide-up ${
                h.includes('正确') ? 'bg-green-500/20 text-green-300' : 'bg-white/5 text-slate-300'
              }`}>
                <span>{h.split(':')[0]}</span>
                <span>{h.split(':')[1]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};