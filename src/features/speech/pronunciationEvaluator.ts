import { AppLanguage, DifficultyLevel, SpeechEvaluationResult, Word } from '../../types';

/**
 * Normalizes French text by lowercasing, removing diacritics and punctuation
 */
export const normalizeFrench = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Normalizes Arabic and Darija text by removing Tashkeel (harakat),
 * standardizing Alef variants, Taa Marbuta, and Yaa.
 */
export const normalizeArabic = (text: string): string => {
  return text
    // Remove Arabic diacritics / harakat
    .replace(/[\u064B-\u0652\u0670\u0640]/g, '')
    // Normalize Alefs
    .replace(/[أإآٱ]/g, 'ا')
    // Normalize Taa Marbuta
    .replace(/ة/g, 'ه')
    // Normalize Yaa
    .replace(/[ىي]/g, 'ي')
    // Remove non-Arabic, non-digit punctuation
    .replace(/[^\u0600-\u06FFa-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

export const normalizeByLanguage = (text: string, lang: AppLanguage): string => {
  if (lang === 'fr') {
    return normalizeFrench(text);
  }
  return normalizeArabic(text);
};

/**
 * Computes Levenshtein distance between two strings
 */
export const calculateLevenshteinDistance = (a: string, b: string): number => {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
};

/**
 * Computes similarity ratio between 0 and 1
 */
export const calculateSimilarity = (a: string, b: string): number => {
  const normA = a.trim();
  const normB = b.trim();
  if (!normA && !normB) return 1.0;
  if (!normA || !normB) return 0.0;
  if (normA === normB) return 1.0;

  const maxLen = Math.max(normA.length, normB.length);
  const dist = calculateLevenshteinDistance(normA, normB);
  return Math.max(0, (maxLen - dist) / maxLen);
};

/**
 * Evaluates spoken repetition against expected word and variants
 */
export const evaluatePronunciation = (
  spokenText: string,
  word: Word,
  lang: AppLanguage,
  difficulty: DifficultyLevel
): SpeechEvaluationResult => {
  const rawSpoken = spokenText.trim();
  const expectedTarget = word.translations[lang];

  if (!rawSpoken) {
    return {
      isMatch: false,
      recognizedText: '',
      expectedWord: expectedTarget,
      score: 0,
      feedbackKey: 'silence',
    };
  }

  const normalizedSpoken = normalizeByLanguage(rawSpoken, lang);
  const targetNormalized = normalizeByLanguage(expectedTarget, lang);
  const variants = (word.acceptedVariants[lang] || [expectedTarget]).map((v) =>
    normalizeByLanguage(v, lang)
  );

  const spokenTokens = normalizedSpoken.split(' ').filter(Boolean);

  // 1. Direct match with expected target or configured variants
  if (
    normalizedSpoken === targetNormalized ||
    variants.includes(normalizedSpoken)
  ) {
    return {
      isMatch: true,
      recognizedText: rawSpoken,
      expectedWord: expectedTarget,
      score: 100,
      feedbackKey: 'exact',
      matchedVariant: expectedTarget,
    };
  }

  // 2. Token inclusion check (e.g. child said "un chat" or "voici la pomme")
  for (const variant of [targetNormalized, ...variants]) {
    if (spokenTokens.includes(variant) || normalizedSpoken.includes(variant)) {
      return {
        isMatch: true,
        recognizedText: rawSpoken,
        expectedWord: expectedTarget,
        score: 95,
        feedbackKey: 'exact',
        matchedVariant: variant,
      };
    }
  }

  // 3. Highest similarity among target and variants
  let highestScore = 0;
  let bestVariant = targetNormalized;

  const candidates = [targetNormalized, ...variants];
  for (const cand of candidates) {
    const directSim = calculateSimilarity(normalizedSpoken, cand);
    if (directSim > highestScore) {
      highestScore = directSim;
      bestVariant = cand;
    }
    // Also check similarity against individual tokens in spoken phrase
    for (const token of spokenTokens) {
      const tokenSim = calculateSimilarity(token, cand);
      if (tokenSim > highestScore) {
        highestScore = tokenSim;
        bestVariant = cand;
      }
    }
  }

  const finalScore = Math.round(highestScore * 100);

  // 4. Thresholds per difficulty level
  // Easy: very forgiving (e.g. child 4yo trying their best)
  // Medium: balanced
  // Hard: higher precision
  let matchThreshold = 45;
  if (difficulty === 'medium') matchThreshold = 65;
  if (difficulty === 'hard') matchThreshold = 85;

  const isMatch = finalScore >= matchThreshold;

  return {
    isMatch,
    recognizedText: rawSpoken,
    expectedWord: expectedTarget,
    score: finalScore,
    feedbackKey: isMatch ? (finalScore >= 80 ? 'exact' : 'close') : 'encouraging',
    matchedVariant: bestVariant,
  };
};
