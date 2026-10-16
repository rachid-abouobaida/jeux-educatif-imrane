import React, { useState } from 'react';
import { motion, AnimatePresence, TargetAndTransition } from 'framer-motion';
import { LionState } from '../types';
import { Sparkles, Heart, HelpCircle, Volume2, Mic } from 'lucide-react';

interface LionCharacterProps {
  state: LionState;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  speechBubbleText?: string;
  isRtl?: boolean;
}

export const LionCharacter: React.FC<LionCharacterProps> = ({
  state,
  size = 'lg',
  className = '',
  speechBubbleText,
  isRtl = false,
}) => {
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    sm: 'w-28 h-28',
    md: 'w-44 h-44',
    lg: 'w-64 h-64 sm:w-72 sm:h-72',
    xl: 'w-80 h-80 sm:w-96 sm:h-96',
  };

  const imageSrc = `/assets/lion/lion-${state}.png`;

  // Motion variants per state
  const getLionAnimation = (): TargetAndTransition => {
    switch (state) {
      case 'speaking':
        return {
          y: [0, -6, 0, -4, 0],
          scale: [1, 1.025, 1, 1.015, 1],
          transition: { repeat: Infinity, duration: 1.1, ease: 'easeInOut' as const },
        };
      case 'listening':
        return {
          rotate: [0, 6, 4, 6],
          scale: [1, 1.03, 1.02, 1.03],
          y: [0, -3, -3, 0],
          transition: { repeat: Infinity, duration: 2.2, ease: 'easeInOut' as const },
        };
      case 'happy':
        return {
          y: [0, -22, 0, -14, 0],
          rotate: [0, -4, 4, -2, 0],
          scale: [1, 1.08, 1, 1.04, 1],
          transition: { repeat: Infinity, duration: 1.3, ease: 'easeOut' as const },
        };
      case 'encouraging':
        return {
          rotate: [-2, 2, -2],
          y: [0, -4, 0],
          transition: { repeat: Infinity, duration: 2.5, ease: 'easeInOut' as const },
        };
      case 'thinking':
        return {
          rotate: [-5, -2, -5],
          y: [0, -5, 0],
          transition: { repeat: Infinity, duration: 2.2, ease: 'easeInOut' as const },
        };
      case 'idle':
      default:
        return {
          y: [0, -5, 0],
          scale: [1, 1.01, 1],
          transition: { repeat: Infinity, duration: 3.2, ease: 'easeInOut' as const },
        };
    }
  };

  return (
    <div
      className={`relative flex flex-col items-center justify-center select-none ${className}`}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Speech / Feedback Bubble */}
      <AnimatePresence>
        {speechBubbleText && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className={`max-w-xs sm:max-w-md px-5 py-3.5 mb-3 rounded-3xl shadow-xl font-bold text-center border-4 border-amber-200 z-20 ${
              state === 'happy'
                ? 'bg-gradient-to-r from-emerald-50 via-teal-50 to-green-50 text-emerald-900 border-emerald-300'
                : state === 'encouraging'
                ? 'bg-gradient-to-r from-amber-50 to-orange-50 text-amber-950 border-amber-300'
                : state === 'listening'
                ? 'bg-gradient-to-r from-sky-50 to-indigo-50 text-sky-950 border-sky-300'
                : 'bg-white text-slate-800'
            }`}
          >
            <p className="text-base sm:text-lg md:text-xl leading-relaxed font-rounded">
              {speechBubbleText}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lion Container with Floating Badges */}
      <div className="relative">
        {/* State Badges / Floating Micro-effects */}
        <AnimatePresence>
          {state === 'happy' && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [1, 1.3, 1], opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ repeat: Infinity, duration: 1.2 }}
              className="absolute -top-4 -right-2 bg-amber-400 text-white p-2.5 rounded-full shadow-lg z-10"
            >
              <Sparkles className="w-6 h-6 animate-spin text-amber-100" />
            </motion.div>
          )}

          {state === 'encouraging' && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [1, 1.25, 1], y: [0, -6, 0] }}
              exit={{ scale: 0 }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="absolute -top-3 -left-2 bg-rose-400 text-white p-2.5 rounded-full shadow-lg z-10"
            >
              <Heart className="w-6 h-6 fill-rose-100 text-rose-100" />
            </motion.div>
          )}

          {state === 'thinking' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute -top-6 right-2 bg-indigo-500 text-white p-2.5 rounded-full shadow-lg z-10 flex items-center justify-center"
            >
              <HelpCircle className="w-6 h-6 text-indigo-100 animate-pulse" />
            </motion.div>
          )}

          {state === 'speaking' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: [0.7, 1, 0.7], scale: [1, 1.15, 1] }}
              exit={{ opacity: 0 }}
              transition={{ repeat: Infinity, duration: 0.9 }}
              className="absolute top-2 -right-4 bg-teal-500 text-white p-2 rounded-full shadow-md z-10"
            >
              <Volume2 className="w-5 h-5 text-teal-100" />
            </motion.div>
          )}

          {state === 'listening' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: [0.7, 1, 0.7], scale: [1, 1.2, 1] }}
              exit={{ opacity: 0 }}
              transition={{ repeat: Infinity, duration: 0.8 }}
              className="absolute top-2 -left-4 bg-sky-500 text-white p-2.5 rounded-full shadow-lg z-10"
            >
              <Mic className="w-6 h-6 text-sky-100 animate-pulse" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Character Visual */}
        <motion.div
          animate={getLionAnimation()}
          className={`relative ${sizeClasses[size]} flex items-center justify-center filter drop-shadow-xl`}
        >
          {!imageError ? (
            <img
              src={imageSrc}
              alt={`Petit Lion - ${state}`}
              onError={() => setImageError(true)}
              className="w-full h-full object-contain pointer-events-none"
              draggable={false}
            />
          ) : (
            /* Bulletproof SVG Lion Mascot Fallback */
            <svg
              viewBox="0 0 200 240"
              className="w-full h-full"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <radialGradient id="lionBody" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stop-color="#FFB347" />
                  <stop offset="100%" stop-color="#FF8C00" />
                </radialGradient>
                <radialGradient id="lionMane" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stop-color="#D48439" />
                  <stop offset="100%" stop-color="#9C5217" />
                </radialGradient>
              </defs>
              {/* Mane */}
              <circle cx="100" cy="95" r="72" fill="url(#lionMane)" />
              {/* Ears */}
              <circle cx="45" cy="55" r="22" fill="url(#lionBody)" stroke="#9C5217" strokeWidth="4" />
              <circle cx="45" cy="55" r="12" fill="#FFECC7" />
              <circle cx="155" cy="55" r="22" fill="url(#lionBody)" stroke="#9C5217" strokeWidth="4" />
              <circle cx="155" cy="55" r="12" fill="#FFECC7" />
              {/* Head */}
              <circle cx="100" cy="95" r="54" fill="url(#lionBody)" stroke="#9C5217" strokeWidth="4" />
              {/* Eyes */}
              <circle cx="80" cy="85" r="11" fill="#3E2723" />
              <circle cx="120" cy="85" r="11" fill="#3E2723" />
              <circle cx="83" cy="81" r="4" fill="#FFFFFF" />
              <circle cx="123" cy="81" r="4" fill="#FFFFFF" />
              {/* Cheeks */}
              <ellipse cx="68" cy="100" rx="9" ry="6" fill="#FF8A80" opacity="0.6" />
              <ellipse cx="132" cy="100" rx="9" ry="6" fill="#FF8A80" opacity="0.6" />
              {/* Muzzle */}
              <ellipse cx="100" cy="106" rx="26" ry="18" fill="#FFF2DC" />
              <polygon points="100,98 92,106 108,106" fill="#4B2B20" />
              <path d="M94 110 Q100 117 106 110" stroke="#4B2B20" strokeWidth="3" strokeLinecap="round" />
              {/* Body */}
              <path d="M75 140 L70 195 Q70 215 100 215 Q130 215 130 195 L125 140 Z" fill="url(#lionBody)" stroke="#9C5217" strokeWidth="4" />
              <ellipse cx="100" cy="178" rx="20" ry="24" fill="#FFF2DC" />
              {/* Turquoise Scarf */}
              <path d="M68 140 C80 148 120 148 132 140 L128 152 C115 160 85 160 72 152 Z" fill="#2CB1C2" stroke="#00798C" strokeWidth="3" />
              <path d="M112 146 L124 175 L110 176 Z" fill="#2CB1C2" stroke="#00798C" strokeWidth="2.5" />
              <polygon points="100,165 103,172 110,172 105,176 107,183 100,178 93,183 95,176 90,172 97,172" fill="#FFCA3A" />
              {/* Paws */}
              <ellipse cx="78" cy="215" rx="14" ry="10" fill="#FFF2DC" stroke="#9C5217" strokeWidth="3" />
              <ellipse cx="122" cy="215" rx="14" ry="10" fill="#FFF2DC" stroke="#9C5217" strokeWidth="3" />
            </svg>
          )}
        </motion.div>
      </div>
    </div>
  );
};
