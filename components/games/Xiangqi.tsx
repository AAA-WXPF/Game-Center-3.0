import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { ChessPiece, User, GameType, MatchDetails } from '../../types';
import { playSound } from '../../utils/sound';
import { StreakIndicator } from '../ui/StreakIndicator';

// Helper: Check bounds
const isValidPos = (r: number, c: number) => r >= 0 && r < 10 && c >= 0 && c < 9;

// Xiangqi Rules Logic
const getValidMoves = (board: (ChessPiece | null)[][], piece: ChessPiece, r: number, c: number) => {
  const moves: { r: number, c: number }[] = [];
  const isRed = piece.color === 'red';
  
  const addIfValid = (nr: number, nc: number) => {
    if (isValidPos(nr, nc)) {
      const target = board[nr][nc];
      if (!target || target.color !== piece.color) {
        moves.push({ r: nr, c: nc });
      }
    }
  };

  const addLineMoves = (dirs: number[][]) => {
    dirs.forEach(([dr, dc]) => {
      let nr = r + dr;
      let nc = c + dc;
      while (isValidPos(nr, nc)) {
        const target = board[nr][nc];
        if (!target) {
          moves.push({ r: nr, c: nc });
        } else {
          if (target.color !== piece.color) {
            moves.push({ r: nr, c: nc });
          }
          break; // Blocked
        }
        nr += dr;
        nc += dc;
      }
    });
  };

  switch (piece.type) {
    case 'K': // General/King
      const kDirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
      kDirs.forEach(([dr, dc]) => {
        const nr = r + dr;
        const nc = c + dc;
        if (nc >= 3 && nc <= 5) {
          if (isRed ? (nr >= 7 && nr <= 9) : (nr >= 0 && nr <= 2)) {
            addIfValid(nr, nc);
          }
        }
      });
      break;

    case 'A': // Advisor
      const aDirs = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
      aDirs.forEach(([dr, dc]) => {
        const nr = r + dr;
        const nc = c + dc;
        if (nc >= 3 && nc <= 5) {
          if (isRed ? (nr >= 7 && nr <= 9) : (nr >= 0 && nr <= 2)) {
            addIfValid(nr, nc);
          }
        }
      });
      break;

    case 'E': // Elephant
      const eDirs = [
        { dr: -2, dc: -2, er: -1, ec: -1 }, { dr: -2, dc: 2, er: -1, ec: 1 },
        { dr: 2, dc: -2, er: 1, ec: -1 }, { dr: 2, dc: 2, er: 1, ec: 1 },
      ];
      eDirs.forEach(({ dr, dc, er, ec }) => {
        const nr = r + dr;
        const nc = c + dc;
        if (isRed ? nr >= 5 : nr <= 4) {
          if (isValidPos(r + er, c + ec) && !board[r + er][c + ec]) {
             addIfValid(nr, nc);
          }
        }
      });
      break;

    case 'N': // Horse
      const nDirs = [
        { dr: -2, dc: -1, lr: -1, lc: 0 }, { dr: -2, dc: 1, lr: -1, lc: 0 },
        { dr: 2, dc: -1, lr: 1, lc: 0 }, { dr: 2, dc: 1, lr: 1, lc: 0 },
        { dr: -1, dc: -2, lr: 0, lc: -1 }, { dr: 1, dc: -2, lr: 0, lc: -1 },
        { dr: -1, dc: 2, lr: 0, lc: 1 }, { dr: 1, dc: 2, lr: 0, lc: 1 },
      ];
      nDirs.forEach(({ dr, dc, lr, lc }) => {
        if (isValidPos(r + lr, c + lc) && !board[r + lr][c + lc]) {
          addIfValid(r + dr, c + dc);
        }
      });
      break;

    case 'R': // Rook
      addLineMoves([[0, 1], [0, -1], [1, 0], [-1, 0]]);
      break;

    case 'C': // Cannon
      const cDirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
      cDirs.forEach(([dr, dc]) => {
        let nr = r + dr;
        let nc = c + dc;
        let screenFound = false;
        while (isValidPos(nr, nc)) {
          const target = board[nr][nc];
          if (!screenFound) {
            if (!target) {
              moves.push({ r: nr, c: nc }); 
            } else {
              screenFound = true; 
            }
          } else {
            if (target) {
              if (target.color !== piece.color) {
                moves.push({ r: nr, c: nc });
              }
              break; 
            }
          }
          nr += dr;
          nc += dc;
        }
      });
      break;

    case 'P': // Soldier
      const forward = isRed ? -1 : 1;
      addIfValid(r + forward, c);
      const crossedRiver = isRed ? r <= 4 : r >= 5;
      if (crossedRiver) {
        addIfValid(r, c - 1);
        addIfValid(r, c + 1);
      }
      break;
  }
  return moves;
};

