import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import {
  getStoredPreferences,
  savePreferences,
  getStoredProgress,
  saveProgress,
  addStarAndWord,
  resetProgress,
  DEFAULT_PREFERENCES,
  DEFAULT_PROGRESS,
} from '../src/services/storageService';

describe('Storage Service', () => {
  let mockStorage: Record<string, string> = {};

  beforeAll(() => {
    // Mock browser localStorage for Node testing environment
    global.localStorage = {
      getItem: (key: string) => mockStorage[key] || null,
      setItem: (key: string, value: string) => {
        mockStorage[key] = value;
      },
      removeItem: (key: string) => {
        delete mockStorage[key];
      },
      clear: () => {
        mockStorage = {};
      },
      length: 0,
      key: () => null,
    };
  });

  beforeEach(() => {
    localStorage.clear();
  });

  it('returns default preferences when storage is empty', () => {
    const prefs = getStoredPreferences();
    expect(prefs).toEqual(DEFAULT_PREFERENCES);
  });

  it('saves and retrieves updated preferences', () => {
    savePreferences({
      ...DEFAULT_PREFERENCES,
      defaultLanguage: 'ary',
      difficultyLevel: 'hard',
      volume: 0.5,
    });
    const loaded = getStoredPreferences();
    expect(loaded.defaultLanguage).toBe('ary');
    expect(loaded.difficultyLevel).toBe('hard');
    expect(loaded.volume).toBe(0.5);
  });

  it('correctly tracks stars and discovered words', () => {
    saveProgress(DEFAULT_PROGRESS);
    const updated = addStarAndWord('cat');
    expect(updated.stars).toBe(1);
    expect(updated.discoveredWords).toContain('cat');

    // Adding same word gives another star but keeps unique discovered words
    const updated2 = addStarAndWord('cat');
    expect(updated2.stars).toBe(2);
    expect(updated2.discoveredWords.length).toBe(1);
  });

  it('resets progress back to initial default state', () => {
    addStarAndWord('dog');
    addStarAndWord('apple');
    const reset = resetProgress();
    expect(reset.stars).toBe(0);
    expect(reset.discoveredWords.length).toBe(0);
  });
});
