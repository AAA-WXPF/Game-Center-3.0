import React, { useRef, useEffect, useState, useCallback } from 'react';
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

type BilliardsMode = '8BALL' | '9BALL';
type GroupType = 'SOLIDS' | 'STRIPES' | null;

// --- Physics Constants ---
const TABLE_WIDTH = 800;
const TABLE_HEIGHT = 400;
const BALL_RADIUS = 12; 
const POCKET_RADIUS = 28; 

// Physics Parameters
const SUB_STEPS = 8; 
const DECELERATION = 0.045;
const WALL_BOUNCE = 0.75;
const BALL_RESTITUTION = 0.92; 
const MAX_POWER = 45;
const STOP_THRESHOLD = 0.08;

const BALL_COLORS = [
  '#f0f0f0', '#fbbf24', '#2563eb', '#dc2626', '#7e22ce', '#f97316', '#16a34a', '#881337', 
  '#111111', '#fbbf24', '#2563eb', '#dc2626', '#7e22ce', '#f97316', '#16a34a', '#881337'
];

// Pre-defined pocket locations
const POCKETS = [
  { x: 0, y: 0 }, { x: TABLE_WIDTH / 2, y: -8 }, { x: TABLE_WIDTH, y: 0 },
  { x: 0, y: TABLE_HEIGHT }, { x: TABLE_WIDTH / 2, y: TABLE_HEIGHT + 8 }, { x: TABLE_WIDTH, y: TABLE_HEIGHT }
];

interface Ball {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  active: boolean; 
  type: 'CUE' | 'SOLID' | 'STRIPE' | 'EIGHT' | 'NINE';
}

interface MatchConfig {
    totalFrames: number; 
    pointsPerMatch: number;
}

