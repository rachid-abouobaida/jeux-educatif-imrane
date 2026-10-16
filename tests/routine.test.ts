import { describe, it, expect } from 'vitest';
import routineStepsData from '../src/data/routineSteps.json';
import { RoutineStep } from '../src/types';
import { normalizeByLanguage, calculateSimilarity } from '../src/features/speech/pronunciationEvaluator';

describe('Morning Routine Feature', () => {
  const steps = routineStepsData as RoutineStep[];

  it('contains exactly 8 sequential steps', () => {
    expect(steps.length).toBe(8);
    steps.forEach((st, idx) => {
      expect(st.stepNumber).toBe(idx + 1);
    });
  });

  it('provides valid translations for all 3 languages (fr, ar, ary)', () => {
    steps.forEach((st) => {
      expect(st.title.fr).toBeDefined();
      expect(st.title.ar).toBeDefined();
      expect(st.title.ary).toBeDefined();

      expect(st.repeatSentence.fr.length).toBeGreaterThan(0);
      expect(st.repeatSentence.ar.length).toBeGreaterThan(0);
      expect(st.repeatSentence.ary.length).toBeGreaterThan(0);

      expect(st.encouragement.fr.length).toBeGreaterThan(0);
      expect(st.encouragement.ar.length).toBeGreaterThan(0);
      expect(st.encouragement.ary.length).toBeGreaterThan(0);
    });
  });

  it('references valid cropped image paths', () => {
    steps.forEach((st) => {
      expect(st.image).toMatch(/^\/assets\/routine\/step-\d+-.+\.png$/);
    });
  });

  it('correctly matches child spoken repetition for routine phrases', () => {
    const step1 = steps[0]; // "Bonjour !"
    const normalizedSpoken = normalizeByLanguage('bonjour', 'fr');
    const target = normalizeByLanguage(step1.repeatSentence.fr, 'fr');
    expect(normalizedSpoken).toBe(target);

    // Variant matching: "coucou" or "bonjour imrane"
    const variants = step1.acceptedVariants.fr.map((v) => normalizeByLanguage(v, 'fr'));
    expect(variants).toContain('bonjour imrane');

    // Fuzzy matching for 4yo
    const sim = calculateSimilarity('bonjour', 'bonjour');
    expect(sim).toBe(1.0);
  });

  it('verifies the exact 8 French expressions requested for the morning programme', () => {
    const expectedFrenchExpressions = [
      'Bonjour !',
      'Je me lève.',
      'Je me lave.',
      'Je lave mon visage.',
      'Je brosse mes dents.',
      'Je mange.',
      'Je m’habille.',
      'Je vais à l’école !'
    ];

    expect(steps.map((s) => s.spokenPrompt.fr)).toEqual(expectedFrenchExpressions);
    expect(steps.map((s) => s.title.fr)).toEqual(expectedFrenchExpressions);
  });
});
