import React from 'react';
import { motion } from 'framer-motion';
import { playPopSound } from '../services/audioService';

interface BigActionButtonProps {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'purple';
  size?: 'md' | 'lg' | 'xl';
  disabled?: boolean;
  className?: string;
  isRtl?: boolean;
}

export const BigActionButton: React.FC<BigActionButtonProps> = ({
  label,
  icon,
  onClick,
  variant = 'primary',
  size = 'lg',
  disabled = false,
  className = '',
  isRtl = false,
}) => {
  const handleClick = () => {
    if (disabled) return;
    playPopSound(0.5);
    onClick();
  };

  const variantStyles = {
    primary:
      'bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 text-white shadow-amber-300/50 hover:from-amber-500 hover:to-orange-500 ring-amber-200',
    secondary:
      'bg-gradient-to-r from-sky-400 to-blue-500 text-white shadow-sky-300/50 hover:from-sky-500 hover:to-blue-600 ring-sky-200',
    success:
      'bg-gradient-to-r from-emerald-400 to-teal-500 text-white shadow-emerald-300/50 hover:from-emerald-500 hover:to-teal-600 ring-emerald-200',
    warning:
      'bg-gradient-to-r from-rose-400 to-pink-500 text-white shadow-rose-300/50 hover:from-rose-500 hover:to-pink-600 ring-rose-200',
    purple:
      'bg-gradient-to-r from-purple-400 to-indigo-500 text-white shadow-purple-300/50 hover:from-purple-500 hover:to-indigo-600 ring-purple-200',
  };

  const sizeStyles = {
    md: 'px-6 py-3 text-base sm:text-lg rounded-2xl',
    lg: 'px-8 py-4 text-lg sm:text-xl md:text-2xl rounded-3xl',
    xl: 'px-10 py-5 text-xl sm:text-2xl md:text-3xl rounded-3xl',
  };

  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.04, y: disabled ? 0 : -2 }}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      onClick={handleClick}
      disabled={disabled}
      dir={isRtl ? 'rtl' : 'ltr'}
      className={`relative inline-flex items-center justify-center space-x-3 rtl:space-x-reverse font-black shadow-xl ring-4 transition-all select-none border-2 border-white/60 ${
        variantStyles[variant]
      } ${sizeStyles[size]} ${
        disabled ? 'opacity-50 cursor-not-allowed filter grayscale' : 'cursor-pointer'
      } ${className}`}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span className="tracking-wide font-rounded">{label}</span>
    </motion.button>
  );
};
