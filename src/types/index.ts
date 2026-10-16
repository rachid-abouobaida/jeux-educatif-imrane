export type AppLanguage = 'fr' | 'ar' | 'ary';

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export type LionState =
  | 'idle'
  | 'speaking'
  | 'listening'
  | 'happy'
  | 'encouraging'
  | 'thinking';

export type GameState =
  | 'idle'
  | 'speaking'
  | 'listening'
  | 'success'
  | 'retry'
  | 'completed';

export type WordCategory =
  | 'animals'
  | 'food'
  | 'objects'
  | 'body'
  | 'vehicles'
  | 'actions'
  | 'numbers'
  | 'letters';

export interface Word {
  id: string;
  category: WordCategory;
  translations: Record<AppLanguage, string>;
  phonetic?: Partial<Record<AppLanguage, string>>;
  image: string;
  audio: Record<AppLanguage, string>;
  acceptedVariants: Record<AppLanguage, string[]>;
  exampleSentence?: Record<AppLanguage, string>;
}

export interface UserPreferences {
  defaultLanguage: AppLanguage;
  difficultyLevel: DifficultyLevel;
  speechRecognitionEnabled: boolean;
  autoAdvance: boolean;
  soundEffectsEnabled: boolean;
  volume: number;
  maxRetries: number;
  speechSpeed: number; // e.g. 0.75 for clear preschool pronunciation
  wordRepeatIntervalSeconds?: number; // e.g. 4 seconds repetition for immersive learning
}

export interface UserProgress {
  stars: number;
  discoveredWords: string[];
  sessionsCompleted: number;
  lastSessionDate: string;
}

export interface SpeechEvaluationResult {
  isMatch: boolean;
  recognizedText: string;
  expectedWord: string;
  score: number; // 0 to 100
  feedbackKey: 'exact' | 'close' | 'encouraging' | 'silence' | 'error';
  matchedVariant?: string;
}

export interface RoutineStep {
  id: string;
  stepNumber: number;
  title: Record<AppLanguage, string>;
  spokenPrompt: Record<AppLanguage, string>;
  repeatSentence: Record<AppLanguage, string>;
  image: string;
  acceptedVariants: Record<AppLanguage, string[]>;
  encouragement: Record<AppLanguage, string>;
}

export type ActiveScreen = 'home' | 'game' | 'challenge' | 'routine' | 'settings';
