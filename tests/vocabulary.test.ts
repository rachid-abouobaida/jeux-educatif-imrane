import { describe, it, expect } from 'vitest';
import wordsData from '../src/data/words.json';
import { Word } from '../src/types';

describe('Vocabulary Database Integrity', () => {
  const words = wordsData as Word[];

  it('contains at least 30 words', () => {
    expect(words.length).toBeGreaterThanOrEqual(30);
  });

  it('covers all required preschool categories including shapes', () => {
    const categories = new Set(words.map((w) => w.category));
    expect(categories.has('animals')).toBe(true);
    expect(categories.has('food')).toBe(true);
    expect(categories.has('objects')).toBe(true);
    expect(categories.has('body')).toBe(true);
    expect(categories.has('vehicles')).toBe(true);
    expect(categories.has('actions')).toBe(true);
    expect(categories.has('numbers')).toBe(true);
    expect(categories.has('letters')).toBe(true);
    expect(categories.has('shapes')).toBe(true);
  });

  it('contains the 6 required geometric shapes', () => {
    const shapeIds = words.filter((w) => w.category === 'shapes').map((w) => w.id);
    expect(shapeIds).toContain('shape_square');
    expect(shapeIds).toContain('shape_circle');
    expect(shapeIds).toContain('shape_triangle');
    expect(shapeIds).toContain('shape_star');
    expect(shapeIds).toContain('shape_rectangle');
    expect(shapeIds).toContain('shape_losange');

    const shapeWords = words.filter((w) => w.category === 'shapes');
    expect(shapeWords.map((w) => w.translations.fr)).toEqual([
      'Le carré',
      'Le cercle',
      'Le triangle',
      "L'étoile",
      'Le rectangle',
      'Le losange'
    ]);
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
