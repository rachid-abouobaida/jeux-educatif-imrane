import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { RoutineStep, AppLanguage, UserPreferences, LionState } from '../../types';
import routineStepsData from '../../data/routineSteps.json';
import { translations } from '../../i18n/translations';
import { LionCharacter } from '../../components/LionCharacter';
import { ListeningIndicator } from '../../components/ListeningIndicator';
import { RewardAnimation } from '../../components/RewardAnimation';
import { BigActionButton } from '../../components/BigActionButton';
import { useAudio } from '../../hooks/useAudio';
import { startListening, stopListening } from '../speech/speechRecognitionService';
import { normalizeByLanguage, calculateSimilarity, phoneticFrench, stripLeadingArticles } from '../speech/pronunciationEvaluator';
import { addStarAndWord } from '../../services/storageService';
import {
  Home,
  Volume2,
  Mic,
  ArrowRight,
  ArrowLeft,
  Star,
  RotateCcw,
  Award,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Sparkles,
  Maximize2,
  Minimize2,
} from 'lucide-react';

interface MorningRoutineGameProps {
  lang: AppLanguage;
  preferences: UserPreferences;
  onBackHome: () => void;
  onStarGained?: () => void;
}

export const MorningRoutineGame: React.FC<MorningRoutineGameProps> = ({
  lang,
  preferences,
  onBackHome,
  onStarGained,
}) => {
  const steps = routineStepsData as RoutineStep[];
  const t = translations[lang];
  const isRtl = lang === 'ar' || lang === 'ary';

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [lionState, setLionState] = useState<LionState>('idle');
  const [feedbackText, setFeedbackText] = useState<string>('');
  const [isListening, setIsListening] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isCelebrating, setIsCelebrating] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [starsWon, setStarsWon] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const autoNextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasAnnouncedIntroRef = useRef<boolean>(false);
  const thumbnailRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const thumbnailsContainerRef = useRef<HTMLDivElement | null>(null);

  const { speakWord, playSuccess, playEncourage, stop: stopAudio } = useAudio(
    preferences.volume,
    preferences.soundEffectsEnabled,
    preferences.speechSpeed || 0.75
  );

  const currentStep = steps[currentStepIndex];

  // Icons for the 8 routine steps
  const stepIcons = ['☀️', '🛏️', '🛁', '💧', '🪥', '🥣', '👕', '🎒'];

  /**
   * Auto-scroll active thumbnail into view in the bottom carousel
   */
  useEffect(() => {
    const activeThumb = thumbnailRefs.current[currentStepIndex];
    if (activeThumb && thumbnailsContainerRef.current) {
      activeThumb.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [currentStepIndex]);

  /**
   * Evaluates if Imrane's speech matches the routine sentence.
   * Tolerant of soft child voices, dropped letters, and polite prefixes.
   */
  const evaluateRoutineSpeech = useCallback(
    (spokenText: string | string[], step: RoutineStep, alternatives: string[] = []): boolean => {
      const candidates = (Array.isArray(spokenText) ? [...spokenText, ...alternatives] : [spokenText, ...alternatives])
        .map((s) => (s ? s.trim() : ''))
        .filter(Boolean);

      if (candidates.length === 0) return false;

      const target = normalizeByLanguage(step.repeatSentence[lang], lang);
      const variants = (step.acceptedVariants[lang] || []).map((v) =>
        normalizeByLanguage(v, lang)
      );
      const allTargets = [target, ...variants];

      for (const text of candidates) {
        const normalizedSpoken = normalizeByLanguage(text, lang);
        const strippedSpoken = stripLeadingArticles(normalizedSpoken, lang);

        // 1. Exact or variant match (raw or stripped)
        if (
          allTargets.includes(normalizedSpoken) ||
          allTargets.includes(strippedSpoken)
        ) {
          return true;
        }

        // 2. Token inclusion (e.g. child said "bonjour maman" or "je me lave bien")
        const spokenTokens = normalizedSpoken.split(' ').filter(Boolean);
        for (const variant of allTargets) {
          if (spokenTokens.includes(variant) || normalizedSpoken.includes(variant)) {
            return true;
          }
          const variantTokens = variant.split(' ').filter((vt) => vt.length >= 3);
          if (variantTokens.length > 0 && variantTokens.some((vt) => spokenTokens.includes(vt))) {
            return true;
          }
        }

        // 3. Phonetic matching for French (e.g. "leve" vs "lève", "dents" vs "dan", "ecole" vs "ekol")
        if (lang === 'fr' && preferences.difficultyLevel !== 'hard') {
          const targetPhon = phoneticFrench(target);
          const spokenPhon = phoneticFrench(strippedSpoken);
          const spokenPhonTokens = phoneticFrench(normalizedSpoken).split(' ').filter(Boolean);
          const allPhonTargets = allTargets.map((t) => phoneticFrench(t));

          if (
            allPhonTargets.includes(spokenPhon) ||
            spokenPhon.includes(targetPhon) ||
            targetPhon.includes(spokenPhon) ||
            allPhonTargets.some((pt) => spokenPhonTokens.includes(pt))
          ) {
            return true;
          }
        }

        // 4. Fuzzy similarity (tolerant for a 4yo child)
        let bestSim = 0;
        for (const cand of allTargets) {
          const sim = calculateSimilarity(normalizedSpoken, cand);
          if (sim > bestSim) bestSim = sim;
          const strippedSim = calculateSimilarity(strippedSpoken, cand);
          if (strippedSim > bestSim) bestSim = strippedSim;
        }

        const threshold = preferences.difficultyLevel === 'hard' ? 0.70 : 0.40;
        if (bestSim >= threshold) {
          return true;
        }
      }
      return false;
    },
    [lang, preferences.difficultyLevel]
  );

  /**
   * Reads and announces the current step with deliberate clarity.
   * Announces "Mon programme du matin" at the beginning, then speaks only the step expression.
   */
  const playCurrentStep = useCallback(
    async (andThenListen = true) => {
      if (!currentStep) return;
      stopAudio();
      stopListening();
      setIsListening(false);

      const stepText = currentStep.spokenPrompt[lang];

      // At the start of the routine, announce "Mon programme du matin" first
      if (currentStepIndex === 0 && !hasAnnouncedIntroRef.current) {
        hasAnnouncedIntroRef.current = true;
        setLionState('speaking');
        setFeedbackText(t.routineIntroAnnouncement);

        await speakWord(
          '',
          t.routineIntroAnnouncement,
          lang,
          () => setLionState('speaking'),
          () => {
            setTimeout(async () => {
              setLionState('speaking');
              setFeedbackText(stepText);
              await speakWord(
                '',
                stepText,
                lang,
                () => setLionState('speaking'),
                () => {
                  if (andThenListen && preferences.speechRecognitionEnabled) {
                    startStepListening();
                  } else {
                    setLionState('idle');
                  }
                },
                preferences.speechSpeed || 0.75
              );
            }, 500);
          },
          preferences.speechSpeed || 0.75
        );
        return;
      }

      // Step pronunciation: speaks ONLY the exact expression of the step
      setLionState('speaking');
      setFeedbackText(stepText);

      await speakWord(
        '',
        stepText,
        lang,
        () => setLionState('speaking'),
        () => {
          if (andThenListen && preferences.speechRecognitionEnabled) {
            startStepListening();
          } else {
            setLionState('idle');
          }
        },
        preferences.speechSpeed || 0.75
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentStep, currentStepIndex, lang, preferences.speechRecognitionEnabled, preferences.speechSpeed, t.routineIntroAnnouncement]
  );

  /**
   * Starts microphone listening for Imrane's repetition
   */
  const startStepListening = useCallback(() => {
    if (!currentStep || !preferences.speechRecognitionEnabled) return;

    setIsListening(true);
    setAudioLevel(0);
    setLionState('listening');
    setFeedbackText(t.iAmListening);

    startListening({
      lang,
      timeoutSeconds: 9,
      onStart: () => setIsListening(true),
      onAudioLevel: (lvl) => setAudioLevel(lvl),
      onInterimResult: (spokenText, alternatives) => {
        if (evaluateRoutineSpeech(spokenText, currentStep, alternatives)) {
          stopListening();
          setIsListening(false);
          setAudioLevel(0);
          handleStepSuccess();
        }
      },
      onResult: (spokenText, alternatives) => {
        setIsListening(false);
        setAudioLevel(0);
        const isMatch = evaluateRoutineSpeech(spokenText, currentStep, alternatives);
        if (isMatch) {
          handleStepSuccess();
        } else {
          setLionState('encouraging');
          setFeedbackText(
            lang === 'fr'
              ? `Presque Imrane ! Essaie de dire : ${currentStep.repeatSentence[lang]} ! 🦁`
              : lang === 'ary'
              ? `قريب بزاف عمران ! عاود قول معايا : ${currentStep.repeatSentence[lang]} ! 🦁`
              : `أنت قريب يا عمران ! حاول أن تقول : ${currentStep.repeatSentence[lang]} ! 🦁`
          );
          playEncourage();
        }
      },
      onError: (err) => {
        setIsListening(false);
        setAudioLevel(0);
        setLionState('encouraging');
        if (err === 'no-speech') {
          setFeedbackText(
            lang === 'fr'
              ? `Je t’écoute Imrane ! Répète tout doucement avec moi 🦁`
              : lang === 'ary'
              ? `كنسمعك عمران ! عاود معايا بشوية 🦁`
              : `أنا أستمع إليك يا عمران ! ردد معي بلطف 🦁`
          );
          playEncourage();
        }
      },
      onEnd: () => {
        setIsListening(false);
        setAudioLevel(0);
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, evaluateRoutineSpeech, lang, preferences.speechRecognitionEnabled, t.iAmListening]);

  /**
   * Handles successful repetition: Lion cheer, confetti, star and audio fanfare
   */
  const handleStepSuccess = useCallback(() => {
    stopListening();
    setIsListening(false);
    setAudioLevel(0);
    setIsCelebrating(true);
    setLionState('happy');

    const praise = currentStep.encouragement[lang];
    setFeedbackText(praise);
    playSuccess();

    // Award star
    addStarAndWord(currentStep.id);
    setStarsWon((prev) => prev + 1);
    onStarGained?.();

    if (!completedSteps.includes(currentStepIndex)) {
      setCompletedSteps((prev) => [...prev, currentStepIndex]);
    }

    // Auto-advance after celebratory show if autoAdvance enabled
    if (preferences.autoAdvance) {
      if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = setTimeout(() => {
        setIsCelebrating(false);
        goToNextStep();
      }, 3000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, completedSteps, currentStepIndex, onStarGained, playSuccess, preferences.autoAdvance, lang]);

  /**
   * Navigates directly to any step index with slider direction
   */
  const goToStep = useCallback((targetIndex: number) => {
    if (targetIndex === currentStepIndex || targetIndex < 0 || targetIndex >= steps.length) return;
    setDirection(targetIndex > currentStepIndex ? 1 : -1);
    if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
    setIsCelebrating(false);
    stopAudio();
    stopListening();
    setCurrentStepIndex(targetIndex);
    setLionState('idle');
  }, [currentStepIndex, steps.length, stopAudio]);

  /**
   * Advances to the next routine step or grand finale
   */
  const goToNextStep = useCallback(() => {
    if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
    setIsCelebrating(false);
    stopAudio();
    stopListening();

    if (currentStepIndex + 1 < steps.length) {
      setDirection(1);
      setCurrentStepIndex((prev) => prev + 1);
      setLionState('idle');
    } else {
      setIsFinished(true);
      setLionState('happy');
      setFeedbackText(t.routineCompletedTitle);
      playSuccess();
    }
  }, [currentStepIndex, steps.length, stopAudio, t.routineCompletedTitle, playSuccess]);

  /**
   * Go back to previous step
   */
  const goToPreviousStep = useCallback(() => {
    if (currentStepIndex > 0) {
      if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
      setIsCelebrating(false);
      stopAudio();
      stopListening();
      setDirection(-1);
      setCurrentStepIndex((prev) => prev - 1);
      setLionState('idle');
    }
  }, [currentStepIndex, stopAudio]);

  /**
   * Restart the morning routine session
   */
  const restartRoutine = () => {
    if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
    hasAnnouncedIntroRef.current = false;
    setIsCelebrating(false);
    setIsFinished(false);
    setDirection(0);
    setCurrentStepIndex(0);
    setCompletedSteps([]);
    setStarsWon(0);
    setLionState('idle');
  };

  // Keyboard navigation for desktop & accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isFinished) return;
      if (e.key === 'ArrowRight') {
        if (isRtl) goToPreviousStep();
        else goToNextStep();
      } else if (e.key === 'ArrowLeft') {
        if (isRtl) goToNextStep();
        else goToPreviousStep();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNextStep, goToPreviousStep, isFinished, isRtl]);

  // Play step prompt on index or language change
  useEffect(() => {
    if (!isFinished) {
      playCurrentStep(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStepIndex, lang, isFinished]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
      stopAudio();
      stopListening();
    };
  }, [stopAudio]);

  // Framer-motion carousel sliding variants
  const slideVariants: Variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? (isRtl ? -280 : 280) : (isRtl ? 280 : -280),
      opacity: 0,
      scale: 0.94,
      filter: 'blur(4px)',
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1,
      filter: 'blur(0px)',
      transition: {
        x: { type: 'spring' as const, stiffness: 320, damping: 30 },
        opacity: { duration: 0.28 },
        scale: { duration: 0.28 },
        filter: { duration: 0.2 },
      },
    },
    exit: (dir: number) => ({
      zIndex: 0,
      x: dir < 0 ? (isRtl ? -280 : 280) : (isRtl ? 280 : -280),
      opacity: 0,
      scale: 0.94,
      filter: 'blur(4px)',
      transition: {
        x: { type: 'spring' as const, stiffness: 320, damping: 30 },
        opacity: { duration: 0.2 },
        scale: { duration: 0.2 },
      },
    }),
  };

  return (
    <div
      className="routine-container"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Confetti & Golden Star Celebration */}
      {isCelebrating && (
        <RewardAnimation
          isRtl={isRtl}
          message={feedbackText}
        />
      )}

      {/* Top Header */}
      <header className="routine-header">
        <motion.button
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          onClick={onBackHome}
          className="flex items-center space-x-2 rtl:space-x-reverse px-3.5 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-2xl font-bold text-sm sm:text-base transition-colors cursor-pointer"
        >
          <Home className="w-5 h-5" />
          <span className="hidden sm:inline">{t.backHome}</span>
        </motion.button>

        {/* Title & Step Badge */}
        <div className="flex items-center space-x-2 sm:space-x-3 rtl:space-x-reverse">
          <div className="flex items-center space-x-2 rtl:space-x-reverse bg-gradient-to-r from-amber-100 via-orange-100 to-amber-100 border-2 border-amber-300 px-3 sm:px-5 py-1 rounded-2xl text-amber-950 font-black text-xs sm:text-base shadow-sm">
            <span>🌅</span>
            <span>{t.routineButton}</span>
          </div>

          {!isFinished && (
            <div className="hidden sm:flex items-center space-x-1.5 rtl:space-x-reverse px-3 py-1 bg-amber-500/10 border border-amber-300/80 rounded-2xl text-amber-950 text-xs sm:text-sm font-extrabold">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>{t.stepIndicator(currentStepIndex + 1, steps.length)}</span>
            </div>
          )}
        </div>

        {/* Stars Won Counter */}
        <div className="flex items-center space-x-2 rtl:space-x-reverse bg-gradient-to-r from-amber-400 to-orange-400 text-white px-3.5 sm:px-4 py-1.5 rounded-2xl font-black text-sm sm:text-base shadow-md">
          <Star className="w-5 h-5 fill-white text-white drop-shadow" />
          <span>+{starsWon}</span>
        </div>
      </header>

      {!isFinished && currentStep ? (
        /* Main Two-Column Stage: Vertical Filmstrip on Left + Full-Screen Image Stage on Right */
        <div className="routine-layout">
          
          {/* 1. LEFT COLUMN: Le film de ma matinée (Vertical Filmstrip) */}
          <aside className="routine-sidebar">
            {/* Sidebar Header */}
            <div className="routine-sidebar-header">
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <span className="text-xl">🎞️</span>
                <div className="flex flex-col">
                  <span className="text-xs sm:text-sm font-black text-amber-950">
                    {lang === 'fr'
                      ? 'Film de ma matinée'
                      : lang === 'ary'
                      ? 'فيلم الصباح ديالي'
                      : 'شريط صباحي'}
                  </span>
                  <span className="text-[10px] font-bold text-amber-700">
                    {steps.length} {lang === 'fr' ? 'étapes en photos' : 'خطوات بالصور'}
                  </span>
                </div>
              </div>

              {/* Progress counter pill */}
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-black">
                {currentStepIndex + 1}/{steps.length}
              </span>
            </div>

            {/* Vertical Scrollable List of All 8 Steps */}
            <div
              ref={thumbnailsContainerRef}
              className="routine-sidebar-list"
            >
              {steps.map((st, idx) => {
                const isCurrent = idx === currentStepIndex;
                const isDone = completedSteps.includes(idx);

                return (
                  <motion.button
                    key={st.id}
                    ref={(el) => {
                      thumbnailRefs.current[idx] = el;
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => goToStep(idx)}
                    className={`routine-sidebar-card ${
                      isCurrent ? 'is-active' : isDone ? 'is-done' : ''
                    }`}
                    title={st.title[lang]}
                  >
                    {/* Thumbnail Image */}
                    <div className="routine-sidebar-thumb">
                      <img
                        src={st.image}
                        alt={st.title[lang]}
                        loading="lazy"
                      />
                      {/* Step Number & Emoji Badge */}
                      <div className="absolute top-0.5 left-0.5 px-1 py-0.2 rounded-md bg-black/60 text-white text-[9px] font-black backdrop-blur-sm flex items-center space-x-0.5">
                        <span>{idx + 1}</span>
                        <span>{stepIcons[idx]}</span>
                      </div>
                      {/* Done Star */}
                      {isDone && (
                        <div className="absolute top-0.5 right-0.5 p-0.5 bg-emerald-500 rounded-full text-white shadow">
                          <CheckCircle2 className="w-3 h-3 fill-emerald-500 text-white" />
                        </div>
                      )}
                    </div>

                    {/* Step Title & Subtext */}
                    <div className="flex-1 min-w-0 flex flex-col">
                      <span className={`text-xs sm:text-sm font-black truncate leading-tight ${
                        isCurrent ? 'text-amber-950 font-extrabold' : 'text-slate-800'
                      }`}>
                        {st.title[lang]}
                      </span>
                      <span className="text-[10px] text-slate-500 truncate mt-0.5 font-bold">
                        « {st.repeatSentence[lang]} »
                      </span>
                    </div>

                    {/* Active Golden Star */}
                    {isCurrent && (
                      <span className="text-amber-500 font-black text-sm flex-shrink-0 animate-pulse">
                        ★
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </aside>

          {/* 2. RIGHT / CENTER: Fullscreen Hero Image & Learning Stage */}
          <main className="routine-stage">
            
            {/* Ambient Blurred Background of current image */}
            <div
              className="routine-stage-bg"
              style={{ backgroundImage: `url(${currentStep.image})` }}
            />

            {/* Central Stage Viewport with Chevrons and Full Screen Image */}
            <div className="routine-stage-image-container">
              <AnimatePresence custom={direction} mode="wait">
                <motion.div
                  key={currentStep.id}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.25}
                  onDragEnd={(_e, { offset }) => {
                    const swipeThreshold = 50;
                    if (offset.x < -swipeThreshold) {
                      if (isRtl) goToPreviousStep();
                      else goToNextStep();
                    } else if (offset.x > swipeThreshold) {
                      if (isRtl) goToNextStep();
                      else goToPreviousStep();
                    }
                  }}
                  className="relative w-full h-full flex items-center justify-center"
                >
                  {/* Full-Screen Hero Image */}
                  <img
                    src={currentStep.image}
                    alt={currentStep.title[lang]}
                    className="routine-stage-image cursor-pointer"
                    onClick={() => playCurrentStep(false)}
                    draggable={false}
                  />

                  {/* Gradient Vignette Overlays for Maximum Legibility */}
                  <div className="routine-stage-vignette" />

                  {/* Floating Top Bar (Header over image) */}
                  <div className="routine-stage-topbar pointer-events-auto">
                    <span className="inline-flex items-center space-x-2 rtl:space-x-reverse px-4 py-1.5 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/20 font-black text-xs sm:text-sm shadow-xl">
                      <span>{stepIcons[currentStepIndex]}</span>
                      <span>{t.stepIndicator(currentStep.stepNumber, steps.length)}</span>
                    </span>

                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <motion.button
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.92 }}
                        onClick={() => playCurrentStep(false)}
                        className="inline-flex items-center space-x-1.5 rtl:space-x-reverse px-3.5 py-1.5 rounded-full bg-amber-500 hover:bg-amber-400 text-white font-extrabold text-xs sm:text-sm shadow-lg border border-amber-300/40 backdrop-blur-md transition-all cursor-pointer"
                        aria-label="Écouter l'étape"
                      >
                        <Volume2 className="w-4 h-4" />
                        <span className="hidden sm:inline">Écouter</span>
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.92 }}
                        onClick={toggleFullscreen}
                        className="p-2 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 shadow-lg backdrop-blur-md transition-all cursor-pointer"
                        title={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
                        aria-label="Plein écran"
                      >
                        {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                      </motion.button>
                    </div>
                  </div>

                  {/* Floating Previous Chevron (Left Flank) */}
                  <motion.button
                    whileHover={{ scale: 1.12 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={isRtl ? goToNextStep : goToPreviousStep}
                    disabled={isRtl ? currentStepIndex === steps.length - 1 : currentStepIndex === 0}
                    className={`routine-stage-chevron ${isRtl ? 'right' : 'left'} ${
                      (isRtl ? currentStepIndex === steps.length - 1 : currentStepIndex === 0)
                        ? 'opacity-25 cursor-not-allowed hidden sm:flex'
                        : 'flex'
                    }`}
                    aria-label="Étape précédente"
                  >
                    {isRtl ? <ChevronRight className="w-7 h-7" /> : <ChevronLeft className="w-7 h-7" />}
                  </motion.button>

                  {/* Floating Next Chevron (Right Flank) */}
                  <motion.button
                    whileHover={{ scale: 1.12 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={isRtl ? goToPreviousStep : goToNextStep}
                    className={`routine-stage-chevron ${isRtl ? 'left' : 'right'} flex`}
                    aria-label="Étape suivante"
                  >
                    {isRtl ? <ChevronLeft className="w-7 h-7" /> : <ChevronRight className="w-7 h-7" />}
                  </motion.button>

                  {/* Floating Bottom Cinematic Control Dock */}
                  <div className="routine-stage-dock pointer-events-auto">
                    
                    {/* Big Step Title */}
                    <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white font-rounded drop-shadow-lg text-center tracking-tight">
                      {currentStep.title[lang]}
                    </h2>

                    {/* Speech Prompt Highlight Banner */}
                    <div className="inline-flex items-center space-x-2 rtl:space-x-reverse bg-white/20 backdrop-blur-md border-2 border-amber-300/80 px-4 sm:px-6 py-1 sm:py-1.5 rounded-2xl shadow-lg text-center">
                      <span className="text-lg sm:text-2xl">🗣️</span>
                      <p className="text-sm sm:text-lg lg:text-xl font-black text-amber-200">
                        {lang === 'fr' ? 'Répète :' : lang === 'ary' ? 'عاود قول :' : 'ردد :'} <span className="text-white underline decoration-amber-400 decoration-wavy underline-offset-4 font-black">« {currentStep.repeatSentence[lang]} »</span>
                      </p>
                    </div>

                    {/* Lion Companion Speech Bubble */}
                    <div className="flex items-center justify-center space-x-3 rtl:space-x-reverse bg-black/50 backdrop-blur-md rounded-2xl px-3.5 py-1.5 sm:py-2 border border-white/20 max-w-xl text-center">
                      <LionCharacter state={lionState} size="sm" isRtl={isRtl} />
                      <p className="text-xs sm:text-sm font-extrabold text-amber-100 flex-1">
                        {feedbackText || (lang === 'fr' ? 'À toi de répéter avec le Petit Lion !' : lang === 'ary' ? 'دورك تعاود مع السبيع الصغير !' : 'دورك لتردد مع الأسد الصغير !')}
                      </p>
                    </div>

                    {/* Listening Indicator with Audio Frequency Waves */}
                    <AnimatePresence>
                      {isListening && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="w-full flex justify-center"
                        >
                          <ListeningIndicator
                            label={t.iAmListening}
                            isListening={isListening}
                            audioLevel={audioLevel}
                            onValidateManual={handleStepSuccess}
                            validateLabel={t.stepValidated}
                            isRtl={isRtl}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Bottom Action Controls for Child */}
                    <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 w-full pt-1">
                      {/* Replay Sound */}
                      <BigActionButton
                        label={t.repeatStep}
                        icon={<Volume2 className="w-5 h-5" />}
                        onClick={() => playCurrentStep(false)}
                        variant="secondary"
                        size="md"
                        isRtl={isRtl}
                      />

                      {/* Microphone */}
                      {preferences.speechRecognitionEnabled && !isListening && (
                        <BigActionButton
                          label={t.trySpeaking}
                          icon={<Mic className="w-5 h-5" />}
                          onClick={startStepListening}
                          variant="primary"
                          size="md"
                          isRtl={isRtl}
                        />
                      )}

                      {/* Child Validation */}
                      {!isListening && (
                        <BigActionButton
                          label={t.stepValidated}
                          icon={<Star className="w-5 h-5 fill-amber-100" />}
                          onClick={handleStepSuccess}
                          variant="success"
                          size="md"
                          isRtl={isRtl}
                        />
                      )}

                      {/* Next Step */}
                      <BigActionButton
                        label={t.nextStep}
                        icon={isRtl ? <ArrowLeft className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
                        onClick={goToNextStep}
                        variant="primary"
                        size="md"
                        isRtl={isRtl}
                      />
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
        </div>
      ) : (
        /* Grand Finale: School Graduation Celebration Screen */
        <div className="flex-1 min-h-0 flex items-center justify-center w-full z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center text-center p-6 sm:p-8 bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border-4 border-amber-300 my-auto max-w-xl mx-auto z-10"
          >
            <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-2xl overflow-hidden border-4 border-amber-400 shadow-xl mb-4">
              <img
                src="/assets/routine/step-8-ecole.png"
                alt="Imrane prêt pour l'école"
                className="w-full h-full object-cover"
              />
            </div>

            <LionCharacter state="happy" size="md" isRtl={isRtl} />

            <h2 className="text-3xl sm:text-4xl font-black text-amber-950 mt-3 font-rounded">
              {t.routineCompletedTitle}
            </h2>

            <p className="text-base sm:text-lg text-slate-700 mt-2 font-bold max-w-md">
              {t.routineCompletedDesc}
            </p>

            <div className="flex items-center space-x-3 rtl:space-x-reverse bg-gradient-to-r from-amber-100 to-orange-100 border-2 border-amber-300 px-6 py-3 rounded-full my-6 text-amber-900 font-extrabold text-2xl shadow-inner">
              <Award className="w-8 h-8 text-amber-600" />
              <span>8 / 8 étapes réussies ! 🌟</span>
            </div>

            <div className="flex flex-wrap gap-4 justify-center">
              <BigActionButton
                label={lang === 'fr' ? 'Recommencer le rituel 🔄' : lang === 'ary' ? 'نعاودو الروتين 🔄' : 'إعادة الروتين 🔄'}
                icon={<RotateCcw className="w-6 h-6" />}
                onClick={restartRoutine}
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
        </div>
      )}
    </div>
  );
};
