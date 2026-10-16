import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Word, AppLanguage, UserPreferences } from '../../types';
import { translations } from '../../i18n/translations';
import { useGameController } from './useGameController';
import { LionCharacter } from '../../components/LionCharacter';
import { WordCard } from '../../components/WordCard';
import { ListeningIndicator } from '../../components/ListeningIndicator';
import { RewardAnimation } from '../../components/RewardAnimation';
import { BigActionButton } from '../../components/BigActionButton';
import { Home, Volume2, Mic, ArrowRight, ArrowLeft, Star, RotateCcw } from 'lucide-react';

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

  const { state, actions } = useGameController({
    words,
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
  } = state;

  return (
    <div
      className="relative min-h-screen flex flex-col justify-between p-3 sm:p-6 max-w-5xl mx-auto"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Confetti & Star Animation on Success */}
      {gameState === 'success' && (
        <RewardAnimation
          isRtl={isRtl}
          message={feedbackText}
        />
      )}

      {/* Top Navigation Bar */}
      <header className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 bg-white/85 backdrop-blur-md rounded-3xl p-3 sm:p-4 shadow-lg border-2 border-amber-200">
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          onClick={onBackHome}
          className="flex items-center space-x-2 rtl:space-x-reverse px-3.5 py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-2xl font-bold text-sm sm:text-base transition-colors"
        >
          <Home className="w-5 h-5" />
          <span className="hidden sm:inline">{t.backHome}</span>
        </motion.button>

        {/* Word Progress Indicator */}
        <div className="flex items-center space-x-2 bg-amber-50 px-3.5 py-1.5 rounded-2xl border border-amber-200 text-amber-900 font-extrabold text-sm sm:text-base">
          <span>{currentWordIndex + 1}</span>
          <span className="text-amber-400">/</span>
          <span>{words.length}</span>
        </div>

        {/* Speech Speed Slider on Interface */}
        <div
          className="flex items-center space-x-1.5 sm:space-x-2 rtl:space-x-reverse bg-amber-50/90 border border-amber-200 px-3 py-1.5 rounded-2xl shadow-sm text-xs font-bold text-amber-950"
          title="Vitesse de prononciation (Ralenti pour apprendre)"
        >
          <span className="text-sm select-none" title="Ralenti">🐢</span>
          <input
            type="range"
            min="0.55"
            max="1.00"
            step="0.05"
            value={preferences.speechSpeed || 0.75}
            onChange={(e) => onUpdateSpeechSpeed?.(parseFloat(e.target.value))}
            className="w-16 sm:w-24 accent-amber-500 cursor-pointer"
            aria-label="Vitesse de prononciation"
          />
          <span className="text-sm select-none" title="Normal">🐇</span>
          <span className="font-extrabold text-amber-900 min-w-[2.2rem] text-center">
            {(preferences.speechSpeed || 0.75).toFixed(2)}x
          </span>
        </div>

        {/* Stars Counter */}
        <div className="flex items-center space-x-2 rtl:space-x-reverse bg-gradient-to-r from-amber-400 to-orange-400 text-white px-4 py-2 rounded-2xl font-black text-sm sm:text-base shadow-md">
          <Star className="w-5 h-5 fill-white" />
          <span>+{sessionStarsGained}</span>
        </div>
      </header>

      {/* Main Play Area */}
      {!isSessionFinished ? (
        <main className="flex-1 flex flex-col md:flex-row items-center justify-center gap-6 sm:gap-10 my-4 sm:my-6">
          {/* Left: Animated Lion Mascot */}
          <div className="flex flex-col items-center justify-center w-full md:w-1/2">
            <LionCharacter
              state={lionState}
              size="lg"
              isRtl={isRtl}
              speechBubbleText={feedbackText}
            />
          </div>

          {/* Right: Word Card & Controls */}
          <div className="flex flex-col items-center justify-center w-full md:w-1/2 space-y-5">
            <WordCard
              word={currentWord}
              lang={lang}
              onPlayAudio={actions.playCurrentWord}
              isPlaying={gameState === 'speaking'}
              isRtl={isRtl}
            />

            {/* Listening Indicator with Waves */}
            <AnimatePresence>
              {gameState === 'listening' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="w-full flex justify-center"
                >
                  <ListeningIndicator
                    label={t.iAmListening}
                    isListening={isListening}
                    onValidateManual={actions.validateManually}
                    validateLabel={t.validateManually}
                    isRtl={isRtl}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tactile Action Controls */}
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 w-full">
              {/* Listen / Repeat Sound */}
              <BigActionButton
                label={t.repeatWord}
                icon={<Volume2 className="w-6 h-6" />}
                onClick={actions.playCurrentWord}
                variant="secondary"
                size="md"
                isRtl={isRtl}
              />

              {/* Speak / Mic Trigger (if speech enabled and not already listening) */}
              {preferences.speechRecognitionEnabled && gameState !== 'listening' && (
                <BigActionButton
                  label={t.trySpeaking}
                  icon={<Mic className="w-6 h-6" />}
                  onClick={actions.startListeningRepeat}
                  variant="primary"
                  size="md"
                  isRtl={isRtl}
                />
              )}

              {/* Manual Success Star Button (always present so child never feels blocked) */}
              {gameState !== 'listening' && (
                <BigActionButton
                  label={t.validateManually}
                  icon={<Star className="w-6 h-6 fill-amber-100" />}
                  onClick={actions.validateManually}
                  variant="success"
                  size="md"
                  isRtl={isRtl}
                />
              )}

              {/* Next Word Button */}
              <BigActionButton
                label={t.nextWord}
                icon={isRtl ? <ArrowLeft className="w-6 h-6" /> : <ArrowRight className="w-6 h-6" />}
                onClick={actions.nextWord}
                variant="primary"
                size="md"
                isRtl={isRtl}
              />
            </div>
          </div>
        </main>
      ) : (
        /* End of Session Celebration Screen */
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl border-4 border-amber-300 my-6 max-w-xl mx-auto"
        >
          <LionCharacter state="happy" size="lg" isRtl={isRtl} />

          <h2 className="text-3xl sm:text-4xl font-black text-amber-950 mt-4 font-rounded">
            {t.sessionCompletedTitle}
          </h2>

          <p className="text-lg sm:text-xl text-slate-700 mt-2 font-medium">
            {t.sessionCompletedDesc(words.length)}
          </p>

          <div className="flex items-center space-x-3 rtl:space-x-reverse bg-amber-100 px-6 py-3 rounded-full my-6 text-amber-900 font-extrabold text-2xl shadow-inner">
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

      {/* Navigation bottom arrows for easy browsing */}
      {!isSessionFinished && (
        <footer className="flex justify-between items-center py-2">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={actions.previousWord}
            disabled={currentWordIndex === 0}
            className={`p-3 rounded-full bg-white/80 shadow border border-amber-200 text-amber-900 ${
              currentWordIndex === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-amber-100'
            }`}
          >
            {isRtl ? <ArrowRight className="w-6 h-6" /> : <ArrowLeft className="w-6 h-6" />}
          </motion.button>

          <p className="text-xs sm:text-sm text-slate-500 font-semibold text-center">
            {t.categories[currentWord.category]} • « Petit Lion d'Imrane »
          </p>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={actions.nextWord}
            className="p-3 rounded-full bg-white/80 shadow border border-amber-200 text-amber-900 hover:bg-amber-100"
          >
            {isRtl ? <ArrowLeft className="w-6 h-6" /> : <ArrowRight className="w-6 h-6" />}
          </motion.button>
        </footer>
      )}
    </div>
  );
};
