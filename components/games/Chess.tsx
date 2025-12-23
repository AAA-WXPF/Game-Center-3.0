import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { ChessPiece, User, GameType, MatchDetails } from '../../types';
import { playSound } from '../../utils/sound';
import { StreakIndicator } from '../ui/StreakIndicator';

// Initial Board State
const initialBoard: (ChessPiece | null)[][] = [
  [
    { type: 'R', color: 'black', label: '♜' }, { type: 'N', color: 'black', label: '♞' }, { type: 'B', color: 'black', label: '♝' }, { type: 'Q', color: 'black', label: '♛' },
    { type: 'K', color: 'black', label: '♚' }, { type: 'B', color: 'black', label: '♝' }, { type: 'N', color: 'black', label: '♞' }, { type: 'R', color: 'black', label: '♜' }
  ],
  Array(8).fill({ type: 'P', color: 'black', label: '♟' }),
  Array(8).fill(null),
  Array(8).fill(null),
  Array(8).fill(null),
  Array(8).fill(null),
  Array(8).fill({ type: 'P', color: 'white', label: '♙' }),
  [
    { type: 'R', color: 'white', label: '♖' }, { type: 'N', color: 'white', label: '♘' }, { type: 'B', color: 'white', label: '♗' }, { type: 'Q', color: 'white', label: '♕' },
    { type: 'K', color: 'white', label: '♔' }, { type: 'B', color: 'white', label: '♗' }, { type: 'N', color: 'white', label: '♘' }, { type: 'R', color: 'white', label: '♖' }
  ]
];

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
  turn: 'white' | 'black';
  lastMove: { from: { r: number, c: number }, to: { r: number, c: number } } | null;
}

