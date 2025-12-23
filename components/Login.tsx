
import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/Button';
import { User } from '../types';
import { storage } from '../utils/storage';
import { playSound } from '../utils/sound';

interface Props {
  onLogin: (user: User) => void;
}

const AVATAR_OPTIONS = ['👤', '🦸‍♂️', '🦹‍♀️', '👽', '🤖', '💀', '🤡', '👻', '🐱', '🐶', '🐉', '🦄'];

export const Login: React.FC<Props> = ({ onLogin }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('👤');
  const [error, setError] = useState('');
  const [recentUsers, setRecentUsers] = useState<{username: string, avatar: string}[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const recents = storage.getRecent();
    const users = storage.getUsers();
    const recentData = recents.map(u => ({
        username: u,
        avatar: users[u]?.avatar || '👤'
    })).filter(u => users[u.username]);
    setRecentUsers(recentData);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!username.trim() || (!password.trim() && username !== '测试玩家')) {
      setError('请输入完整的账号信息');
      playSound.wrong();
      return;
    }

    if (isRegister) {
      const res = storage.register(username.trim(), password.trim(), selectedAvatar);
      if (res.success) {
        const loginRes = storage.login(username.trim(), password.trim());
        if (loginRes.user) {
            playSound.win();
            onLogin(loginRes.user);
        }
      } else {
        playSound.wrong();
        setError(res.message);
      }
    } else {
      const res = storage.login(username.trim(), password.trim());
      if (res.success && res.user) {
        playSound.click();
        onLogin(res.user);
      } else {
        playSound.wrong();
        setError(res.message);
      }
    }
  };

  const handleTestLogin = () => {
    const res = storage.login('测试玩家', '');
    if (res.user) {
      playSound.win();
      onLogin(res.user);
    }
  };

  const handleResetTestUser = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (window.confirm("确定要重置测试用户的积分和数据吗？")) {
          const newUser = storage.resetTestUser();
          playSound.click();
          alert("测试用户已重置！");
          onLogin(newUser);
      }
  };

  const handleQuickLogin = (u: string) => {
    const users = storage.getUsers();
    if (users[u]) {
        playSound.click();
        storage.addRecent(u); 
        onLogin({ username: u, totalScore: users[u].score, avatar: users[u].avatar || '👤' });
    } else {
        storage.removeRecent(u);
        setRecentUsers(prev => prev.filter(user => user.username !== u));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        if (file.size > 2 * 1024 * 1024) {
            setError("图片大小不能超过 2MB");
            return;
        }

        const reader = new FileReader();
        reader.onload = (readerEvent) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_SIZE = 150; 
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_SIZE) {
                        height *= MAX_SIZE / width;
                        width = MAX_SIZE;
                    }
                } else {
                    if (height > MAX_SIZE) {
                        width *= MAX_SIZE / height;
                        height = MAX_SIZE;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                setSelectedAvatar(dataUrl);
            };
            img.src = readerEvent.target?.result as string;
        };
        reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 overflow-y-auto">
      {/* Container - Glassmorphism */}
      <div className="max-w-md w-full relative group">
        
        <div className="relative bg-slate-900/60 backdrop-blur-2xl p-6 md:p-8 rounded-3xl shadow-2xl border border-white/5">
            <div className="text-center mb-6 md:mb-8">
            <h1 className="text-4xl md:text-5xl font-black text-white mb-2 tracking-tighter">
                游戏平台
            </h1>
            <p className="text-slate-400 font-medium tracking-widest text-[10px] md:text-xs uppercase">
                {isRegister ? '创建您的身份' : '欢迎回来'}
            </p>
            </div>

            {/* Mode Switcher */}
            <div className="flex bg-black/20 p-1 rounded-xl mb-6 border border-white/5">
            <button
                type="button"
                onClick={() => { setIsRegister(false); setError(''); }}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${!isRegister ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:text-slate-300'}`}
            >
                登录
            </button>
            <button
                type="button"
                onClick={() => { setIsRegister(true); setError(''); }}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${isRegister ? 'bg-pink-600 text-white shadow-lg shadow-pink-500/20' : 'text-slate-500 hover:text-slate-300'}`}
            >
                注册
            </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
            {/* Avatar Selection (Register Only) */}
            {isRegister && (
                <div className="mb-4">
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">选择头像</label>
                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-16 h-16 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center text-3xl overflow-hidden">
                            {selectedAvatar.startsWith('data:') ? (
                                <img src={selectedAvatar} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                selectedAvatar
                            )}
                        </div>
                        <button 
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-lg text-white border border-white/10"
                        >
                            上传图片
                        </button>
                        <input 
                            ref={fileInputRef}
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={handleImageUpload} 
                        />
                    </div>
                    <div className="grid grid-cols-6 gap-2 bg-black/20 p-2 rounded-lg border border-white/5">
                        {AVATAR_OPTIONS.map(avatar => (
                            <button
                                type="button"
                                key={avatar}
                                onClick={() => setSelectedAvatar(avatar)}
                                className={`text-2xl w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded hover:bg-white/10 transition-colors ${selectedAvatar === avatar ? 'bg-white/20 ring-1 ring-white/50' : 'opacity-50 hover:opacity-100'}`}
                            >
                                {avatar}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="space-y-3 md:space-y-4">
                <div className="group/input">
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1 ml-1 group-focus-within/input:text-indigo-400 transition-colors">
                    用户名
                    </label>
                    <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 md:py-3 text-white placeholder-slate-600 focus:outline-none focus:bg-black/40 focus:border-indigo-500/50 transition-all"
                    placeholder="输入您的ID"
                    />
                </div>
                
                <div className="group/input">
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1 ml-1 group-focus-within/input:text-pink-400 transition-colors">
                    密码
                    </label>
                    <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 md:py-3 text-white placeholder-slate-600 focus:outline-none focus:bg-black/40 focus:border-pink-500/50 transition-all"
                    placeholder={isRegister ? "设置安全密码" : "输入密码"}
                    />
                </div>
            </div>

            {error && (
                <div className="text-red-400 text-xs font-bold text-center bg-red-500/10 py-2 rounded-lg border border-red-500/20 animate-pulse">
                ⚠️ {error}
                </div>
            )}

            <Button type="submit" className={`w-full py-3 md:py-4 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-[0.98] ${isRegister ? 'bg-pink-600 hover:bg-pink-500' : 'bg-indigo-600 hover:bg-indigo-500'}`}>
                {isRegister ? '立即开始' : '进入系统'}
            </Button>
            </form>

            <div className="relative my-6 md:my-8">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/5"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase tracking-widest font-bold">
                    <span className="px-2 bg-transparent text-slate-500">快速登录</span>
                </div>
            </div>

            <div className="space-y-4">
                {recentUsers.length > 0 && !isRegister && (
                    <div className="flex justify-center gap-4 py-2 overflow-x-auto scrollbar-hide">
                        {recentUsers.map(u => (
                            <button
                                key={u.username}
                                onClick={() => handleQuickLogin(u.username)}
                                className="flex flex-col items-center gap-2 group transition-transform hover:-translate-y-1 min-w-[60px]"
                                title={`登录 ${u.username}`}
                            >
                                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-slate-800/50 border border-white/10 group-hover:border-indigo-400 group-hover:shadow-[0_0_15px_rgba(99,102,241,0.5)] flex items-center justify-center text-xl md:text-2xl transition-all overflow-hidden backdrop-blur-sm">
                                     {u.avatar.startsWith('data:') ? <img src={u.avatar} className="w-full h-full object-cover"/> : u.avatar}
                                </div>
                                <span className="text-[10px] font-bold text-slate-500 group-hover:text-white max-w-[60px] truncate">{u.username}</span>
                            </button>
                        ))}
                    </div>
                )}

                <div className="flex gap-2">
                    <Button 
                        variant="ghost" 
                        onClick={handleTestLogin}
                        className="flex-1 flex items-center justify-center gap-2 text-slate-500 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/5 py-2"
                    >
                        <span>🧪</span>
                        <span className="text-xs">测试玩家 (免密)</span>
                    </Button>
                     <Button 
                        variant="ghost" 
                        onClick={handleResetTestUser}
                        className="w-10 flex items-center justify-center text-slate-600 hover:text-red-400 hover:bg-red-900/10 border border-transparent py-2"
                        title="重置测试用户"
                    >
                        <span className="text-sm">↻</span>
                    </Button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
