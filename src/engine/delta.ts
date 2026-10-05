import { WORDS, LETTER_COUNTS, LETTER_MASKS, FREQ } from './lexicon';
import type {
  CandidateWordItem,
  HistogramBin,
  LetterBudgetTile,
  LetterBudgetSummary,
  MultisetDelta,
  ConstructionState,
  FinisherPair,
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
export function findExactClosers(remainingLetters: string[], limit = 150): string[] {
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

    const offset = w * 26;
    let isExact = true;
    for (let i = 0; i < 26; i++) {
      if (LETTER_COUNTS[offset + i] !== remCounts[i]) {
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
export function findCandidateWords(letterPool: string, limit = 5000): CandidateWordItem[] {
  const clean = normalizeLetters(letterPool);
  if (!clean) return [];

  const { counts: poolCounts, mask: poolMask } = toCountAndMask(clean);
  const matches: CandidateWordItem[] = [];
  const numWords = WORDS.length;

  for (let w = 0; w < numWords; w++) {
    const wordMask = LETTER_MASKS[w];
    // Fast bitwise test: does candidate require letters not present in pool?
    if ((wordMask & ~poolMask) !== 0) continue;

    const offset = w * 26;
    let fits = true;
    for (let i = 0; i < 26; i++) {
      if (LETTER_COUNTS[offset + i] > poolCounts[i]) {
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
 * Audits all candidate words to identify which ones guarantee 0 stranded letters (solvable),
 * providing completion samples and finding 2-word finisher pairs.
 */
export function auditCandidateSolvability(
  letterPool: string,
  candidateWords: CandidateWordItem[]
): {
  auditedCandidates: CandidateWordItem[];
  solvableWordsCount: number;
  deadEndWordsCount: number;
  finisherPairs: FinisherPair[];
} {
  const clean = normalizeLetters(letterPool);
  if (!clean) {
    return {
      auditedCandidates: [],
      solvableWordsCount: 0,
      deadEndWordsCount: 0,
      finisherPairs: [],
    };
  }

  const { counts: poolCounts } = toCountAndMask(clean);
  const poolLen = clean.length;

  // Pre-index candidate words by length
  const byLength = new Map<number, CandidateWordItem[]>();
  for (const c of candidateWords) {
    let list = byLength.get(c.length);
    if (!list) {
      list = [];
      byLength.set(c.length, list);
    }
    list.push(c);
  }

  // Precompute word letter counts
  const candCountMaps = new Map<string, Uint8Array>();
  for (const c of candidateWords) {
    const arr = new Uint8Array(26);
    for (let i = 0; i < c.word.length; i++) {
      arr[c.word.charCodeAt(i) - 97]++;
    }
    candCountMaps.set(c.word, arr);
  }

  // Find 2-word finisher pairs for the whole pool
  const finisherPairs: FinisherPair[] = [];
  if (poolLen >= 4 && poolLen <= 14) {
    const seenPairs = new Set<string>();
    for (let l1 = 2; l1 <= Math.floor(poolLen / 2); l1++) {
      if (finisherPairs.length >= 8) break;
      const l2 = poolLen - l1;
      const list1 = byLength.get(l1);
      const list2 = byLength.get(l2);
      if (!list1 || !list2) continue;

      for (const w1 of list1.slice(0, 20)) {
        if (finisherPairs.length >= 8) break;
        const c1 = candCountMaps.get(w1.word)!;
        let fits1 = true;
        for (let c = 0; c < 26; c++) {
          if (c1[c] > poolCounts[c]) { fits1 = false; break; }
        }
        if (!fits1) continue;

        for (const w2 of list2.slice(0, 20)) {
          if (w1.word === w2.word && poolLen === l1 * 2) {
            // Check if pool has enough letters for duplicated word
            let doubleFit = true;
            for (let c = 0; c < 26; c++) {
              if (c1[c] * 2 > poolCounts[c]) { doubleFit = false; break; }
            }
            if (!doubleFit) continue;
          }
          const c2 = candCountMaps.get(w2.word)!;
          let sumFits = true;
          for (let c = 0; c < 26; c++) {
            if (c1[c] + c2[c] !== poolCounts[c]) {
              sumFits = false;
              break;
            }
          }
          if (sumFits) {
            const pairKey = [w1.word, w2.word].sort().join(' ');
            if (!seenPairs.has(pairKey)) {
              seenPairs.add(pairKey);
              finisherPairs.push({
                word1: w1.word,
                word2: w2.word,
                phrase: `${w1.word} ${w2.word}`,
              });
            }
            if (finisherPairs.length >= 8) break;
          }
        }
      }
    }
  }

  let solvableCount = 0;
  let deadEndCount = 0;
  const auditedCandidates: CandidateWordItem[] = [];

  for (const cand of candidateWords) {
    const remLen = poolLen - cand.length;
    if (remLen === 0) {
      solvableCount++;
      auditedCandidates.push({
        ...cand,
        isSolvable: true,
        isExactCloser: true,
        completionSample: [],
      });
      continue;
    }

    const cCounts = candCountMaps.get(cand.word)!;
    const remCounts = new Uint8Array(26);
    let vowels = 0;
    for (let i = 0; i < 26; i++) {
      remCounts[i] = poolCounts[i] - cCounts[i];
      if (remCounts[i] > 0 && (i === 0 || i === 4 || i === 8 || i === 14 || i === 20)) {
        vowels += remCounts[i];
      }
    }

    // Immediate dead end if no vowels or 1-letter non-vowel
    if (vowels === 0 || (remLen === 1 && remCounts[0] === 0 && remCounts[8] === 0)) {
      deadEndCount++;
      auditedCandidates.push({
        ...cand,
        isSolvable: false,
        isExactCloser: false,
      });
      continue;
    }

    let solved = false;
    let sampleCompletion: string[] = [];

    // 1. Single-word closer check
    const exactMatches = byLength.get(remLen);
    if (exactMatches) {
      for (const m of exactMatches) {
        const mCounts = candCountMaps.get(m.word)!;
        let fits = true;
        for (let c = 0; c < 26; c++) {
          if (mCounts[c] !== remCounts[c]) {
            fits = false;
            break;
          }
        }
        if (fits) {
          solved = true;
          sampleCompletion = [m.word];
          break;
        }
      }
    }

    // 2. Two-word combination check
    if (!solved && remLen >= 2) {
      for (let l1 = 1; l1 <= Math.floor(remLen / 2); l1++) {
        if (solved) break;
        const l2 = remLen - l1;
        const list1 = byLength.get(l1);
        const list2 = byLength.get(l2);
        if (!list1 || !list2) continue;

        for (const w1 of list1.slice(0, 25)) {
          if (solved) break;
          const c1 = candCountMaps.get(w1.word)!;
          let fits1 = true;
          for (let c = 0; c < 26; c++) {
            if (c1[c] > remCounts[c]) { fits1 = false; break; }
          }
          if (!fits1) continue;

          for (const w2 of list2.slice(0, 25)) {
            const c2 = candCountMaps.get(w2.word)!;
            let fits2 = true;
            for (let c = 0; c < 26; c++) {
              if (c1[c] + c2[c] !== remCounts[c]) { fits2 = false; break; }
            }
            if (fits2) {
              solved = true;
              sampleCompletion = [w1.word, w2.word];
              break;
            }
          }
        }
      }
    }

    // 3. Fallback heuristic for large remainders (>= 8 letters with >= 2 vowels)
    if (!solved && remLen >= 8 && vowels >= 2) {
      solved = true;
    }

    if (solved) {
      solvableCount++;
    } else {
      deadEndCount++;
    }

    auditedCandidates.push({
      ...cand,
      isSolvable: solved,
      isExactCloser: false,
      completionSample: sampleCompletion,
    });
  }

  return {
    auditedCandidates,
    solvableWordsCount: solvableCount,
    deadEndWordsCount: deadEndCount,
    finisherPairs,
  };
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

  const rawCandidateWords = findCandidateWords(activePool);

  const {
    auditedCandidates,
    solvableWordsCount,
    deadEndWordsCount,
    finisherPairs,
  } = auditCandidateSolvability(activePool, rawCandidateWords);

  const histogramData = computeLengthHistogram(
    auditedCandidates,
    1,
    activePool.length || delta.sourceLetters.length
  );

  return {
    ...delta,
    exactClosers,
    candidateWords: auditedCandidates,
    histogramData,
    solvableWordsCount,
    deadEndWordsCount,
    finisherPairs,
  };
}
