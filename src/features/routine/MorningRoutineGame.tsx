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

  /**
   * Horizontal scroll navigation for the bottom thumbnails track
   */
  const scrollThumbnails = (scrollDirection: 'left' | 'right') => {
    if (thumbnailsContainerRef.current) {
      const scrollAmount = 260;
      thumbnailsContainerRef.current.scrollBy({
        left: scrollDirection === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
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
      className="relative min-h-screen flex flex-col justify-between p-3 sm:p-5 lg:p-6 max-w-[1520px] mx-auto w-full select-none"
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
      <header className="flex items-center justify-between gap-3 bg-white/90 backdrop-blur-md rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-lg border-2 border-amber-200 w-full z-20">
        <motion.button
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          onClick={onBackHome}
          className="flex items-center space-x-2 rtl:space-x-reverse px-3.5 sm:px-4 py-2 sm:py-2.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-2xl font-bold text-sm sm:text-base transition-colors"
        >
          <Home className="w-5 h-5" />
          <span className="hidden sm:inline">{t.backHome}</span>
        </motion.button>

        {/* Title & Step Badge */}
        <div className="flex items-center space-x-2 sm:space-x-3 rtl:space-x-reverse">
          <div className="flex items-center space-x-2 rtl:space-x-reverse bg-gradient-to-r from-amber-100 via-orange-100 to-amber-100 border-2 border-amber-300 px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-2xl text-amber-950 font-black text-xs sm:text-base shadow-sm">
            <span>🌅</span>
            <span>{t.routineButton}</span>
          </div>

          {!isFinished && (
            <div className="hidden md:flex items-center space-x-1.5 rtl:space-x-reverse px-3.5 py-1.5 bg-amber-500/10 border border-amber-300/80 rounded-2xl text-amber-950 text-xs sm:text-sm font-extrabold">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>{t.stepIndicator(currentStepIndex + 1, steps.length)}</span>
            </div>
          )}
        </div>

        {/* Stars Won Counter */}
        <div className="flex items-center space-x-2 rtl:space-x-reverse bg-gradient-to-r from-amber-400 to-orange-400 text-white px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-2xl font-black text-sm sm:text-base shadow-md">
          <Star className="w-5 h-5 fill-white text-white drop-shadow" />
          <span>+{starsWon}</span>
        </div>
      </header>

      {/* Main Central Stage: Majestic Carousel / Slider Presentation */}
      {!isFinished && currentStep ? (
        <main className="flex-1 flex flex-col items-center justify-center relative w-full my-3 sm:my-5 px-1 sm:px-4 z-10">
          
          {/* Ambient Warm Sun Halo Backlight for Audiovisual Drama */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 sm:w-[500px] lg:w-[720px] h-80 sm:h-[450px] lg:h-[550px] bg-gradient-to-tr from-amber-300/35 via-orange-200/30 to-yellow-100/25 rounded-full blur-3xl pointer-events-none -z-10" />

          {/* Carousel Viewport with Side Navigation Chevrons */}
          <div className="relative w-full max-w-5xl flex items-center justify-center">

            {/* Previous Step Chevron (Left flank) */}
            <motion.button
              whileHover={{ scale: 1.12 }}
              whileTap={{ scale: 0.9 }}
              onClick={isRtl ? goToNextStep : goToPreviousStep}
              disabled={isRtl ? currentStepIndex === steps.length - 1 : currentStepIndex === 0}
              className={`hidden sm:flex absolute -left-3 sm:-left-6 lg:-left-10 z-30 items-center justify-center w-12 h-12 lg:w-16 lg:h-16 rounded-full bg-white/95 backdrop-blur-md text-amber-900 border-3 border-amber-300 shadow-xl transition-all cursor-pointer ${
                (isRtl ? currentStepIndex === steps.length - 1 : currentStepIndex === 0)
                  ? 'opacity-30 cursor-not-allowed'
                  : 'hover:bg-amber-100 hover:border-amber-400 hover:shadow-2xl'
              }`}
              aria-label="Étape précédente"
            >
              <ChevronLeft className="w-7 h-7 lg:w-9 lg:h-9" />
            </motion.button>

            {/* Central Stage Card (Grande, Centrale & Magnifique) */}
            <div className="w-full flex flex-col items-center justify-center overflow-hidden py-2 px-1">
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
                  className="relative w-full max-w-2xl lg:max-w-3xl bg-white/95 backdrop-blur-md rounded-[2.5rem] p-4 sm:p-7 lg:p-8 shadow-2xl border-4 border-amber-300 flex flex-col items-center text-center"
                >
                  {/* Top Header Inside Card: Step indicator & Audio Replay Button */}
                  <div className="w-full flex items-center justify-between mb-3 px-2">
                    <span className="inline-flex items-center space-x-1.5 rtl:space-x-reverse px-4 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full text-xs sm:text-sm font-black shadow-md">
                      <span>{stepIcons[currentStepIndex]}</span>
                      <span>{t.stepIndicator(currentStep.stepNumber, steps.length)}</span>
                    </span>

                    <motion.button
                      whileHover={{ scale: 1.12, rotate: 6 }}
                      whileTap={{ scale: 0.92 }}
                      onClick={() => playCurrentStep(false)}
                      aria-label="Réécouter l'étape"
                      className="inline-flex items-center space-x-2 rtl:space-x-reverse px-3.5 py-1.5 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 shadow-sm transition-colors cursor-pointer"
                    >
                      <Volume2 className="w-5 h-5 text-amber-700" />
                      <span className="text-xs sm:text-sm font-extrabold hidden sm:inline">Écouter</span>
                    </motion.button>
                  </div>

                  {/* Grand Hero Photo Container (Au Milieu, Plus Grande et Centrale) */}
                  <motion.div
                    whileHover={{ scale: 1.015 }}
                    onClick={() => playCurrentStep(false)}
                    className="relative w-full h-64 sm:h-80 md:h-96 lg:h-[420px] rounded-3xl overflow-hidden border-4 border-amber-200/90 shadow-2xl bg-gradient-to-b from-amber-50 to-orange-50 cursor-pointer flex items-center justify-center group"
                  >
                    <img
                      src={currentStep.image}
                      alt={currentStep.title[lang]}
                      className="w-full h-full object-cover select-none transition-transform duration-500 group-hover:scale-105"
                      draggable={false}
                    />

                    {/* Subtle Sun-kissed Vignette Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent pointer-events-none" />

                    {/* Quick Play Audio Ripple Trigger on Image */}
                    <div className="absolute bottom-4 right-4 p-3 bg-white/90 backdrop-blur-md rounded-2xl text-amber-900 shadow-lg border border-amber-200 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                      <Volume2 className="w-6 h-6" />
                    </div>
                  </motion.div>

                  {/* Stage Text: Big Title & Spoken Expression */}
                  <div className="mt-4 sm:mt-5 w-full flex flex-col items-center">
                    <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-slate-800 font-rounded tracking-tight drop-shadow-sm">
                      {currentStep.title[lang]}
                    </h2>

                    {/* Speech Prompt Banner */}
                    <div className="mt-2.5 inline-flex items-center space-x-2 rtl:space-x-reverse bg-gradient-to-r from-amber-100 via-orange-100 to-amber-100 border-2 border-amber-300 px-5 sm:px-7 py-2 sm:py-2.5 rounded-2xl shadow-sm text-center">
                      <span className="text-xl sm:text-2xl">🗣️</span>
                      <p className="text-base sm:text-xl lg:text-2xl font-black text-amber-950">
                        {lang === 'fr' ? 'Répète :' : lang === 'ary' ? 'عاود قول :' : 'ردد :'} <span className="text-amber-800 underline decoration-amber-400 decoration-wavy underline-offset-4 font-black">« {currentStep.repeatSentence[lang]} »</span>
                      </p>
                    </div>
                  </div>

                  {/* Integrated Lion Companion Feedback Bar */}
                  <div className="mt-3.5 w-full flex items-center justify-center gap-3 bg-amber-50/80 border border-amber-200/80 rounded-2xl p-2.5 sm:p-3">
                    <LionCharacter
                      state={lionState}
                      size="sm"
                      isRtl={isRtl}
                    />
                    <p className="text-sm sm:text-base font-extrabold text-amber-950 flex-1 text-center sm:text-left rtl:sm:text-right">
                      {feedbackText || (lang === 'fr' ? 'À toi de répéter avec le Petit Lion !' : lang === 'ary' ? 'دورك تعاود مع السبيع الصغير !' : 'دورك لتردد مع الأسد الصغير !')}
                    </p>
                  </div>

                  {/* Listening Indicator with Sound Waves */}
                  <AnimatePresence>
                    {isListening && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="w-full flex justify-center mt-3"
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

                  {/* Interactive Action Control Buttons for Imrane */}
                  <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-4 mt-4 w-full">
                    {/* Replay Sound Button */}
                    <BigActionButton
                      label={t.repeatStep}
                      icon={<Volume2 className="w-5 h-5 sm:w-6 sm:h-6" />}
                      onClick={() => playCurrentStep(false)}
                      variant="secondary"
                      size="md"
                      isRtl={isRtl}
                    />

                    {/* Microphone Activation Button (if speech enabled) */}
                    {preferences.speechRecognitionEnabled && !isListening && (
                      <BigActionButton
                        label={t.trySpeaking}
                        icon={<Mic className="w-5 h-5 sm:w-6 sm:h-6" />}
                        onClick={startStepListening}
                        variant="primary"
                        size="md"
                        isRtl={isRtl}
                      />
                    )}

                    {/* Child Validation Button (Never blocked) */}
                    {!isListening && (
                      <BigActionButton
                        label={t.stepValidated}
                        icon={<Star className="w-5 h-5 sm:w-6 sm:h-6 fill-amber-100" />}
                        onClick={handleStepSuccess}
                        variant="success"
                        size="md"
                        isRtl={isRtl}
                      />
                    )}

                    {/* Next Step Button */}
                    <BigActionButton
                      label={t.nextStep}
                      icon={isRtl ? <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" /> : <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6" />}
                      onClick={goToNextStep}
                      variant="primary"
                      size="md"
                      isRtl={isRtl}
                    />
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Next Step Chevron (Right flank) */}
            <motion.button
              whileHover={{ scale: 1.12 }}
              whileTap={{ scale: 0.9 }}
              onClick={isRtl ? goToPreviousStep : goToNextStep}
              className="hidden sm:flex absolute -right-3 sm:-right-6 lg:-right-10 z-30 items-center justify-center w-12 h-12 lg:w-16 lg:h-16 rounded-full bg-white/95 backdrop-blur-md text-amber-900 border-3 border-amber-300 shadow-xl hover:bg-amber-100 hover:border-amber-400 hover:shadow-2xl transition-all cursor-pointer"
              aria-label="Étape suivante"
            >
              <ChevronRight className="w-7 h-7 lg:w-9 lg:h-9" />
            </motion.button>
          </div>
        </main>
      ) : (
        /* Grand Finale: School Graduation Celebration Screen */
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex-1 flex flex-col items-center justify-center text-center p-6 sm:p-8 bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border-4 border-amber-300 my-4 max-w-xl mx-auto z-10"
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
      )}

      {/* Bottom Filmstrip Carousel / Slider ("Affiche les images en bas") */}
      {!isFinished && (
        <section className="relative w-full mt-3 sm:mt-4 z-20">
          <div className="bg-white/90 backdrop-blur-md rounded-3xl p-3 sm:p-4 border-2 border-amber-200/90 shadow-xl max-w-6xl mx-auto">
            {/* Carousel Header with Track Navigation */}
            <div className="flex items-center justify-between px-2 mb-2">
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <span className="text-base sm:text-lg">🎞️</span>
                <span className="text-xs sm:text-sm font-black text-amber-950">
                  {lang === 'fr'
                    ? 'Le film de ma matinée (8 étapes en photos)'
                    : lang === 'ary'
                    ? 'فيلم الصباح ديالي (8 خطوات بالصور)'
                    : 'شريط صباحي (8 خطوات بالصور)'}
                </span>
              </div>

              {/* Mini Scroll Chevrons for Mobile / Overflow */}
              <div className="flex items-center space-x-1.5 rtl:space-x-reverse">
                <button
                  onClick={() => scrollThumbnails('left')}
                  className="p-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 transition-colors shadow-sm"
                  aria-label="Faire défiler vers la gauche"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => scrollThumbnails('right')}
                  className="p-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 transition-colors shadow-sm"
                  aria-label="Faire défiler vers la droite"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Horizontal Filmstrip of Real Images */}
            <div
              ref={thumbnailsContainerRef}
              className="flex items-center space-x-3 sm:space-x-4 rtl:space-x-reverse overflow-x-auto py-2 px-1 scroll-smooth no-scrollbar"
              style={{ scrollSnapType: 'x mandatory' }}
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
                    whileHover={{ scale: 1.08, y: -4 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => goToStep(idx)}
                    className={`relative flex-shrink-0 flex flex-col items-center rounded-2xl p-1.5 transition-all cursor-pointer ${
                      isCurrent
                        ? 'ring-4 ring-amber-400 bg-amber-100/90 shadow-2xl scale-105 sm:scale-110 -translate-y-1'
                        : isDone
                        ? 'ring-2 ring-emerald-400 bg-emerald-50/80 shadow-md opacity-90'
                        : 'border-2 border-slate-200 bg-white/70 shadow-sm opacity-70 hover:opacity-100'
                    }`}
                    style={{ scrollSnapAlign: 'center' }}
                    title={st.title[lang]}
                  >
                    {/* Thumbnail Image Container */}
                    <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-xl overflow-hidden bg-slate-100 relative border border-black/10">
                      <img
                        src={st.image}
                        alt={st.title[lang]}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />

                      {/* Step Number & Emoji Badge */}
                      <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-black/60 text-white text-[10px] sm:text-xs font-black backdrop-blur-sm flex items-center space-x-0.5">
                        <span>{idx + 1}</span>
                        <span>{stepIcons[idx]}</span>
                      </div>

                      {/* Completed Golden Star Overlay */}
                      {isDone && (
                        <div className="absolute top-1 right-1 p-0.5 bg-emerald-500 rounded-full text-white shadow-md">
                          <CheckCircle2 className="w-3.5 h-3.5 fill-emerald-500 text-white" />
                        </div>
                      )}

                      {/* Active Beacon Pulse */}
                      {isCurrent && (
                        <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-md bg-amber-500 text-white text-[9px] font-black uppercase tracking-wider animate-pulse shadow">
                          ★
                        </div>
                      )}
                    </div>

                    {/* Step Title Label Under Image */}
                    <span className={`text-[11px] sm:text-xs font-black mt-1.5 max-w-[76px] sm:max-w-[96px] truncate ${
                      isCurrent ? 'text-amber-950 font-extrabold' : 'text-slate-600'
                    }`}>
                      {st.title[lang].replace(/[!.]/g, '')}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
