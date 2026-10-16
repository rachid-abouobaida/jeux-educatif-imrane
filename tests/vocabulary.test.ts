import { describe, it, expect } from 'vitest';
import wordsData from '../src/data/words.json';
import { Word } from '../src/types';

describe('Vocabulary Database Integrity', () => {
  const words = wordsData as Word[];

  it('contains at least 30 words', () => {
    expect(words.length).toBeGreaterThanOrEqual(30);
  });

  it('covers all 6 required preschool categories', () => {
    const categories = new Set(words.map((w) => w.category));
    expect(categories.has('animals')).toBe(true);
    expect(categories.has('food')).toBe(true);
    expect(categories.has('objects')).toBe(true);
    expect(categories.has('body')).toBe(true);
    expect(categories.has('vehicles')).toBe(true);
    expect(categories.has('actions')).toBe(true);
  });

  it('contains valid translations for all 3 languages in every word', () => {
    words.forEach((w) => {
      expect(w.id).toBeDefined();
      expect(w.translations.fr.trim().length).toBeGreaterThan(0);
      expect(w.translations.ar.trim().length).toBeGreaterThan(0);
      expect(w.translations.ary.trim().length).toBeGreaterThan(0);
    });
  });

  it('provides image path and accepted variants for every word', () => {
    words.forEach((w) => {
      expect(w.image).toMatch(/^\/assets\/words\/.+/);
      expect(w.acceptedVariants.fr.length).toBeGreaterThanOrEqual(1);
      expect(w.acceptedVariants.ar.length).toBeGreaterThanOrEqual(1);
      expect(w.acceptedVariants.ary.length).toBeGreaterThanOrEqual(1);
    });
  });
});
