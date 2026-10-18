import React from 'react';
import { motion } from 'framer-motion';
import { Mic, Check, Volume2 } from 'lucide-react';

interface ListeningIndicatorProps {
  label: string;
  onValidateManual?: () => void;
  validateLabel?: string;
  isListening: boolean;
  audioLevel?: number;
  isRtl?: boolean;
}

export const ListeningIndicator: React.FC<ListeningIndicatorProps> = ({
  label,
  onValidateManual,
  validateLabel = "J'ai bien répété ! ⭐",
  isListening,
  audioLevel = 0,
  isRtl = false,
}) => {
  const isHearingVoice = isListening && audioLevel > 12;

  return (
    <div
      className="flex flex-col items-center justify-center space-y-4 my-2 select-none"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Listening Status Badge with Pulsing Waves & Dynamic Voice Amplitude */}
      <div className="relative flex items-center justify-center">
        {isListening && (
          <>
            <motion.div
              animate={{
                scale: isHearingVoice ? [1.2, 1.9, 1.3] : [1, 1.8],
                opacity: isHearingVoice ? [0.8, 0.2, 0.7] : [0.6, 0],
              }}
              transition={{ repeat: Infinity, duration: isHearingVoice ? 0.8 : 1.5, ease: 'easeOut' }}
              className={`absolute w-20 h-20 rounded-full ${
                isHearingVoice ? 'bg-emerald-400' : 'bg-teal-400'
              }`}
            />
            <motion.div
              animate={{
                scale: isHearingVoice ? [1.1, 1.5, 1.1] : [1, 1.4],
                opacity: [0.8, 0],
              }}
              transition={{ repeat: Infinity, duration: 1.5, delay: 0.3, ease: 'easeOut' }}
              className="absolute w-20 h-20 rounded-full bg-teal-300"
            />
          </>
        )}

        <div
          className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center text-white shadow-xl ring-4 ring-white transition-colors duration-200 ${
            isHearingVoice
              ? 'bg-gradient-to-tr from-emerald-500 to-lime-400 shadow-emerald-400/60 scale-105'
              : 'bg-gradient-to-tr from-teal-500 to-emerald-400'
          }`}
        >
          <Mic className={`w-9 h-9 ${isListening ? 'animate-pulse' : ''} ${isHearingVoice ? 'text-yellow-200' : ''}`} />
        </div>
      </div>

      {/* Dynamic Sound Wave Visualizer when child is speaking softly or clearly */}
      {isListening && (
        <div className="flex items-center justify-center space-x-1.5 h-6">
          {[0.6, 1.0, 1.4, 1.0, 0.7].map((heightFactor, i) => {
            const barHeight = Math.max(6, Math.min(24, (audioLevel / 100) * 26 * heightFactor));
            return (
              <motion.div
                key={i}
                animate={{ height: `${barHeight}px` }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className={`w-1.5 rounded-full ${
                  isHearingVoice ? 'bg-emerald-500' : 'bg-teal-300/80'
                }`}
              />
            );
          })}
        </div>
      )}

      {/* Spoken prompt text / Live Hearing Feedback */}
      <motion.div
        animate={{ opacity: [0.9, 1, 0.9] }}
        transition={{ repeat: Infinity, duration: 1.2 }}
        className={`flex items-center space-x-2 text-base sm:text-lg font-bold px-5 py-2 rounded-full border shadow-sm transition-colors ${
          isHearingVoice
            ? 'text-emerald-900 bg-emerald-100/90 border-emerald-300'
            : 'text-teal-900 bg-teal-100/80 border-teal-200'
        }`}
      >
        {isHearingVoice && <Volume2 className="w-5 h-5 text-emerald-600 animate-bounce flex-shrink-0" />}
        <span>{isHearingVoice ? 'Je t’entends ! Continue 🦁' : label}</span>
      </motion.div>

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