export const Billiards: React.FC<Props> = ({ user, onGameEnd, player2, onOpenP2Login }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [mode, setMode] = useState<BilliardsMode>('8BALL');
  const [gameState, setGameState] = useState<'SETUP' | 'PLAYING' | 'ROUND_OVER' | 'GAMEOVER'>('SETUP');
  
  // Match State
  const [matchConfig, setMatchConfig] = useState<MatchConfig>({ totalFrames: 3, pointsPerMatch: 100 });
  const [matchScore, setMatchScore] = useState<{p1: number, p2: number}>({ p1: 0, p2: 0 });
  
  const [turn, setTurn] = useState<1 | 2>(1);
  const [winner, setWinner] = useState<string | null>(null); 
  const [matchWinner, setMatchWinner] = useState<string | null>(null);

  // We use a ref for balls to avoid re-renders on every frame, but keep a state for initialization triggers
  const ballsRef = useRef<Ball[]>([]);
  const [isMoving, setIsMoving] = useState(false);
  
  const [playerGroups, setPlayerGroups] = useState<{1: GroupType, 2: GroupType}>({ 1: null, 2: null });
  
  const [dragStart, setDragStart] = useState<{x: number, y: number} | null>(null);
  const [currentDrag, setCurrentDrag] = useState<{x: number, y: number} | null>(null);
  const [power, setPower] = useState(0);

  const [placingBall, setPlacingBall] = useState(false);
  const [validPlacement, setValidPlacement] = useState(true);

  const [foulMessage, setFoulMessage] = useState<string | null>(null);

  const requestRef = useRef<number>(0);
  const soundCooldowns = useRef<Record<string, number>>({}); 

  const turnInfoRef = useRef<{
      pottedThisTurn: boolean;
      firstHitId: number | null;
      nineBallPotted: boolean;
  }>({ pottedThisTurn: false, firstHitId: null, nineBallPotted: false });

  // Refs for State in Game Loop
  const modeRef = useRef(mode);
  const turnRef = useRef(turn);
  const playerGroupsRef = useRef(playerGroups);
  const placingBallRef = useRef(placingBall);

  // Sync refs
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { turnRef.current = turn; }, [turn]);
  useEffect(() => { playerGroupsRef.current = playerGroups; }, [playerGroups]);
  useEffect(() => { placingBallRef.current = placingBall; }, [placingBall]);

  // --- Mobile & Responsive Logic ---
  const [windowSize, setWindowSize] = useState({ w: 1000, h: 600 });

  useEffect(() => {
    const handleResize = () => {
        setWindowSize({ w: window.innerWidth, h: window.innerHeight });
    };
    handleResize(); // Init
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const endRound = (roundWinnerName: string) => {
      playSound.win();
      
      const newScore = { ...matchScore };
      if (roundWinnerName === 'P1' || (user && roundWinnerName === user.username)) newScore.p1 += 1;
      else newScore.p2 += 1;
      
      setMatchScore(newScore);
      setWinner(roundWinnerName);

      const targetWins = Math.ceil(matchConfig.totalFrames / 2);

      if (newScore.p1 >= targetWins) {
          setMatchWinner('P1');
          setGameState('GAMEOVER');
          onGameEnd(matchConfig.pointsPerMatch, true, {
              opponent: player2 ? player2.username : 'Player 2',
              opponentAvatar: player2?.avatar || '👤',
              score: `${newScore.p1}-${newScore.p2}`,
              matchTags: [`${mode}`, `BO${matchConfig.totalFrames}`]
          });
      } else if (newScore.p2 >= targetWins) {
          setMatchWinner('P2');
          setGameState('GAMEOVER');
          onGameEnd(-matchConfig.pointsPerMatch, false, {
              opponent: player2 ? player2.username : 'Player 2',
              opponentAvatar: player2?.avatar || '👤',
              score: `${newScore.p1}-${newScore.p2}`,
              matchTags: [`${mode}`, `BO${matchConfig.totalFrames}`]
          });
      } else {
          setGameState('ROUND_OVER');
      }
  };

  const initRound = () => {
    const newBalls: Ball[] = [];
    
    // Cue Ball
    newBalls.push({ id: 0, x: 200, y: TABLE_HEIGHT / 2, vx: 0, vy: 0, active: true, type: 'CUE' });

    const startX = 600;
    const startY = TABLE_HEIGHT / 2;
    const r = BALL_RADIUS;
    const dist = Math.sqrt((2 * r) ** 2 - r ** 2) + 0.5;

    if (mode === '8BALL') {
        const pattern = [
            [1], 
            [2, 9], 
            [3, 8, 10], 
            [4, 15, 12, 5], 
            [6, 7, 13, 14, 11]
        ];
        
        pattern.forEach((row, colIndex) => {
            row.forEach((id, rowIndex) => {
                 const x = startX + colIndex * dist;
                 const y = startY + (rowIndex * 2 * r) - (row.length - 1) * r;
                 
                 let type: Ball['type'] = 'SOLID';
                 if (id > 8) type = 'STRIPE';
                 if (id === 8) type = 'EIGHT';

                 newBalls.push({ id, x: x + Math.random()*0.1, y: y + Math.random()*0.1, vx: 0, vy: 0, active: true, type });
            });
        });
    } else {
        const ids = [1, 2, 3, 9, 5, 6, 7, 8, 4];
        const positions = [
            { c: 0, r: 0 },
            { c: 1, r: -0.5 }, { c: 1, r: 0.5 },
            { c: 2, r: 0 }, 
            { c: 2, r: -1 }, { c: 2, r: 1 },
            { c: 3, r: -0.5 }, { c: 3, r: 0.5 },
            { c: 4, r: 0 }
        ];
        
        positions.forEach((pos, i) => {
            const id = ids[i];
            const x = startX + pos.c * dist;
            const y = startY + pos.r * 2 * r;
            newBalls.push({ 
                id, x: x + Math.random()*0.1, y: y + Math.random()*0.1, vx: 0, vy: 0, active: true, 
                type: id === 9 ? 'NINE' : 'SOLID' 
            });
        });
    }

    ballsRef.current = newBalls;
    setGameState('PLAYING');
    setTurn(1); 
    setWinner(null);
    setPlacingBall(false);
    setFoulMessage(null);
    setPlayerGroups({ 1: null, 2: null });
    turnInfoRef.current = { pottedThisTurn: false, firstHitId: null, nineBallPotted: false };
    soundCooldowns.current = {};
  };

  const startMatch = (selectedMode: BilliardsMode) => {
    if (user.username !== '测试玩家' && !player2 && onOpenP2Login) {
        onOpenP2Login();
        return;
    }

    playSound.click();
    setMode(selectedMode);
    setMatchScore({ p1: 0, p2: 0 });
    setMatchWinner(null);
    initRound();
};

  // --- Physics Engine ---
  const checkPockets = (ball: Ball) => {
      for (let p of POCKETS) {
          const dx = ball.x - p.x;
          const dy = ball.y - p.y;
          if (dx*dx + dy*dy < (POCKET_RADIUS * 1.2)**2) return true;
      }
      return false;
  };

  const handlePotLogic = (ids: number[]) => {
    if (ids.includes(0)) return;
    
    const currentMode = modeRef.current;
    const currentTurn = turnRef.current;
    const currentGroups = playerGroupsRef.current;

    if (currentMode === '8BALL' && currentGroups[1] === null) {
        const firstBall = ids.find(id => id !== 0 && id !== 8);
        if (firstBall) {
            const isSolid = firstBall < 8;
            const type: GroupType = isSolid ? 'SOLIDS' : 'STRIPES';
            const otherType: GroupType = isSolid ? 'STRIPES' : 'SOLIDS';
            setPlayerGroups({ 1: currentTurn === 1 ? type : otherType, 2: currentTurn === 2 ? type : otherType });
        }
    }
    if (currentMode === '8BALL' && ids.includes(8)) {
        const activeBalls = ballsRef.current.filter(b => b.active && b.id !== 0 && b.id !== 8);
        // Win if all other balls potted, else lose
        endRound(activeBalls.length === 0 && turnInfoRef.current.firstHitId ? (currentTurn === 1 ? 'P1' : 'P2') : (currentTurn === 1 ? 'P2' : 'P1'));
    }
  };

  const handleTurnEnd = () => {
    let foulReason: string | null = null;
    const cue = ballsRef.current.find(b => b.id === 0);
    const ninePotted = turnInfoRef.current.nineBallPotted;
    
    const currentMode = modeRef.current;
    const currentTurn = turnRef.current;
    const currentGroups = playerGroupsRef.current;

    if (!cue || !cue.active) {
        foulReason = "母球落袋";
        if (cue) { cue.active = true; cue.vx = 0; cue.vy = 0; }
        setPlacingBall(true);
    } else if (turnInfoRef.current.firstHitId === null) {
        foulReason = "未击中任何球";
        setPlacingBall(true);
    } else if (currentMode === '9BALL') {
        const activeBalls = ballsRef.current.filter(b => b.active && b.id !== 0);
        if (turnInfoRef.current.firstHitId !== null) {
            // Lowest ball logic for 9-ball
            const lowestTarget = ballsRef.current.reduce((minId, b) => {
                if (b.id === 0) return minId;
                if (b.active && b.id < minId) return b.id;
                return minId;
            }, 999);
            
             if (turnInfoRef.current.firstHitId !== lowestTarget) {
                foulReason = "未击中最小号码球";
                setPlacingBall(true);
             }
        }
    } else if (currentMode === '8BALL') {
        // 8-ball specific fouls (hitting wrong group)
        const myGroup = currentGroups[currentTurn];
        if (myGroup) {
            const firstHit = ballsRef.current.find(b => b.id === turnInfoRef.current.firstHitId);
            if (firstHit) {
                let hitGroup: GroupType | 'EIGHT' = null;
                if (firstHit.id < 8) hitGroup = 'SOLIDS';
                else if (firstHit.id > 8) hitGroup = 'STRIPES';
                else hitGroup = 'EIGHT'; // Hitting 8 first is allowed only if 8 is the target
                
                // If groups established, must hit own group.
                // 8 ball is valid target ONLY if all own group balls are potted.
                const myBalls = ballsRef.current.filter(b => b.active && b.id !== 0 && b.id !== 8 && ((b.id < 8 && myGroup === 'SOLIDS') || (b.id > 8 && myGroup === 'STRIPES')));
                const onEight = myBalls.length === 0;

                if (onEight) {
                    if (firstHit.id !== 8) {
                        foulReason = "必须击打黑8";
                        setPlacingBall(true);
                    }
                } else {
                    if (hitGroup !== myGroup) {
                         foulReason = "未击中本方目标球";
                         setPlacingBall(true);
                    }
                }
            }
        }
    }

    if (foulReason) {
        setFoulMessage(`犯规: ${foulReason}`);
        playSound.wrong();
        // Turn passes on foul
        setTurn(currentTurn === 1 ? 2 : 1);
    } else {
        // Valid shot
        if (turnInfoRef.current.pottedThisTurn) {
             // Stay on turn if valid pot
             if (currentMode === '9BALL' && ninePotted) {
                 endRound(currentTurn === 1 ? 'P1' : 'P2');
                 return;
             }
             playSound.click(); 
        } else {
            setTurn(currentTurn === 1 ? 2 : 1);
        }
    }
    
    // Reset turn info
    turnInfoRef.current = { pottedThisTurn: false, firstHitId: null, nineBallPotted: false };
    if (foulReason) setTimeout(() => setFoulMessage(null), 2000);
  };

  const updatePhysics = () => {
      let isAnyBallMoving = false;
      const balls = ballsRef.current;
      const pottedInFrame: number[] = [];

      for (let step = 0; step < SUB_STEPS; step++) {
          balls.forEach(b => {
              if (!b.active) return;
              // Don't move cue ball if we are in placing mode
              if (placingBallRef.current && b.id === 0) return;

              b.x += b.vx / SUB_STEPS; b.y += b.vy / SUB_STEPS;
              const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
              if (speed > 0) {
                  const friction = DECELERATION / SUB_STEPS;
                  const newSpeed = Math.max(0, speed - friction);
                  if (newSpeed < STOP_THRESHOLD) { b.vx = 0; b.vy = 0; } 
                  else { const scale = newSpeed / speed; b.vx *= scale; b.vy *= scale; isAnyBallMoving = true; }
              }
              let wallHit = false;
              if (b.x < BALL_RADIUS) { b.x = BALL_RADIUS; b.vx = Math.abs(b.vx) * WALL_BOUNCE; wallHit = true; }
              if (b.x > TABLE_WIDTH - BALL_RADIUS) { b.x = TABLE_WIDTH - BALL_RADIUS; b.vx = -Math.abs(b.vx) * WALL_BOUNCE; wallHit = true; }
              if (b.y < BALL_RADIUS) { b.y = BALL_RADIUS; b.vy = Math.abs(b.vy) * WALL_BOUNCE; wallHit = true; }
              if (b.y > TABLE_HEIGHT - BALL_RADIUS) { b.y = TABLE_HEIGHT - BALL_RADIUS; b.vy = -Math.abs(b.vy) * WALL_BOUNCE; wallHit = true; }
              
              if (wallHit) {
                  const impactSpeed = Math.sqrt(b.vx*b.vx + b.vy*b.vy);
                  if (impactSpeed > 0.5) {
                      const now = Date.now();
                      const soundKey = `wall-${b.id}`;
                      if (!soundCooldowns.current[soundKey] || now - soundCooldowns.current[soundKey] > 50) {
                         playSound.billiardRail(impactSpeed);
                         soundCooldowns.current[soundKey] = now;
                      }
                  }
              }

              if (checkPockets(b)) {
                  b.active = false; b.vx = 0; b.vy = 0;
                  if (!pottedInFrame.includes(b.id)) pottedInFrame.push(b.id);
                  if (b.id === 9) turnInfoRef.current.nineBallPotted = true;
                  playSound.billiardPocket();
              }
          });

          for (let i = 0; i < balls.length; i++) {
              for (let j = i + 1; j < balls.length; j++) {
                  const b1 = balls[i]; const b2 = balls[j];
                  if (!b1.active || !b2.active) continue;
                  // Skip collision for cue ball if placing
                  if (placingBallRef.current && (b1.id === 0 || b2.id === 0)) continue; 

                  const dx = b2.x - b1.x; const dy = b2.y - b1.y;
                  const distSq = dx*dx + dy*dy;
                  if (distSq < (BALL_RADIUS * 2) ** 2) {
                      const dist = Math.sqrt(distSq);
                      const nx = dx / dist; const ny = dy / dist;
                      const overlap = (BALL_RADIUS * 2) - dist;
                      const correction = overlap * 0.5; 
                      b1.x -= nx * correction; b1.y -= ny * correction;
                      b2.x += nx * correction; b2.y += ny * correction;
                      
                      const v1n = b1.vx * nx + b1.vy * ny; const v2n = b2.vx * nx + b2.vy * ny;
                      const tx = -ny; const ty = nx;
                      const v1t = b1.vx * tx + b1.vy * ty; const v2t = b2.vx * tx + b2.vy * ty;
                      const e = BALL_RESTITUTION;
                      const v1n_new = (v1n * (1 - e) + v2n * (1 + e)) / 2;
                      const v2n_new = (v1n * (1 + e) + v2n * (1 - e)) / 2;
                      b1.vx = v1n_new * nx + v1t * tx; b1.vy = v1n_new * ny + v1t * ty;
                      b2.vx = v2n_new * nx + v2t * tx; b2.vy = v2n_new * ny + v2t * ty;
                      
                      const impactForce = Math.abs(v1n - v2n);
                      if (impactForce > 0.1) {
                          const now = Date.now();
                          const pairId = b1.id < b2.id ? `${b1.id}-${b2.id}` : `${b2.id}-${b1.id}`;
                          if (!soundCooldowns.current[pairId] || now - soundCooldowns.current[pairId] > 30) {
                              playSound.billiardHit(impactForce);
                              soundCooldowns.current[pairId] = now;
                          }
                      }
                      if (b1.id === 0 && turnInfoRef.current.firstHitId === null) turnInfoRef.current.firstHitId = b2.id;
                      if (b2.id === 0 && turnInfoRef.current.firstHitId === null) turnInfoRef.current.firstHitId = b1.id;
                  }
              }
          }
      }

      if (pottedInFrame.length > 0) {
          turnInfoRef.current.pottedThisTurn = true;
          handlePotLogic(pottedInFrame);
      }
      setIsMoving(isAnyBallMoving);
      if (!isAnyBallMoving && isMoving) { handleTurnEnd(); }
  };

  // --- Rendering & Loop ---
  const render = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // Use ballsRef directly for rendering to avoid React state lag
      const balls = ballsRef.current;

      // Reset transform
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      
      // Calculate Scale
      const scale = Math.min(canvas.width / TABLE_WIDTH, canvas.height / TABLE_HEIGHT);
      const offsetX = (canvas.width - TABLE_WIDTH * scale) / 2;
      const offsetY = (canvas.height - TABLE_HEIGHT * scale) / 2;

      // Draw Table Felt
      ctx.fillStyle = '#15803d'; // Green felt
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Transform for game world
      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);

      // Draw Rails
      ctx.strokeStyle = '#3f2c22'; // Dark wood
      ctx.lineWidth = 20;
      ctx.strokeRect(-10, -10, TABLE_WIDTH + 20, TABLE_HEIGHT + 20);

      // Draw Pockets
      ctx.fillStyle = '#111';
      POCKETS.forEach(p => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, POCKET_RADIUS, 0, Math.PI * 2);
          ctx.fill();
      });

      // Draw Balls
      balls.forEach(b => {
          if (!b.active) return;
          
          ctx.beginPath();
          ctx.arc(b.x, b.y, BALL_RADIUS, 0, Math.PI * 2);
          ctx.fillStyle = BALL_COLORS[b.id];
          ctx.fill();
          
          // Glossy Shine
          ctx.beginPath();
          ctx.arc(b.x - 3, b.y - 3, 3, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,255,255,0.3)';
          ctx.fill();

          // Stripes for striped balls
          if (b.id > 8) {
              ctx.beginPath();
              ctx.arc(b.x, b.y, BALL_RADIUS * 0.7, 0, Math.PI * 2);
              ctx.fillStyle = '#fff';
              ctx.fill();
          }

          // Number Circle (except Cue)
          if (b.id !== 0) {
              ctx.beginPath();
              ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
              ctx.fillStyle = 'rgba(255,255,255,0.8)';
              ctx.fill();
              
              ctx.fillStyle = '#000';
              ctx.font = 'bold 5px Arial';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(b.id.toString(), b.x, b.y);
          }
      });

      // Drag Line
      // We read state for drag because it updates on interaction, not frame
      if (dragStart && currentDrag) {
          const cue = balls.find(b => b.id === 0);
          if (cue && cue.active) {
              ctx.beginPath();
              ctx.moveTo(cue.x, cue.y);
              ctx.lineTo(cue.x + (dragStart.x - currentDrag.x), cue.y + (dragStart.y - currentDrag.y));
              ctx.strokeStyle = `rgba(255, 255, 255, ${0.3 + power/MAX_POWER})`;
              ctx.lineWidth = 3;
              ctx.setLineDash([5, 5]);
              ctx.stroke();
              ctx.setLineDash([]);
          }
      }
      
      // Highlight placing area
      if (placingBall) {
          ctx.strokeStyle = validPlacement ? '#4ade80' : '#ef4444';
          ctx.lineWidth = 2;
          ctx.beginPath();
          const cue = balls.find(b => b.id === 0);
          if (cue) {
             ctx.arc(cue.x, cue.y, BALL_RADIUS + 4, 0, Math.PI * 2);
             ctx.stroke();
          }
      }
  }, [dragStart, currentDrag, placingBall, validPlacement, power]);

  const loop = useCallback(() => {
      updatePhysics();
      render();
      requestRef.current = requestAnimationFrame(loop);
  }, [render]); // Loop depends on render

  // Start/Stop Loop
  useEffect(() => {
      requestRef.current = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(requestRef.current);
  }, [loop]);

  // Input Handling
  const getTablePos = (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const scale = Math.min(canvas.width / TABLE_WIDTH, canvas.height / TABLE_HEIGHT);
      const offsetX = (canvas.width - TABLE_WIDTH * scale) / 2;
      const offsetY = (canvas.height - TABLE_HEIGHT * scale) / 2;

      const rawX = (clientX - rect.left) * scaleX;
      const rawY = (clientY - rect.top) * scaleY;

      return {
          x: (rawX - offsetX) / scale,
          y: (rawY - offsetY) / scale
      };
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
      if (isMoving || gameState !== 'PLAYING') return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const pos = getTablePos(clientX, clientY);

      if (placingBall) {
          // Check placement validity
          let valid = true;
          // Check bounds
          if (pos.x < BALL_RADIUS || pos.x > TABLE_WIDTH - BALL_RADIUS || pos.y < BALL_RADIUS || pos.y > TABLE_HEIGHT - BALL_RADIUS) valid = false;
          // Check overlaps
          const balls = ballsRef.current;
          for (let b of balls) {
              if (b.id !== 0 && b.active) {
                  const dx = b.x - pos.x; const dy = b.y - pos.y;
                  if (dx*dx + dy*dy < (BALL_RADIUS*2)**2) valid = false;
              }
          }
          if (valid) {
              const cue = balls.find(b => b.id === 0);
              if (cue) {
                  cue.x = pos.x; cue.y = pos.y;
                  setPlacingBall(false);
                  playSound.click();
              }
          } else {
              playSound.wrong();
          }
          return;
      }

      setDragStart(pos);
      setCurrentDrag(pos);
      setPower(0);
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (placingBall) {
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        const pos = getTablePos(clientX, clientY);
        const balls = ballsRef.current;
        const cue = balls.find(b => b.id === 0);
        
        let valid = true;
        if (pos.x < BALL_RADIUS || pos.x > TABLE_WIDTH - BALL_RADIUS || pos.y < BALL_RADIUS || pos.y > TABLE_HEIGHT - BALL_RADIUS) valid = false;
        for (let b of balls) {
              if (b.id !== 0 && b.active) {
                  const dx = b.x - pos.x; const dy = b.y - pos.y;
                  if (dx*dx + dy*dy < (BALL_RADIUS*2)**2) valid = false;
              }
        }
        setValidPlacement(valid);
        
        if (cue) {
             cue.x = pos.x; cue.y = pos.y;
        }
        return;
    }
    
    if (!dragStart) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const pos = getTablePos(clientX, clientY);
    setCurrentDrag(pos);
    
    const dx = dragStart.x - pos.x;
    const dy = dragStart.y - pos.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    setPower(Math.min(dist * 0.25, MAX_POWER));
  };

  const handleMouseUp = () => {
    if (placingBall) return;
    if (!dragStart || !currentDrag) return;

    const dx = dragStart.x - currentDrag.x;
    const dy = dragStart.y - currentDrag.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    
    if (dist > 5) { // Minimum pull
        const p = Math.min(dist * 0.25, MAX_POWER);
        const angle = Math.atan2(dy, dx);
        
        const balls = ballsRef.current;
        const cue = balls.find(b => b.id === 0);
        if (cue) {
            cue.vx = Math.cos(angle) * p;
            cue.vy = Math.sin(angle) * p;
            playSound.billiardShot(p);
        }
    }
    
    setDragStart(null);
    setCurrentDrag(null);
    setPower(0);
  };

  // --- High DPI ---
  useEffect(() => {
     const canvas = canvasRef.current;
     const container = containerRef.current;
     if (canvas && container) {
         const dpr = window.devicePixelRatio || 1;
         const rect = container.getBoundingClientRect();
         canvas.width = rect.width * dpr;
         canvas.height = rect.height * dpr;
     }
  }, [windowSize]);

  // UI for Setup
  if (gameState === 'SETUP') {
      return (
        <div className="flex flex-col items-center justify-center h-full max-w-lg mx-auto p-4">
        <div className="bg-slate-900/60 backdrop-blur-xl p-8 rounded-2xl shadow-xl border border-white/5 w-full animate-zoom-in">
          <h2 className="text-3xl font-bold text-center mb-6 text-cyan-400">台球大师 - 赛制设置</h2>
          
          <div className="bg-black/20 p-4 rounded-xl mb-6 border border-white/5">
               <div className="mb-4">
                   <label className="block text-xs text-slate-500 mb-2">选择模式</label>
                   <div className="flex gap-4">
                       <button onClick={() => setMode('8BALL')} className={`flex-1 py-2 rounded-lg border transition-all ${mode === '8BALL' ? 'bg-cyan-600 border-cyan-400 text-white' : 'bg-slate-800 border-slate-600 text-slate-400'}`}>
                           🎱 中式八球
                       </button>
                       <button onClick={() => setMode('9BALL')} className={`flex-1 py-2 rounded-lg border transition-all ${mode === '9BALL' ? 'bg-orange-600 border-orange-400 text-white' : 'bg-slate-800 border-slate-600 text-slate-400'}`}>
                           9️⃣ 九球
                       </button>
                   </div>
               </div>
               
               <div className="mb-4">
                   <label className="block text-xs text-slate-500 mb-1">总局数 (奇数)</label>
                   <div className="flex gap-2">
                       {[1, 3, 5, 7].map(num => (
                           <button 
                            key={num}
                            onClick={() => setMatchConfig({...matchConfig, totalFrames: num})}
                            className={`flex-1 py-1 rounded border ${matchConfig.totalFrames === num ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-slate-800 border-slate-600 text-slate-400'}`}
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

               <div className="pt-2 border-t border-white/5 mt-4">
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">对手 (P2)</span>
                        <span className={`font-bold ${player2 ? 'text-white' : 'text-slate-500'}`}>
                            {player2 ? player2.username : (user.username === '测试玩家' ? '测试路人' : '未登录')}
                        </span>
                    </div>
                </div>
           </div>

          <Button onClick={() => startMatch(mode)} className="w-full py-3 text-lg bg-cyan-600 hover:bg-cyan-500">
              {user.username !== '测试玩家' && !player2 ? '登录 2P 并开始' : '开始比赛'}
          </Button>
        </div>
      </div>
      );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full w-full p-2 overflow-hidden select-none">
       {/* Game Header */}
       <div className="w-full max-w-2xl mb-2 flex justify-between items-end px-2">
          <div className="flex items-center gap-4">
             <div className={`flex flex-col items-center ${turn === 1 ? 'scale-110 opacity-100' : 'opacity-60'}`}>
                 <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 border border-white/20 overflow-hidden mb-1">
                        {user.avatar?.startsWith('data:') ? <img src={user.avatar} className="w-full h-full object-cover"/> : (user.avatar || '👤')}
                    </div>
                    <StreakIndicator streak={user.stats?.[GameType.BILLIARDS]?.streak || 0} className="absolute -top-3 -right-3 scale-50" />
                 </div>
                 <div className="flex items-center gap-1">
                     <span className="text-xs font-bold text-slate-300">P1</span>
                     <span className="text-lg font-black text-white">{matchScore.p1}</span>
                 </div>
                 {mode === '8BALL' && playerGroups[1] && (
                     <span className={`text-[10px] px-1 rounded ${playerGroups[1] === 'SOLIDS' ? 'bg-red-500 text-white' : 'bg-white text-black'}`}>
                         {playerGroups[1] === 'SOLIDS' ? '全色' : '花色'}
                     </span>
                 )}
             </div>
             <div className="text-xs font-bold text-slate-500 pb-2">VS</div>
             <div className={`flex flex-col items-center ${turn === 2 ? 'scale-110 opacity-100' : 'opacity-60'}`}>
                 <div className="w-8 h-8 rounded-full bg-slate-700 border border-white/20 flex items-center justify-center mb-1 overflow-hidden">
                    {player2?.avatar?.startsWith('data:') ? <img src={player2.avatar} className="w-full h-full object-cover"/> : (player2?.avatar || '👤')}
                 </div>
                 <div className="flex items-center gap-1">
                     <span className="text-xs font-bold text-slate-300">P2</span>
                     <span className="text-lg font-black text-white">{matchScore.p2}</span>
                 </div>
                 {mode === '8BALL' && playerGroups[2] && (
                     <span className={`text-[10px] px-1 rounded ${playerGroups[2] === 'SOLIDS' ? 'bg-red-500 text-white' : 'bg-white text-black'}`}>
                         {playerGroups[2] === 'SOLIDS' ? '全色' : '花色'}
                     </span>
                 )}
             </div>
          </div>
          
          <div className="flex flex-col items-end">
             {foulMessage && (
                 <div className="text-red-400 font-bold text-sm animate-bounce mb-1">{foulMessage}</div>
             )}
             {placingBall && (
                 <div className="text-green-400 font-bold text-xs animate-pulse mb-1">自由球：点击放置母球</div>
             )}
             <Button onClick={() => setGameState('SETUP')} variant="secondary" className="text-xs py-1 h-6">结束比赛</Button>
          </div>
       </div>

       {/* Table Container */}
       <div ref={containerRef} className="relative w-full max-w-4xl aspect-[2/1] bg-slate-800 rounded-lg shadow-2xl border-8 border-yellow-900/40">
           <canvas
               ref={canvasRef}
               className="w-full h-full block cursor-crosshair touch-none"
               onMouseDown={handleMouseDown}
               onMouseMove={handleMouseMove}
               onMouseUp={handleMouseUp}
               onTouchStart={handleMouseDown}
               onTouchMove={handleMouseMove}
               onTouchEnd={handleMouseUp}
           />

           {gameState === 'ROUND_OVER' && (
             <div className="absolute inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center text-center p-4 animate-fade-in">
                 <h3 className="text-2xl font-bold text-white mb-2">本局结束</h3>
                 <p className="text-cyan-400 mb-6 font-bold text-lg">{winner === 'P1' ? user.username : (player2?.username || 'P2')} 获胜</p>
                 <Button onClick={initRound} className="bg-cyan-600 hover:bg-cyan-500">下一局</Button>
             </div>
           )}

           {gameState === 'GAMEOVER' && (
             <div className="absolute inset-0 z-50 bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center text-center p-4 animate-zoom-in">
                 <div className="text-6xl mb-4">🏆</div>
                 <h3 className="text-4xl font-bold text-yellow-400 mb-2">MATCH WINNER</h3>
                 <p className="text-white text-2xl font-bold mb-6">
                    {matchWinner === 'P1' ? user.username : (player2?.username || 'P2')}
                 </p>
                 <div className="flex gap-4">
                     <Button onClick={() => setGameState('SETUP')}>返回大厅</Button>
                 </div>
             </div>
           )}
       </div>
    </div>
  );
};