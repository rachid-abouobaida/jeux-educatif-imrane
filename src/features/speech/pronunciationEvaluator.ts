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
    // Normalize Persian/Darija kaf/gaf
    .replace(/گ/g, 'ك')
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
 * Strips common child articles and helper prefixes (e.g. "un chat", "c'est un lion", "الماء")
 */
export const stripLeadingArticles = (text: string, lang: AppLanguage): string => {
  if (lang === 'fr') {
    const norm = normalizeFrench(text);
    const prefixes = [
      'c est un ', 'c est une ', 'c est le ', 'c est la ', 'c est les ', 'c est du ', 'c est ',
      'voici un ', 'voici une ', 'voici le ', 'voici la ', 'voici les ', 'voici du ', 'voici ',
      'voila un ', 'voila une ', 'voila le ', 'voila la ', 'voila les ', 'voila du ', 'voila ',
      'un petit ', 'une petite ', 'un grand ', 'une grande ',
      'un ', 'une ', 'le ', 'la ', 'les ', 'du ', 'de la ', 'des ', 'l ', 'd ',
      'mon ', 'ma ', 'mes ', 'ton ', 'ta ', 'tes ', 'son ', 'sa ', 'ses ',
      'ce ', 'cet ', 'cette '
    ];
    for (const p of prefixes) {
      if (norm.startsWith(p)) {
        return norm.slice(p.length).trim();
      }
    }
    return norm;
  } else {
    const norm = normalizeArabic(text);
    const prefixes = [
      'هذا ', 'هادي ', 'واحد ال', 'واحد ', 'شي ', 'ديال '
    ];
    for (const p of prefixes) {
      if (norm.startsWith(p)) {
        return norm.slice(p.length).trim();
      }
    }
    if (norm.startsWith('ال') && norm.length > 3) {
      return norm.slice(2).trim();
    }
    return norm;
  }
};

/**
 * Child-friendly French phonetic reduction
 * Translates silent final letters, homophones and child simplifications:
 * - "chat" -> "sha", "cha" -> "sha"
 * - "eau" -> "o", "o" -> "o"
 * - "loup" -> "lu", "lou" -> "lu"
 * - "pain" -> "pin", "pin" -> "pin"
 * - "vert" -> "ve", "ver" -> "ve"
 * - "soleil" -> "soley", "soley" -> "soley"
 * - "oiseau" -> "wazo", "wazo" -> "wazo"
 * - "elephant" -> "elefan", "elefan" -> "elefan"
 */