const createInitialXiangqiBoard = (): (ChessPiece | null)[][] => {
  const board = Array(10).fill(null).map(() => Array(9).fill(null));

  const setupRow = (row: number, color: 'red' | 'black', types: string[]) => {
    const labels: Record<string, string> = color === 'red' 
      ? { R: '车', N: '马', E: '相', A: '仕', K: '帅', C: '炮', P: '兵' }
      : { R: '车', N: '马', E: '象', A: '士', K: '将', C: '炮', P: '卒' };
    
    types.forEach((type, col) => {
      board[row][col] = { type, color, label: labels[type] };
    });
  };

  setupRow(0, 'black', ['R', 'N', 'E', 'A', 'K', 'A', 'E', 'N', 'R']);
  board[2][1] = { type: 'C', color: 'black', label: '炮' };
  board[2][7] = { type: 'C', color: 'black', label: '炮' };
  [0, 2, 4, 6, 8].forEach(c => board[3][c] = { type: 'P', color: 'black', label: '卒' });

  setupRow(9, 'red', ['R', 'N', 'E', 'A', 'K', 'A', 'E', 'N', 'R']);
  board[7][1] = { type: 'C', color: 'red', label: '炮' };
  board[7][7] = { type: 'C', color: 'red', label: '炮' };
  [0, 2, 4, 6, 8].forEach(c => board[6][c] = { type: 'P', color: 'red', label: '兵' });

  return board;
};

interface Props {
  user: User;
  onGameEnd: (points: number, isWin?: boolean, details?: MatchDetails) => void;
  player2?: User | null;
  onOpenP2Login?: () => void;
}

interface MatchConfig {
    totalFrames: number;
    pointsPerMatch: number;
}

interface HistoryState {
  board: (ChessPiece | null)[][];
  turn: 'red' | 'black';
  lastMove: { from: { r: number, c: number }, to: { r: number, c: number } } | null;
}

