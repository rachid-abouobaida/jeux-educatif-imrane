import { UserPreferences, UserProgress } from '../types';

const PREFERENCES_KEY = 'imrane_lion_preferences_v1';
const PROGRESS_KEY = 'imrane_lion_progress_v1';

export const DEFAULT_PREFERENCES: UserPreferences = {
  defaultLanguage: 'fr',
  difficultyLevel: 'easy',
  speechRecognitionEnabled: true,
  autoAdvance: true,
  soundEffectsEnabled: true,
  volume: 0.85,
  maxRetries: 2,
};

export const DEFAULT_PROGRESS: UserProgress = {
  stars: 0,
  discoveredWords: [],
  sessionsCompleted: 0,
  lastSessionDate: new Date().toISOString(),
};

export const getStoredPreferences = (): UserPreferences => {
  try {
    const raw = localStorage.getItem(PREFERENCES_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFERENCES;
  }
};

export const savePreferences = (prefs: UserPreferences): void => {
  try {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(prefs));
  } catch (e) {
    console.warn('Failed to save preferences to localStorage', e);
  }
};

export const getStoredProgress = (): UserProgress => {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return DEFAULT_PROGRESS;
    return { ...DEFAULT_PROGRESS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PROGRESS;
  }
};

export const saveProgress = (progress: UserProgress): void => {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch (e) {
    console.warn('Failed to save progress to localStorage', e);
  }
};

export const addStarAndWord = (wordId: string): UserProgress => {
  const current = getStoredProgress();
  const alreadyDiscovered = current.discoveredWords.includes(wordId);
  const updated: UserProgress = {
    ...current,
    stars: current.stars + 1,
    discoveredWords: alreadyDiscovered
      ? current.discoveredWords
      : [...current.discoveredWords, wordId],
    lastSessionDate: new Date().toISOString(),
  };
  saveProgress(updated);
  return updated;
};

export const resetProgress = (): UserProgress => {
  saveProgress(DEFAULT_PROGRESS);
  return DEFAULT_PROGRESS;
};