export const phoneticFrench = (str: string): string => {
  const norm = normalizeFrench(str);
  const words = norm.split(' ').filter(Boolean).map((w) => {
    let r = w;
    // Strip silent final consonants for words > 2 letters
    if (r.length > 2) {
      r = r.replace(/[tdsxpgzc]\b/g, '');
    }
    r = r.replace(/eaux\b|eau\b|aux\b|au\b/g, 'o');
    r = r.replace(/ph/g, 'f');
    r = r.replace(/qu|ck/g, 'k');
    r = r.replace(/c([aou])/g, 'k$1');
    r = r.replace(/c([eiy])|ç/g, 's$1');
    r = r.replace(/ss/g, 's');
    r = r.replace(/([aeiouy])s([aeiouy])/g, '$1z$2');
    r = r.replace(/eil\b|eille\b/g, 'ey');
    r = r.replace(/ail\b|aille\b/g, 'ay');
    r = r.replace(/euil\b|euille\b/g, 'euy');
    r = r.replace(/ouil\b|ouille\b/g, 'uy');
    r = r.replace(/ain\b|aim\b|ein\b|in\b|im\b|un\b|um\b/g, 'in');
    r = r.replace(/an\b|am\b|en\b|em\b/g, 'an');
    r = r.replace(/on\b|om\b/g, 'on');
    r = r.replace(/ou/g, 'u');
    r = r.replace(/oi/g, 'wa');
    r = r.replace(/ch|sh/g, 'sh');
    r = r.replace(/gu([eiy])/g, 'g$1');
    r = r.replace(/ill/g, 'y');
    r = r.replace(/ai|ei|ez\b|er\b|et\b/g, 'e');
    if (r.length > 2 && r.endsWith('e')) {
      r = r.slice(0, -1);
    }
    r = r.replace(/([a-z])\1+/g, '$1');
    return r;
  });
  return words.join(' ');
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
 * Evaluates spoken repetition against expected word and variants.
 * Supports multiple candidate transcripts (alternatives) from Web Speech API.
 * Employs phonetic French matching and dialect-tolerant Arabic matching for preschoolers.
 */
export const evaluatePronunciation = (
  spokenText: string | string[],
  word: Word,
  lang: AppLanguage,
  difficulty: DifficultyLevel,
  extraAlternatives: string[] = []
): SpeechEvaluationResult => {
  const expectedTarget = word.translations[lang];
  const targetNormalized = normalizeByLanguage(expectedTarget, lang);
  const variants = (word.acceptedVariants[lang] || [expectedTarget]).map((v) =>
    normalizeByLanguage(v, lang)
  );
  const allTargets = [targetNormalized, ...variants];

  // Gather candidate transcripts
  const rawList = Array.isArray(spokenText)
    ? [...spokenText, ...extraAlternatives]
    : [spokenText, ...extraAlternatives];

  const candidateStrings = rawList
    .map((s) => (s ? s.trim() : ''))
    .filter(Boolean);

  if (candidateStrings.length === 0) {
    return {
      isMatch: false,
      recognizedText: '',
      expectedWord: expectedTarget,
      score: 0,
      feedbackKey: 'silence',
    };
  }

  let bestScore = 0;
  let bestCandidate = candidateStrings[0];
  let matchedVariantName = targetNormalized;
  let bestIsMatch = false;

  for (const rawSpoken of candidateStrings) {
    const normalizedSpoken = normalizeByLanguage(rawSpoken, lang);
    const strippedSpoken = stripLeadingArticles(normalizedSpoken, lang);
    const spokenTokens = normalizedSpoken.split(' ').filter(Boolean);

    // 1. Direct match with target or variants (raw or article-stripped)
    if (
      allTargets.includes(normalizedSpoken) ||
      allTargets.includes(strippedSpoken)
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

    // 2. Token inclusion check (child said "un chat", "c'est un lion", "regarde la pomme")
    for (const variant of allTargets) {
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

    // 3. Phonetic matching for French (for 'easy' and 'medium' difficulty)
    if (lang === 'fr' && difficulty !== 'hard') {
      const targetPhonetic = phoneticFrench(targetNormalized);
      const spokenPhonetic = phoneticFrench(strippedSpoken);
      const spokenPhoneticTokens = phoneticFrench(normalizedSpoken).split(' ').filter(Boolean);
      const allPhoneticTargets = allTargets.map((t) => phoneticFrench(t));

      if (
        allPhoneticTargets.includes(spokenPhonetic) ||
        spokenPhoneticTokens.includes(targetPhonetic)
      ) {
        return {
          isMatch: true,
          recognizedText: rawSpoken,
          expectedWord: expectedTarget,
          score: 95,
          feedbackKey: 'exact',
          matchedVariant: expectedTarget,
        };
      }
    }

    // 4. Similarity calculation (orthographic + token-level)
    let candidateHighestSim = 0;
    let candidateBestVariant = targetNormalized;

    for (const cand of allTargets) {
      const directSim = calculateSimilarity(normalizedSpoken, cand);
      if (directSim > candidateHighestSim) {
        candidateHighestSim = directSim;
        candidateBestVariant = cand;
      }

      const strippedSim = calculateSimilarity(strippedSpoken, cand);
      if (strippedSim > candidateHighestSim) {
        candidateHighestSim = strippedSim;
        candidateBestVariant = cand;
      }

      for (const token of spokenTokens) {
        const tokenSim = calculateSimilarity(token, cand);
        if (tokenSim > candidateHighestSim) {
          candidateHighestSim = tokenSim;
          candidateBestVariant = cand;
        }
      }

      // In French, also test phonetic similarity on easy/medium
      if (lang === 'fr' && difficulty !== 'hard') {
        const phonCand = phoneticFrench(cand);
        const phonSpoken = phoneticFrench(strippedSpoken);
        const phonSim = calculateSimilarity(phonSpoken, phonCand);
        if (phonSim > candidateHighestSim) {
          candidateHighestSim = phonSim;
          candidateBestVariant = cand;
        }
      }
    }

    const candScore = Math.round(candidateHighestSim * 100);

    // Thresholds per difficulty level
    // Easy: 45 (forgiving for 4yo preschool learners)
    // Medium: 65
    // Hard: 85
    let matchThreshold = 45;
    if (difficulty === 'medium') matchThreshold = 65;
    if (difficulty === 'hard') matchThreshold = 85;

    const candIsMatch = candScore >= matchThreshold;

    if (candScore > bestScore || (!bestIsMatch && candIsMatch)) {
      bestScore = candScore;
      bestCandidate = rawSpoken;
      matchedVariantName = candidateBestVariant;
      bestIsMatch = candIsMatch;
    }
  }

  return {
    isMatch: bestIsMatch,
    recognizedText: bestCandidate,
    expectedWord: expectedTarget,
    score: bestScore,
    feedbackKey: bestIsMatch ? (bestScore >= 80 ? 'exact' : 'close') : 'encouraging',
    matchedVariant: matchedVariantName,
  };
};
