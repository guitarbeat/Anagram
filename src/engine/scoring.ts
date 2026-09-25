import nlp from 'compromise';
import {
  FREQ,
  pos,
  COMMON_FUNCTION_WORDS,
  hasInvalidArticle,
  startsWithVowelSound,
  formatWordForDisplay,
  type POS,
} from './lexicon';

export interface ScoredPhrase {
  phrase: string;
  words: string[];
  posTags: POS[];
  score: number;
  wordScoreTotal: number;
  grammarScore: number;
  funninessScore: number;
}

/**
 * Sound-based funniness heuristic:
 * - Points for comical / quirky letters: z (+3.5), k/q/x/j (+2.0)
 * - Points for sound patterns: oodle, ffle, uck, ump, onk, izz, ble, oblin, gob, wiz, ozo, zon, zoo, roo, zorr, clown, snort, blob, dork, oo, ee (+2.5)
 * - Points for doubled letters (+1.5)
 * - Sweet spot bonus for length 4-7 (+1.0)
 */
export function funniness(w: string): number {
  const clean = w.toLowerCase().trim();
  if (!clean) return 0;
  let score = 0;

  // Comical / quirky letters
  const zMatch = clean.match(/z/g);
  if (zMatch) {
    score += zMatch.length * 3.5;
  }

  const otherFunnyLetters = clean.match(/[kqxj]/g);
  if (otherFunnyLetters) {
    score += otherFunnyLetters.length * 2.0;
  }

  // Sound patterns & playful morphemes
  const soundPatterns = clean.match(
    /oodle|ffle|uck|ump|onk|izz|oble|oblin|gob|wiz|ozo|zon|zoo|roo|zorr|clown|snort|blob|dork|oo|ee/g
  );
  if (soundPatterns) {
    score += soundPatterns.length * 2.5;
  }

  // Doubled letters
  const doubled = clean.match(/(.)\1/g);
  if (doubled) {
    score += doubled.length * 1.5;
  }

  // Length 4-7 sweet spot
  if (clean.length >= 4 && clean.length <= 7) {
    score += 1.0;
  }

  return Math.round(score * 10) / 10;
}

/**
 * Individual word scoring:
 * log10(freq+1)*2.5, -6 if freq is 0, +min(len,8)*0.3, +funniness*1.5, +8 if custom/anchor word.
 * Penalizes 1-2 letter non-function words.
 */
export function wordScore(w: string, custom = false): number {
  const clean = w.toLowerCase().trim();
  if (!clean) return 0;
  const freq = FREQ.get(clean) || 0;
  let score = 0;

  if (freq === 0) {
    score -= 6;
  } else {
    score += Math.log10(freq + 1) * 2.5;
  }

  if (clean.length <= 2 && !COMMON_FUNCTION_WORDS.has(clean)) {
    score -= 8;
  }

  score += Math.min(clean.length, 8) * 0.3;
  score += funniness(clean) * 1.5;

  if (custom) {
    score += 8;
  }

  return Math.round(score * 10) / 10;
}

const grammarCache = new Map<string, number>();

const MODAL_VERBS = new Set([
  'can', 'will', 'may', 'must', 'could', 'should', 'would', 'might'
]);

const COPULA_AND_AUX_VERBS = new Set([
  'was', 'is', 'am', 'are', 'were', 'be', 'been', 'do', 'did', 'had', 'has', 'have'
]);

/**
 * Grammar scoring based on neighbouring POS transitions, full syntactic patterns,
 * and natural English sentence structures:
 * - Disqualifies/heavily penalises invalid articles (a/an mismatches, plural/verb followers)
 * - Rewards full patterns:
 *     • [art] adj noun: +15
 *     • noun verb [art] noun: +25
 *     • pron verb [art] noun: +25
 * - Penalises adjacent verbs ("try loft was", "son am to err"): -30
 * - Penalises phrases where no ordering produces a noun+verb or adj+noun pair: -30
 * - Penalises phrases ending on dangling copula/auxiliary verbs: -25
 */
