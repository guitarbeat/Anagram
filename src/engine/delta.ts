import { WORDS, LETTER_COUNTS, LETTER_MASKS, FREQ } from './lexicon';
import type {
  CandidateWordItem,
  HistogramBin,
  LetterBudgetTile,
  LetterBudgetSummary,
  MultisetDelta,
  ConstructionState,
} from './types';

const VOWELS = new Set(['a', 'e', 'i', 'o', 'u']);

/**
 * Normalizes string to lowercase a-z characters only
 */
export function normalizeLetters(text: string): string {
  return text.toLowerCase().replace(/[^a-z]/g, '');
}

/**
 * Converts a clean letter string into a 26-element Uint8Array count array and a 32-bit bitmask
 */
export function toCountAndMask(cleanText: string): { counts: Uint8Array; mask: number } {
  const counts = new Uint8Array(26);
  let mask = 0;
  for (let i = 0; i < cleanText.length; i++) {
    const code = cleanText.charCodeAt(i) - 97;
    if (code >= 0 && code < 26) {
      counts[code]++;
      mask |= 1 << code;
    }
  }
  return { counts, mask };
}

/**
 * Performs fast O(N) multiset subtraction between Source and Target text.
 * Partitions characters into Consumed, Remainder, and Surplus.
 */
export function computeMultisetDelta(sourceText: string, targetText: string): MultisetDelta {
  const cleanSource = normalizeLetters(sourceText);
  const cleanTarget = normalizeLetters(targetText);

  const sourceCounts = new Uint8Array(26);
  for (let i = 0; i < cleanSource.length; i++) {
    sourceCounts[cleanSource.charCodeAt(i) - 97]++;
  }

  const targetCounts = new Uint8Array(26);
  for (let i = 0; i < cleanTarget.length; i++) {
    targetCounts[cleanTarget.charCodeAt(i) - 97]++;
  }

  const sourceLetters: string[] = [];
  const targetLetters: string[] = [];
  const consumedLetters: string[] = [];
  const remainingLetters: string[] = [];
  const surplusLetters: string[] = [];
  const budgetTiles: LetterBudgetTile[] = [];

  let totalSource = 0;
  let totalConsumed = 0;
  let totalRemaining = 0;
  let totalSurplus = 0;
  let vowelRemaining = 0;
  let consonantRemaining = 0;

  for (let i = 0; i < 26; i++) {
    const char = String.fromCharCode(97 + i);
    const src = sourceCounts[i];
    const tgt = targetCounts[i];

    const consumed = Math.min(src, tgt);
    const remaining = Math.max(0, src - tgt);
    const surplus = Math.max(0, tgt - src);

    totalSource += src;
    totalConsumed += consumed;
    totalRemaining += remaining;
    totalSurplus += surplus;

    for (let k = 0; k < src; k++) sourceLetters.push(char);
    for (let k = 0; k < tgt; k++) targetLetters.push(char);
    for (let k = 0; k < consumed; k++) consumedLetters.push(char);
    for (let k = 0; k < remaining; k++) {
      remainingLetters.push(char);
      if (VOWELS.has(char)) vowelRemaining++;
      else consonantRemaining++;
    }
    for (let k = 0; k < surplus; k++) surplusLetters.push(char);

    if (src > 0 || tgt > 0) {
      budgetTiles.push({
        letter: char,
        total: src,
        consumed,
        remaining,
        surplus,
      });
    }
  }

  const isExactMatch =
    cleanSource.length > 0 &&
    cleanTarget.length > 0 &&
    totalRemaining === 0 &&
    totalSurplus === 0;

  const isLegalPrefix = cleanTarget.length > 0 && totalSurplus === 0;
  const isSurplus = totalSurplus > 0;

  const budget: LetterBudgetSummary = {
    tiles: budgetTiles,
    totalSourceLetters: totalSource,
    totalConsumed,
    totalRemaining,
    totalSurplus,
    vowelCount: vowelRemaining,
    consonantCount: consonantRemaining,
  };

  return {
    sourceLetters,
    targetLetters,
    consumedLetters,
    remainingLetters,
    surplusLetters,
    isExactMatch,
    isLegalPrefix,
    isSurplus,
    budget,
  };
}

/**
 * Searches the lexicon for single words whose character multiset EXACTLY matches
 * the leftover remaining letters. These are 1-click 100% completion words.
 */
