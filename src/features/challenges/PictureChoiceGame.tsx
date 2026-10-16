import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Word, AppLanguage, LionState } from '../../types';
import { translations } from '../../i18n/translations';
import { LionCharacter } from '../../components/LionCharacter';
import { RewardAnimation } from '../../components/RewardAnimation';
import { useAudio } from '../../hooks/useAudio';
import { addStarAndWord } from '../../services/storageService';
import { Home, Star, Volume2 } from 'lucide-react';

interface PictureChoiceGameProps {
  words: Word[];
  lang: AppLanguage;
  volume?: number;
  soundEffectsEnabled?: boolean;
  speechSpeed?: number;
  onBackHome: () => void;
  onStarGained?: () => void;
}

interface ChallengeRound {
  targetWord: Word;
  options: Word[];
}

export const PictureChoiceGame: React.FC<PictureChoiceGameProps> = ({
  words,
  lang,
  volume = 0.85,
  soundEffectsEnabled = true,
  speechSpeed = 0.75,
  onBackHome,
  onStarGained,
}) => {
  const t = translations[lang];
  const isRtl = lang === 'ar' || lang === 'ary';

  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  const [rounds, setRounds] = useState<ChallengeRound[]>([]);
  const [lionState, setLionState] = useState<LionState>('idle');
  const [feedbackText, setFeedbackText] = useState<string>('');
  const [selectedWordId, setSelectedWordId] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [starsWon, setStarsWon] = useState(0);

  const { speakWord, playSuccess, playEncourage } = useAudio(volume, soundEffectsEnabled, speechSpeed);

  // Generate 8 balanced challenge rounds
  useEffect(() => {
    if (words.length < 3) return;
    const shuffled = [...words].sort(() => Math.random() - 0.5);
    const generated: ChallengeRound[] = [];

    shuffled.slice(0, 10).forEach((target) => {
      // Pick 2 distinct distractors
      const distractors = words
        .filter((w) => w.id !== target.id)
        .sort(() => Math.random() - 0.5)
        .slice(0, 2);

      const options = [target, ...distractors].sort(() => Math.random() - 0.5);
      generated.push({ targetWord: target, options });
    });

    setRounds(generated);
    setCurrentRoundIndex(0);
  }, [words]);

  const currentRound = rounds[currentRoundIndex];
  const targetWord = currentRound?.targetWord;

  // Speak prompt for current round
  const promptRound = useCallback(
    (roundTarget: Word) => {
      const targetName = roundTarget.translations[lang];
      const prompt = t.challengePrompt(targetName);
      setFeedbackText(prompt);
      setLionState('speaking');
      speakWord(roundTarget.audio[lang], targetName, lang, () => {
        setLionState('speaking');
      }, () => {
        setLionState('idle');
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lang, t]
  );

  useEffect(() => {
    if (targetWord) {
      setSelectedWordId(null);
      setIsSuccess(false);
      promptRound(targetWord);
    }
  }, [targetWord, promptRound]);

  const handleOptionClick = (option: Word) => {
    if (isSuccess || !targetWord) return;
    setSelectedWordId(option.id);

    const targetName = targetWord.translations[lang];

    if (option.id === targetWord.id) {
      // Correct answer!
      setIsSuccess(true);
      setLionState('happy');
      setFeedbackText(t.challengeSuccess(targetName));
      playSuccess();
      addStarAndWord(targetWord.id);
      setStarsWon((prev) => prev + 1);
      onStarGained?.();

      setTimeout(() => {
        if (currentRoundIndex + 1 < rounds.length) {
          setCurrentRoundIndex((prev) => prev + 1);
        } else {
          // Finished mini-game
          setLionState('happy');
          setFeedbackText(t.sessionCompletedTitle);
        }
      }, 2200);
    } else {
      // Friendly encouragement to look again
      setLionState('encouraging');
      setFeedbackText(t.challengeRetry(targetName));
      playEncourage();
    }
  };

  return (
    <div
      className="relative min-h-screen flex flex-col justify-between p-3 sm:p-6 max-w-4xl mx-auto"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {isSuccess && (
        <RewardAnimation
          isRtl={isRtl}
          message={feedbackText}
        />
      )}

      {/* Header */}
      <header className="flex items-center justify-between bg-white/80 backdrop-blur-md rounded-3xl p-3 sm:p-4 shadow-lg border-2 border-amber-200">
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          onClick={onBackHome}
          className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-2xl font-bold text-sm sm:text-base"
        >
          <Home className="w-5 h-5" />
          <span className="hidden sm:inline">{t.backHome}</span>
        </motion.button>

        <h1 className="text-lg sm:text-2xl font-black text-amber-950 font-rounded">
          {t.challengeButton}
        </h1>

        <div className="flex items-center space-x-2 rtl:space-x-reverse bg-gradient-to-r from-amber-400 to-orange-400 text-white px-4 py-2 rounded-2xl font-black shadow-md">
          <Star className="w-5 h-5 fill-white" />
          <span>+{starsWon}</span>
        </div>
      </header>

      {/* Main Challenge Arena */}
      <main className="flex-1 flex flex-col items-center justify-center my-4 space-y-6">
        {/* Animated Lion Companion */}
        <LionCharacter
          state={lionState}
          size="md"
          speechBubbleText={feedbackText}
          isRtl={isRtl}
        />

        {/* Audio Re-Prompt Button */}
        {targetWord && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => promptRound(targetWord)}
            className="flex items-center space-x-2 rtl:space-x-reverse px-5 py-2.5 bg-sky-100 hover:bg-sky-200 text-sky-900 rounded-full font-bold shadow-md border-2 border-sky-300"
          >
            <Volume2 className="w-5 h-5" />
            <span>{t.repeatWord}</span>
          </motion.button>
        )}

        {/* 3 Large Picture Choices */}
        {currentRound && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 w-full max-w-2xl px-2">
            <AnimatePresence>
              {currentRound.options.map((option) => {
                const isSelected = selectedWordId === option.id;
                const isCorrectOption = option.id === targetWord?.id;

                let borderStyle = 'border-amber-200 hover:border-amber-400';
                if (isSelected && isSuccess && isCorrectOption) {
                  borderStyle = 'border-emerald-500 ring-4 ring-emerald-300 bg-emerald-50';
                } else if (isSelected && !isSuccess) {
                  borderStyle = 'border-rose-300 ring-4 ring-rose-200 bg-rose-50';
                }

                return (
                  <motion.button
                    key={option.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleOptionClick(option)}
                    className={`flex flex-col items-center justify-center p-4 sm:p-6 bg-white/95 rounded-3xl shadow-xl border-4 transition-all cursor-pointer ${borderStyle}`}
                  >
                    <div className="w-28 h-28 sm:w-36 sm:h-36 flex items-center justify-center mb-3">
                      <img
                        src={option.image}
                        alt={option.translations[lang]}
                        className="w-full h-full object-contain filter drop-shadow-md select-none pointer-events-none"
                        draggable={false}
                      />
                    </div>
                    <span className="text-xl sm:text-2xl font-black text-slate-800 font-rounded">
                      {option.translations[lang]}
                    </span>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </main>

      <footer className="text-center py-2 text-xs sm:text-sm text-slate-500 font-semibold">
        {currentRoundIndex + 1} / {rounds.length} • « Petit Lion d'Imrane »
      </footer>
    </div>
  );
};
