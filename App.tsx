
import React, { useState, useMemo, useEffect } from 'react';
import { GameType, User, MatchDetails, Achievement } from './types';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { GuessNumber } from './components/games/GuessNumber';
import { RockPaperScissors } from './components/games/RockPaperScissors';
import { Chess } from './components/games/Chess';
import { Xiangqi } from './components/games/Xiangqi';
import { Billiards } from './components/games/Billiards';
import { Snake } from './components/games/Snake';
import { Button } from './components/ui/Button';
import { storage } from './utils/storage';
import { ProfileSettings } from './components/ProfileSettings';
import { Profile } from './components/Profile';
import { Ranking } from './components/Ranking';
import { MusicPlayer } from './components/ui/MusicPlayer';
import { PlayerTwoLogin } from './components/PlayerTwoLogin';
import { AchievementToast } from './components/ui/AchievementToast';

enum AppView {
  DASHBOARD = 'DASHBOARD',
  GAME = 'GAME',
  PROFILE = 'PROFILE',
  RANKING = 'RANKING'
}

// Placeholder URLs for royalty-free/public domain music
const MUSIC_TRACKS = {
  LOBBY: 'https://cdn.pixabay.com/download/audio/2022/03/24/audio_1082c5b96b.mp3?filename=lofi-study-112191.mp3', // Chill Lofi
  GAME_FOCUS: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-beat-140866.mp3', // Focus Beat
  GAME_ACTION: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=the-jazz-piano-126835.mp3', // Upbeat Jazz
  GAME_RETRO: 'https://cdn.pixabay.com/download/audio/2022/01/21/audio_31743c58bd.mp3?filename=retro-game-music-2439.mp3' // Retro style
};

