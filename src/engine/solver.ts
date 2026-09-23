import { WORDS, LETTER_COUNTS, LETTER_MASKS, isSpicy, type POS } from './lexicon';
import { scorePhrase, bestOrder } from './scoring';

export interface AnagramResult {
  phrase: string;
  words: string[];
  posTags: POS[];
  score: number;
  wordScoreTotal: number;
  grammarScore: number;
  funninessScore: number;
  isExact: boolean;
}

export interface SolveMetrics {
  elapsedMs: number;
  candidatesCount: number;
  nodesVisited: number;
  solutionsFound: number;
}

export interface SolveOptions {
  source: string;
  maxWords?: number;
  resultLimit?: number;
  allowSpicy?: boolean;
  anchorText?: string;
  customWordsText?: string;
  anchorPlacement?: 'start' | 'end' | 'natural';
  onProgress?: (percent: number) => void;
}

/**
 * Normalizes string: lowercase, accents stripped, a-z only.
 */
export function normalize(str: string): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');
}

/**
 * Computes letter counts for 26 lowercase characters.
 */
export function countsArray(str: string): Uint8Array {
  const norm = normalize(str);
  const arr = new Uint8Array(26);
  for (let i = 0; i < norm.length; i++) {
    arr[norm.charCodeAt(i) - 97]++;
  }
  return arr;
}

/**
 * Validates that candidatePhrase is an EXACT anagram of source.
 */
export function exact(source: string, candidatePhrase: string): boolean {
  const sNorm = normalize(source);
  const cNorm = normalize(candidatePhrase);
  if (sNorm.length !== cNorm.length || sNorm.length === 0) return false;

  const sCounts = countsArray(sNorm);
  const cCounts = countsArray(cNorm);

  for (let i = 0; i < 26; i++) {
    if (sCounts[i] !== cCounts[i]) return false;
  }
  return true;
}

interface CandidatePool {
  words: string[];
  counts: Uint8Array[];
  masks: number[];
  customSet: Set<string>;
}

/**
 * Filters words from WORDS + custom words + anchor words.
 * Uses bitwise mask check first, then full letter counts check, and spicy check.
 */
export function buildCandidates(
  sourceCounts: Uint8Array,
  sourceMask: number,
  allowSpicy = false,
  customWords: string[] = [],
  anchorWords: string[] = []
): CandidatePool {
  const candidates: string[] = [];
  const candCounts: Uint8Array[] = [];
  const candMasks: number[] = [];
  const customSet = new Set<string>();

  // Add custom words and anchor words to customSet
  for (const w of [...customWords, ...anchorWords]) {
    const clean = normalize(w);
    if (clean) customSet.add(clean);
  }

  // Helper to test if a word fits source counts
  const fits = (w: string): Uint8Array | null => {
    const cnt = new Uint8Array(26);
    for (let i = 0; i < w.length; i++) {
      const c = w.charCodeAt(i) - 97;
      cnt[c]++;
      if (cnt[c] > sourceCounts[c]) return null;
    }
    return cnt;
  };

  // 1. Process custom and anchor words first
  for (const w of customSet) {
    if (!allowSpicy && isSpicy(w)) continue;
    const cnt = fits(w);
    if (cnt) {
      let mask = 0;
      for (let i = 0; i < 26; i++) {
        if (cnt[i] > 0) mask |= 1 << i;
      }
      candidates.push(w);
      candCounts.push(cnt);
      candMasks.push(mask);
    }
  }

  // 2. Process dictionary WORDS
  for (let i = 0; i < WORDS.length; i++) {
    const wordMask = LETTER_MASKS[i];
    // Bitwise fast reject: word must only contain letters present in source
    if ((wordMask & sourceMask) !== wordMask) continue;

    const w = WORDS[i];
    if (customSet.has(w)) continue;

    // Full count check using precomputed flat buffer
    const offset = i * 26;
    let possible = true;
    for (let c = 0; c < 26; c++) {
      if (LETTER_COUNTS[offset + c] > sourceCounts[c]) {
        possible = false;
        break;
      }
    }
    if (!possible) continue;

    // Only run isSpicy on words that pass mask and letter count checks
    if (!allowSpicy && isSpicy(w)) continue;

    const cnt = new Uint8Array(26);
    for (let c = 0; c < 26; c++) {
      cnt[c] = LETTER_COUNTS[offset + c];
    }
    candidates.push(w);
    candCounts.push(cnt);
    candMasks.push(wordMask);
  }

  return {
    words: candidates,
    counts: candCounts,
    masks: candMasks,
    customSet,
  };
}

