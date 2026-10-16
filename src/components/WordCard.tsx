import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Word, AppLanguage } from '../types';
import { Volume2, Sparkles } from 'lucide-react';
import { translations } from '../i18n/translations';

interface WordCardProps {
  word: Word;
  lang: AppLanguage;
  onPlayAudio: () => void;
  isPlaying?: boolean;
  isRtl?: boolean;
}

export const WordCard: React.FC<WordCardProps> = ({
  word,
  lang,
  onPlayAudio,
  isPlaying = false,
  isRtl = false,
}) => {
  const [imgError, setImgError] = useState(false);

  const wordText = word.translations[lang];
  const phonetic = word.phonetic?.[lang];
  const categoryLabel =
    translations[lang]?.categories?.[word.category as keyof (typeof translations)['fr']['categories']] ||
    word.category;

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      className="relative flex flex-col items-center bg-white/95 backdrop-blur-md rounded-[2.5rem] p-4 sm:p-6 lg:p-7 shadow-2xl border-4 border-amber-300 hover:border-amber-400 transition-colors w-full max-w-md sm:max-w-lg lg:max-w-xl mx-auto select-none"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Top Bar: Category badge & Audio trigger button */}
      <div className="w-full flex items-center justify-between px-2 mb-2">
        <div className="flex items-center space-x-1.5 rtl:space-x-reverse px-3.5 py-1.5 bg-gradient-to-r from-amber-100 to-orange-100 border border-amber-300/80 text-amber-900 rounded-full text-xs sm:text-sm font-extrabold shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
          <span>{categoryLabel}</span>
        </div>

        {/* Audio Quick Trigger Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.92 }}
          onClick={onPlayAudio}
          aria-label="Écouter le mot"
          className={`p-2.5 sm:p-3 rounded-full shadow-md transition-all cursor-pointer flex items-center justify-center ${
            isPlaying
              ? 'bg-amber-500 text-white scale-110 ring-4 ring-amber-200 shadow-amber-300/60 animate-pulse'
              : 'bg-amber-100 hover:bg-amber-200 text-amber-800'
          }`}
        >
          <Volume2 className="w-5 h-5 sm:w-6 sm:h-6" />
        </motion.button>
      </div>

      {/* Word Large Illustration Container (Fixed Aspect Ratio Box - Strict Stability) */}
      <motion.div
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={onPlayAudio}
        className="w-60 h-60 sm:w-72 sm:h-72 lg:w-80 lg:h-80 p-4 sm:p-6 flex items-center justify-center cursor-pointer bg-gradient-to-b from-amber-50/90 via-orange-50/40 to-yellow-50/30 rounded-3xl shadow-inner border-2 border-amber-200/80 relative overflow-hidden group"
      >
        {/* Playful shine backdrop */}
        <div className="absolute inset-0 bg-radial from-white/40 via-transparent to-transparent pointer-events-none" />

        {!imgError ? (
          <img
            key={word.id + '-' + lang}
            src={word.image}
            alt={wordText}
            onError={() => setImgError(true)}
            className="w-full h-full object-contain filter drop-shadow-xl select-none transition-transform duration-200 group-hover:scale-105"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-amber-100/60 rounded-3xl text-amber-700">
            <span className="text-7xl mb-2">⭐</span>
            <span className="text-3xl font-bold">{wordText}</span>
          </div>
        )}
      </motion.div>

      {/* Target Word Hero Display (Strict Fixed Height Box - Prevents Any Layout Shift) */}
      <div className="w-full h-[104px] sm:h-[116px] flex flex-col items-center justify-center mt-3 px-5 py-2 bg-gradient-to-r from-amber-50/80 via-orange-50/90 to-amber-50/80 rounded-2xl border-2 border-amber-200/90 shadow-sm">
        <motion.h2
          animate={
            isPlaying
              ? { scale: [1, 1.08, 1.04], color: '#ea580c' }
              : { scale: 1, color: '#0f172a' }
          }
          transition={{ duration: 0.5 }}
          className="text-4xl sm:text-5xl lg:text-6xl font-black font-rounded tracking-wide text-center drop-shadow-sm leading-tight"
        >
          {wordText}
        </motion.h2>

        {/* Phonetic transcription for parents / learning aid (Fixed line height container) */}
        <div className="h-6 flex items-center justify-center mt-0.5">
          {phonetic ? (
            <p className="text-sm sm:text-base text-slate-500 font-bold tracking-wider font-mono">
              [{phonetic}]
            </p>
          ) : (
            <span className="text-xs text-amber-500 font-extrabold tracking-widest">✨ PETIT LION ✨</span>
          )}
        </div>
      </div>
    </motion.div>
  );
};
