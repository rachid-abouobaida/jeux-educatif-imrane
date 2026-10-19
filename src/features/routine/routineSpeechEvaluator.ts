import { AppLanguage, DifficultyLevel, RoutineStep } from '../../types';
import {
  normalizeByLanguage,
  calculateSimilarity,
  phoneticFrench,
  stripLeadingArticles,
} from '../speech/pronunciationEvaluator';

/**
 * Key action keywords for each routine step.
 * Crucial constraint: A step can NEVER be activated unless the child
 * actually pronounces the action keyword corresponding to that step.
 * Grammatical pronouns/articles like "je", "me", "mon", "mes" alone must NEVER trigger completion.
 */
export const ROUTINE_STEP_ACTION_KEYWORDS: Record<string, Record<AppLanguage, string[]>> = {
  'step-1': {
    fr: ['bonjour', 'salut', 'coucou'],
    ar: ['صباح', 'الخير', 'مرحبا', 'سلام', 'النور'],
    ary: ['صباح', 'الخير', 'سلام', 'صباحو', 'النور'],
  },
  'step-2': {
    fr: ['leve', 'reveille', 'debout'],
    ar: ['استيقظ', 'انهض', 'نهضت'],
    ary: ['نفيق', 'كنفيق', 'كنوض', 'نوض', 'فقت'],
  },
  'step-3': {
    fr: ['lave', 'douche', 'bain'],
    ar: ['اغتسل', 'استحم', 'حمام', 'اغسل'],
    ary: ['كنغسل', 'نغسل', 'كندوش', 'دوش', 'نعوم'],
  },
  'step-4': {
    fr: ['visage'],
    ar: ['وجهي', 'الوجه', 'وجه'],
    ary: ['وجهي', 'الوجه', 'وجه'],
  },
  'step-5': {
    fr: ['dent', 'dents', 'brosse', 'brosser'],
    ar: ['اسناني', 'الاسنان', 'اسنان', 'انظف', 'تنظيف'],
    ary: ['سناني', 'سنيناتي', 'سنان', 'كنحك', 'نحك'],
  },
  'step-6': {
    fr: ['mange', 'manger', 'dejeuner'],
    ar: ['اكل', 'آكل', 'اتناول', 'فطوري', 'فطور'],
    ary: ['كناكل', 'ناكل', 'كنفطر', 'نفطر', 'فطور'],
  },
  'step-7': {
    fr: ['habille', 'habit', 'habits', 'vetement'],
    ar: ['ملابسي', 'الملابس', 'ملابس', 'ارتدي', 'لبست'],
    ary: ['حوايجي', 'حويجاتي', 'حوايج', 'كنلبس', 'نلبس', 'لبست'],
  },
  'step-8': {
    fr: ['ecole', 'capucine', 'capucines'],
    ar: ['المدرسة', 'مدرسة'],
    ary: ['المدرسة', 'مدرسة', 'نقرا'],
  },
};

/**
 * Common stop-words and pronouns that by themselves cannot validate any routine action.
 */
const FRENCH_STOP_WORDS = new Set([
  'je', 'me', 'mon', 'ma', 'mes', 'le', 'la', 'les', 'l',
  'un', 'une', 'des', 'du', 'de', 'd',
  'ce', 'cet', 'cette', 'ces',
  'tu', 'te', 'ton', 'ta', 'tes',
  'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles',
  'a', 'à', 'au', 'aux', 'en', 'dans', 'sur', 'pour', 'avec',
  'et', 'ou', 'oui', 'non', 'euh', 'ah', 'oh',
  'c est', 'c est un', 'c est une',
]);

const ARABIC_STOP_WORDS = new Set([
  'هذا', 'هادي', 'انا', 'انت', 'هو', 'هي', 'ال', 'في', 'من', 'على', 'ديال', 'واحد', 'شي'
]);

/**
 * Evaluates whether Imrane's speech matches the routine sentence for the given step.
 * Strictly verifies that the child actually pronounced the key action of the step,
 * avoiding accidental auto-validation from noise, pronouns ("je", "me", "mon"), or speaker echo.
 */
