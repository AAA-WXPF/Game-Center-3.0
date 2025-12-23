

export enum GameType {
  NONE = 'NONE',
  GUESS_NUMBER = 'GUESS_NUMBER',
  RPS = 'RPS',
  CHESS = 'CHESS',
  XIANGQI = 'XIANGQI',
  BILLIARDS = 'BILLIARDS',
  SNAKE = 'SNAKE'
}

export interface GameStats {
  played: number;
  wins: number;
  streak: number;
  maxStreak: number;
}

export interface MatchDetails {
  opponent: string;
  opponentAvatar?: string;
  score: string; // e.g., "3-1", "Win", "100pts"
  matchTags?: string[]; // e.g., ["BO3", "Ranked"]
}

export interface GameHistoryItem {
  gameType: GameType;
  points: number;
  result: 'WIN' | 'LOSS' | 'DRAW';
  timestamp: number;
  details?: MatchDetails;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface User {
  username: string;
  totalScore: number;
  avatar?: string; // Emoji or Base64 Image
  stats?: Record<string, GameStats>; // Keyed by GameType
  history?: GameHistoryItem[];
  achievements?: string[]; // List of unlocked Achievement IDs
}

export interface ChessPiece {
  type: string;
  color: 'white' | 'black' | 'red'; // Chess uses black/white, Xiangqi uses red/black
  label: string;
}
