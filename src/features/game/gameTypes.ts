import { GameState, LionState, Word, SpeechEvaluationResult } from '../../types';

export interface GameControllerState {
  currentWordIndex: number;
  currentWord: Word;
  gameState: GameState;
  lionState: LionState;
  feedbackText: string;
  isListening: boolean;
  retriesCount: number;
  sessionStarsGained: number;
  sessionWordsLearned: string[];
  lastEvaluation: SpeechEvaluationResult | null;
  isSessionFinished: boolean;
}

export interface GameControllerActions {
  playCurrentWord: () => void;
  startListeningRepeat: () => void;
  validateManually: () => void;
  nextWord: () => void;
  previousWord: () => void;
  restartSession: () => void;
}
