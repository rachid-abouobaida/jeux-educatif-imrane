import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

interface RewardAnimationProps {
  onComplete?: () => void;
  message?: string;
  isRtl?: boolean;
}

export const RewardAnimation: React.FC<RewardAnimationProps> = ({
  onComplete,
  message,
  isRtl = false,
}) => {
  useEffect(() => {
    // Fire gentle pastel confetti
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.65 },
        colors: ['#FFAF40', '#2EC4B6', '#FFD166', '#06D6A0', '#FF6B6B'],
      });
    } catch {
      // ignore
    }

    const timer = setTimeout(() => {
      onComplete?.();
    }, 2200);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      className="fixed inset-0 pointer-events-none z-50 flex flex-col items-center justify-center p-4"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <motion.div
        initial={{ scale: 0, rotate: -25 }}
        animate={{ scale: [1, 1.25, 1], rotate: [0, 10, -10, 0] }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="relative flex items-center justify-center"
      >
        <Star className="w-28 h-28 sm:w-36 sm:h-36 fill-amber-400 text-amber-500 filter drop-shadow-2xl animate-spin-slow" />
        <span className="absolute text-4xl sm:text-5xl font-black text-amber-900">+1</span>
      </motion.div>

      {message && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 px-6 py-3 bg-white/95 backdrop-blur-md rounded-full shadow-2xl border-4 border-amber-300 text-amber-900 font-extrabold text-xl sm:text-2xl"
        >
          {message}
        </motion.div>
      )}
    </div>
  );
};
