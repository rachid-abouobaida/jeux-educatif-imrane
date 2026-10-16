import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RoutineStep, AppLanguage, UserPreferences, LionState } from '../../types';
import routineStepsData from '../../data/routineSteps.json';
import { translations } from '../../i18n/translations';
import { LionCharacter } from '../../components/LionCharacter';
import { ListeningIndicator } from '../../components/ListeningIndicator';
import { RewardAnimation } from '../../components/RewardAnimation';
import { BigActionButton } from '../../components/BigActionButton';
import { useAudio } from '../../hooks/useAudio';
import { startListening, stopListening } from '../speech/speechRecognitionService';
import { normalizeByLanguage, calculateSimilarity } from '../speech/pronunciationEvaluator';
import { addStarAndWord } from '../../services/storageService';
import { Home, Volume2, Mic, ArrowRight, ArrowLeft, Star, RotateCcw, Award } from 'lucide-react';

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
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [lionState, setLionState] = useState<LionState>('idle');
  const [feedbackText, setFeedbackText] = useState<string>('');
  const [isListening, setIsListening] = useState(false);
  const [isCelebrating, setIsCelebrating] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [starsWon, setStarsWon] = useState(0);

  const autoNextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasAnnouncedIntroRef = useRef<boolean>(false);

  const { speakWord, playSuccess, playEncourage, stop: stopAudio } = useAudio(
    preferences.volume,
    preferences.soundEffectsEnabled,
    preferences.speechSpeed || 0.75
  );

  const currentStep = steps[currentStepIndex];

  // Icons for the 8 routine steps
  const stepIcons = ['☀️', '🛏️', '🛁', '💧', '🪥', '🥣', '👕', '🎒'];

  /**
   * Evaluates if Imrane's speech matches the routine sentence
   */
  const evaluateRoutineSpeech = useCallback(
    (spokenText: string, step: RoutineStep): boolean => {
      if (!spokenText.trim()) return false;
      const normalizedSpoken = normalizeByLanguage(spokenText, lang);
      const target = normalizeByLanguage(step.repeatSentence[lang], lang);
      const variants = (step.acceptedVariants[lang] || []).map((v) =>
        normalizeByLanguage(v, lang)
      );

      // Exact or variant match
      if (normalizedSpoken === target || variants.includes(normalizedSpoken)) {
        return true;
      }

      // Token inclusion (e.g. child said "bonjour maman" or "je mange bien")
      const spokenTokens = normalizedSpoken.split(' ').filter(Boolean);
      for (const variant of [target, ...variants]) {
        if (spokenTokens.includes(variant) || normalizedSpoken.includes(variant)) {
          return true;
        }
      }

      // Fuzzy similarity (tolerant for a 4yo child)
      let bestSim = 0;
      for (const cand of [target, ...variants]) {
        const sim = calculateSimilarity(normalizedSpoken, cand);
        if (sim > bestSim) bestSim = sim;
      }

      // Threshold based on difficulty
      const threshold = preferences.difficultyLevel === 'hard' ? 0.70 : 0.45;
      return bestSim >= threshold;
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
    setLionState('listening');
    setFeedbackText(t.iAmListening);

    startListening({
      lang,
      timeoutSeconds: 8,
      onStart: () => setIsListening(true),
      onResult: (spokenText) => {
        setIsListening(false);
        const isMatch = evaluateRoutineSpeech(spokenText, currentStep);
        if (isMatch) {
          handleStepSuccess();
        } else {
          // Encourage kindly
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
      onError: () => {
        setIsListening(false);
        setLionState('encouraging');
      },
      onEnd: () => setIsListening(false),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, evaluateRoutineSpeech, lang, preferences.speechRecognitionEnabled, t.iAmListening]);

  /**
   * Handles successful repetition: Lion cheer, confetti, star and audio fanfare
   */
  const handleStepSuccess = useCallback(() => {
    stopListening();
    setIsListening(false);
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
   * Advances to the next routine step or grand finale
   */
  const goToNextStep = useCallback(() => {
    if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
    setIsCelebrating(false);
    stopAudio();
    stopListening();

    if (currentStepIndex + 1 < steps.length) {
      setCurrentStepIndex((prev) => prev + 1);
      setLionState('idle');
    } else {
      // Completed all 8 steps! Grand finale!
      setIsFinished(true);
      setLionState('happy');
      setFeedbackText(t.routineCompletedTitle);
      playSuccess();
    }
  }, [currentStepIndex, steps.length, stopAudio, t.routineCompletedTitle, playSuccess]);

  /**
   * Go back to previous step
   */
  const goToPreviousStep = () => {
    if (currentStepIndex > 0) {
      if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
      setIsCelebrating(false);
      stopAudio();
      stopListening();
      setCurrentStepIndex((prev) => prev - 1);
      setLionState('idle');
    }
  };

  /**
   * Restart the morning routine session
   */
  const restartRoutine = () => {
    if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
    hasAnnouncedIntroRef.current = false;
    setIsCelebrating(false);
    setIsFinished(false);
    setCurrentStepIndex(0);
    setCompletedSteps([]);
    setStarsWon(0);
    setLionState('idle');
  };

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

  return (
    <div
      className="relative min-h-screen flex flex-col justify-between p-3 sm:p-6 max-w-5xl mx-auto"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Confetti & Golden Star Celebration */}
      {isCelebrating && (
        <RewardAnimation
          isRtl={isRtl}
          message={feedbackText}
        />
      )}

      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 bg-white/85 backdrop-blur-md rounded-3xl p-3 sm:p-4 shadow-lg border-2 border-amber-200">
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          onClick={onBackHome}
          className="flex items-center space-x-2 rtl:space-x-reverse px-3.5 py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-2xl font-bold text-sm sm:text-base"
        >
          <Home className="w-5 h-5" />
          <span className="hidden sm:inline">{t.backHome}</span>
        </motion.button>

        {/* Title Badge */}
        <div className="flex items-center space-x-2 rtl:space-x-reverse bg-gradient-to-r from-amber-100 to-orange-100 border border-amber-300 px-4 py-1.5 rounded-2xl text-amber-950 font-black text-sm sm:text-base shadow-sm">
          <span>🌅</span>
          <span>{t.routineButton}</span>
        </div>

        {/* Stars Won Counter */}
        <div className="flex items-center space-x-2 rtl:space-x-reverse bg-gradient-to-r from-amber-400 to-orange-400 text-white px-4 py-2 rounded-2xl font-black text-sm sm:text-base shadow-md">
          <Star className="w-5 h-5 fill-white" />
          <span>+{starsWon}</span>
        </div>
      </header>

      {/* Routine Progress Timeline (8 Interactive Circles) */}
      <div className="my-3 px-2">
        <div className="flex items-center justify-between max-w-2xl mx-auto bg-white/70 backdrop-blur-sm p-3 rounded-2xl border border-amber-200 shadow-sm overflow-x-auto">
          {steps.map((st, idx) => {
            const isCurrent = idx === currentStepIndex;
            const isDone = completedSteps.includes(idx);

            return (
              <motion.button
                key={st.id}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
                  setIsCelebrating(false);
                  setCurrentStepIndex(idx);
                }}
                className={`relative flex flex-col items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full font-black text-sm sm:text-base transition-all select-none ${
                  isCurrent
                    ? 'bg-amber-500 text-white ring-4 ring-amber-300 scale-110 shadow-lg'
                    : isDone
                    ? 'bg-emerald-500 text-white shadow-md'
                    : 'bg-white text-slate-500 border-2 border-slate-200'
                }`}
                title={st.title[lang]}
              >
                <span>{stepIcons[idx]}</span>
                {isDone && (
                  <span className="absolute -top-1 -right-1 text-xs">⭐</span>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Main Routine Stage */}
      {!isFinished && currentStep ? (
        <main className="flex-1 flex flex-col md:flex-row items-center justify-center gap-6 sm:gap-10 my-2">
          {/* Left: Little Lion Character Companion */}
          <div className="flex flex-col items-center justify-center w-full md:w-5/12">
            <LionCharacter
              state={lionState}
              size="lg"
              speechBubbleText={feedbackText}
              isRtl={isRtl}
            />
          </div>

          {/* Right: Imrane's Morning Photo Card & Voice Repeat Arena */}
          <div className="flex flex-col items-center justify-center w-full md:w-7/12 space-y-4">
            <motion.div
              key={currentStep.id}
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 280, damping: 22 }}
              className="relative bg-white/95 backdrop-blur-md rounded-3xl p-4 sm:p-6 shadow-2xl border-4 border-amber-300 w-full max-w-md flex flex-col items-center text-center"
            >
              {/* Step Number Tag */}
              <div className="absolute top-3.5 left-4 px-3.5 py-1 bg-amber-500 text-white rounded-full text-xs sm:text-sm font-black shadow-sm">
                {t.stepIndicator(currentStep.stepNumber, steps.length)}
              </div>

              {/* Re-listen Button */}
              <button
                onClick={() => playCurrentStep(false)}
                aria-label="Écouter l'étape"
                className="absolute top-3.5 right-4 p-2.5 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-800 shadow-sm transition-colors"
              >
                <Volume2 className="w-5 h-5" />
              </button>

              {/* Real Photo of Imrane */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                onClick={() => playCurrentStep(false)}
                className="w-full max-w-xs sm:max-w-sm h-64 sm:h-72 my-2 rounded-2xl overflow-hidden border-2 border-amber-200 shadow-md cursor-pointer bg-slate-100 flex items-center justify-center"
              >
                <img
                  src={currentStep.image}
                  alt={currentStep.title[lang]}
                  className="w-full h-full object-cover select-none"
                  draggable={false}
                />
              </motion.div>

              {/* Step Title & Phrase to Repeat */}
              <div className="mt-2">
                <h2 className="text-2xl sm:text-3xl font-black text-slate-800 font-rounded">
                  {currentStep.title[lang]}
                </h2>
                <p className="text-sm sm:text-base font-bold text-amber-900 mt-1 bg-amber-50 px-4 py-1.5 rounded-xl border border-amber-200 inline-block">
                  🗣️ {lang === 'fr' ? 'Répète :' : lang === 'ary' ? 'عاود قول :' : 'ردد :'} « {currentStep.repeatSentence[lang]} »
                </p>
              </div>
            </motion.div>

            {/* Listening Indicator with Waves */}
            <AnimatePresence>
              {isListening && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="w-full flex justify-center"
                >
                  <ListeningIndicator
                    label={t.iAmListening}
                    isListening={isListening}
                    onValidateManual={handleStepSuccess}
                    validateLabel={t.stepValidated}
                    isRtl={isRtl}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tactile Control Buttons for Child */}
            <div className="flex flex-wrap items-center justify-center gap-3 w-full">
              {/* Re-listen Button */}
              <BigActionButton
                label={t.repeatStep}
                icon={<Volume2 className="w-6 h-6" />}
                onClick={() => playCurrentStep(false)}
                variant="secondary"
                size="md"
                isRtl={isRtl}
              />

              {/* Mic Repeat Trigger (if speech enabled) */}
              {preferences.speechRecognitionEnabled && !isListening && (
                <BigActionButton
                  label={t.trySpeaking}
                  icon={<Mic className="w-6 h-6" />}
                  onClick={startStepListening}
                  variant="primary"
                  size="md"
                  isRtl={isRtl}
                />
              )}

              {/* Direct Child Success Button (Never blocks child) */}
              {!isListening && (
                <BigActionButton
                  label={t.stepValidated}
                  icon={<Star className="w-6 h-6 fill-amber-100" />}
                  onClick={handleStepSuccess}
                  variant="success"
                  size="md"
                  isRtl={isRtl}
                />
              )}

              {/* Next Step Button */}
              <BigActionButton
                label={t.nextStep}
                icon={isRtl ? <ArrowLeft className="w-6 h-6" /> : <ArrowRight className="w-6 h-6" />}
                onClick={goToNextStep}
                variant="primary"
                size="md"
                isRtl={isRtl}
              />
            </div>
          </div>
        </main>
      ) : (
        /* Grand Finale: School Graduation Celebration Screen */
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex-1 flex flex-col items-center justify-center text-center p-6 sm:p-8 bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border-4 border-amber-300 my-4 max-w-xl mx-auto"
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

      {/* Bottom Footer Arrows */}
      {!isFinished && (
        <footer className="flex justify-between items-center py-2">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={goToPreviousStep}
            disabled={currentStepIndex === 0}
            className={`p-3 rounded-full bg-white/80 shadow border border-amber-200 text-amber-900 ${
              currentStepIndex === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-amber-100'
            }`}
            aria-label="Étape précédente"
          >
            {isRtl ? <ArrowRight className="w-6 h-6" /> : <ArrowLeft className="w-6 h-6" />}
          </motion.button>

          <p className="text-xs sm:text-sm text-slate-500 font-semibold text-center">
            {t.routineSubtitle}
          </p>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={goToNextStep}
            className="p-3 rounded-full bg-white/80 shadow border border-amber-200 text-amber-900 hover:bg-amber-100"
            aria-label="Étape suivante"
          >
            {isRtl ? <ArrowLeft className="w-6 h-6" /> : <ArrowRight className="w-6 h-6" />}
          </motion.button>
        </footer>
      )}
    </div>
  );
};
