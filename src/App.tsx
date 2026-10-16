import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppLanguage, ActiveScreen, UserPreferences, UserProgress, Word } from './types';
import wordsData from './data/words.json';
import { translations } from './i18n/translations';
import {
  getStoredPreferences,
  savePreferences,
  getStoredProgress,
} from './services/storageService';
import { LionCharacter } from './components/LionCharacter';
import { LanguageSelector } from './components/LanguageSelector';
import { BigActionButton } from './components/BigActionButton';
import { GameScreen } from './features/game/GameScreen';
import { PictureChoiceGame } from './features/challenges/PictureChoiceGame';
import { ParentSettings } from './features/settings/ParentSettings';
import { Star, Award, Settings, Play, Sparkles, BookOpen } from 'lucide-react';
import { playPopSound } from './services/audioService';

export const App: React.FC = () => {
  const [preferences, setPreferences] = useState<UserPreferences>(() => getStoredPreferences());
  const [progress, setProgress] = useState<UserProgress>(() => getStoredProgress());
  const [currentLanguage, setCurrentLanguage] = useState<AppLanguage>(
    preferences.defaultLanguage || 'fr'
  );
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>('home');
  const [showParentSettings, setShowParentSettings] = useState<boolean>(false);

  const words = wordsData as Word[];
  const t = translations[currentLanguage];
  const isRtl = currentLanguage === 'ar' || currentLanguage === 'ary';

  // Apply RTL direction to document root
  useEffect(() => {
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLanguage === 'ary' ? 'ar-MA' : currentLanguage;
  }, [currentLanguage, isRtl]);

  const handleSelectLanguage = (lang: AppLanguage) => {
    playPopSound(preferences.volume);
    setCurrentLanguage(lang);
    const updated = { ...preferences, defaultLanguage: lang };
    setPreferences(updated);
    savePreferences(updated);
  };

  const refreshProgress = () => {
    setProgress(getStoredProgress());
  };

  const handleUpdateSpeechSpeed = (newSpeed: number) => {
    const updated = { ...preferences, speechSpeed: newSpeed };
    setPreferences(updated);
    savePreferences(updated);
  };

  return (
    <div
      className="relative min-h-screen font-rounded select-none overflow-x-hidden"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Animated Clouds Background */}
      <div className="cloud-bg" aria-hidden="true">
        <div className="cloud cloud-1" />
        <div className="cloud cloud-2" />
        <div className="cloud cloud-3" />
        <div className="bg-sparkle" style={{ top: '15%', left: '20%' }}>
          ✨
        </div>
        <div className="bg-sparkle" style={{ top: '35%', right: '15%' }}>
          ⭐
        </div>
        <div className="bg-sparkle" style={{ bottom: '25%', left: '8%' }}>
          🌟
        </div>
      </div>

      {/* Screen Routing */}
      <AnimatePresence mode="wait">
        {activeScreen === 'home' && (
          <motion.div
            key="home"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="relative z-10 min-h-screen flex flex-col justify-between p-4 sm:p-8 max-w-5xl mx-auto"
          >
            {/* Top Bar: Progress and Settings */}
            <header className="flex items-center justify-between">
              {/* Badges / Rewards */}
              <div className="flex items-center space-x-3 rtl:space-x-reverse">
                <div className="flex items-center space-x-2 rtl:space-x-reverse bg-amber-400 text-white px-4 py-2 rounded-2xl shadow-md font-black text-sm sm:text-base border-2 border-white">
                  <Star className="w-5 h-5 fill-white" />
                  <span>{progress.stars}</span>
                </div>

                <div className="hidden sm:flex items-center space-x-2 rtl:space-x-reverse bg-teal-500 text-white px-4 py-2 rounded-2xl shadow-md font-bold text-sm border-2 border-white">
                  <Award className="w-5 h-5" />
                  <span>{progress.discoveredWords.length} / {words.length} mots</span>
                </div>
              </div>

              {/* Language Selector */}
              <LanguageSelector
                currentLanguage={currentLanguage}
                onSelectLanguage={handleSelectLanguage}
              />

              {/* Parent Settings Button */}
              <motion.button
                whileHover={{ scale: 1.1, rotate: 45 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => setShowParentSettings(true)}
                aria-label={t.parentSettings}
                className="p-3 bg-white/90 hover:bg-white text-slate-600 hover:text-amber-600 rounded-2xl shadow-md border-2 border-slate-200 transition-colors"
              >
                <Settings className="w-6 h-6" />
              </motion.button>
            </header>

            {/* Main Welcome Hero */}
            <main className="flex-1 flex flex-col items-center justify-center my-6 text-center space-y-6">
              {/* Title & Subtitle */}
              <div>
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: [1, 1.03, 1] }}
                  transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
                  className="inline-flex items-center space-x-2 rtl:space-x-reverse px-4 py-1.5 bg-amber-200/60 rounded-full text-amber-900 font-extrabold text-xs sm:text-sm mb-3 border border-amber-300"
                >
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>Pour notre petit champion Imrane (عمران)</span>
                </motion.div>

                <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-amber-950 font-rounded tracking-tight drop-shadow-sm">
                  {t.appName}
                </h1>
                <p className="text-base sm:text-xl text-teal-800 font-bold mt-2 max-w-xl mx-auto">
                  {t.appSubtitle}
                </p>
              </div>

              {/* Central Mascot with Welcome Speech Bubble */}
              <LionCharacter
                state="happy"
                size="xl"
                speechBubbleText={t.welcomeMessage}
                isRtl={isRtl}
              />

              {/* Main Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-lg mt-2">
                <BigActionButton
                  label={t.playButton}
                  icon={<Play className="w-7 h-7 fill-white" />}
                  onClick={() => setActiveScreen('game')}
                  variant="primary"
                  size="xl"
                  className="w-full sm:w-auto flex-1 shadow-2xl"
                  isRtl={isRtl}
                />

                <BigActionButton
                  label={t.challengeButton}
                  icon={<BookOpen className="w-6 h-6" />}
                  onClick={() => setActiveScreen('challenge')}
                  variant="secondary"
                  size="lg"
                  className="w-full sm:w-auto"
                  isRtl={isRtl}
                />
              </div>
            </main>

            {/* Bottom Footer Notice */}
            <footer className="text-center py-2 text-xs sm:text-sm text-slate-500 font-semibold">
              <span>Apprentissage bienveillant 100% hors-ligne & sécurisé pour enfants de 4 ans 💛</span>
            </footer>
          </motion.div>
        )}

        {/* Listen & Repeat Main Game Screen */}
        {activeScreen === 'game' && (
          <motion.div
            key="game"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.25 }}
            className="relative z-10"
          >
            <GameScreen
              words={words}
              lang={currentLanguage}
              preferences={preferences}
              onUpdateSpeechSpeed={handleUpdateSpeechSpeed}
              onBackHome={() => {
                setActiveScreen('home');
                refreshProgress();
              }}
              onStarGained={refreshProgress}
            />
          </motion.div>
        )}

        {/* Visual Challenge Mini-game Screen */}
        {activeScreen === 'challenge' && (
          <motion.div
            key="challenge"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.25 }}
            className="relative z-10"
          >
            <PictureChoiceGame
              words={words}
              lang={currentLanguage}
              volume={preferences.volume}
              soundEffectsEnabled={preferences.soundEffectsEnabled}
              speechSpeed={preferences.speechSpeed}
              onBackHome={() => {
                setActiveScreen('home');
                refreshProgress();
              }}
              onStarGained={refreshProgress}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Parental Settings Modal */}
      {showParentSettings && (
        <ParentSettings
          preferences={preferences}
          lang={currentLanguage}
          onUpdatePreferences={(updated) => {
            setPreferences(updated);
            setCurrentLanguage(updated.defaultLanguage);
          }}
          onClose={() => setShowParentSettings(false)}
          onResetProgressDone={refreshProgress}
        />
      )}
    </div>
  );
};