/**
 * Synchronous solve function called by the web worker or tests.
 */
export function solveAnagrams(opts: SolveOptions): {
  results: AnagramResult[];
  metrics: SolveMetrics;
} {
  const startTime = Date.now();
  const source = (opts.source || '').trim();
  const cleanSource = normalize(source);

  if (!cleanSource) {
    return {
      results: [],
      metrics: {
        elapsedMs: 0,
        candidatesCount: 0,
        nodesVisited: 0,
        solutionsFound: 0,
      },
    };
  }

  const maxWords = opts.maxWords || 4;
  const resultLimit = opts.resultLimit || 80;
  const allowSpicy = !!opts.allowSpicy;
  const anchorPlacement = opts.anchorPlacement || 'natural';

  // Compute source counts and 26-bit mask
  const sourceCounts = new Uint8Array(26);
  let sourceMask = 0;
  for (let i = 0; i < cleanSource.length; i++) {
    const c = cleanSource.charCodeAt(i) - 97;
    sourceCounts[c]++;
    sourceMask |= 1 << c;
  }

  // Parse anchor words
  const anchorWords: string[] = [];
  const anchorCounts = new Uint8Array(26);
  let anchorLetterCount = 0;

  if (opts.anchorText && opts.anchorText.trim()) {
    const rawAnchors = opts.anchorText.trim().split(/\s+/);
    for (const raw of rawAnchors) {
      const cleanAnchor = normalize(raw);
      if (cleanAnchor) {
        anchorWords.push(cleanAnchor);
        for (let i = 0; i < cleanAnchor.length; i++) {
          const c = cleanAnchor.charCodeAt(i) - 97;
          anchorCounts[c]++;
          anchorLetterCount++;
        }
      }
    }

    // Verify that anchor letters are contained in source
    for (let c = 0; c < 26; c++) {
      if (anchorCounts[c] > sourceCounts[c]) {
        throw new Error('Anchor contains letters not present in the input text');
      }
    }
  }

  // Parse custom words
  const customWords: string[] = [];
  if (opts.customWordsText && opts.customWordsText.trim()) {
    const rawCustom = opts.customWordsText.trim().split(/[\s,]+/);
    for (const raw of rawCustom) {
      const clean = normalize(raw);
      if (clean) customWords.push(clean);
    }
  }

  // Initial remaining letter counts for DFS
  const remainingCounts = new Uint8Array(26);
  for (let c = 0; c < 26; c++) {
    remainingCounts[c] = sourceCounts[c] - anchorCounts[c];
  }
  const remainingLengthToSolve = cleanSource.length - anchorLetterCount;

  // If anchor itself is exact match
  if (remainingLengthToSolve === 0) {
    const ordered = bestOrder(anchorWords, anchorWords, anchorPlacement);
    const scored = scorePhrase(ordered, new Set(anchorWords));
    const isEx = exact(source, scored.phrase);
    return {
      results: [{ ...scored, isExact: isEx }],
      metrics: {
        elapsedMs: Date.now() - startTime,
        candidatesCount: anchorWords.length,
        nodesVisited: 1,
        solutionsFound: 1,
      },
    };
  }

  // Build candidate words
  let remainingMask = 0;
  for (let c = 0; c < 26; c++) {
    if (remainingCounts[c] > 0) remainingMask |= 1 << c;
  }

  const pool = buildCandidates(
    remainingCounts,
    remainingMask,
    allowSpicy,
    customWords,
    anchorWords
  );

  const candidates = pool.words;
  const candCounts = pool.counts;
  const candMasks = pool.masks;
  const customSet = pool.customSet;

  // Inverted letter index: for each of the 26 letters, list candidates that contain it
  const letterToCandIndices: number[][] = Array.from({ length: 26 }, () => []);
  for (let i = 0; i < candidates.length; i++) {
    const mask = candMasks[i];
    for (let c = 0; c < 26; c++) {
      if ((mask & (1 << c)) !== 0) {
        letterToCandIndices[c].push(i);
      }
    }
  }

  // Vowel bitmask for pruning (a=0, e=4, i=8, o=14, u=20, y=24)
  const VOWEL_INDICES = [0, 4, 8, 14, 20, 24];

  const currentWords: string[] = [];
  const rawSolutions: string[][] = [];
  const seenCombos = new Set<string>();
  let nodesVisited = 0;
  const MAX_NODES = 120_000;
  const TIME_BUDGET_MS = 1500;
  const MAX_SOLUTIONS = 400;

  function dfs(remainingLen: number): void {
    nodesVisited++;
    if (nodesVisited > MAX_NODES || Date.now() - startTime > TIME_BUDGET_MS) {
      return;
    }

    if (remainingLen === 0) {
      const comboKey = [...currentWords].sort().join(' ');
      if (!seenCombos.has(comboKey)) {
        seenCombos.add(comboKey);
        rawSolutions.push([...currentWords]);
      }
      return;
    }

    if (currentWords.length + anchorWords.length >= maxWords) {
      return;
    }

    // Vowel pruning: if more than 2 letters remain and there are no vowels, prune branch
    if (remainingLen > 2) {
      let hasVowel = false;
      for (let v = 0; v < VOWEL_INDICES.length; v++) {
        if (remainingCounts[VOWEL_INDICES[v]] > 0) {
          hasVowel = true;
          break;
        }
      }
      if (!hasVowel) return;
    }

    // Branch on letter with fewest candidate options among remaining positive letters
    let bestLetter = -1;
    let fewestOptions = 999999;

    for (let c = 0; c < 26; c++) {
      if (remainingCounts[c] > 0) {
        const opts = letterToCandIndices[c].length;
        if (opts < fewestOptions) {
          fewestOptions = opts;
          bestLetter = c;
        }
      }
    }

    if (bestLetter === -1 || fewestOptions === 0) return;

    const validCandIndices = letterToCandIndices[bestLetter];
    for (let k = 0; k < validCandIndices.length; k++) {
      const idx = validCandIndices[k];
      const wCounts = candCounts[idx];
      let canUse = true;
      for (let c = 0; c < 26; c++) {
        if (wCounts[c] > remainingCounts[c]) {
          canUse = false;
          break;
        }
      }
      if (!canUse) continue;

      const wLen = candidates[idx].length;
      for (let c = 0; c < 26; c++) {
        remainingCounts[c] -= wCounts[c];
      }
      currentWords.push(candidates[idx]);

      dfs(remainingLen - wLen);

      currentWords.pop();
      for (let c = 0; c < 26; c++) {
        remainingCounts[c] += wCounts[c];
      }

      if (rawSolutions.length >= MAX_SOLUTIONS) return;
    }
  }

  dfs(remainingLengthToSolve);

  // Score and order each solution
  const seenPhrases = new Set<string>();
  const scoredList: AnagramResult[] = [];

  for (let sIdx = 0; sIdx < rawSolutions.length; sIdx++) {
    const solutionWords = rawSolutions[sIdx];
    const allWords = [...solutionWords, ...anchorWords];
    const ordered = bestOrder(allWords, anchorWords, anchorPlacement);
    const phraseKey = ordered.join(' ');

    if (seenPhrases.has(phraseKey)) continue;
    seenPhrases.add(phraseKey);

    const scored = scorePhrase(ordered, customSet);
    const isEx = exact(source, scored.phrase);
    if (!isEx) continue; // Hard rule: Every result must remain an EXACT anagram

    scoredList.push({
      ...scored,
      isExact: isEx,
    });
  }

  // Sort by base score descending
  scoredList.sort((a, b) => b.score - a.score);

  // Diversity filtering:
  // Subtract 1.5 * (number of earlier results containing that word) for each repeated word
  const finalResults: AnagramResult[] = [];
  const wordSeenCount = new Map<string, number>();

  const remainingToSelect = [...scoredList];

  while (finalResults.length < resultLimit && remainingToSelect.length > 0) {
    let bestIndex = 0;
    let bestAdjustedScore = -99999;

    for (let i = 0; i < remainingToSelect.length; i++) {
      const item = remainingToSelect[i];
      let penalty = 0;
      for (const w of item.words) {
        const count = wordSeenCount.get(w.toLowerCase()) || 0;
        penalty += count * 1.5;
      }
      const adjusted = item.score - penalty;
      if (adjusted > bestAdjustedScore) {
        bestAdjustedScore = adjusted;
        bestIndex = i;
      }
    }

    const chosen = remainingToSelect.splice(bestIndex, 1)[0];
    finalResults.push(chosen);

    for (const w of chosen.words) {
      const lower = w.toLowerCase();
      wordSeenCount.set(lower, (wordSeenCount.get(lower) || 0) + 1);
    }
  }

  const elapsedMs = Date.now() - startTime;

  return {
    results: finalResults,
    metrics: {
      elapsedMs,
      candidatesCount: candidates.length,
      nodesVisited,
      solutionsFound: finalResults.length,
    },
  };
}
