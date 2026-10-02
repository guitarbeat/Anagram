import { normalize, countsArray } from './solver';
import { WORDS, FREQ, pos, COMMON_FUNCTION_WORDS } from './lexicon';
import { grammarScore } from './scoring';
import { smartPunctuate } from './polish';

export interface ProgressiveCompletion {
  id: string;
  words: string[];
  phrase: string;
  fullPhrase: string;
  formattedProse: string;
  score: number;
  isExact: boolean;
  leftoverCount: number;
  breakdown: {
    grammarScore: number;
    naturalnessScore: number;
    clevernessScore: number;
    brevityScore: number;
  };
}

/**
 * Solves the remaining letters multiset and scores all exact endings
 * according to natural language constraint decomposition:
 * score = 45% natural grammar + 25% word naturalness + 20% cleverness + 10% brevity
 * Hard requirement: 100% exact letter match (0 leftovers)
 */
export function findProgressiveCompletions(
  sourceName: string,
  targetPhrase: string,
  remainingLetters: string[],
  maxCount = 10
): ProgressiveCompletion[] {
  if (remainingLetters.length === 0) return [];

  const remStr = remainingLetters.join('');
  const remCounts = countsArray(remStr);

  // Filter dictionary words that can fit in remaining letters
  const validCandidates: string[] = [];
  const candidateCounts: Uint8Array[] = [];

  for (let i = 0; i < WORDS.length; i++) {
    const w = WORDS[i];
    if (w.length > remStr.length) continue;
    if (w.length <= 2 && !COMMON_FUNCTION_WORDS.has(w)) continue;

    const cnt = countsArray(w);
    let fits = true;
    for (let c = 0; c < 26; c++) {
      if (cnt[c] > remCounts[c]) {
        fits = false;
        break;
      }
    }
    if (fits) {
      validCandidates.push(w);
      candidateCounts.push(cnt);
    }
  }

  const exactSolutions: string[][] = [];

  // Helper to subtract counts
  const subtract = (base: Uint8Array, sub: Uint8Array): Uint8Array | null => {
    const res = new Uint8Array(26);
    for (let i = 0; i < 26; i++) {
      if (sub[i] > base[i]) return null;
      res[i] = base[i] - sub[i];
    }
    return res;
  };

  const isZero = (c: Uint8Array): boolean => {
    for (let i = 0; i < 26; i++) {
      if (c[i] !== 0) return false;
    }
    return true;
  };

  // 1. Single-word exact closers
  for (let i = 0; i < validCandidates.length; i++) {
    const rem = subtract(remCounts, candidateCounts[i]);
    if (rem && isZero(rem)) {
      exactSolutions.push([validCandidates[i]]);
    }
  }

  // 2. Two-word exact closers
  for (let i = 0; i < validCandidates.length; i++) {
    const rem1 = subtract(remCounts, candidateCounts[i]);
    if (!rem1 || isZero(rem1)) continue;

    for (let j = i; j < validCandidates.length; j++) {
      const rem2 = subtract(rem1, candidateCounts[j]);
      if (rem2 && isZero(rem2)) {
        exactSolutions.push([validCandidates[i], validCandidates[j]]);
      }
    }
  }

  // 3. Three-word exact closers (if remainder is longer)
  if (remStr.length >= 7 && exactSolutions.length < 150) {
    const limit = Math.min(validCandidates.length, 120);
    for (let i = 0; i < limit; i++) {
      const rem1 = subtract(remCounts, candidateCounts[i]);
      if (!rem1 || isZero(rem1)) continue;

      for (let j = i; j < limit; j++) {
        const rem2 = subtract(rem1, candidateCounts[j]);
        if (!rem2 || isZero(rem2)) continue;

        for (let k = j; k < limit; k++) {
          const rem3 = subtract(rem2, candidateCounts[k]);
          if (rem3 && isZero(rem3)) {
            exactSolutions.push([validCandidates[i], validCandidates[j], validCandidates[k]]);
            if (exactSolutions.length >= 300) break;
          }
        }
        if (exactSolutions.length >= 300) break;
      }
      if (exactSolutions.length >= 300) break;
    }
  }

  // Score and rank all exact solutions
  const targetWords = targetPhrase.trim().split(/\s+/).filter(Boolean);
  const scored: ProgressiveCompletion[] = [];
  const seenPhrases = new Set<string>();

  for (const sol of exactSolutions) {
    const endingPhrase = sol.join(' ');
    if (seenPhrases.has(endingPhrase)) continue;
    seenPhrases.add(endingPhrase);

    const fullWords = [...targetWords, ...sol];
    const fullPhrase = fullWords.join(' ').toUpperCase();

    // 1. Natural grammar score across the whole combined sentence
    const gScore = Math.max(-50, grammarScore(fullWords));
    const normalizedGrammar = Math.max(0, Math.min(100, (gScore + 30) * 1.5));

    // 2. Lexical naturalness & frequency
    let natScore = 0;
    for (const w of sol) {
      const freq = FREQ.get(w) || 0;
      if (freq > 2000) natScore += 30;
      else if (freq > 500) natScore += 20;
      else if (freq > 50) natScore += 10;
    }
    const normalizedNaturalness = Math.min(100, (natScore / sol.length) * 3);

    // 3. Cleverness & word length/depth
    let cScore = 0;
    for (const w of sol) {
      if (w.length >= 6) cScore += 35;
      else if (w.length >= 4) cScore += 20;
    }
    const normalizedCleverness = Math.min(100, cScore);

    // 4. Brevity (crispness)
    const normalizedBrevity = sol.length === 1 ? 95 : sol.length === 2 ? 85 : 70;

    // Weighted multi-factor score: 45% grammar + 25% naturalness + 20% cleverness + 10% brevity
    const compositeScore = Math.round(
      0.45 * normalizedGrammar +
      0.25 * normalizedNaturalness +
      0.20 * normalizedCleverness +
      0.10 * normalizedBrevity
    );

    const formattedProse = smartPunctuate(fullPhrase, targetPhrase);

    scored.push({
      id: endingPhrase,
      words: sol,
      phrase: endingPhrase.toUpperCase(),
      fullPhrase,
      formattedProse,
      score: compositeScore,
      isExact: true,
      leftoverCount: 0,
      breakdown: {
        grammarScore: Math.round(normalizedGrammar),
        naturalnessScore: Math.round(normalizedNaturalness),
        clevernessScore: Math.round(normalizedCleverness),
        brevityScore: Math.round(normalizedBrevity),
      },
    });
  }

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, maxCount);
}

/**
 * Finds high-value semantic anchor words hiding in the source name multiset
 */
export function findSemanticAnchors(sourceName: string, limit = 8): { word: string; length: number; tag: string }[] {
  const norm = normalize(sourceName);
  if (norm.length < 3) return [];

  const sourceCounts = countsArray(norm);
  const anchors: { word: string; length: number; tag: string }[] = [];

  for (let i = 0; i < WORDS.length; i++) {
    const w = WORDS[i];
    if (w.length < 4 || w.length > norm.length - 2) continue;

    const cnt = countsArray(w);
    let fits = true;
    for (let c = 0; c < 26; c++) {
      if (cnt[c] > sourceCounts[c]) {
        fits = false;
        break;
      }
    }
    if (fits) {
      const p = pos(w);
      anchors.push({
        word: w.toUpperCase(),
        length: w.length,
        tag: p,
      });
    }
  }

  // Sort by length and semantic uniqueness
  anchors.sort((a, b) => b.length - a.length);
  return anchors.slice(0, limit);
}