export const Chess: React.FC<Props> = ({ user, onGameEnd, player2, onOpenP2Login }) => {
  const [board, setBoard] = useState<(ChessPiece | null)[][]>(initialBoard);
  const [selected, setSelected] = useState<{ r: number, c: number } | null>(null);
  const [validMoves, setValidMoves] = useState<{ r: number, c: number }[]>([]);
  const [turn, setTurn] = useState<'white' | 'black'>('white');
  const [lastMove, setLastMove] = useState<{ from: { r: number, c: number }, to: { r: number, c: number } } | null>(null);
  const [captureAnim, setCaptureAnim] = useState<{ r: number, c: number, piece: ChessPiece } | null>(null);
  
  // Game & Match State
  const [gameState, setGameState] = useState<'SETUP' | 'PLAYING' | 'ROUND_OVER' | 'GAMEOVER'>('SETUP');
  const [matchConfig, setMatchConfig] = useState<MatchConfig>({ totalFrames: 3, pointsPerMatch: 100 });
  const [matchScore, setMatchScore] = useState<{p1: number, p2: number}>({ p1: 0, p2: 0 }); // p1=White, p2=Black
  const [winner, setWinner] = useState<'white' | 'black' | null>(null); // Match winner
  
  const [history, setHistory] = useState<HistoryState[]>([]);

  // Helper: Check bounds
  const isValidPos = (r: number, c: number) => r >= 0 && r < 8 && c >= 0 && c < 8;

  // Helper: Calculate valid moves for a piece
  const getValidMoves = (currentBoard: (ChessPiece | null)[][], piece: ChessPiece, r: number, c: number) => {
    const moves: { r: number, c: number }[] = [];
    const isWhite = piece.color === 'white';
    
    // Pawn Logic
    if (piece.type === 'P') {
      const direction = isWhite ? -1 : 1;
      const startRow = isWhite ? 6 : 1;

      // Forward 1
      if (isValidPos(r + direction, c) && !currentBoard[r + direction][c]) {
        moves.push({ r: r + direction, c });
        // Forward 2
        if (r === startRow && isValidPos(r + direction * 2, c) && !currentBoard[r + direction * 2][c]) {
          moves.push({ r: r + direction * 2, c });
        }
      }
      // Captures
      const captureOffsets = [-1, 1];
      captureOffsets.forEach(offset => {
        if (isValidPos(r + direction, c + offset)) {
          const target = currentBoard[r + direction][c + offset];
          if (target && target.color !== piece.color) {
            moves.push({ r: r + direction, c: c + offset });
          }
        }
      });
    } 
    // Other Pieces
    else {
      const directions: Record<string, number[][]> = {
        'R': [[0, 1], [0, -1], [1, 0], [-1, 0]],
        'B': [[1, 1], [1, -1], [-1, 1], [-1, -1]],
        'N': [[1, 2], [1, -2], [-1, 2], [-1, -2], [2, 1], [2, -1], [-2, 1], [-2, -1]],
        'Q': [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]],
        'K': [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]],
      };

      const movesDirs = directions[piece.type];
      const isSliding = ['R', 'B', 'Q'].includes(piece.type);

      movesDirs.forEach(([dr, dc]) => {
        let nr = r + dr;
        let nc = c + dc;

        if (isSliding) {
          while (isValidPos(nr, nc)) {
            const target = currentBoard[nr][nc];
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
        } else {
          // Stepping (Knight, King)
          if (isValidPos(nr, nc)) {
            const target = currentBoard[nr][nc];
            if (!target || target.color !== piece.color) {
              moves.push({ r: nr, c: nc });
            }
          }
        }
      });
    }
    return moves;
  };

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
      setBoard(initialBoard);
      setTurn('white');
      setSelected(null);
      setValidMoves([]);
      setLastMove(null);
      setHistory([]);
      setGameState('PLAYING');
  };

  const handleSquareClick = (r: number, c: number) => {
    if (gameState !== 'PLAYING') return;

    // If a piece is selected
    if (selected) {
      // Check if clicked square is a valid move
      const move = validMoves.find(m => m.r === r && m.c === c);

      if (move) {
        // --- SAVE HISTORY BEFORE MOVE ---
        setHistory(prev => [...prev, {
            board: board.map(row => [...row]),
            turn,
            lastMove
        }]);

        const piece = board[selected.r][selected.c];
        const target = board[r][c];

        // Sound & Animation & Scoring
        if (target) {
          setCaptureAnim({ r, c, piece: target });
          setTimeout(() => setCaptureAnim(null), 600); // Slightly longer for explosion

          if (target.type === 'K') {
             // King Captured - Round Over
             handleRoundEnd(turn); // Winner is current turn player
             return;
          } else {
             // Normal Capture
             playSound.capture();
          }
        } else {
          playSound.move(); // Play normal move sound
        }

        // Execute Move
        const newBoard = board.map(row => [...row]);
        newBoard[r][c] = piece;
        newBoard[selected.r][selected.c] = null;
        
        // Auto-Promote Pawn to Queen for simplicity
        if (piece?.type === 'P' && (r === 0 || r === 7)) {
           newBoard[r][c] = { ...piece, type: 'Q', label: piece.color === 'white' ? '♕' : '♛' };
        }

        setBoard(newBoard);
        setLastMove({ from: selected, to: { r, c } });
        setTurn(turn === 'white' ? 'black' : 'white');
        
        // Deselect
        setSelected(null);
        setValidMoves([]);
      } else {
        // If clicking on another friendly piece, select it instead
        const target = board[r][c];
        if (target && target.color === turn) {
          setSelected({ r, c });
          setValidMoves(getValidMoves(board, target, r, c));
        } else {
          // Deselect
          setSelected(null);
          setValidMoves([]);
        }
      }
    } else {
      // Select a piece
      const piece = board[r][c];
      if (piece && piece.color === turn) {
        setSelected({ r, c });
        setValidMoves(getValidMoves(board, piece, r, c));
      }
    }
  };

  const handleRoundEnd = (roundWinner: 'white' | 'black') => {
      playSound.win();
      
      const newScore = { ...matchScore };
      if (roundWinner === 'white') newScore.p1 += 1;
      else newScore.p2 += 1;
      
      setMatchScore(newScore);

      const targetWins = Math.ceil(matchConfig.totalFrames / 2);

      if (newScore.p1 >= targetWins) {
          setWinner('white');
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

  // Setup UI
  if (gameState === 'SETUP') {
      return (
        <div className="flex flex-col items-center justify-center h-full max-w-lg mx-auto p-4">
        <div className="bg-slate-900/60 backdrop-blur-xl p-8 rounded-2xl shadow-xl border border-white/5 w-full animate-zoom-in">
          <h2 className="text-3xl font-bold text-center mb-6 text-emerald-400">国际象棋 - 赛制设置</h2>
          
          <div className="bg-black/20 p-4 rounded-xl mb-6 border border-white/5">
               <div className="mb-4">
                   <label className="block text-xs text-slate-500 mb-1">总局数 (奇数)</label>
                   <div className="flex gap-2">
                       {[1, 3, 5, 7].map(num => (
                           <button 
                            key={num}
                            onClick={() => setMatchConfig({...matchConfig, totalFrames: num})}
                            className={`flex-1 py-1 rounded border ${matchConfig.totalFrames === num ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-slate-800 border-slate-600 text-slate-400'}`}
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

          <Button onClick={startMatch} className="w-full py-3 text-lg bg-emerald-600 hover:bg-emerald-500">
              {user.username !== '测试玩家' && !player2 ? '登录 2P 并开始' : '开始对弈'}
          </Button>
        </div>
      </div>
      );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-4">
      {/* Centered Game Header */}
      <div className="w-full max-w-md mb-4 flex flex-col items-center relative animate-slide-up">
          <div className="flex flex-col items-center bg-slate-900/60 backdrop-blur-xl px-8 py-2 rounded-2xl border border-white/10 shadow-xl">
              <div className="text-[10px] text-slate-400 font-bold tracking-[0.2em] mb-1">
                BO{matchConfig.totalFrames} MATCH
              </div>
              <div className="flex items-center gap-6">
                  <div className={`flex flex-col items-center transition-opacity duration-300 relative ${turn === 'white' ? 'opacity-100 scale-110' : 'opacity-50'}`}>
                     <div className="w-8 h-8 rounded-full bg-white border border-slate-300 overflow-hidden mb-1">
                        {user.avatar?.startsWith('data:') ? <img src={user.avatar} className="w-full h-full object-cover"/> : (user.avatar || '👤')}
                     </div>
                     <span className="text-[10px] font-bold text-slate-400 tracking-wider">白方</span>
                     <span className="text-4xl font-black text-white leading-none">{matchScore.p1}</span>
                     <StreakIndicator streak={user.stats?.[GameType.CHESS]?.streak || 0} className="absolute -top-3 -left-3 scale-75" />
                  </div>
                  <div className="text-slate-600 font-light text-2xl">:</div>
                  <div className={`flex flex-col items-center transition-opacity duration-300 ${turn === 'black' ? 'opacity-100 scale-110' : 'opacity-50'}`}>
                     <div className="w-8 h-8 rounded-full bg-black border border-slate-600 flex items-center justify-center text-sm mb-1 overflow-hidden">
                        {player2?.avatar?.startsWith('data:') ? <img src={player2.avatar} className="w-full h-full object-cover"/> : (player2?.avatar || '👤')}
                     </div>
                     <span className="text-[10px] font-bold text-slate-400 tracking-wider">黑方</span>
                     <span className="text-4xl font-black text-white leading-none">{matchScore.p2}</span>
                  </div>
              </div>
          </div>
      </div>

      <div className="text-right w-full max-w-md mb-2 flex justify-between items-center px-1">
          <div className="text-xs text-slate-500 font-mono">
              当前回合: <span className={turn === 'white' ? 'text-white' : 'text-slate-400'}>{turn === 'white' ? '白方' : '黑方'}</span>
          </div>
          <div className="flex gap-2">
              <Button 
                onClick={handleUndo} 
                variant="secondary" 
                className="text-xs py-1 h-8 bg-slate-800/50 hover:bg-slate-700 backdrop-blur-md border border-white/5"
                disabled={history.length === 0 || gameState !== 'PLAYING'}
              >
                ↶ 悔棋
              </Button>
              <Button onClick={() => setGameState('SETUP')} variant="secondary" className="text-xs py-1 h-8 bg-slate-800/50 hover:bg-slate-700 backdrop-blur-md border border-white/5">重置</Button>
          </div>
      </div>
      
      <div className="bg-slate-800 p-2 rounded-lg shadow-2xl relative border-4 border-slate-700">
        {gameState === 'ROUND_OVER' && (
             <div className="absolute inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg text-center p-4">
                 <h3 className="text-2xl font-bold text-white mb-4">本局结束</h3>
                 <p className="text-slate-300 mb-6">比分 {matchScore.p1} : {matchScore.p2}</p>
                 <Button onClick={initRound}>下一局</Button>
             </div>
        )}

        {gameState === 'GAMEOVER' && (
            <div className="absolute inset-0 z-50 bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg text-center p-4">
                <h3 className="text-4xl font-bold text-yellow-400 mb-4">
                    {winner === 'white' ? user.username : (player2?.username || 'Player 2')} 获得最终胜利!
                </h3>
                <p className="text-white mb-6">
                    {winner === 'white' ? '获得 ' + matchConfig.pointsPerMatch + ' 积分' : '扣除 ' + matchConfig.pointsPerMatch + ' 积分'}
                </p>
                <Button onClick={() => setGameState('SETUP')}>返回设置</Button>
            </div>
        )}

        <div className="grid grid-cols-8 gap-0 bg-slate-400 select-none relative">
          {board.map((row, r) => (
            row.map((cell, c) => {
              const isBlackSquare = (r + c) % 2 === 1;
              const isSelected = selected?.r === r && selected?.c === c;
              const isLastMove = (lastMove?.from.r === r && lastMove?.from.c === c) || (lastMove?.to.r === r && lastMove?.to.c === c);
              const isValidMove = validMoves.some(m => m.r === r && m.c === c);
              const isCapture = isValidMove && cell !== null; // Valid move and has piece = capture
              const isAnimatingCapture = captureAnim?.r === r && captureAnim?.c === c;
              
              return (
                <div
                  key={`${r}-${c}`}
                  onClick={() => handleSquareClick(r, c)}
                  className={`
                    w-10 h-10 sm:w-14 sm:h-14 flex items-center justify-center text-3xl sm:text-4xl cursor-pointer relative
                    ${isBlackSquare ? 'bg-slate-600' : 'bg-slate-300'}
                    ${isSelected ? 'ring-inset ring-4 ring-yellow-400 z-10' : ''}
                    ${isLastMove && !isSelected ? 'bg-indigo-400/50' : ''}
                    transition-colors duration-200
                  `}
                >
                  {/* Position Labels (Rank/File) */}
                  {c === 0 && <span className={`absolute left-0.5 top-0.5 text-[0.6rem] font-bold ${isBlackSquare ? 'text-slate-400' : 'text-slate-500'}`}>{8 - r}</span>}
                  {r === 7 && <span className={`absolute right-0.5 bottom-0 text-[0.6rem] font-bold ${isBlackSquare ? 'text-slate-400' : 'text-slate-500'}`}>{String.fromCharCode(97 + c)}</span>}

                  {cell && (
                    <span 
                      className={`
                        z-20 drop-shadow-lg transition-transform duration-200 
                        ${cell.color === 'white' ? 'text-white' : 'text-black'}
                        ${isSelected ? 'scale-110 -translate-y-1' : ''}
                      `}
                    >
                      {cell.label}
                    </span>
                  )}

                  {isValidMove && !cell && (
                    <div className="absolute w-3 h-3 sm:w-4 sm:h-4 bg-green-500/50 rounded-full z-10 animate-pulse" />
                  )}

                  {isCapture && (
                    <div className="absolute inset-0 border-4 border-red-500/60 z-10 animate-pulse rounded-sm" />
                  )}
                  {isCapture && (
                    <div className="absolute inset-0 bg-red-500/10 z-0" />
                  )}

                  {isAnimatingCapture && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
                      {captureAnim?.piece && (
                          <div 
                             className="absolute text-4xl animate-ping opacity-60 z-10"
                             style={{ color: captureAnim.piece.color === 'white' ? '#fff' : '#000' }}
                          >
                             {captureAnim.piece.label}
                          </div>
                      )}
                      <div className="absolute w-full h-full bg-red-500/60 rounded-full animate-ping" />
                      <div className="absolute w-3/4 h-3/4 bg-yellow-300/80 rounded-full animate-ping" style={{ animationDelay: '0.1s' }} />
                    </div>
                  )}
                </div>
              );
            })
          ))}
        </div>
      </div>
    </div>
  );
};