export function grammarScore(words: string[]): number {
  if (words.length === 0) return 0;
  const key = words.join(' ').toLowerCase();
  const cached = grammarCache.get(key);
  if (cached !== undefined) return cached;

  let score = 0;
  const tags: POS[] = words.map(w => pos(w));

  // 1. Heavy penalties for invalid article usage (phonetic mismatches, verbs/pronouns/plurals, dangling)
  for (let i = 0; i < words.length; i++) {
    const w = words[i].toLowerCase();
    if (w === 'a' || w === 'an') {
      if (i === words.length - 1) {
        score -= 50; // Dangling article at end of phrase
        continue;
      }
      const nextWord = words[i + 1].toLowerCase();
      const nextDoc = nlp(nextWord);
      const nextPos = pos(nextWord);

      // Specific penalty for 'a' or 'an' directly before a verb or pronoun
      if (nextPos === 'pron' || nextDoc.has('#Pronoun')) {
        score -= 60; // e.g. "a its", "a him", "an you"
      }
      if (nextPos === 'verb' || (nextDoc.has('#Verb') && !nextDoc.has('#Noun') && !nextDoc.has('#Adjective'))) {
        score -= 60; // e.g. "a was", "a runs", "an eats"
      }

      // Penalty before plural noun
      if (nextDoc.has('#Plural')) {
        score -= 45; // e.g. "a rooms", "a doors"
      }

      // Heavily penalise phonetic mismatch: 'an' before consonant sound, 'a' before vowel sound
      const isVowel = startsWithVowelSound(nextWord);
      if (w === 'a' && isVowel) {
        score -= 60; // e.g. "a owl", "a apple"
      } else if (w === 'an' && !isVowel) {
        score -= 60; // e.g. "an wood", "an dog"
      }
    }
  }

  // Ensure phrases flagged by hasInvalidArticle receive at least -80 penalty
  if (hasInvalidArticle(words)) {
    score = Math.min(score, -80);
  }

  for (let i = 0; i < tags.length - 1; i++) {
    const a = tags[i];
    const b = tags[i + 1];
    const wA = words[i].toLowerCase();

    if (a === 'art' && (b === 'adj' || b === 'noun')) {
      score += 8;
      if ((FREQ.get(words[i + 1].toLowerCase()) || 0) > 0) {
        score += 2;
      }
    }
    if (a === 'adj' && b === 'noun') score += 10;
    if ((a === 'noun' || a === 'pron') && b === 'verb') score += 8;
    if (a === 'verb' && (b === 'art' || b === 'noun')) score += 6;

    // Penalise two verbs next to each other ("try loft was", "son am to err")
    if (a === 'verb' && b === 'verb') {
      if (!MODAL_VERBS.has(wA)) {
        score -= 30;
      }
    }

    if (a === b && a !== 'noun') score -= 5;
  }

  // Penalty for awkward sentence boundaries
  const firstWord = words[0].toLowerCase();
  if (tags[0] === 'conj' || firstWord === 'or' || firstWord === 'and' || firstWord === 'but') {
    score -= 6;
  }

  const lastWord = words[words.length - 1].toLowerCase();
  const lastTag = tags[tags.length - 1];
  if (lastTag === 'art' || lastTag === 'prep' || lastTag === 'conj') {
    score -= 15;
  }

  // Penalise ending on dangling copula/auxiliary verbs without predicate ("loft was", "it do")
  if (COPULA_AND_AUX_VERBS.has(lastWord)) {
    score -= 25;
  }

  if (lastWord === 'no') {
    score -= 6;
  }

  // Penalty for any 1-2 letter word that is not a common function word
  let shortCount = 0;
  for (const w of words) {
    const clean = w.toLowerCase();
    if (clean.length <= 2) {
      shortCount++;
      if (!COMMON_FUNCTION_WORDS.has(clean)) {
        score -= 10;
      }
    }
  }

  // Choppy phrase penalty: 3 or more 1-2 letter words in a single phrase
  if (shortCount >= 3) {
    score -= (shortCount - 2) * 10;
  }

  // Sweet-spot bonus for crisp 3-4 word sentences
  if (words.length >= 3 && words.length <= 4) {
    score += 6;
  }

  // Evaluate full syntactic patterns with compromise
  const doc = nlp(key);

  // Heavily reward [Article] + [Adjective] + [Noun] pattern
  if (doc.has('#Determiner #Adjective+ #Noun')) {
    score += 40;
  } else if (doc.has('#Determiner? #Adjective+ #Noun')) {
    score += 18;
  }

  // [Article] + [Noun] pattern
  if (doc.has('#Determiner #Noun')) {
    score += 20;
  }

  // noun verb [art] noun pattern
  if (doc.has('#Noun #Verb #Determiner? #Noun')) {
    score += 25;
  }

  // pron verb [art] noun pattern
  if (doc.has('#Pronoun #Verb #Determiner? #Noun')) {
    score += 25;
  }

  // Secondary constituent patterns
  if (doc.has('#Noun #Verb')) {
    score += 8;
  }
  if (doc.has('#Pronoun #Verb')) {
    score += 8;
  }
  if (doc.has('#Verb #Determiner? #Noun')) {
    score += 8;
  }

  // Penalise phrases where no ordering produces a noun+verb, pron+verb, verb+noun, or adj+noun pair
  const hasCorePair =
    doc.has('#Noun #Verb') ||
    doc.has('#Pronoun #Verb') ||
    doc.has('#Verb #Noun') ||
    doc.has('#Adjective #Noun');

  if (!hasCorePair) {
    score -= 30;
  }

  grammarCache.set(key, score);
  return score;
}

