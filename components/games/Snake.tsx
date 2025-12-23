
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '../ui/Button';
import { playSound } from '../../utils/sound';
import { User, MatchDetails } from '../../types';

interface Props {
  user: User;
  onGameEnd: (points: number, isWin?: boolean, details?: MatchDetails) => void;
  // 保留接口定义以兼容 App.tsx 的传参，但贪吃蛇目前仅作为单人模式
  player2?: User | null;
  onOpenP2Login?: () => void;
}

// --- Engine Constants ---
const TILE_SIZE = 20; 
const GRID_COUNT = 25; 
const CANVAS_SIZE = TILE_SIZE * GRID_COUNT; // 500px
const GAME_SPEED_START = 150; 
const GAME_SPEED_MIN = 60; 

// Types
type Point = { x: number; y: number };
type Particle = { 
  x: number; y: number; 
  vx: number; vy: number; 
  life: number; 
  color: string; 
  size: number;
};

export const Snake: React.FC<Props> = ({ user, onGameEnd }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // UI State
  const [gameState, setGameState] = useState<'SETUP' | 'PLAYING' | 'GAMEOVER'>('SETUP');
  const [score, setScore] = useState(0);

  // Engine State (Refs for Loop)
  const statusRef = useRef<'SETUP' | 'PLAYING' | 'GAMEOVER'>('SETUP');
  const snake = useRef<Point[]>([]);
  const food = useRef<Point>({ x: 15, y: 15 });
  const direction = useRef<Point>({ x: 0, y: -1 }); 
  const nextMoves = useRef<Point[]>([]); 
  const particles = useRef<Particle[]>([]); 
  
  const speed = useRef(GAME_SPEED_START);
  const timeAccumulator = useRef(0);
  const lastTime = useRef(0);
  const reqId = useRef<number>(0);
  const frameTick = useRef(0);

  // Sync React state to Ref
  useEffect(() => {
      statusRef.current = gameState;
  }, [gameState]);

  // --- Initialization ---
  const initBoard = useCallback(() => {
    const startX = 10;
    const startY = 15;
    snake.current = [
      { x: startX, y: startY },
      { x: startX, y: startY + 1 },
      { x: startX, y: startY + 2 },
      { x: startX, y: startY + 3 },
      { x: startX, y: startY + 4 },
    ];
    direction.current = { x: 0, y: -1 };
    nextMoves.current = [];
    particles.current = [];
    spawnFood(snake.current);
  }, []);

  // Mount logic
  useEffect(() => {
      initBoard();
      // Start loop immediately to render the initial board
      if (!reqId.current) {
        lastTime.current = performance.now();
        reqId.current = requestAnimationFrame(loop);
      }
      return () => {
        if (reqId.current) cancelAnimationFrame(reqId.current);
      };
  }, [initBoard]);

  // --- Helpers ---
  const spawnParticles = (x: number, y: number, color: string) => {
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = Math.random() * 4 + 1;
      particles.current.push({
        x: x * TILE_SIZE + TILE_SIZE / 2,
        y: y * TILE_SIZE + TILE_SIZE / 2,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        life: 1.0,
        color: color,
        size: Math.random() * 3 + 2
      });
    }
  };

  const updateParticles = () => {
    for (let i = particles.current.length - 1; i >= 0; i--) {
      const p = particles.current[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.04; 
      p.size *= 0.95; 
      if (p.life <= 0) particles.current.splice(i, 1);
    }
  };

  const spawnFood = (currentSnake: Point[]) => {
    let valid = false;
    let newFood = { x: 0, y: 0 };
    while (!valid) {
      newFood = {
        x: Math.floor(Math.random() * GRID_COUNT),
        y: Math.floor(Math.random() * GRID_COUNT)
      };
      // eslint-disable-next-line no-loop-func
      valid = !currentSnake.some(s => s.x === newFood.x && s.y === newFood.y);
    }
    food.current = newFood;
  };

  const startGame = () => {
    initBoard();
    speed.current = GAME_SPEED_START;
    setScore(0);
    timeAccumulator.current = 0;
    lastTime.current = performance.now();
    frameTick.current = 0;
    setGameState('PLAYING');
    playSound.click();
  };

  const handleGameOver = () => {
    playSound.lose();
    setGameState('GAMEOVER');
    onGameEnd(score, true, {
        opponent: 'System',
        score: `${score} 分`,
        matchTags: ['Snake']
    });
  };

  // --- Update Physics ---
  const update = () => {
    // 1. Input
    if (nextMoves.current.length > 0) {
      const nextDir = nextMoves.current.shift()!;
      if (direction.current.x + nextDir.x !== 0 || direction.current.y + nextDir.y !== 0) {
        direction.current = nextDir;
      }
    }

    // 2. Move Head
    const head = snake.current[0];
    const newHead = { x: head.x + direction.current.x, y: head.y + direction.current.y };

    // 3. Collisions
    if (newHead.x < 0 || newHead.x >= GRID_COUNT || newHead.y < 0 || newHead.y >= GRID_COUNT) {
      handleGameOver();
      return;
    }
    for (let i = 0; i < snake.current.length - 1; i++) {
        if (newHead.x === snake.current[i].x && newHead.y === snake.current[i].y) {
            handleGameOver();
            return;
        }
    }

    snake.current.unshift(newHead);

    // 4. Food
    if (newHead.x === food.current.x && newHead.y === food.current.y) {
      playSound.capture();
      setScore(s => {
        const newScore = s + 1;
        if (newScore % 5 === 0) speed.current = Math.max(GAME_SPEED_MIN, speed.current * 0.95);
        return newScore;
      });
      spawnParticles(newHead.x, newHead.y, '#f43f5e');
      spawnFood(snake.current);
    } else {
      snake.current.pop();
    }
  };

  // --- Render ---
  const drawRoundedRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fill();
  };

  const drawEye = (ctx: CanvasRenderingContext2D, cx: number, cy: number, dx: number, dy: number) => {
     const offset = 4;
     const size = 3;
     const pSize = 1.5;
     
     const eyes = dy !== 0 
        ? [{ x: cx - offset, y: cy + dy * 2 }, { x: cx + offset, y: cy + dy * 2 }]
        : [{ x: cx + dx * 2, y: cy - offset }, { x: cx + dx * 2, y: cy + offset }];

     eyes.forEach(eye => {
         ctx.fillStyle = '#fff';
         ctx.beginPath(); ctx.arc(eye.x, eye.y, size, 0, Math.PI*2); ctx.fill();
         ctx.fillStyle = '#000';
         ctx.beginPath(); ctx.arc(eye.x + dx, eye.y + dy, pSize, 0, Math.PI*2); ctx.fill();
     });
  };

  const render = (ctx: CanvasRenderingContext2D) => {
    // Clear & Grid
    ctx.fillStyle = '#0f172a'; 
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for(let i=0; i<=GRID_COUNT; i++) {
        ctx.moveTo(i * TILE_SIZE, 0); ctx.lineTo(i * TILE_SIZE, CANVAS_SIZE);
        ctx.moveTo(0, i * TILE_SIZE); ctx.lineTo(CANVAS_SIZE, i * TILE_SIZE);
    }
    ctx.stroke();

    // Food
    const fx = food.current.x * TILE_SIZE;
    const fy = food.current.y * TILE_SIZE;
    const pulse = Math.sin(frameTick.current * 0.15) * 2;
    ctx.shadowColor = '#f43f5e';
    ctx.shadowBlur = 15 + pulse * 2;
    ctx.fillStyle = '#f43f5e';
    const pad = 3 - pulse * 0.2;
    drawRoundedRect(ctx, fx + pad, fy + pad, TILE_SIZE - pad*2, TILE_SIZE - pad*2, 6);
    ctx.shadowBlur = 0;

    // Snake
    snake.current.forEach((seg, i) => {
      const isHead = i === 0;
      const x = seg.x * TILE_SIZE;
      const y = seg.y * TILE_SIZE;
      
      if (isHead) {
          ctx.fillStyle = '#10b981';
          ctx.shadowColor = 'rgba(16, 185, 129, 0.5)';
          ctx.shadowBlur = 12;
      } else {
          ctx.fillStyle = '#34d399';
          ctx.shadowBlur = 0;
      }
      const bPad = 1;
      drawRoundedRect(ctx, x + bPad, y + bPad, TILE_SIZE - bPad*2, TILE_SIZE - bPad*2, 4);
      
      if (isHead) {
          ctx.shadowBlur = 0;
          drawEye(ctx, x + TILE_SIZE/2, y + TILE_SIZE/2, direction.current.x, direction.current.y);
      }
    });

    // Particles
    particles.current.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    });
  };

  // --- Loop ---
  const loop = (time: number) => {
    const dt = time - lastTime.current;
    lastTime.current = time;
    
    frameTick.current++;
    updateParticles();

    if (statusRef.current === 'PLAYING') {
        timeAccumulator.current += dt;
        if (timeAccumulator.current >= speed.current) {
            update();
            timeAccumulator.current -= speed.current;
        }
    }

    const canvas = canvasRef.current;
    if (canvas) {
       const ctx = canvas.getContext('2d');
       if (ctx) render(ctx);
    }
    
    reqId.current = requestAnimationFrame(loop);
  };

  // --- Events ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (statusRef.current !== 'PLAYING') return;
      const key = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) e.preventDefault();

      const map: Record<string, Point> = {
          'w': {x: 0, y: -1}, 'arrowup': {x: 0, y: -1},
          's': {x: 0, y: 1},  'arrowdown': {x: 0, y: 1},
          'a': {x: -1, y: 0}, 'arrowleft': {x: -1, y: 0},
          'd': {x: 1, y: 0},  'arrowright': {x: 1, y: 0}
      };

      const desiredDir = map[key];
      if (!desiredDir) return;

      const lastScheduledDir = nextMoves.current.length > 0 
          ? nextMoves.current[nextMoves.current.length - 1] 
          : direction.current;

      if (lastScheduledDir.x + desiredDir.x !== 0 || lastScheduledDir.y + desiredDir.y !== 0) {
          if (nextMoves.current.length < 3) nextMoves.current.push(desiredDir);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // --- High DPI ---
  useEffect(() => {
     const canvas = canvasRef.current;
     if (canvas) {
         const dpr = window.devicePixelRatio || 1;
         canvas.width = CANVAS_SIZE * dpr;
         canvas.height = CANVAS_SIZE * dpr;
         const ctx = canvas.getContext('2d');
         if (ctx) ctx.scale(dpr, dpr);
     }
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full w-full p-4 overflow-hidden">
      <div className="bg-slate-900/80 backdrop-blur-xl p-6 rounded-2xl shadow-2xl border border-white/10 w-full max-w-lg flex flex-col items-center relative animate-zoom-in">
        
        {/* Header */}
        <div className="w-full flex justify-between items-center mb-6">
            <div>
                <h2 className="text-2xl font-bold text-emerald-400 tracking-wider flex items-center gap-2">
                    <span>🐍</span> 贪吃蛇
                </h2>
                <div className="flex gap-2 text-[10px] text-slate-400 mt-1 font-mono uppercase">
                   <span className="border border-slate-700 px-1 rounded bg-slate-800">WASD / 方向键</span>
                </div>
            </div>
            <div className="text-right">
                <div className="text-4xl font-black text-white font-mono leading-none">{score}</div>
                <div className="text-[10px] text-slate-500 font-bold tracking-widest mt-1">SCORE</div>
            </div>
        </div>

        {/* Game Area */}
        <div className="relative rounded-xl overflow-hidden border-4 border-slate-800 shadow-[0_0_30px_rgba(0,0,0,0.5)] bg-slate-950">
            <canvas
                ref={canvasRef}
                style={{ 
                    width: `${CANVAS_SIZE}px`, 
                    height: `${CANVAS_SIZE}px`, 
                    maxWidth: '100%', 
                    aspectRatio: '1/1' 
                }}
                className="block"
            />
            
            {gameState !== 'PLAYING' && (
                <div className="absolute inset-0 bg-slate-900/80 flex flex-col items-center justify-center text-center p-8 z-20 animate-fade-in backdrop-blur-sm">
                    {gameState === 'SETUP' ? (
                        <>
                            <div className="text-6xl mb-6 animate-bounce">🍎</div>
                            <h3 className="text-3xl font-black text-white mb-2">准备挑战</h3>
                            <Button onClick={startGame} className="px-10 py-4 text-xl bg-emerald-600 hover:bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)] border-none">
                                开始游戏
                            </Button>
                        </>
                    ) : (
                        <>
                            <div className="text-6xl mb-4">💥</div>
                            <h3 className="text-3xl font-black text-red-500 mb-2">GAME OVER</h3>
                            <div className="bg-white/5 p-4 rounded-xl mb-6 w-full border border-white/10">
                                <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">本次得分</p>
                                <p className="text-5xl font-mono font-black text-white">{score}</p>
                            </div>
                            <Button onClick={startGame} className="w-full py-3 text-lg bg-slate-700 hover:bg-slate-600 transition-all">
                                再试一次
                            </Button>
                        </>
                    )}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