export function findExactClosers(remainingLetters: string[], limit = 30): string[] {
  if (remainingLetters.length === 0) return [];
  const clean = remainingLetters.join('');
  const targetLen = clean.length;
  const { counts: remCounts, mask: remMask } = toCountAndMask(clean);

  const exactMatches: { word: string; freq: number }[] = [];
  const numWords = WORDS.length;

  for (let w = 0; w < numWords; w++) {
    const word = WORDS[w];
    if (word.length !== targetLen) continue;
    if (LETTER_MASKS[w] !== remMask) continue;

    const wCounts = LETTER_COUNTS[w];
    let isExact = true;
    for (let i = 0; i < 26; i++) {
      if (wCounts[i] !== remCounts[i]) {
        isExact = false;
        break;
      }
    }

    if (isExact) {
      exactMatches.push({
        word,
        freq: FREQ.get(word) || 1,
      });
    }
  }

  // Sort closers by SUBTLEX frequency (most natural words first)
  exactMatches.sort((a, b) => b.freq - a.freq);
  return exactMatches.slice(0, limit).map((m) => m.word);
}

/**
 * Computes all dictionary candidate sub-words that can be formed from the given letter pool
 */
export function findCandidateWords(letterPool: string, limit = 1200): CandidateWordItem[] {
  const clean = normalizeLetters(letterPool);
  if (!clean) return [];

  const { counts: poolCounts, mask: poolMask } = toCountAndMask(clean);
  const matches: CandidateWordItem[] = [];
  const numWords = WORDS.length;

  for (let w = 0; w < numWords; w++) {
    const wordMask = LETTER_MASKS[w];
    // Fast bitwise test: does candidate require letters not present in pool?
    if ((wordMask & ~poolMask) !== 0) continue;

    const wCounts = LETTER_COUNTS[w];
    let fits = true;
    for (let i = 0; i < 26; i++) {
      if (wCounts[i] > poolCounts[i]) {
        fits = false;
        break;
      }
    }

    if (fits) {
      const word = WORDS[w];
      matches.push({
        word,
        length: word.length,
        freq: FREQ.get(word) || 1,
      });
    }
  }

  // Sort candidate words: longest first, then highest frequency
  matches.sort((a, b) => {
    if (b.length !== a.length) return b.length - a.length;
    return b.freq - a.freq;
  });

  return matches.slice(0, limit);
}

/**
 * Computes a contiguous length histogram based on candidate words
 */
export function computeLengthHistogram(
  words: CandidateWordItem[],
  minPoolLength = 1,
  maxPoolLength = 8
): HistogramBin[] {
  const countsByLength = new Map<number, number>();
  let minLen = 999;
  let maxLen = 0;

  for (const item of words) {
    countsByLength.set(item.length, (countsByLength.get(item.length) || 0) + 1);
    if (item.length < minLen) minLen = item.length;
    if (item.length > maxLen) maxLen = item.length;
  }

  if (words.length === 0) {
    minLen = minPoolLength;
    maxLen = maxPoolLength;
  }

  const start = Math.max(1, Math.min(minLen, minPoolLength));
  const end = Math.max(start, maxLen);

  const bins: HistogramBin[] = [];
  for (let l = start; l <= end; l++) {
    bins.push({
      length: l,
      count: countsByLength.get(l) || 0,
    });
  }

  return bins;
}

/**
 * Full unified pipeline calculating the complete ConstructionState
 */
export function getConstructionState(sourceText: string, targetText: string): ConstructionState {
  const delta = computeMultisetDelta(sourceText, targetText);

  // Active pool for candidate generation:
  // If target has letters and surplus is 0, explore remaining letters!
  // If target is empty or has surplus, fallback to source pool.
  const activePool =
    delta.targetLetters.length > 0 && !delta.isSurplus
      ? delta.remainingLetters.join('')
      : delta.sourceLetters.join('');

  const exactClosers = delta.isLegalPrefix && delta.remainingLetters.length > 0
    ? findExactClosers(delta.remainingLetters)
    : [];

  const candidateWords = findCandidateWords(activePool);
  const histogramData = computeLengthHistogram(
    candidateWords,
    1,
    activePool.length || delta.sourceLetters.length
  );

  return {
    ...delta,
    exactClosers,
    candidateWords,
    histogramData,
  };
}