export const evaluateRoutineSpeech = (
  spokenText: string | string[],
  step: RoutineStep,
  lang: AppLanguage,
  difficulty: DifficultyLevel = 'easy',
  alternatives: string[] = []
): boolean => {
  if (!step) return false;

  const candidates = (
    Array.isArray(spokenText) ? [...spokenText, ...alternatives] : [spokenText, ...alternatives]
  )
    .map((s) => (s ? s.trim() : ''))
    .filter(Boolean);

  if (candidates.length === 0) return false;

  const target = normalizeByLanguage(step.repeatSentence[lang], lang);
  const variants = (step.acceptedVariants[lang] || []).map((v) =>
    normalizeByLanguage(v, lang)
  );
  const allTargets = [target, ...variants];

  const stepKeywords = ROUTINE_STEP_ACTION_KEYWORDS[step.id]?.[lang] || [];
  const stopSet = lang === 'fr' ? FRENCH_STOP_WORDS : ARABIC_STOP_WORDS;

  for (const text of candidates) {
    const normalizedSpoken = normalizeByLanguage(text, lang);
    if (!normalizedSpoken || normalizedSpoken.length < 3) {
      continue;
    }

    // 1. Guard against single pronoun or stop word (e.g. child said only "je", "me", "mon", "mes")
    if (stopSet.has(normalizedSpoken)) {
      continue;
    }

    // 2. Action Keyword Verification:
    // The utterance MUST contain the action keyword (or its phonetic root) for the current step.
    const spokenTokens = normalizedSpoken.split(' ').filter(Boolean);
    const spokenPhon = lang === 'fr' ? phoneticFrench(normalizedSpoken) : '';
    const spokenPhonTokens = spokenPhon ? spokenPhon.split(' ').filter(Boolean) : [];

    const hasActionKeyword = stepKeywords.some((kw) => {
      const normKw = normalizeByLanguage(kw, lang);
      if (spokenTokens.includes(normKw) || normalizedSpoken.includes(normKw)) {
        return true;
      }
      if (lang === 'fr') {
        const kwPhon = phoneticFrench(normKw);
        if (spokenPhonTokens.includes(kwPhon) || spokenPhon.includes(kwPhon)) {
          return true;
        }
      }
      return false;
    });

    if (!hasActionKeyword) {
      // The child didn't pronounce the key action of this step: reject
      continue;
    }

    const strippedSpoken = stripLeadingArticles(normalizedSpoken, lang);

    // 3. Exact match with expected sentence or accepted variants
    if (
      allTargets.includes(normalizedSpoken) ||
      allTargets.includes(strippedSpoken)
    ) {
      return true;
    }

    // 4. Token / Phrase inclusion:
    // If the child included the full action variant in their utterance (e.g. "bonjour maman", "je me lave bien")
    for (const variant of allTargets) {
      if (normalizedSpoken.includes(variant) || strippedSpoken.includes(variant)) {
        return true;
      }
      const variantTokens = variant.split(' ').filter((vt) => vt.length >= 3 && !stopSet.has(vt));
      if (variantTokens.length > 0 && variantTokens.every((vt) => spokenTokens.includes(vt))) {
        return true;
      }
    }

    // 5. Phonetic matching for French (e.g. "leve" vs "lève", "dents" vs "dan", "ecole" vs "ekol")
    if (lang === 'fr' && difficulty !== 'hard') {
      const strippedPhon = phoneticFrench(strippedSpoken);
      for (const cand of allTargets) {
        const candPhon = phoneticFrench(cand);
        if (candPhon === spokenPhon || candPhon === strippedPhon) {
          return true;
        }
        if (
          candPhon.length >= 4 &&
          (spokenPhon.includes(candPhon) || strippedPhon.includes(candPhon))
        ) {
          return true;
        }
      }
    }

    // 6. Fuzzy similarity with a solid threshold (0.60 for easy/medium, 0.75 for hard)
    const threshold = difficulty === 'hard' ? 0.75 : 0.60;
    for (const cand of allTargets) {
      const sim = calculateSimilarity(normalizedSpoken, cand);
      if (sim >= threshold) return true;
      const strippedSim = calculateSimilarity(strippedSpoken, cand);
      if (strippedSim >= threshold) return true;
    }
  }

  return false;
};
