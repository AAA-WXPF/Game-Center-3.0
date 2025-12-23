
export interface RankInfo {
    title: string;
    color: string;
    bg: string; // Tailwind background class
    border: string; // Tailwind border class
    shadow: string; // Tailwind shadow class
    icon: string;
    min: number;
    max: number; // Next tier threshold
}

export const RANKS: RankInfo[] = [
    { title: '青铜', color: 'text-orange-500', bg: 'bg-orange-500', border: 'border-orange-500', shadow: 'shadow-orange-500/20', icon: '🥉', min: 0, max: 500 },
    { title: '白银', color: 'text-slate-300', bg: 'bg-slate-300', border: 'border-slate-300', shadow: 'shadow-slate-300/20', icon: '🥈', min: 500, max: 1500 },
    { title: '黄金', color: 'text-yellow-400', bg: 'bg-yellow-400', border: 'border-yellow-400', shadow: 'shadow-yellow-400/20', icon: '🥇', min: 1500, max: 3000 },
    { title: '钻石', color: 'text-cyan-400', bg: 'bg-cyan-400', border: 'border-cyan-400', shadow: 'shadow-cyan-400/40', icon: '💎', min: 3000, max: 100000 }
];

export const getRank = (score: number): RankInfo => {
    return RANKS.find(r => score < r.max) || RANKS[RANKS.length - 1];
};
