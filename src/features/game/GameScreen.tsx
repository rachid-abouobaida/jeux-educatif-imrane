import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Word, AppLanguage, UserPreferences, WordCategory } from '../../types';
import { translations } from '../../i18n/translations';
import { useGameController } from './useGameController';
import { LionCharacter } from '../../components/LionCharacter';
import { WordCard } from '../../components/WordCard';
import { RewardAnimation } from '../../components/RewardAnimation';
import { BigActionButton } from '../../components/BigActionButton';
import {
  Home,
  Volume2,
  Mic,
  ArrowRight,
  ArrowLeft,
  Star,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

interface GameScreenProps {
  words: Word[];
  lang: AppLanguage;
  preferences: UserPreferences;
  onUpdateSpeechSpeed?: (speed: number) => void;
  onBackHome: () => void;
  onStarGained?: () => void;
}

export const GameScreen: React.FC<GameScreenProps> = ({
  words,
  lang,
  preferences,
  onUpdateSpeechSpeed,
  onBackHome,
  onStarGained,
}) => {
  const t = translations[lang];
  const isRtl = lang === 'ar' || lang === 'ary';

  // Category selection (Default: All or specific category)
  const [selectedCategory, setSelectedCategory] = useState<WordCategory | 'all'>('all');

  // Filter words according to chosen category
  const filteredWords = useMemo(() => {
    if (selectedCategory === 'all') return words;
    const subset = words.filter((w) => w.category === selectedCategory);
    return subset.length > 0 ? subset : words;
  }, [words, selectedCategory]);

  const { state, actions } = useGameController({
    words: filteredWords,
    lang,
    preferences,
    onStarAwarded: onStarGained,
  });

  const {
    currentWordIndex,
    currentWord,
    gameState,
    lionState,
    feedbackText,
    isListening,
    sessionStarsGained,
    isSessionFinished,
    audioLevel,
  } = state;

  const isFirstWord = currentWordIndex === 0;
  const progressPercent = Math.round(((currentWordIndex + 1) / filteredWords.length) * 100);

  // Direction-aware navigation arrows
  const PrevIcon = isRtl ? ArrowRight : ArrowLeft;
  const NextIcon = isRtl ? ArrowLeft : ArrowRight;

  // Category filter items configuration
  const categoryItems: Array<{ id: WordCategory | 'all'; icon: string; label: string; count: number }> = [
    {
      id: 'all',
      icon: '🌟',
      label: lang === 'fr' ? 'Tous' : lang === 'ar' ? 'الكل' : 'كلشي',
      count: words.length,
    },
    {
      id: 'numbers',
      icon: '🔢',
      label: t.categories.numbers,
      count: words.filter((w) => w.category === 'numbers').length,
    },
    {
      id: 'letters',
      icon: '🔤',
      label: t.categories.letters,
      count: words.filter((w) => w.category === 'letters').length,
    },
    {
      id: 'animals',
      icon: '🦁',
      label: t.categories.animals,
      count: words.filter((w) => w.category === 'animals').length,
    },
    {
      id: 'food',
      icon: '🍎',
      label: t.categories.food,
      count: words.filter((w) => w.category === 'food').length,
    },
    {
      id: 'vehicles',
      icon: '🚗',
      label: t.categories.vehicles,
      count: words.filter((w) => w.category === 'vehicles').length,
    },
    {
      id: 'objects',
      icon: '🧸',
      label: t.categories.objects,
      count: words.filter((w) => w.category === 'objects').length,
    },
    {
      id: 'body',
      icon: '🖐️',
      label: t.categories.body,
      count: words.filter((w) => w.category === 'body').length,
    },
    {
      id: 'actions',
      icon: '🏃',
      label: t.categories.actions,
      count: words.filter((w) => w.category === 'actions').length,
    },
    {
      id: 'shapes',
      icon: '🔷',
      label: t.categories.shapes,
      count: words.filter((w) => w.category === 'shapes').length,
    },
  ];

  return (
    <div
      className="relative min-h-screen lg:h-screen lg:max-h-screen lg:overflow-hidden flex flex-col justify-between p-2 sm:p-4 lg:py-2.5 max-w-7xl mx-auto w-full select-none"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Confetti & Star Animation on Success */}
      {gameState === 'success' && (
        <RewardAnimation
          isRtl={isRtl}
          message={feedbackText}
        />
      )}

      {/* 1. TOP BAR: Stable Navigation & Stats */}
      <header className="flex flex-col gap-2.5 bg-white/95 backdrop-blur-md rounded-3xl p-3 sm:px-6 sm:py-3.5 shadow-lg border-2 border-amber-200/90 w-full z-20">
        <div className="flex items-center justify-between gap-2 sm:gap-4 w-full">
          {/* Back to Home Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onBackHome}
            className="flex items-center space-x-2 rtl:space-x-reverse px-3.5 py-2 sm:px-4 sm:py-2.5 bg-amber-100 hover:bg-amber-200 text-amber-950 rounded-2xl font-black text-sm sm:text-base transition-colors shadow-sm cursor-pointer"
            aria-label={t.backHome}
          >
            <Home className="w-5 h-5 text-amber-800" />
            <span className="hidden sm:inline font-rounded">{t.backHome}</span>
          </motion.button>

          {/* Word Progress Indicator with Visual Mini-Bar */}
          <div className="flex flex-col items-center justify-center min-w-[120px] sm:min-w-[160px]">
            <div className="flex items-center space-x-1.5 rtl:space-x-reverse text-amber-950 font-black text-sm sm:text-base">
              <span>{currentWordIndex + 1}</span>
              <span className="text-amber-400">/</span>
              <span>{filteredWords.length}</span>
            </div>
            {/* Mini progress bar */}
            <div className="w-24 sm:w-36 h-2 bg-amber-100 rounded-full overflow-hidden mt-1 border border-amber-200/70">
              <motion.div
                className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full"
                initial={false}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
          </div>

          {/* Speech Speed Setting & Stars counter */}
          <div className="flex items-center space-x-2 sm:space-x-3 rtl:space-x-reverse">
            {/* Speech Speed Control */}
            <div
              className="hidden sm:flex items-center space-x-1.5 rtl:space-x-reverse bg-amber-50/90 border border-amber-200 px-3 py-1.5 rounded-2xl shadow-sm text-xs font-bold text-amber-950"
              title="Vitesse de la voix du Petit Lion"
            >
              <span className="text-sm select-none" title="Ralenti">🐢</span>
              <input
                type="range"
                min="0.55"
                max="1.00"
                step="0.05"
                value={preferences.speechSpeed || 0.75}
                onChange={(e) => onUpdateSpeechSpeed?.(parseFloat(e.target.value))}
                className="w-14 sm:w-20 accent-amber-500 cursor-pointer"
                aria-label="Vitesse de prononciation"
              />
              <span className="text-sm select-none" title="Normal">🐇</span>
            </div>

            {/* Stars Counter */}
            <div className="flex items-center space-x-1.5 rtl:space-x-reverse bg-gradient-to-r from-amber-400 to-orange-400 text-white px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl font-black text-sm sm:text-base shadow-md border border-white/50">
              <Star className="w-4 h-4 sm:w-5 sm:h-5 fill-white text-white" />
              <span>+{sessionStarsGained}</span>
            </div>
          </div>
        </div>

        {/* Categories Horizontal Tactile Selector */}
        <div className="flex items-center space-x-2 rtl:space-x-reverse overflow-x-auto pt-1 pb-0.5 scrollbar-none w-full">
          {categoryItems.map((item) => {
            const isActive = selectedCategory === item.id;
            return (
              <motion.button
                key={item.id}
                whileTap={{ scale: 0.94 }}
                onClick={() => setSelectedCategory(item.id)}
                className={`flex-shrink-0 flex items-center space-x-1.5 rtl:space-x-reverse px-3 py-1.5 rounded-full font-black text-xs sm:text-sm transition-all cursor-pointer border ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-white border-amber-300 shadow-md ring-2 ring-amber-200'
                    : 'bg-amber-50/80 text-amber-950 hover:bg-amber-100 border-amber-200'
                }`}
              >
                <span className="text-sm select-none">{item.icon}</span>
                <span className="font-rounded font-extrabold">{item.label}</span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-white/30 text-white' : 'bg-amber-200/70 text-amber-900'
                  }`}
                >
                  {item.count}
                </span>
              </motion.button>
            );
          })}
        </div>
      </header>

      {/* 2. MAIN LEARNING ARENA */}
      {!isSessionFinished ? (
        <main className="flex-1 min-h-0 flex flex-col justify-center items-center my-auto py-1 sm:py-2 w-full">
          {/* A. Friendly Lion Mascot with Speech Guidance Banner (Fixed Height - 0px layout shift) */}
          <div className="w-full max-w-2xl h-20 sm:h-24 flex items-center justify-center px-4 mb-1">
            <div className="flex items-center space-x-3 rtl:space-x-reverse bg-white/95 backdrop-blur-md rounded-full px-5 py-2.5 sm:px-6 sm:py-3 shadow-lg border-2 border-amber-200/90 max-w-full">
              {/* Animated Baby Lion Avatar with Strict Dimensions & Overflow Hidden */}
              <div
                className="w-12 h-12 sm:w-14 sm:h-14 min-w-[48px] min-h-[48px] max-w-[56px] max-h-[56px] rounded-full overflow-hidden bg-gradient-to-tr from-amber-100 to-orange-100 border-2 border-amber-300 flex items-center justify-center flex-shrink-0 shadow-inner"
              >
                <img
                  src={`/assets/lion/lion-${lionState}.png`}
                  alt="Petit Lion"
                  className="w-10 h-10 sm:w-12 sm:h-12 object-contain filter drop-shadow-sm select-none"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>

              {/* Dynamic Speech Text with AnimatePresence */}
              <div className="flex-1 overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={feedbackText || gameState}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.18 }}
                    className="flex items-center space-x-2 rtl:space-x-reverse"
                  >
                    <span className="font-rounded font-extrabold text-sm sm:text-base lg:text-lg text-slate-800 line-clamp-1">
                      {feedbackText || t.presentationText(currentWord.translations[lang])}
                    </span>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Pulse status badge */}
              <div className="flex-shrink-0">
                {isListening || gameState === 'listening' ? (
                  <span className="px-3 py-1 bg-teal-100 text-teal-800 text-xs sm:text-sm font-black rounded-full border border-teal-300 animate-pulse">
                    👂 J'écoute
                  </span>
                ) : gameState === 'speaking' ? (
                  <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs sm:text-sm font-black rounded-full border border-amber-300 animate-pulse">
                    🔊 Écoute
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-amber-50 text-amber-600 text-xs sm:text-sm font-black rounded-full border border-amber-200">
                    ⭐ À toi
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* B. Central Stage: Perfectly Centered WordCard flanked by Big Touch Navigation Arrows */}
          <div className="w-full max-w-4xl mx-auto flex items-center justify-center gap-4 sm:gap-8 lg:gap-12 px-2 my-auto">
            {/* Left Nav Button (Previous Word) */}
            <div className="flex-shrink-0 flex items-center justify-center">
              <motion.button
                whileHover={!isFirstWord ? { scale: 1.1, x: isRtl ? 4 : -4 } : {}}
                whileTap={!isFirstWord ? { scale: 0.92 } : {}}
                onClick={actions.previousWord}
                disabled={isFirstWord}
                aria-label="Mot précédent"
                className={`w-16 h-16 sm:w-20 sm:h-20 lg:w-22 lg:h-22 rounded-full flex items-center justify-center shadow-2xl border-4 transition-all ${
                  isFirstWord
                    ? 'bg-white/40 border-amber-100 text-amber-300 opacity-25 cursor-not-allowed shadow-none'
                    : 'bg-white hover:bg-amber-50 border-amber-300 text-amber-900 hover:border-amber-400 cursor-pointer shadow-amber-200/60 ring-4 ring-amber-100'
                }`}
              >
                <PrevIcon className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 stroke-[3]" />
              </motion.button>
            </div>

            {/* WordCard: Hero Learning Focal Point (Strictly Centered) */}
            <div className="flex justify-center w-full max-w-md sm:max-w-lg lg:max-w-xl flex-shrink-0">
              <WordCard
                word={currentWord}
                lang={lang}
                onPlayAudio={actions.playCurrentWord}
                isPlaying={gameState === 'speaking'}
                isRtl={isRtl}
              />
            </div>

            {/* Right Nav Button (Next Word) */}
            <div className="flex-shrink-0 flex items-center justify-center">
              <motion.button
                whileHover={{ scale: 1.1, x: isRtl ? -4 : 4 }}
                whileTap={{ scale: 0.92 }}
                onClick={actions.nextWord}
                aria-label="Mot suivant"
                className="w-16 h-16 sm:w-20 sm:h-20 lg:w-22 lg:h-22 rounded-full flex items-center justify-center bg-gradient-to-tr from-amber-400 via-orange-400 to-amber-500 hover:from-amber-500 hover:to-orange-500 text-white shadow-2xl shadow-orange-300/70 border-4 border-white cursor-pointer transition-all ring-4 ring-orange-200"
              >
                <NextIcon className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 stroke-[3]" />
              </motion.button>
            </div>
          </div>
        </main>
      ) : (
        /* End of Session Celebration Screen */
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border-4 border-amber-300 my-4 max-w-xl mx-auto w-full select-none"
        >
          <LionCharacter state="happy" size="lg" isRtl={isRtl} />

          <h2 className="text-3xl sm:text-4xl font-black text-amber-950 mt-4 font-rounded">
            {t.sessionCompletedTitle}
          </h2>

          <p className="text-lg sm:text-xl text-slate-700 mt-2 font-medium">
            {t.sessionCompletedDesc(words.length)}
          </p>

          <div className="flex items-center space-x-3 rtl:space-x-reverse bg-amber-100 px-6 py-3 rounded-full my-6 text-amber-900 font-extrabold text-2xl shadow-inner border border-amber-300/80">
            <Star className="w-8 h-8 fill-amber-400 text-amber-500" />
            <span>+{sessionStarsGained} étoiles !</span>
          </div>

          <div className="flex flex-wrap gap-4 justify-center">
            <BigActionButton
              label={t.replaySession}
              icon={<RotateCcw className="w-6 h-6" />}
              onClick={actions.restartSession}
              variant="success"
              size="lg"
              isRtl={isRtl}
            />
            <BigActionButton
              label={t.backHome}
              icon={<Home className="w-6 h-6" />}
              onClick={onBackHome}
              variant="secondary"
              size="lg"
              isRtl={isRtl}
            />
          </div>
        </motion.div>
      )}

      {/* 3. FIXED BOTTOM ACTION DOCK: Absolutely Stable Trio of Tactile Actions */}
      {!isSessionFinished && (
        <footer className="w-full max-w-4xl mx-auto pt-3 pb-2 z-20">
          <div className="bg-white/95 backdrop-blur-md rounded-[2.2rem] p-3 sm:p-4 shadow-2xl border-4 border-amber-200/90 flex flex-wrap sm:flex-nowrap items-center justify-center gap-3 sm:gap-4 w-full">
            {/* Action 1: Listen / Repeat Audio (Strictly Fixed Position & Size) */}
            <motion.button
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.94 }}
              onClick={actions.playCurrentWord}
              className={`flex-1 min-w-[140px] h-16 sm:h-20 lg:h-22 flex items-center justify-center space-x-2.5 sm:space-x-3 rtl:space-x-reverse px-4 rounded-2xl sm:rounded-3xl font-black text-lg sm:text-xl lg:text-2xl text-white shadow-xl transition-all cursor-pointer border-2 border-white/80 ring-4 ${
                gameState === 'speaking'
                  ? 'bg-gradient-to-r from-sky-500 to-blue-600 ring-sky-300 animate-pulse'
                  : 'bg-gradient-to-r from-sky-400 to-blue-500 hover:from-sky-500 hover:to-blue-600 shadow-sky-300/50 ring-sky-200/60'
              }`}
              aria-label={t.repeatWord}
            >
              <Volume2 className={`w-7 h-7 sm:w-8 sm:h-8 lg:w-9 lg:h-9 flex-shrink-0 ${gameState === 'speaking' ? 'animate-bounce' : ''}`} />
              <span className="font-rounded tracking-wide truncate">{t.repeatWord}</span>
            </motion.button>

            {/* Action 2: Repeat with Mic / Listening State (Strictly Fixed Position & Size) */}
            {preferences.speechRecognitionEnabled ? (
              (() => {
                const isListeningActive = isListening || gameState === 'listening';
                const isHearingVoice = isListeningActive && audioLevel > 12;

                return (
                  <motion.button
                    whileHover={{ scale: 1.04, y: -2 }}
                    whileTap={{ scale: 0.94 }}
                    onClick={
                      isListeningActive
                        ? actions.validateManually
                        : actions.startListeningRepeat
                    }
                    className={`relative flex-1 min-w-[140px] h-16 sm:h-20 lg:h-22 flex items-center justify-center space-x-2 sm:space-x-2.5 rtl:space-x-reverse px-3 sm:px-4 rounded-2xl sm:rounded-3xl font-black text-lg sm:text-xl lg:text-2xl text-white shadow-xl transition-all cursor-pointer border-2 border-white/80 overflow-hidden ring-4 ${
                      isListeningActive
                        ? isHearingVoice
                          ? 'bg-gradient-to-r from-emerald-400 to-lime-500 ring-lime-300 shadow-lime-300/60 scale-[1.02]'
                          : 'bg-gradient-to-r from-teal-400 to-emerald-500 ring-teal-300 shadow-teal-300/60'
                        : 'bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 hover:from-amber-500 hover:to-orange-500 shadow-amber-300/50 ring-amber-200/60'
                    }`}
                    aria-label={isListeningActive ? t.iAmListening : t.trySpeaking}
                  >
                    {/* Visual pulse effect when listening */}
                    {isListeningActive && (
                      <motion.div
                        animate={{
                          scale: isHearingVoice ? [1, 1.5, 1] : [1, 1.4, 1],
                          opacity: isHearingVoice ? [0.4, 0.8, 0.4] : [0.3, 0.7, 0.3],
                        }}
                        transition={{ repeat: Infinity, duration: isHearingVoice ? 0.7 : 1.2 }}
                        className="absolute inset-0 bg-white/25 rounded-2xl sm:rounded-3xl pointer-events-none"
                      />
                    )}
                    <Mic
                      className={`w-7 h-7 sm:w-8 sm:h-8 lg:w-9 lg:h-9 flex-shrink-0 z-10 ${
                        isListeningActive ? 'animate-pulse text-yellow-200' : ''
                      }`}
                    />
                    {/* Live Audio Frequency Bars when listening */}
                    {isListeningActive && (
                      <div className="flex items-center space-x-1 z-10 px-0.5">
                        {[0.6, 1.3, 0.8, 1.5].map((factor, i) => {
                          const barHeight = Math.max(4, Math.min(18, (audioLevel / 100) * 22 * factor));
                          return (
                            <motion.div
                              key={i}
                              animate={{ height: `${barHeight}px` }}
                              transition={{ type: 'spring', stiffness: 350, damping: 20 }}
                              className={`w-1 rounded-full ${
                                isHearingVoice ? 'bg-yellow-200' : 'bg-white/70'
                              }`}
                            />
                          );
                        })}
                      </div>
                    )}
                    <span className="font-rounded tracking-wide truncate z-10">
                      {isListeningActive
                        ? isHearingVoice
                          ? 'Je t’entends ! 🎵'
                          : 'J’écoute… 👂'
                        : 'Je parle 🎤'}
                    </span>
                  </motion.button>
                );
              })()
            ) : (
              /* Fallback if mic disabled in settings: keeps layout 100% stable */
              <div
                className="flex-1 min-w-[140px] h-16 sm:h-20 lg:h-22 flex items-center justify-center space-x-2 bg-amber-50 rounded-2xl sm:rounded-3xl border-2 border-dashed border-amber-300 text-amber-800 font-extrabold text-base sm:text-lg"
              >
                <Sparkles className="w-6 h-6 text-amber-500" />
                <span className="font-rounded">Écoute attentive 🦁</span>
              </div>
            )}

            {/* Action 3: Child Success Validation ("J'ai bien répété !") (Strictly Fixed Position & Size) */}
            <motion.button
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.94 }}
              onClick={actions.validateManually}
              className="flex-1 min-w-[140px] h-16 sm:h-20 lg:h-22 flex items-center justify-center space-x-2.5 sm:space-x-3 rtl:space-x-reverse px-4 bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-500 hover:to-teal-600 text-white rounded-2xl sm:rounded-3xl font-black text-lg sm:text-xl lg:text-2xl shadow-xl shadow-emerald-300/50 border-2 border-white/80 ring-4 ring-emerald-200/60 transition-all cursor-pointer"
              aria-label={t.validateManually}
            >
              <Star className="w-7 h-7 sm:w-8 sm:h-8 lg:w-9 lg:h-9 fill-amber-200 text-amber-100 flex-shrink-0" />
              <span className="font-rounded tracking-wide truncate">{t.validateManually}</span>
            </motion.button>
          </div>
        </footer>
      )}
    </div>
  );
};

