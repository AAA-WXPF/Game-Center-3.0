
import { User, GameType, GameStats, GameHistoryItem, MatchDetails, Achievement } from '../types';
import { checkAchievements } from './achievements';

const USERS_KEY = 'game_platform_users';
const RECENT_KEY = 'game_platform_recent';

interface StoredUser {
  password?: string;
  score: number;
  avatar?: string;
  stats?: Record<string, GameStats>;
  history?: GameHistoryItem[];
  achievements?: string[];
}

// 初始化测试数据
const initStorage = () => {
  if (!localStorage.getItem(USERS_KEY)) {
    createTestUser();
  }
};

const createTestUser = () => {
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
    users['测试玩家'] = { 
        password: '', 
        score: 1000, 
        avatar: '🧪',
        stats: {},
        history: [],
        achievements: []
    };
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    return users['测试玩家'];
};

initStorage();

export const storage = {
  // 重置测试用户
  resetTestUser: (): User => {
      const u = createTestUser();
      return {
          username: '测试玩家',
          totalScore: u.score,
          avatar: u.avatar,
          stats: u.stats,
          history: u.history,
          achievements: u.achievements
      };
  },

  // 获取所有用户数据
  getUsers: (): Record<string, StoredUser> => {
    try {
      return JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
    } catch {
      return {};
    }
  },

  // 注册新用户
  register: (username: string, password: string, avatar: string = '👤'): { success: boolean; message: string } => {
    const users = storage.getUsers();
    if (users[username]) {
      return { success: false, message: '用户名已存在' };
    }
    users[username] = { password, score: 0, avatar, stats: {}, history: [], achievements: [] };
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    return { success: true, message: '注册成功' };
  },

  // 验证登录
  login: (username: string, password: string): { success: boolean; message: string; user?: User } => {
    const users = storage.getUsers();
    const user = users[username];
    
    if (!user) {
      return { success: false, message: '用户不存在' };
    }

    // 测试玩家无需密码，或者密码匹配
    if (username === '测试玩家' || user.password === password) {
      storage.addRecent(username);
      return { 
        success: true, 
        message: '登录成功', 
        user: { 
            username, 
            totalScore: user.score, 
            avatar: user.avatar || '👤',
            stats: user.stats || {},
            history: user.history || [],
            achievements: user.achievements || []
        } 
      };
    }

    return { success: false, message: '密码错误' };
  },

  // 修改密码
  changePassword: (username: string, newPassword: string): { success: boolean; message: string } => {
    const users = storage.getUsers();
    if (!users[username]) {
      return { success: false, message: '用户不存在' };
    }
    users[username].password = newPassword;
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    return { success: true, message: '密码修改成功' };
  },

  // 更新个人资料 (用户名/头像)
  updateProfile: (currentUsername: string, newUsername: string, newAvatar: string): { success: boolean; message: string; user?: User } => {
    const users = storage.getUsers();
    const currentUserData = users[currentUsername];

    if (!currentUserData) {
        return { success: false, message: '用户数据错误' };
    }

    // 如果只改头像
    if (currentUsername === newUsername) {
        users[currentUsername].avatar = newAvatar;
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
        return { 
            success: true, 
            message: '头像更新成功', 
            user: { 
              username: currentUsername, 
              totalScore: currentUserData.score, 
              avatar: newAvatar, 
              stats: currentUserData.stats,
              history: currentUserData.history || [],
              achievements: currentUserData.achievements || []
            } 
        };
    }

    // 如果改用户名，需要检查新用户名是否存在
    if (users[newUsername]) {
        return { success: false, message: '该用户名已被占用' };
    }

    // 迁移数据
    users[newUsername] = {
        ...currentUserData,
        avatar: newAvatar
    };
    delete users[currentUsername];
    localStorage.setItem(USERS_KEY, JSON.stringify(users));

    // 更新最近登录列表
    const recent = storage.getRecent().map(u => u === currentUsername ? newUsername : u);
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent));

    return { 
        success: true, 
        message: '资料更新成功', 
        user: { 
          username: newUsername, 
          totalScore: users[newUsername].score, 
          avatar: newAvatar, 
          stats: users[newUsername].stats,
          history: users[newUsername].history || [],
          achievements: users[newUsername].achievements || []
        } 
    };
  },

  // 更新游戏统计数据 (通用)
  updateGameStats: (username: string, gameType: GameType, isWin: boolean, points: number, details?: MatchDetails): { user: User, newAchievements: Achievement[] } | null => {
      const users = storage.getUsers();
      const userStore = users[username];
      
      if (!userStore) return null;

      // Update Total Score
      userStore.score = Math.max(0, userStore.score + points);

      // Initialize stats if missing
      if (!userStore.stats) userStore.stats = {};
      if (!userStore.stats[gameType]) {
          userStore.stats[gameType] = { played: 0, wins: 0, streak: 0, maxStreak: 0 };
      }

      const stats = userStore.stats[gameType];
      
      // Update Stats
      stats.played += 1;
      if (isWin) {
          stats.wins += 1;
          stats.streak += 1;
          stats.maxStreak = Math.max(stats.streak, stats.maxStreak);
      } else {
          // Only reset streak on explicit loss. 
          stats.streak = 0;
      }

      // Update History
      if (!userStore.history) userStore.history = [];
      userStore.history.unshift({
        gameType,
        points,
        result: isWin ? 'WIN' : 'LOSS',
        timestamp: Date.now(),
        details
      });
      if (userStore.history.length > 50) userStore.history.pop();

      // Check Achievements
      if (!userStore.achievements) userStore.achievements = [];
      const tempUserObj: User = {
          username,
          totalScore: userStore.score,
          avatar: userStore.avatar,
          stats: userStore.stats,
          achievements: userStore.achievements
      };
      
      const unlocked = checkAchievements(tempUserObj, gameType, isWin);
      
      if (unlocked.length > 0) {
          unlocked.forEach(a => {
              if (!userStore.achievements?.includes(a.id)) {
                  userStore.achievements?.push(a.id);
              }
          });
      }

      localStorage.setItem(USERS_KEY, JSON.stringify(users));

      return {
          user: {
            username,
            totalScore: userStore.score,
            avatar: userStore.avatar || '👤',
            stats: userStore.stats,
            history: userStore.history,
            achievements: userStore.achievements
          },
          newAchievements: unlocked
      };
  },

  // 获取最近登录用户列表
  getRecent: (): string[] => {
    try {
      return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    } catch {
      return [];
    }
  },

  // 添加最近登录用户
  addRecent: (username: string) => {
    const recent = storage.getRecent().filter(u => u !== username);
    recent.unshift(username);
    // 只保留最近3个
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, 3)));
  },
  
  // 移除最近登录记录
  removeRecent: (username: string) => {
     const recent = storage.getRecent().filter(u => u !== username);
     localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
  }
};
