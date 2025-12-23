import React, { useState, useRef } from 'react';
import { User } from '../types';
import { Button } from './ui/Button';
import { storage } from '../utils/storage';
import { playSound } from '../utils/sound';

interface Props {
  user: User;
  onClose: () => void;
  onLogout: () => void;
  onUpdateUser: (user: User) => void;
}

const AVATAR_OPTIONS = [
    '👤', '👦', '👧', '👨', '👩', '👴', '👵',
    '🦸‍♂️', '🦹‍♀️', '🧙‍♂️', '🧚‍♀️', '🧛‍♂️', '🧜‍♀️', '🧝‍♂️', '🧞‍♂️',
    '👽', '🤖', '💀', '🤡', '👻', '👾', '👿',
    '🐱', '🐶', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷',
    '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄',
    '🐲', '🦖', '🐳', '🐬', '🐙', '🦋', '🐝', '🕷️',
    '🌹', '🌻', '🌲', '🌵', '🍄', '🔥', '⚡', '🌈', '⭐', '🌙', '☀️', '🍎', '🍔', '🍕', '⚽', '🏀', '🎮', '🎲'
];

export const ProfileSettings: React.FC<Props> = ({ user, onClose, onLogout, onUpdateUser }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editUsername, setEditUsername] = useState(user.username);
  const [editAvatar, setEditAvatar] = useState(user.avatar || '👤');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 4) {
      setMessage({ text: '密码长度至少为4位', type: 'error' });
      playSound.wrong();
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ text: '两次输入的密码不一致', type: 'error' });
      playSound.wrong();
      return;
    }

    const res = storage.changePassword(user.username, newPassword);
    if (res.success) {
      setMessage({ text: '密码修改成功！', type: 'success' });
      setNewPassword('');
      setConfirmPassword('');
      playSound.win();
    } else {
      setMessage({ text: res.message, type: 'error' });
      playSound.wrong();
    }
  };

  const handleSaveProfile = () => {
      if (!editUsername.trim()) {
          setMessage({ text: '用户名不能为空', type: 'error' });
          return;
      }
      
      const res = storage.updateProfile(user.username, editUsername.trim(), editAvatar);
      
      if (res.success && res.user) {
          setMessage({ text: '个人资料已更新', type: 'success' });
          playSound.win();
          onUpdateUser(res.user);
          setEditMode(false);
      } else {
          setMessage({ text: res.message, type: 'error' });
          playSound.wrong();
      }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        if (file.size > 2 * 1024 * 1024) {
            setMessage({ text: "图片大小不能超过 2MB", type: 'error' });
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
                setEditAvatar(dataUrl);
            };
            img.src = readerEvent.target?.result as string;
        };
        reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 overflow-hidden animate-zoom-in">
      {/* Clean, minimalist background overlay */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose}></div>

      <div className="relative bg-slate-900 rounded-xl shadow-2xl border border-slate-700 w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-slate-800/50 p-6 flex justify-between items-center border-b border-slate-700">
          <h2 className="text-xl font-bold text-white tracking-wide">
              系统设置
          </h2>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-700"
          >
            &times;
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[80vh] scrollbar-hide">
          <div className="mb-8">
               <div className="flex justify-between items-center mb-4">
                   <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                       个人资料
                   </h3>
                   {!editMode ? (
                       <button onClick={() => setEditMode(true)} className="text-xs text-indigo-400 hover:text-white font-bold bg-indigo-500/10 hover:bg-indigo-600 px-3 py-1.5 rounded-lg border border-indigo-500/20 transition-all">
                           编辑
                       </button>
                   ) : (
                       <div className="flex gap-2">
                           <button onClick={() => setEditMode(false)} className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 transition-colors">取消</button>
                           <button onClick={handleSaveProfile} className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-lg transition-all">保存</button>
                       </div>
                   )}
               </div>

               {editMode ? (
                   <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700 space-y-5 animate-slide-up">
                       <div>
                           <label className="block text-xs text-slate-400 mb-1 font-bold">用户名</label>
                           <input 
                                type="text" 
                                value={editUsername}
                                onChange={e => setEditUsername(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-indigo-500 focus:outline-none transition-colors"
                                placeholder="请输入新用户名"
                           />
                       </div>

                       <div>
                           <label className="block text-xs text-slate-400 mb-2 font-bold">头像</label>
                           
                           <div className="flex gap-3 mb-4 items-center">
                                <div className="w-14 h-14 flex-shrink-0 flex items-center justify-center bg-slate-800 rounded-xl text-2xl border border-slate-600 overflow-hidden">
                                    {editAvatar.startsWith('data:') ? <img src={editAvatar} className="w-full h-full object-cover"/> : editAvatar}
                                </div>
                                <div className="flex flex-col gap-2 flex-1">
                                    <input 
                                        type="text" 
                                        value={editAvatar.startsWith('data:') ? 'Image Uploaded' : editAvatar}
                                        onChange={(e) => setEditAvatar(e.target.value.substring(0, 2))} 
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-indigo-500 focus:outline-none"
                                        placeholder="输入 Emoji 或上传..."
                                        disabled={editAvatar.startsWith('data:')}
                                    />
                                     <div className="flex gap-2">
                                        <button 
                                            type="button" 
                                            onClick={() => fileInputRef.current?.click()}
                                            className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg text-white border border-slate-600 transition-all"
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
                                </div>
                           </div>

                           <div className="grid grid-cols-8 gap-1.5 h-32 overflow-y-auto pr-1 scrollbar-hide bg-slate-950 p-2 rounded-lg border border-slate-700">
                               {AVATAR_OPTIONS.map(ava => (
                                   <button 
                                      key={ava} 
                                      onClick={() => setEditAvatar(ava)}
                                      className={`w-8 h-8 flex items-center justify-center rounded-md text-lg hover:bg-white/10 transition-all ${editAvatar === ava ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400'}`}
                                   >
                                       {ava}
                                   </button>
                               ))}
                           </div>
                       </div>
                   </div>
               ) : (
                   <div className="flex items-center gap-4 bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">
                        <div className="w-16 h-16 rounded-xl bg-slate-800 border border-slate-600 flex items-center justify-center text-3xl overflow-hidden">
                          {user.avatar?.startsWith('data:') ? <img src={user.avatar} className="w-full h-full object-cover"/> : (user.avatar || '👤')}
                        </div>
                        <div>
                        <h3 className="text-xl font-bold text-white">{user.username}</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded border border-slate-600 font-mono">
                                PTS: {user.totalScore}
                            </span>
                        </div>
                        </div>
                    </div>
               )}
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4 mb-8 pt-6 border-t border-slate-700">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
               安全设置
            </h3>
            
            <div className="space-y-3">
              <input
                type="password"
                placeholder="新密码"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-all text-sm"
              />
              <input
                type="password"
                placeholder="确认新密码"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-all text-sm"
              />
            </div>

            {message && (
              <div className={`text-xs px-3 py-2 rounded border flex items-center gap-2 ${
                message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
              }`}>
                <span>{message.type === 'success' ? '✓' : '⚠'}</span>
                {message.text}
              </div>
            )}

            <Button type="submit" className="w-full py-2.5 bg-slate-700 hover:bg-slate-600 transition-colors text-sm shadow-none">
              修改密码
            </Button>
          </form>

          <div className="pt-4 border-t border-slate-700">
            <Button 
              variant="danger" 
              onClick={() => {
                playSound.click();
                onLogout();
                onClose();
              }} 
              className="w-full border border-red-900/30 bg-red-900/20 text-red-400 hover:bg-red-600 hover:text-white transition-all shadow-none"
            >
              退出登录
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};