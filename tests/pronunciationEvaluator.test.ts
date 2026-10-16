import { describe, it, expect } from 'vitest';
import {
  evaluatePronunciation,
  normalizeFrench,
  normalizeArabic,
  calculateLevenshteinDistance,
  calculateSimilarity,
} from '../src/features/speech/pronunciationEvaluator';
import { Word } from '../src/types';

describe('Pronunciation Evaluator', () => {
  const sampleWordCat: Word = {
    id: 'cat',
    category: 'animals',
    translations: { fr: 'chat', ar: 'قطة', ary: 'مشّ' },
    image: '/assets/words/cat.png',
    audio: {
      fr: '/assets/audio/fr/cat.mp3',
      ar: '/assets/audio/ar/cat.mp3',
      ary: '/assets/audio/ary/cat.mp3',
    },
    acceptedVariants: {
      fr: ['chat', 'un chat', 'le chat', 'chaton'],
      ar: ['قطة', 'القطة', 'قط'],
      ary: ['مش', 'مشة', 'موش'],
    },
  };

  it('normalizes French text properly', () => {
    expect(normalizeFrench('Éléphant !')).toBe('elephant');
    expect(normalizeFrench('Un CHÂTEAU.')).toBe('un chateau');
  });

  it('normalizes Arabic text and removes Tashkeel (harakat)', () => {
    expect(normalizeArabic('قِطَّةٌ')).toBe('قطه');
    expect(normalizeArabic('إِمرَان')).toBe('امران');
  });

  it('calculates edit distance and similarity accurately', () => {
    expect(calculateLevenshteinDistance('chat', 'chat')).toBe(0);
    expect(calculateLevenshteinDistance('chat', 'cha')).toBe(1);
    expect(calculateSimilarity('chat', 'chat')).toBe(1.0);
    expect(calculateSimilarity('chat', 'cha')).toBe(0.75);
  });

  it('accepts exact repetition in French', () => {
    const result = evaluatePronunciation('chat', sampleWordCat, 'fr', 'easy');
    expect(result.isMatch).toBe(true);
    expect(result.score).toBe(100);
  });

  it('accepts configured variant in French (e.g. "un chat")', () => {
    const result = evaluatePronunciation('un chat', sampleWordCat, 'fr', 'easy');
    expect(result.isMatch).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(95);
  });

  it('evaluates Arabic with diacritics removal and accepts target', () => {
    const result = evaluatePronunciation('قِطَّة', sampleWordCat, 'ar', 'medium');
    expect(result.isMatch).toBe(true);
  });

  it('evaluates Moroccan Darija term (مش / مشة)', () => {
    const result = evaluatePronunciation('مش', sampleWordCat, 'ary', 'easy');
    expect(result.isMatch).toBe(true);
  });

  it('distinguishes between easy, medium, and hard difficulty thresholds', () => {
    // Child said "cha" instead of "chat" (75% similarity)
    const easyRes = evaluatePronunciation('cha', sampleWordCat, 'fr', 'easy');
    const hardRes = evaluatePronunciation('cha', sampleWordCat, 'fr', 'hard');

    expect(easyRes.isMatch).toBe(true); // threshold 45
    expect(hardRes.isMatch).toBe(false); // threshold 85
  });

  it('handles empty / silence gracefully', () => {
    const silenceRes = evaluatePronunciation('', sampleWordCat, 'fr', 'easy');
    expect(silenceRes.isMatch).toBe(false);
    expect(silenceRes.feedbackKey).toBe('silence');
  });
});
