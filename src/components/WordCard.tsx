import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Word, AppLanguage } from '../types';
import { Volume2 } from 'lucide-react';

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

  return (
    <motion.div
      initial={{ scale: 0.92, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className="relative flex flex-col items-center bg-white/90 backdrop-blur-md rounded-3xl p-5 sm:p-7 shadow-2xl border-4 border-amber-200/80 hover:border-amber-300 transition-colors w-full max-w-sm sm:max-w-md"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Category Tag */}
      <div className="absolute top-3.5 left-4 px-3 py-1 bg-amber-100 text-amber-900 rounded-full text-xs sm:text-sm font-bold tracking-wide">
        {word.category}
      </div>

      {/* Audio Quick Trigger Icon */}
      <button
        onClick={onPlayAudio}
        aria-label="Écouter le mot"
        className={`absolute top-3.5 right-4 p-2.5 rounded-full shadow-md transition-all ${
          isPlaying
            ? 'bg-amber-500 text-white scale-110 ring-4 ring-amber-200 animate-pulse'
            : 'bg-amber-100 hover:bg-amber-200 text-amber-800'
        }`}
      >
        <Volume2 className="w-5 h-5" />
      </button>

      {/* Word Large Illustration */}
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.96 }}
        onClick={onPlayAudio}
        className="w-44 h-44 sm:w-52 sm:h-52 my-3 p-3 flex items-center justify-center cursor-pointer bg-gradient-to-b from-amber-50/50 to-orange-50/40 rounded-2xl"
      >
        {!imgError ? (
          <img
            src={word.image}
            alt={wordText}
            onError={() => setImgError(true)}
            className="w-full h-full object-contain filter drop-shadow-md select-none"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-amber-100/60 rounded-2xl text-amber-700">
            <span className="text-5xl mb-2">⭐</span>
            <span className="text-lg font-bold">{wordText}</span>
          </div>
        )}
      </motion.div>

      {/* Target Word Display */}
      <div className="text-center mt-2">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-800 font-rounded tracking-wide">
          {wordText}
        </h2>

        {/* Phonetic transcription for parents / learning aid */}
        {phonetic && (
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1 tracking-wider">
            [{phonetic}]
          </p>
        )}
      </div>
    </motion.div>
  );
};
