import { describe, it, expect } from 'vitest';
import routineStepsData from '../src/data/routineSteps.json';
import { RoutineStep } from '../src/types';
import { normalizeByLanguage, calculateSimilarity } from '../src/features/speech/pronunciationEvaluator';
import { evaluateRoutineSpeech } from '../src/features/routine/routineSpeechEvaluator';

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

  describe('Action Keyword Enforcement & Auto-activation Prevention', () => {
    it('rejects empty strings, silence, and short noise', () => {
      steps.forEach((step) => {
        expect(evaluateRoutineSpeech('', step, 'fr')).toBe(false);
        expect(evaluateRoutineSpeech('   ', step, 'fr')).toBe(false);
        expect(evaluateRoutineSpeech('ah', step, 'fr')).toBe(false);
        expect(evaluateRoutineSpeech('e', step, 'fr')).toBe(false);
      });
    });

    it('rejects single pronouns and grammatical stop words (e.g. "je", "me", "mon", "mes")', () => {
      const step2 = steps[1]; // "Je me lève."
      expect(evaluateRoutineSpeech('je', step2, 'fr')).toBe(false);
      expect(evaluateRoutineSpeech('me', step2, 'fr')).toBe(false);
      expect(evaluateRoutineSpeech('je me', step2, 'fr')).toBe(false);

      const step4 = steps[3]; // "Je lave mon visage."
      expect(evaluateRoutineSpeech('mon', step4, 'fr')).toBe(false);
      expect(evaluateRoutineSpeech('je', step4, 'fr')).toBe(false);

      const step5 = steps[4]; // "Je brosse mes dents."
      expect(evaluateRoutineSpeech('mes', step5, 'fr')).toBe(false);
      expect(evaluateRoutineSpeech('je', step5, 'fr')).toBe(false);

      const step6 = steps[5]; // "Je mange."
      expect(evaluateRoutineSpeech('je', step6, 'fr')).toBe(false);

      const step7 = steps[6]; // "Je m’habille."
      expect(evaluateRoutineSpeech('je', step7, 'fr')).toBe(false);

      const step8 = steps[7]; // "Je vais à l’école !"
      expect(evaluateRoutineSpeech('je', step8, 'fr')).toBe(false);
      expect(evaluateRoutineSpeech('vais', step8, 'fr')).toBe(false);
    });

    it('validates each step when the child pronounces the actual action', () => {
      // Step 1: Bonjour
      expect(evaluateRoutineSpeech('bonjour', steps[0], 'fr')).toBe(true);
      expect(evaluateRoutineSpeech('coucou', steps[0], 'fr')).toBe(true);
      expect(evaluateRoutineSpeech('bonjour imrane', steps[0], 'fr')).toBe(true);

      // Step 2: Je me lève
      expect(evaluateRoutineSpeech('je me lève', steps[1], 'fr')).toBe(true);
      expect(evaluateRoutineSpeech('je me leve', steps[1], 'fr')).toBe(true);
      expect(evaluateRoutineSpeech('lève', steps[1], 'fr')).toBe(true);
      expect(evaluateRoutineSpeech('debout', steps[1], 'fr')).toBe(true);

      // Step 3: Je me lave
      expect(evaluateRoutineSpeech('je me lave', steps[2], 'fr')).toBe(true);
      expect(evaluateRoutineSpeech('lave', steps[2], 'fr')).toBe(true);
      expect(evaluateRoutineSpeech('douche', steps[2], 'fr')).toBe(true);

      // Step 4: Je lave mon visage (requires 'visage')
      expect(evaluateRoutineSpeech('je lave mon visage', steps[3], 'fr')).toBe(true);
      expect(evaluateRoutineSpeech('mon visage', steps[3], 'fr')).toBe(true);
      expect(evaluateRoutineSpeech('visage', steps[3], 'fr')).toBe(true);
      // 'lave' alone without 'visage' must not validate step 4
      expect(evaluateRoutineSpeech('lave', steps[3], 'fr')).toBe(false);

      // Step 5: Je brosse mes dents
      expect(evaluateRoutineSpeech('je brosse mes dents', steps[4], 'fr')).toBe(true);
      expect(evaluateRoutineSpeech('brosse mes dents', steps[4], 'fr')).toBe(true);
      expect(evaluateRoutineSpeech('dents', steps[4], 'fr')).toBe(true);
      expect(evaluateRoutineSpeech('brosse', steps[4], 'fr')).toBe(true);

      // Step 6: Je mange
      expect(evaluateRoutineSpeech('je mange', steps[5], 'fr')).toBe(true);
      expect(evaluateRoutineSpeech('mange', steps[5], 'fr')).toBe(true);

      // Step 7: Je m'habille
      expect(evaluateRoutineSpeech("je m'habille", steps[6], 'fr')).toBe(true);
      expect(evaluateRoutineSpeech('habille', steps[6], 'fr')).toBe(true);
      expect(evaluateRoutineSpeech('mes habits', steps[6], 'fr')).toBe(true);

      // Step 8: Je vais à l'école !
      expect(evaluateRoutineSpeech("je vais à l'école", steps[7], 'fr')).toBe(true);
      expect(evaluateRoutineSpeech("à l'école", steps[7], 'fr')).toBe(true);
      expect(evaluateRoutineSpeech('école', steps[7], 'fr')).toBe(true);
      expect(evaluateRoutineSpeech('les capucines', steps[7], 'fr')).toBe(true);
    });

    it('works properly in Arabic and Moroccan Darija', () => {
      // Step 1: صباح الخير
      expect(evaluateRoutineSpeech('صباح الخير', steps[0], 'ar')).toBe(true);
      expect(evaluateRoutineSpeech('صباح الخير', steps[0], 'ary')).toBe(true);

      // Step 2: أستيقظ / كنفيق
      expect(evaluateRoutineSpeech('أستيقظ', steps[1], 'ar')).toBe(true);
      expect(evaluateRoutineSpeech('كنفيق', steps[1], 'ary')).toBe(true);

      // Step 4: أغسل وجهي
      expect(evaluateRoutineSpeech('أغسل وجهي', steps[3], 'ar')).toBe(true);
      expect(evaluateRoutineSpeech('كنغسل وجهي', steps[3], 'ary')).toBe(true);

      // Step 8: أذهب إلى المدرسة / كنمشي للمدرسة
      expect(evaluateRoutineSpeech('المدرسة', steps[7], 'ar')).toBe(true);
      expect(evaluateRoutineSpeech('كنمشي للمدرسة', steps[7], 'ary')).toBe(true);
    });
  });
});