const SESSION_KEY = 'game_platform_last_session';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeGame, setActiveGame] = useState<GameType>(GameType.NONE);
  const [view, setView] = useState<AppView>(AppView.DASHBOARD);
  const [showSettings, setShowSettings] = useState(false);
  
  // Player 2 State for PVP
  const [player2, setPlayer2] = useState<User | null>(null);
  const [showP2Login, setShowP2Login] = useState(false);

  // Achievement State
  const [unlockedAchievement, setUnlockedAchievement] = useState<Achievement | null>(null);
  const [achievementQueue, setAchievementQueue] = useState<Achievement[]>([]);

  // Auto-login effect
  useEffect(() => {
    const lastUsername = localStorage.getItem(SESSION_KEY);
    if (lastUsername) {
      const users = storage.getUsers();
      const userData = users[lastUsername];
      if (userData) {
        setUser({
          username: lastUsername,
          totalScore: userData.score,
          avatar: userData.avatar || '👤',
          stats: userData.stats || {},
          history: userData.history || [],
          achievements: userData.achievements || []
        });
        setView(AppView.DASHBOARD);
      }
    }
  }, []);

  // Achievement Queue Processing
  useEffect(() => {
    if (!unlockedAchievement && achievementQueue.length > 0) {
      const next = achievementQueue[0];
      setUnlockedAchievement(next);
      setAchievementQueue(prev => prev.slice(1));
    }
  }, [unlockedAchievement, achievementQueue]);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    localStorage.setItem(SESSION_KEY, loggedInUser.username);
    setView(AppView.DASHBOARD);
  };

  const handleGameResult = (points: number, isWin?: boolean, details?: MatchDetails) => {
    if (user && isWin !== undefined && activeGame !== GameType.NONE) {
      const result = storage.updateGameStats(user.username, activeGame, isWin, points, details);

      if (result) {
          setUser(result.user);
          if (result.newAchievements.length > 0) {
              setAchievementQueue(prev => [...prev, ...result.newAchievements]);
          }
      }
    }
  };

  const handleLogout = () => {
    setUser(null);
    setPlayer2(null);
    localStorage.removeItem(SESSION_KEY);
    setActiveGame(GameType.NONE);
    setView(AppView.DASHBOARD);
    setShowSettings(false);
  };

  const handleSelectGame = (game: GameType) => {
      setActiveGame(game);
      setPlayer2(null); // Reset player 2 when switching games
      setView(AppView.GAME);
  };

  const handleGoToProfile = () => {
      setView(AppView.PROFILE);
  };

  const handleGoToRanking = () => {
      setView(AppView.RANKING);
  };

  const handleBackToDashboard = () => {
      setActiveGame(GameType.NONE);
      setPlayer2(null);
      setView(AppView.DASHBOARD);
  };
  
  const handleUpdateUser = (updatedUser: User) => {
      setUser(updatedUser);
      // Update session if username changed
      localStorage.setItem(SESSION_KEY, updatedUser.username);
  };

  const handleP2Login = (p2User: User) => {
      setPlayer2(p2User);
      setShowP2Login(false);
  };

  const currentMusicTrack = useMemo(() => {
    if (!user) return ''; 
    if (view === AppView.DASHBOARD || view === AppView.PROFILE || view === AppView.RANKING) return MUSIC_TRACKS.LOBBY;
    
    switch (activeGame) {
      case GameType.BILLIARDS:
      case GameType.RPS:
        return MUSIC_TRACKS.GAME_ACTION;
      case GameType.SNAKE:
        return MUSIC_TRACKS.GAME_RETRO;
      case GameType.CHESS:
      case GameType.XIANGQI:
      case GameType.GUESS_NUMBER:
        return MUSIC_TRACKS.GAME_FOCUS;
      default:
        return MUSIC_TRACKS.LOBBY;
    }
  }, [user, view, activeGame]);

  const renderGame = () => {
    if (!user) return null;
    const commonProps = {
        user: user,
        onGameEnd: handleGameResult,
        player2: player2,
        onOpenP2Login: () => setShowP2Login(true)
    };

    switch (activeGame) {
      case GameType.GUESS_NUMBER:
        return <GuessNumber {...commonProps} />;
      case GameType.RPS:
        return <RockPaperScissors {...commonProps} />;
      case GameType.CHESS:
        return <Chess {...commonProps} />;
      case GameType.XIANGQI:
        return <Xiangqi {...commonProps} />;
      case GameType.BILLIARDS:
        return <Billiards {...commonProps} />;
      case GameType.SNAKE:
        return <Snake {...commonProps} />;
      default:
        return null;
    }
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex flex-col h-screen bg-transparent text-slate-100 font-sans">
      {/* Global Music Player */}
      <MusicPlayer currentTrack={currentMusicTrack} />

      {/* Achievement Toast */}
      {unlockedAchievement && (
          <AchievementToast 
            achievement={unlockedAchievement} 
            onComplete={() => setUnlockedAchievement(null)} 
          />
      )}

      {/* Header */}
      <header className={`bg-slate-950/50 backdrop-blur-md border-b border-white/5 px-4 md:px-6 py-2 md:py-4 flex items-center justify-between shadow-sm z-20 transition-all ${view === AppView.GAME ? 'h-12 md:h-16' : 'h-16'}`}>
        <div 
            className="flex items-center gap-2 md:gap-4 cursor-pointer hover:bg-white/5 p-1 md:p-2 -ml-2 rounded-xl transition-all group"
            onClick={handleGoToProfile}
            title="查看个人档案"
        >
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center font-bold text-base md:text-xl cursor-pointer select-none shadow-sm group-hover:scale-110 transition-transform overflow-hidden">
             {user.avatar?.startsWith('data:') ? <img src={user.avatar} className="w-full h-full object-cover"/> : (user.avatar || user.username.charAt(0).toUpperCase())}
          </div>
          <div className="flex flex-col justify-center">
            <h1 className="font-bold text-sm md:text-lg leading-tight text-white group-hover:text-indigo-400 transition-colors max-w-[100px] md:max-w-none truncate">{user.username}</h1>
            <p className="hidden md:block text-xs text-slate-400 font-mono">LV.{(Math.floor(user.totalScore / 1000) + 1)} | PTS: {user.totalScore}</p>
          </div>
        </div>

        <div className="flex gap-2 md:gap-3">
            {(view === AppView.GAME || view === AppView.PROFILE || view === AppView.RANKING) && (
            <Button variant="ghost" onClick={handleBackToDashboard} className="text-slate-300 hover:text-white hover:bg-white/10 text-xs md:text-sm px-2 md:px-4">
                <span className="md:hidden">←</span>
                <span className="hidden md:inline">← 大厅</span>
            </Button>
            )}
            
            <Button 
                variant="ghost" 
                onClick={() => setShowSettings(true)} 
                className="text-slate-400 hover:text-white hover:bg-white/10 px-2"
            >
                ⚙️
            </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative">
        {view === AppView.PROFILE ? (
            <Profile 
                user={user} 
                onLogout={handleLogout} 
                onClose={handleBackToDashboard} 
                onUpdateUser={handleUpdateUser}
            />
        ) : view === AppView.RANKING ? (
            <Ranking currentUser={user} onClose={handleBackToDashboard} />
        ) : view === AppView.DASHBOARD ? (
          <div key="dashboard" className="h-full w-full animate-slide-up">
            <Dashboard 
                onSelectGame={handleSelectGame} 
                userScore={user.totalScore} 
                onShowRanking={handleGoToRanking}
            />
          </div>
        ) : (
          <div key="game" className="h-full w-full animate-zoom-in">
             {renderGame()}
          </div>
        )}
      </main>

      {/* Settings Modal (Overlay) */}
      {showSettings && (
        <ProfileSettings 
            user={user} 
            onClose={() => setShowSettings(false)} 
            onLogout={handleLogout} 
            onUpdateUser={handleUpdateUser}
        />
      )}

      {/* Player 2 Login Modal */}
      {showP2Login && (
          <PlayerTwoLogin 
            onLogin={handleP2Login} 
            onCancel={() => setShowP2Login(false)} 
          />
      )}
    </div>
  );
};

export default App;
