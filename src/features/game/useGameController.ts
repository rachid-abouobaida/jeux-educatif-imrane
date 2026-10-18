import { useState, useEffect, useCallback, useRef } from 'react';
import { Word, AppLanguage, GameState, LionState, UserPreferences, SpeechEvaluationResult } from '../../types';
import { translations } from '../../i18n/translations';
import { startListening, stopListening } from '../speech/speechRecognitionService';
import { evaluatePronunciation } from '../speech/pronunciationEvaluator';
import { useAudio } from '../../hooks/useAudio';
import { addStarAndWord } from '../../services/storageService';

interface UseGameControllerProps {
  words: Word[];
  lang: AppLanguage;
  preferences: UserPreferences;
  onStarAwarded?: () => void;
}

export const useGameController = ({
  words,
  lang,
  preferences,
  onStarAwarded,
}: UseGameControllerProps) => {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [gameState, setGameState] = useState<GameState>('idle');
  const [lionState, setLionState] = useState<LionState>('idle');
  const [feedbackText, setFeedbackText] = useState<string>('');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [retriesCount, setRetriesCount] = useState<number>(0);
  const [sessionStarsGained, setSessionStarsGained] = useState<number>(0);
  const [sessionWordsLearned, setSessionWordsLearned] = useState<string[]>([]);
  const [lastEvaluation, setLastEvaluation] = useState<SpeechEvaluationResult | null>(null);
  const [isSessionFinished, setIsSessionFinished] = useState<boolean>(false);
  const [audioLevel, setAudioLevel] = useState<number>(0);

  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repeatTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;
  const isSessionFinishedRef = useRef(isSessionFinished);
  isSessionFinishedRef.current = isSessionFinished;

  const currentWord = words[currentWordIndex] || words[0];
  const currentWordRef = useRef(currentWord);
  currentWordRef.current = currentWord;

  const { speakWord, playSuccess, playEncourage, stop: stopAudio } = useAudio(
    preferences.volume,
    preferences.soundEffectsEnabled,
    preferences.speechSpeed || 0.75
  );

  const t = translations[lang];

  // Helper to get random encouragement or success phrase
  const getRandomPhrase = (list: string[]) => {
    const index = Math.floor(Math.random() * list.length);
    return list[index];
  };

  /**
   * Clear the automatic 4-second word repetition timer
   */
  const clearRepeatTimer = useCallback(() => {
    if (repeatTimerRef.current) {
      clearTimeout(repeatTimerRef.current);
      repeatTimerRef.current = null;
    }
  }, []);

  /**
   * Schedule the next word repetition (default 4 seconds)
   */
  const scheduleRepeat = useCallback(
    (delayMs?: number) => {
      clearRepeatTimer();
      const repeatIntervalSec = preferences.wordRepeatIntervalSeconds ?? 4;
      if (repeatIntervalSec <= 0) return;

      const delay = delayMs ?? repeatIntervalSec * 1000;
      repeatTimerRef.current = setTimeout(() => {
        if (
          gameStateRef.current === 'success' ||
          gameStateRef.current === 'completed' ||
          isSessionFinishedRef.current
        ) {
          return;
        }
        playCurrentWordRef.current?.(true);
      }, delay);
    },
    [clearRepeatTimer, preferences.wordRepeatIntervalSeconds]
  );

  /**
   * Reads the current word with lion animation and schedules 4s repetition
   */
  const playCurrentWord = useCallback(
    async (andThenListen = true) => {
      if (!currentWord) return;
      clearRepeatTimer();
      stopAudio();
      stopListening();
      setIsListening(false);
      setGameState('speaking');
      setLionState('speaking');

      const wordText = currentWord.translations[lang];
      const audioPath = currentWord.audio[lang];
      setFeedbackText(t.presentationText(wordText));

      await speakWord(
        audioPath,
        wordText,
        lang,
        () => {
          setLionState('speaking');
        },
        () => {
          // Finished playing
          if (
            gameStateRef.current === 'success' ||
            gameStateRef.current === 'completed' ||
            isSessionFinishedRef.current
          ) {
            return;
          }

          if (andThenListen && preferences.speechRecognitionEnabled) {
            setGameState('listening');
            setLionState('listening');
            setFeedbackText(t.repeatInvitation(wordText));
            listenForRepetition();
          } else {
            setGameState('idle');
            setLionState('idle');
            setFeedbackText(t.presentationText(wordText));
          }

          // Schedule automatic repetition after 4 seconds
          scheduleRepeat();
        }
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentWord, lang, preferences.speechRecognitionEnabled, preferences.volume, scheduleRepeat, stopAudio, t]
  );

  const playCurrentWordRef = useRef(playCurrentWord);
  playCurrentWordRef.current = playCurrentWord;

  /**
   * Success handler: lion is happy, award star, confetti
   */
  const handleSuccess = useCallback(() => {
    clearRepeatTimer();
    stopListening();
    setIsListening(false);
    setAudioLevel(0);
    setGameState('success');
    setLionState('happy');

    const phrase = getRandomPhrase(t.successMessages);
    setFeedbackText(phrase);
    playSuccess();

    // Save progress locally
    addStarAndWord(currentWord.id);
    setSessionStarsGained((prev) => prev + 1);
    setSessionWordsLearned((prev) =>
      prev.includes(currentWord.id) ? prev : [...prev, currentWord.id]
    );
    onStarAwarded?.();

    // Auto advance if configured
    if (preferences.autoAdvance) {
      if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = setTimeout(() => {
        nextWord();
      }, 2600);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearRepeatTimer, currentWord.id, onStarAwarded, playSuccess, preferences.autoAdvance, t.successMessages]);

  /**
   * Processes the recognized text through pronunciation evaluator
   */
  const handleSpokenResult = useCallback(
    (spokenText: string, alternatives?: string[]) => {
      const activeWord = currentWordRef.current;
      if (!activeWord) return;

      const evalResult = evaluatePronunciation(
        spokenText,
        activeWord,
        lang,
        preferences.difficultyLevel,
        alternatives
      );
      setLastEvaluation(evalResult);

      if (evalResult.isMatch) {
        handleSuccess();
      } else {
        handleMismatchOrRetry(spokenText);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [handleSuccess, lang, preferences.difficultyLevel, retriesCount]
  );

  /**
   * Starts listening to Imrane's voice repetition with zero-lag interim detection
   */
  const listenForRepetition = useCallback(() => {
    const activeWord = currentWordRef.current;
    if (!activeWord || !preferences.speechRecognitionEnabled) return;

    setIsListening(true);
    setAudioLevel(0);
    setGameState('listening');
    setLionState('listening');
    setFeedbackText(t.iAmListening);

    startListening({
      lang,
      timeoutSeconds: 9,
      onStart: () => {
        setIsListening(true);
      },
      onAudioLevel: (level) => {
        setAudioLevel(level);
      },
      onInterimResult: (spokenText, alternatives) => {
        // Fast instant match check: as soon as the child says the word, reward immediately!
        const targetWord = currentWordRef.current;
        if (!targetWord) return;

        const evalResult = evaluatePronunciation(
          spokenText,
          targetWord,
          lang,
          preferences.difficultyLevel,
          alternatives
        );

        if (evalResult.isMatch) {
          setLastEvaluation(evalResult);
          stopListening();
          setIsListening(false);
          setAudioLevel(0);
          handleSuccess();
        }
      },
      onResult: (spokenText, alternatives) => {
        setIsListening(false);
        setAudioLevel(0);
        handleSpokenResult(spokenText, alternatives);
      },
      onError: (err) => {
        setIsListening(false);
        setAudioLevel(0);
        console.debug('Speech recognition notice:', err);
        if (err === 'no-speech') {
          // Warm, gentle guidance when silence or very soft speech is heard
          setLionState('encouraging');
          setFeedbackText(
            lang === 'fr'
              ? `Le lion t’écoute... Parle tout doucement 🦁`
              : lang === 'ary'
              ? `كنسمعك عمران... عاود قول معايا بشوية 🦁`
              : `أنا أستمع يا عمران... ردد معي بلطف 🦁`
          );
          playEncourage();
        } else {
          handleMismatchOrRetry('...');
        }
      },
      onEnd: () => {
        setIsListening(false);
        setAudioLevel(0);
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleSuccess, lang, preferences.speechRecognitionEnabled, preferences.difficultyLevel, t]);

  /**
   * Friendly encouragement if mismatch: never scold
   */
  const handleMismatchOrRetry = useCallback(
    (_spokenText: string) => {
      const nextRetries = retriesCount + 1;
      setRetriesCount(nextRetries);

      if (nextRetries >= preferences.maxRetries) {
        // After max attempts, reward effort warmly so the 4yo is celebrated!
        handleSuccess();
      } else {
        setGameState('retry');
        setLionState('encouraging');
        setFeedbackText(getRandomPhrase(t.encouragementMessages));
        playEncourage();
        // Repeat word shortly after encouragement so the child can try again
        scheduleRepeat(2000);
      }
    },
    [handleSuccess, playEncourage, preferences.maxRetries, retriesCount, scheduleRepeat, t.encouragementMessages]
  );

  /**
   * Manual validation button (always accessible if mic is off/unavailable)
   */
  const validateManually = useCallback(() => {
    clearRepeatTimer();
    stopListening();
    setIsListening(false);
    handleSuccess();
  }, [clearRepeatTimer, handleSuccess]);

  /**
   * Advance to the next word
   */
  const nextWord = useCallback(() => {
    clearRepeatTimer();
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    stopAudio();
    stopListening();
    setIsListening(false);
    setRetriesCount(0);
    setLastEvaluation(null);

    if (currentWordIndex + 1 >= words.length) {
      // Reached the end of words or session
      setIsSessionFinished(true);
      setGameState('completed');
      setLionState('happy');
      setFeedbackText(t.sessionCompletedTitle);
    } else {
      setCurrentWordIndex((prev) => prev + 1);
      setGameState('idle');
      setLionState('idle');
    }
  }, [clearRepeatTimer, currentWordIndex, stopAudio, t.sessionCompletedTitle, words.length]);

  /**
   * Go to previous word
   */
  const previousWord = useCallback(() => {
    if (currentWordIndex > 0) {
      clearRepeatTimer();
      stopAudio();
      stopListening();
      setIsListening(false);
      setRetriesCount(0);
      setLastEvaluation(null);
      setCurrentWordIndex((prev) => prev - 1);
      setGameState('idle');
      setLionState('idle');
    }
  }, [clearRepeatTimer, currentWordIndex, stopAudio]);

  /**
   * Restart session from beginning
   */
  const restartSession = useCallback(() => {
    clearRepeatTimer();
    stopAudio();
    stopListening();
    setCurrentWordIndex(0);
    setRetriesCount(0);
    setSessionStarsGained(0);
    setIsSessionFinished(false);
    setGameState('idle');
    setLionState('idle');
  }, [clearRepeatTimer, stopAudio]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      clearRepeatTimer();
      if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
      stopAudio();
      stopListening();
    };
  }, [clearRepeatTimer, stopAudio]);

  // Reset index when words list changes (e.g. category switch)
  useEffect(() => {
    clearRepeatTimer();
    setCurrentWordIndex(0);
    setGameState('idle');
    setLionState('idle');
  }, [clearRepeatTimer, words]);

  // When current word or language changes, play it exactly once and start repetition cycle
  const currentWordId = currentWord ? currentWord.id : null;
  useEffect(() => {
    clearRepeatTimer();
    playCurrentWord(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWordId, lang]);

  return {
    state: {
      currentWordIndex,
      currentWord,
      gameState,
      lionState,
      feedbackText,
      isListening,
      retriesCount,
      sessionStarsGained,
      sessionWordsLearned,
      lastEvaluation,
      isSessionFinished,
      audioLevel,
    },
    actions: {
      playCurrentWord: () => playCurrentWord(false),
      startListeningRepeat: listenForRepetition,
      validateManually,
      nextWord,
      previousWord,
      restartSession,
    },
  };
};
