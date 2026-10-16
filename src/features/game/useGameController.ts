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

  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { speakWord, playSuccess, playEncourage, stop: stopAudio } = useAudio(
    preferences.volume,
    preferences.soundEffectsEnabled
  );

  const currentWord = words[currentWordIndex] || words[0];
  const t = translations[lang];

  // Helper to get random encouragement or success phrase
  const getRandomPhrase = (list: string[]) => {
    const index = Math.floor(Math.random() * list.length);
    return list[index];
  };

  /**
   * Reads the current word with lion animation
   */
  const playCurrentWord = useCallback(
    async (andThenListen = true) => {
      if (!currentWord) return;
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
          if (andThenListen && preferences.speechRecognitionEnabled) {
            setGameState('listening');
            setLionState('listening');
            setFeedbackText(t.repeatInvitation(wordText));
            // Trigger repeat listening
            listenForRepetition();
          } else {
            setGameState('idle');
            setLionState('idle');
            setFeedbackText(t.presentationText(wordText));
          }
        }
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentWord, lang, preferences.speechRecognitionEnabled, preferences.volume, t]
  );

  /**
   * Starts listening to Imrane's voice repetition
   */
  const listenForRepetition = useCallback(() => {
    if (!currentWord || !preferences.speechRecognitionEnabled) return;

    setIsListening(true);
    setGameState('listening');
    setLionState('listening');
    setFeedbackText(t.iAmListening);

    startListening({
      lang,
      timeoutSeconds: 7,
      onStart: () => {
        setIsListening(true);
      },
      onResult: (spokenText) => {
        setIsListening(false);
        handleSpokenResult(spokenText);
      },
      onError: (err) => {
        setIsListening(false);
        console.debug('Speech recognition ended with notice:', err);
        // On error or no speech, provide gentle guidance
        handleMismatchOrRetry(err === 'no-speech' ? '' : '...');
      },
      onEnd: () => {
        setIsListening(false);
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWord, lang, preferences.speechRecognitionEnabled, preferences.difficultyLevel, t]);

  /**
   * Processes the recognized text through pronunciation evaluator
   */
  const handleSpokenResult = useCallback(
    (spokenText: string) => {
      if (!currentWord) return;

      const evalResult = evaluatePronunciation(
        spokenText,
        currentWord,
        lang,
        preferences.difficultyLevel
      );
      setLastEvaluation(evalResult);

      if (evalResult.isMatch) {
        handleSuccess();
      } else {
        handleMismatchOrRetry(spokenText);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentWord, lang, preferences.difficultyLevel, retriesCount]
  );

  /**
   * Success handler: lion is happy, award star, confetti
   */
  const handleSuccess = useCallback(() => {
    stopListening();
    setIsListening(false);
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
  }, [currentWord, onStarAwarded, playSuccess, preferences.autoAdvance, t.successMessages]);

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
      }
    },
    [handleSuccess, playEncourage, preferences.maxRetries, retriesCount, t.encouragementMessages]
  );

  /**
   * Manual validation button (always accessible if mic is off/unavailable)
   */
  const validateManually = useCallback(() => {
    stopListening();
    setIsListening(false);
    handleSuccess();
  }, [handleSuccess]);

  /**
   * Advance to the next word
   */
  const nextWord = useCallback(() => {
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
  }, [currentWordIndex, stopAudio, t.sessionCompletedTitle, words.length]);

  /**
   * Go to previous word
   */
  const previousWord = useCallback(() => {
    if (currentWordIndex > 0) {
      stopAudio();
      stopListening();
      setIsListening(false);
      setRetriesCount(0);
      setLastEvaluation(null);
      setCurrentWordIndex((prev) => prev - 1);
      setGameState('idle');
      setLionState('idle');
    }
  }, [currentWordIndex, stopAudio]);

  /**
   * Restart session from beginning
   */
  const restartSession = useCallback(() => {
    stopAudio();
    stopListening();
    setCurrentWordIndex(0);
    setRetriesCount(0);
    setSessionStarsGained(0);
    setIsSessionFinished(false);
    setGameState('idle');
    setLionState('idle');
  }, [stopAudio]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
      stopAudio();
      stopListening();
    };
  }, [stopAudio]);

  // When word changes, play it
  useEffect(() => {
    playCurrentWord(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWordIndex, lang]);

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
