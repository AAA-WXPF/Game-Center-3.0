import React from 'react';
import { playSound } from '../../utils/sound';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  className = '', 
  onClick,
  ...props 
}) => {
  const baseStyles = "px-4 py-2 rounded-lg font-bold transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-indigo-600 hover:bg-indigo-500 text-white focus:ring-indigo-500 shadow-lg shadow-indigo-500/30",
    secondary: "bg-slate-700 hover:bg-slate-600 text-white focus:ring-slate-500",
    danger: "bg-red-600 hover:bg-red-500 text-white focus:ring-red-500 shadow-lg shadow-red-500/30",
    ghost: "bg-transparent hover:bg-slate-800 text-slate-300 hover:text-white"
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    playSound.click();
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`} 
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  );
};