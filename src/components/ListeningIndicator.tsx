import React from 'react';
import { motion } from 'framer-motion';
import { Mic, Check } from 'lucide-react';

interface ListeningIndicatorProps {
  label: string;
  onValidateManual?: () => void;
  validateLabel?: string;
  isListening: boolean;
  isRtl?: boolean;
}

export const ListeningIndicator: React.FC<ListeningIndicatorProps> = ({
  label,
  onValidateManual,
  validateLabel = "J'ai bien répété ! ⭐",
  isListening,
  isRtl = false,
}) => {
  return (
    <div
      className="flex flex-col items-center justify-center space-y-4 my-2 select-none"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Listening Status Badge with Pulsing Waves */}
      <div className="relative flex items-center justify-center">
        {isListening && (
          <>
            <motion.div
              animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'easeOut' }}
              className="absolute w-20 h-20 rounded-full bg-teal-400"
            />
            <motion.div
              animate={{ scale: [1, 1.4], opacity: [0.8, 0] }}
              transition={{ repeat: Infinity, duration: 1.5, delay: 0.3, ease: 'easeOut' }}
              className="absolute w-20 h-20 rounded-full bg-teal-300"
            />
          </>
        )}

        <div className="relative z-10 w-20 h-20 rounded-full bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center text-white shadow-xl ring-4 ring-white">
          <Mic className={`w-9 h-9 ${isListening ? 'animate-pulse' : ''}`} />
        </div>
      </div>

      {/* Spoken prompt text */}
      <motion.p
        animate={{ opacity: [0.85, 1, 0.85] }}
        transition={{ repeat: Infinity, duration: 1.2 }}
        className="text-lg sm:text-xl font-bold text-teal-900 bg-teal-100/80 px-6 py-2 rounded-full border border-teal-200 shadow-sm"
      >
        {label}
      </motion.p>

      {/* Child Manual Validation Big Button (Never locks the child) */}
      {onValidateManual && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onValidateManual}
          className="flex items-center space-x-2 rtl:space-x-reverse px-6 py-3 bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-500 hover:to-orange-500 text-white font-extrabold text-base sm:text-lg rounded-full shadow-lg border-2 border-white transition-transform"
        >
          <Check className="w-5 h-5 stroke-[3]" />
          <span>{validateLabel}</span>
        </motion.button>
      )}
    </div>
  );
};