export const Xiangqi: React.FC<Props> = ({ user, onGameEnd, player2, onOpenP2Login }) => {
  const [board, setBoard] = useState(createInitialXiangqiBoard());
  const [selected, setSelected] = useState<{ r: number, c: number } | null>(null);
  const [validMoves, setValidMoves] = useState<{ r: number, c: number }[]>([]);
  const [turn, setTurn] = useState<'red' | 'black'>('red');
  const [lastMove, setLastMove] = useState<{ from: { r: number, c: number }, to: { r: number, c: number } } | null>(null);
  const [captureAnim, setCaptureAnim] = useState<{ r: number, c: number, piece: ChessPiece } | null>(null);
  
  // Game & Match State
  const [gameState, setGameState] = useState<'SETUP' | 'PLAYING' | 'ROUND_OVER' | 'GAMEOVER'>('SETUP');
  const [matchConfig, setMatchConfig] = useState<MatchConfig>({ totalFrames: 3, pointsPerMatch: 100 });
  const [matchScore, setMatchScore] = useState<{p1: number, p2: number}>({ p1: 0, p2: 0 }); // p1=Red, p2=Black
  const [winner, setWinner] = useState<'red' | 'black' | null>(null); // Match winner
  
  const [history, setHistory] = useState<HistoryState[]>([]);

  const startMatch = () => {
      if (user.username !== '测试玩家' && !player2 && onOpenP2Login) {
          onOpenP2Login();
          return;
      }

      playSound.click();
      setMatchScore({ p1: 0, p2: 0 });
      setWinner(null);
      initRound();
  };

  const initRound = () => {
      setBoard(createInitialXiangqiBoard());
      setTurn('red');
      setSelected(null);
      setValidMoves([]);
      setLastMove(null);
      setHistory([]);
      setGameState('PLAYING');
  };

  const handlePointClick = (r: number, c: number) => {
    if (gameState !== 'PLAYING') return;

    if (selected) {
      const target = board[r][c];
      if (target && target.color === turn) {
        setSelected({ r, c });
        setValidMoves(getValidMoves(board, target, r, c));
        playSound.click();
        return;
      }

      const move = validMoves.find(m => m.r === r && m.c === c);
      if (move) {
        setHistory(prev => [...prev, {
            board: board.map(row => [...row]),
            turn,
            lastMove
        }]);

        const piece = board[selected.r][selected.c];
        
        if (target) {
          setCaptureAnim({ r, c, piece: target });
          setTimeout(() => setCaptureAnim(null), 600); 

          if (target.type === 'K') {
            // Captured General/King - Round Over
            handleRoundEnd(turn); // Current turn player wins
            return;
          } else {
            playSound.capture();
          }
        } else {
          playSound.move();
        }

        const newBoard = board.map(row => [...row]);
        newBoard[r][c] = piece;
        newBoard[selected.r][selected.c] = null;
        
        setBoard(newBoard);
        setLastMove({ from: selected, to: { r, c } });
        setTurn(turn === 'red' ? 'black' : 'red');
        setSelected(null);
        setValidMoves([]);
      } else {
        setSelected(null);
        setValidMoves([]);
      }
    } else {
      const piece = board[r][c];
      if (piece && piece.color === turn) {
        setSelected({ r, c });
        setValidMoves(getValidMoves(board, piece, r, c));
        playSound.click();
      }
    }
  };

  const handleRoundEnd = (roundWinner: 'red' | 'black') => {
      playSound.win();
      
      const newScore = { ...matchScore };
      if (roundWinner === 'red') newScore.p1 += 1;
      else newScore.p2 += 1;
      
      setMatchScore(newScore);

      const targetWins = Math.ceil(matchConfig.totalFrames / 2);

      if (newScore.p1 >= targetWins) {
          setWinner('red');
          setGameState('GAMEOVER');
          onGameEnd(matchConfig.pointsPerMatch, true, {
              opponent: player2 ? player2.username : 'Player 2',
              opponentAvatar: player2?.avatar || '👤',
              score: `${newScore.p1}-${newScore.p2}`,
              matchTags: [`BO${matchConfig.totalFrames}`]
          });
      } else if (newScore.p2 >= targetWins) {
          setWinner('black');
          setGameState('GAMEOVER');
          onGameEnd(-matchConfig.pointsPerMatch, false, {
              opponent: player2 ? player2.username : 'Player 2',
              opponentAvatar: player2?.avatar || '👤',
              score: `${newScore.p1}-${newScore.p2}`,
              matchTags: [`BO${matchConfig.totalFrames}`]
          });
      } else {
          setGameState('ROUND_OVER');
      }
  };

  const handleUndo = () => {
      if (history.length === 0) return;
      const prev = history[history.length - 1];
      const newHistory = history.slice(0, -1);
      
      setBoard(prev.board);
      setTurn(prev.turn);
      setLastMove(prev.lastMove);
      setHistory(newHistory);
      setSelected(null);
      setValidMoves([]);
      playSound.click();
  };

  if (gameState === 'SETUP') {
      return (
        <div className="flex flex-col items-center justify-center h-full max-w-lg mx-auto p-4">
        <div className="bg-slate-900/60 backdrop-blur-xl p-8 rounded-2xl shadow-xl border border-white/5 w-full animate-zoom-in">
          <h2 className="text-3xl font-bold text-center mb-6 text-red-500">中国象棋 - 赛制设置</h2>
          
          <div className="bg-black/20 p-4 rounded-xl mb-6 border border-white/5">
               <div className="mb-4">
                   <label className="block text-xs text-slate-500 mb-1">总局数 (奇数)</label>
                   <div className="flex gap-2">
                       {[1, 3, 5, 7].map(num => (
                           <button 
                            key={num}
                            onClick={() => setMatchConfig({...matchConfig, totalFrames: num})}
                            className={`flex-1 py-1 rounded border ${matchConfig.totalFrames === num ? 'bg-red-600 border-red-400 text-white' : 'bg-slate-800 border-slate-600 text-slate-400'}`}
                           >
                               BO{num}
                           </button>
                       ))}
                   </div>
               </div>

               <div>
                   <label className="block text-xs text-slate-500 mb-1">押注积分</label>
                   <input 
                        type="number" 
                        min="10" 
                        step="10"
                        value={matchConfig.pointsPerMatch}
                        onChange={(e) => setMatchConfig({...matchConfig, pointsPerMatch: Math.max(0, parseInt(e.target.value))})}
                        className="w-full bg-slate-950 border border-slate-600 rounded px-2 py-1 text-white"
                   />
               </div>

               <div className="pt-2 border-t border-white/5">
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">黑方 (P2)</span>
                        <span className={`font-bold ${player2 ? 'text-white' : 'text-slate-500'}`}>
                            {player2 ? player2.username : (user.username === '测试玩家' ? '测试路人' : '未登录')}
                        </span>
                    </div>
                </div>
           </div>

          <Button onClick={startMatch} className="w-full py-3 text-lg bg-red-600 hover:bg-red-500">
              {user.username !== '测试玩家' && !player2 ? '登录 2P 并开始' : '开始对弈'}
          </Button>
        </div>
      </div>
      );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-2 overflow-y-auto">
      {/* Centered Game Header */}
      <div className="w-full max-w-md mb-4 flex flex-col items-center relative animate-slide-up">
          <div className="flex flex-col items-center bg-[#eecfa1]/10 px-8 py-2 rounded-2xl border border-amber-500/20 shadow-xl backdrop-blur-md">
              <div className="text-[10px] text-amber-500/70 font-bold tracking-[0.2em] mb-1 uppercase">
                BO{matchConfig.totalFrames} Match
              </div>
              <div className="flex items-center gap-6">
                  <div className={`flex flex-col items-center transition-all duration-300 relative ${turn === 'red' ? 'scale-110 opacity-100' : 'opacity-60'}`}>
                     <div className="w-8 h-8 rounded-full bg-red-600 border border-white/20 overflow-hidden mb-1">
                        {user.avatar?.startsWith('data:') ? <img src={user.avatar} className="w-full h-full object-cover"/> : (user.avatar || '👤')}
                     </div>
                     <span className="text-[10px] font-bold text-red-400 tracking-wider">红方</span>
                     <span className="text-4xl font-black text-red-500 leading-none drop-shadow-md">{matchScore.p1}</span>
                     <StreakIndicator streak={user.stats?.[GameType.XIANGQI]?.streak || 0} className="absolute -top-3 -left-3 scale-75" />
                  </div>
                  <div className="text-amber-700/50 font-light text-2xl">:</div>
                  <div className={`flex flex-col items-center transition-all duration-300 ${turn === 'black' ? 'scale-110 opacity-100' : 'opacity-60'}`}>
                     <div className="w-8 h-8 rounded-full bg-black border border-white/20 flex items-center justify-center text-sm mb-1 overflow-hidden">
                        {player2?.avatar?.startsWith('data:') ? <img src={player2.avatar} className="w-full h-full object-cover"/> : (player2?.avatar || '👤')}
                     </div>
                     <span className="text-[10px] font-bold text-slate-400 tracking-wider">黑方</span>
                     <span className="text-4xl font-black text-slate-900 bg-slate-200 px-1 rounded leading-none">{matchScore.p2}</span>
                  </div>
              </div>
          </div>
      </div>

      <div className="text-right w-full max-w-md mb-2 flex justify-between items-center px-1">
          <div className="text-xs text-amber-600/80 font-bold">
              当前: <span className={turn === 'red' ? 'text-red-500' : 'text-slate-900'}>{turn === 'red' ? '红方' : '黑方'}</span>
          </div>
          <div className="flex gap-2">
              <Button 
                onClick={handleUndo} 
                variant="secondary" 
                className="text-xs py-1 h-8 bg-slate-800/50 hover:bg-slate-700 backdrop-blur-md border border-white/10"
                disabled={history.length === 0 || gameState !== 'PLAYING'}
              >
                ↶ 悔棋
              </Button>
              <Button onClick={() => setGameState('SETUP')} variant="secondary" className="text-xs py-1 mt-0 h-8 bg-slate-800/50 hover:bg-slate-700 backdrop-blur-md border border-white/10">重置</Button>
          </div>
      </div>

      <div className="bg-[#eecfa1] p-4 rounded-lg shadow-2xl relative select-none border-4 border-[#8b4513]">
        {gameState === 'ROUND_OVER' && (
             <div className="absolute inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg text-center p-4">
                 <h3 className="text-2xl font-bold text-white mb-4">本局结束</h3>
                 <p className="text-amber-100 mb-6">比分 {matchScore.p1} : {matchScore.p2}</p>
                 <Button onClick={initRound}>下一局</Button>
             </div>
        )}

        {gameState === 'GAMEOVER' && (
            <div className="absolute inset-0 z-50 bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg text-center p-4">
                <h3 className="text-4xl font-bold text-red-500 mb-4 tracking-widest">
                    {winner === 'red' ? user.username : (player2?.username || 'Player 2')} 获得最终胜利!
                </h3>
                 <p className="text-white mb-6">
                    {winner === 'red' ? '获得 ' + matchConfig.pointsPerMatch + ' 积分' : '扣除 ' + matchConfig.pointsPerMatch + ' 积分'}
                </p>
                <Button onClick={() => setGameState('SETUP')}>返回设置</Button>
            </div>
        )}

        {/* The Grid Board */}
        <div className="relative border-2 border-black w-[324px] h-[360px] sm:w-[450px] sm:h-[500px] bg-[#eecfa1]">
           {/* Grid Lines Overlay */}
           <div className="absolute inset-0 grid grid-rows-9 grid-cols-8 gap-0 pointer-events-none">
             {Array(72).fill(null).map((_, i) => (
               <div key={i} className={`border-black ${i < 32 || i >= 40 ? 'border' : 'border-r border-l'} `}></div>
             ))}
           </div>
           
           {/* River Text */}
           <div className="absolute top-[40%] sm:top-[42%] w-full text-center pointer-events-none opacity-40 font-serif text-2xl sm:text-3xl text-black rotate-0">
             <span>楚 河</span>
             <span className="ml-16 sm:ml-24">漢 界</span>
           </div>

           {/* Palace Crosses */}
           <svg className="absolute inset-0 pointer-events-none w-full h-full opacity-60">
             <line x1="33.3%" y1="0" x2="55.5%" y2="20%" stroke="black" strokeWidth="1" />
             <line x1="55.5%" y1="0" x2="33.3%" y2="20%" stroke="black" strokeWidth="1" />
             <line x1="33.3%" y1="100%" x2="55.5%" y2="80%" stroke="black" strokeWidth="1" />
             <line x1="55.5%" y1="100%" x2="33.3%" y2="80%" stroke="black" strokeWidth="1" />
           </svg>

           {/* Clickable Intersections */}
           <div className="absolute -top-[5%] -left-[5.5%] w-[111%] h-[110%] grid grid-rows-10 grid-cols-9 z-10">
              {board.map((row, r) => (
                row.map((cell, c) => {
                   const isSelected = selected?.r === r && selected?.c === c;
                   const isValidMove = validMoves.some(m => m.r === r && m.c === c);
                   const isLastFrom = lastMove?.from.r === r && lastMove?.from.c === c;
                   const isLastTo = lastMove?.to.r === r && lastMove?.to.c === c;
                   const isAnimatingCapture = captureAnim?.r === r && captureAnim?.c === c;
                   const isCaptureTarget = isValidMove && cell;

                   return (
                     <div 
                        key={`${r}-${c}`}
                        onClick={() => handlePointClick(r, c)}
                        className="flex items-center justify-center relative cursor-pointer"
                     >
                       {/* Last Move Highlight */}
                       {(isLastFrom || isLastTo) && !isSelected && (
                         <div className="absolute w-8 h-8 sm:w-12 sm:h-12 bg-indigo-500/20 rounded-full" />
                       )}

                       {/* The Piece */}
                       {cell && (
                         <div className={`
                           w-8 h-8 sm:w-12 sm:h-12 rounded-full border-2 
                           flex items-center justify-center text-lg sm:text-2xl font-bold bg-[#f5deb3] shadow-md transition-all duration-200
                           ${cell.color === 'red' ? 'text-red-600 border-red-600' : 'text-black border-black'}
                           ${isSelected ? 'scale-110 -translate-y-1 ring-4 ring-yellow-400 z-50' : ''}
                           ${isCaptureTarget ? 'ring-4 ring-red-500/50 z-40' : ''} 
                         `}>
                           {cell.label}
                         </div>
                       )}

                       {isValidMove && !cell && (
                         <div className="w-3 h-3 sm:w-4 sm:h-4 bg-green-600/50 rounded-full animate-pulse z-20" />
                       )}

                       {isAnimatingCapture && (
                         <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
                            {captureAnim?.piece && (
                                <div className={`
                                    absolute w-12 h-12 rounded-full border-2 
                                    flex items-center justify-center text-2xl font-bold bg-[#f5deb3]
                                    animate-ping opacity-60 z-10
                                    ${captureAnim.piece.color === 'red' ? 'text-red-600 border-red-600' : 'text-black border-black'}
                                `}>
                                    {captureAnim.piece.label}
                                </div>
                            )}
                            <div className="absolute w-16 h-16 bg-red-600/40 rounded-full animate-ping" />
                         </div>
                       )}
                     </div>
                   );
                })
              ))}
           </div>
        </div>
      </div>
    </div>
  );
};