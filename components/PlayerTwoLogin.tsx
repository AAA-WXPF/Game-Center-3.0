import React, { useState } from 'react';
import { Button } from './ui/Button';
import { storage } from '../utils/storage';
import { playSound } from '../utils/sound';
import { User } from '../types';

interface Props {
  onLogin: (user: User) => void;
  onCancel: () => void;
}

export const PlayerTwoLogin: React.FC<Props> = ({ onLogin, onCancel }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const res = storage.login(username.trim(), password.trim());
    if (res.success && res.user) {
      playSound.win();
      onLogin(res.user);
    } else {
      playSound.wrong();
      setError(res.message);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-zoom-in">
      <div className="bg-slate-900 border border-white/10 p-8 rounded-2xl w-full max-w-sm shadow-2xl relative">
        <button 
            onClick={onCancel}
            className="absolute top-4 right-4 text-slate-500 hover:text-white"
        >
            ✕
        </button>
        
        <h2 className="text-2xl font-bold text-center text-white mb-6">
            <span className="text-pink-500">2P</span> 玩家登录
        </h2>
        
        <p className="text-xs text-slate-400 text-center mb-6">
            双人对战模式需要验证对手身份<br/>请输入已注册的账户信息
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">用户名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-pink-500 focus:outline-none transition-colors"
              placeholder="输入 2P 用户名"
              autoFocus
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-pink-500 focus:outline-none transition-colors"
              placeholder="输入密码"
            />
          </div>

          {error && (
            <div className="text-red-400 text-xs text-center bg-red-500/10 py-2 rounded">
              ⚠️ {error}
            </div>
          )}

          <Button type="submit" className="w-full bg-pink-600 hover:bg-pink-500 shadow-lg shadow-pink-500/20">
            加入对战
          </Button>
        </form>
      </div>
    </div>
  );
};