function getPermutations<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr];
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i++) {
    const cur = arr[i];
    const rem = arr.slice(0, i).concat(arr.slice(i + 1));
    const sub = getPermutations(rem);
    for (const s of sub) {
      result.push([cur, ...s]);
    }
  }
  return result;
}

/**
 * Orders words to maximize grammarScore.
 * If <= 4 non-anchor words, tries all permutations; otherwise keeps order.
 * Respects anchorPlacement ('start', 'end', or 'natural').
 */
export function bestOrder(
  words: string[],
  anchorWords: string[] = [],
  anchorPlacement: 'start' | 'end' | 'natural' = 'natural'
): string[] {
  if (words.length === 0) return [];

  if (anchorWords.length > 0) {
    const cleanAnchors = anchorWords.map(w => w.toLowerCase());
    const anchorsInWords: string[] = [];
    const nonAnchorsInWords: string[] = [];
    const remainingAnchors = [...cleanAnchors];

    for (const w of words) {
      const idx = remainingAnchors.indexOf(w.toLowerCase());
      if (idx !== -1) {
        anchorsInWords.push(w);
        remainingAnchors.splice(idx, 1);
      } else {
        nonAnchorsInWords.push(w);
      }
    }

    if (anchorPlacement === 'start') {
      const prefix = anchorsInWords.length > 0 ? anchorsInWords : anchorWords;
      const toPermute = nonAnchorsInWords;
      if (toPermute.length <= 4 && toPermute.length > 0) {
        const perms = getPermutations(toPermute);
        let best = toPermute;
        let bestS = -99999;
        for (const p of perms) {
          const candidate = [...prefix, ...p];
          const s = grammarScore(candidate);
          if (s > bestS) {
            bestS = s;
            best = p;
          }
        }
        return [...prefix, ...best];
      }
      return [...prefix, ...toPermute];
    }

    if (anchorPlacement === 'end') {
      const suffix = anchorsInWords.length > 0 ? anchorsInWords : anchorWords;
      const toPermute = nonAnchorsInWords;
      if (toPermute.length <= 4 && toPermute.length > 0) {
        const perms = getPermutations(toPermute);
        let best = toPermute;
        let bestS = -99999;
        for (const p of perms) {
          const candidate = [...p, ...suffix];
          const s = grammarScore(candidate);
          if (s > bestS) {
            bestS = s;
            best = p;
          }
        }
        return [...best, ...suffix];
      }
      return [...toPermute, ...suffix];
    }
  }

  // Natural placement or no anchors
  if (words.length <= 4) {
    const perms = getPermutations(words);
    let best = words;
    let bestS = -99999;
    for (const p of perms) {
      const s = grammarScore(p);
      if (s > bestS) {
        bestS = s;
        best = p;
      }
    }
    return best;
  }

  return words;
}

/**
 * Computes the overall phrase score:
 * sum(wordScore) + grammarScore * 3.0 - duplicatePenalty
 * Capitalises proper names (#Person or #Place) in the returned phrase.
 */
export function scorePhrase(
  words: string[],
  customWordsSet: Set<string> = new Set()
): ScoredPhrase {
  let wordScoreTotal = 0;
  let funninessScore = 0;
  const wordCounts = new Map<string, number>();

  for (const w of words) {
    const lower = w.toLowerCase();
    wordCounts.set(lower, (wordCounts.get(lower) || 0) + 1);
    const isCustom = customWordsSet.has(lower);
    wordScoreTotal += wordScore(lower, isCustom);
    funninessScore += funniness(lower);
  }

  const grammar = grammarScore(words);
  let duplicatePenalty = 0;
  for (const count of wordCounts.values()) {
    if (count > 1) {
      duplicatePenalty += (count - 1) * 5;
    }
  }

  // Grammar score counts heavily (weight 3.0x) so coherent sentences beat word salads
  const totalScore = Math.round((wordScoreTotal + grammar * 3.0 - duplicatePenalty) * 10) / 10;
  const posTags: POS[] = words.map(w => pos(w));

  // Capitalise proper names for display
  const displayWords = words.map(w => formatWordForDisplay(w));

  return {
    phrase: displayWords.join(' '),
    words: displayWords,
    posTags,
    score: totalScore,
    wordScoreTotal: Math.round(wordScoreTotal * 10) / 10,
    grammarScore: grammar,
    funninessScore: Math.round(funninessScore * 10) / 10,
  };
}

