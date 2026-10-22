import { WORDS, LETTER_COUNTS, LETTER_MASKS, FREQ, isTLD, isCustomWord } from './lexicon';
import { getTLDCategory, getTLDQualityScore, formatWordsAsWebsite } from './tlds';
import type {
  CandidateWordItem,
  HistogramBin,
  LetterBudgetTile,
  LetterBudgetSummary,
  MultisetDelta,
  ConstructionState,
  FinisherPair,
  WebsiteSolution,
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
        isTLD: isTLD(word),
        isCustom: isCustomWord(word),
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
 * Discovers exact website / domain name solutions (e.g. domain.tld, sub.domain.tld, domain.tld/path, or wor.ld domain hacks)
 * that consume 100% of the active letter pool with 0 leftover letters.
 */
export function findWebsiteSolutions(
  letterPool: string,
  candidateWords: CandidateWordItem[],
  exactClosers: string[] = [],
  limit = 36
): WebsiteSolution[] {
  const clean = normalizeLetters(letterPool);
  if (!clean || clean.length < 3) return [];

  const { counts: poolCounts } = toCountAndMask(clean);
  const poolLen = clean.length;

  const solutions: WebsiteSolution[] = [];
  const seenUrls = new Set<string>();

  const addSolution = (sol: WebsiteSolution) => {
    const key = sol.url.toLowerCase();
    if (!seenUrls.has(key)) {
      seenUrls.add(key);
      solutions.push(sol);
    }
  };

  // 1. Check 1-word exact closers for Domain Hacks (e.g., "radio" -> "rad.io", "delicious" -> "delicio.us")
  for (const closer of exactClosers) {
    const formatted = formatWordsAsWebsite([closer]);
    if (formatted) {
      const freq = FREQ.get(closer) || 10;
      addSolution({
        url: formatted.url,
        domain: formatted.domain,
        tld: formatted.tld,
        tldCategory: formatted.tldCategory,
        format: formatted.format,
        words: [closer],
        score: 120 + formatted.qualityBonus + Math.log10(freq + 1) * 18,
      });
    }
  }

  // Pre-index candidates by length and precompute letter count arrays
  const byLength = new Map<number, CandidateWordItem[]>();
  const candCountMaps = new Map<string, Uint8Array>();
  const tldCandidates: CandidateWordItem[] = [];

  for (const c of candidateWords) {
    if (c.length < 2) continue;
    let list = byLength.get(c.length);
    if (!list) {
      list = [];
      byLength.set(c.length, list);
    }
    list.push(c);

    const arr = new Uint8Array(26);
    for (let i = 0; i < c.word.length; i++) {
      arr[c.word.charCodeAt(i) - 97]++;
    }
    candCountMaps.set(c.word, arr);

    if (c.isTLD) {
      tldCandidates.push(c);
    }
  }

  // Sort TLD candidates by TLD quality score descending so iconic TLDs (.com, .io, .ai, .co, .org, .us, .me, .dev, .app, etc.) are explored first
  tldCandidates.sort((a, b) => {
    const qDiff = getTLDQualityScore(b.word) - getTLDQualityScore(a.word);
    if (qDiff !== 0) return qDiff;
    return b.freq - a.freq;
  });

  // 2. 2-Word Exact Domains: [hostWord].[tld]
  for (const tldCand of tldCandidates) {
    const tld = tldCand.word;
    const remLen = poolLen - tld.length;
    if (remLen < 2) continue;

    const hostList = byLength.get(remLen);
    if (!hostList) continue;

    const tldCounts = candCountMaps.get(tld)!;
    const tldQuality = getTLDQualityScore(tld);
    const tldCat = getTLDCategory(tld);

    for (const hostCand of hostList) {
      if (hostCand.word === tld) {
        let canDouble = true;
        for (let i = 0; i < 26; i++) {
          if (tldCounts[i] * 2 !== poolCounts[i]) {
            canDouble = false;
            break;
          }
        }
        if (!canDouble) continue;
      } else {
        const hCounts = candCountMaps.get(hostCand.word)!;
        let exactFit = true;
        for (let i = 0; i < 26; i++) {
          if (hCounts[i] + tldCounts[i] !== poolCounts[i]) {
            exactFit = false;
            break;
          }
        }
        if (!exactFit) continue;
      }

      const url = `${hostCand.word}.${tld}`;
      addSolution({
        url,
        domain: url,
        tld,
        tldCategory: tldCat,
        format: 'domain',
        words: [hostCand.word, tld],
        score:
          140 +
          tldQuality +
          hostCand.length * 6 +
          Math.log10((hostCand.freq || 1) + 1) * 16,
      });
    }
  }

  // 3. 3-Word Exact Websites: [w1][w2].[tld], [w1].[w2].[tld], and [w1].[tld]/[w2]
  if (poolLen >= 6 && poolLen <= 22) {
    const topTlds = tldCandidates.slice(0, 32);
    for (const tldCand of topTlds) {
      if (solutions.length >= limit * 2) break;
      const tld = tldCand.word;
      const remLen = poolLen - tld.length;
      if (remLen < 4) continue;

      const tldCounts = candCountMaps.get(tld)!;
      const remCounts = new Uint8Array(26);
      for (let i = 0; i < 26; i++) {
        remCounts[i] = poolCounts[i] - tldCounts[i];
      }

      const tldQuality = getTLDQualityScore(tld);
      const tldCat = getTLDCategory(tld);

      for (let l1 = Math.min(remLen - 2, 12); l1 >= Math.ceil(remLen / 2); l1--) {
        const l2 = remLen - l1;
        if (l2 < 2) continue;

        const list1 = byLength.get(l1);
        const list2 = byLength.get(l2);
        if (!list1 || !list2) continue;

        for (const w1 of list1.slice(0, 28)) {
          const c1 = candCountMaps.get(w1.word)!;
          let fits1 = true;
          for (let i = 0; i < 26; i++) {
            if (c1[i] > remCounts[i]) {
              fits1 = false;
              break;
            }
          }
          if (!fits1) continue;

          for (const w2 of list2.slice(0, 28)) {
            const c2 = candCountMaps.get(w2.word)!;
            let fits2 = true;
            for (let i = 0; i < 26; i++) {
              if (c1[i] + c2[i] !== remCounts[i]) {
                fits2 = false;
                break;
              }
            }
            if (!fits2) continue;

            const freqScore =
              Math.log10((w1.freq || 1) + 1) * 12 +
              Math.log10((w2.freq || 1) + 1) * 12;

            // Format A: Compound Domain (e.g. solarwood.ae, aaronwoods.re)
            const compoundDomain = `${w1.word}${w2.word}.${tld}`;
            addSolution({
              url: compoundDomain,
              domain: compoundDomain,
              tld,
              tldCategory: tldCat,
              format: 'domain',
              words: [w1.word, w2.word, tld],
              score: 112 + tldQuality + freqScore + (w1.length + w2.length) * 2,
            });

            // Format B: URL with Path (e.g. woods.io/learn)
            const pathUrl = `${w1.word}.${tld}/${w2.word}`;
            addSolution({
              url: pathUrl,
              domain: `${w1.word}.${tld}`,
              tld,
              tldCategory: tldCat,
              format: 'url-path',
              words: [w1.word, tld, w2.word],
              score: 104 + tldQuality + freqScore,
            });
          }
        }
      }
    }
  }

  // 4. 4-Word Exact Websites for longer names (e.g. 14-22 letters): [w1][w2].[tld]/[w3]
  if (poolLen >= 13 && poolLen <= 24 && solutions.length < 18) {
    const topTlds = tldCandidates.slice(0, 18);
    const longWords = candidateWords.filter((c) => c.length >= 5 && c.length <= poolLen - 6).slice(0, 30);

    for (const tldCand of topTlds) {
      if (solutions.length >= limit * 2) break;
      const tld = tldCand.word;
      const tldCounts = candCountMaps.get(tld)!;
      const tldQuality = getTLDQualityScore(tld);
      const tldCat = getTLDCategory(tld);

      for (const w1 of longWords) {
        if (w1.word === tld) continue;
        const c1 = candCountMaps.get(w1.word)!;
        const remAfterW1 = new Uint8Array(26);
        let fitsW1 = true;
        for (let i = 0; i < 26; i++) {
          const used = tldCounts[i] + c1[i];
          if (used > poolCounts[i]) {
            fitsW1 = false;
            break;
          }
          remAfterW1[i] = poolCounts[i] - used;
        }
        if (!fitsW1) continue;

        const remLen23 = poolLen - tld.length - w1.length;
        if (remLen23 < 4) continue;

        let foundForW1 = false;
        for (let l2 = Math.min(remLen23 - 2, 9); l2 >= Math.ceil(remLen23 / 2); l2--) {
          if (foundForW1) break;
          const l3 = remLen23 - l2;
          if (l3 < 2) continue;

          const list2 = byLength.get(l2);
          const list3 = byLength.get(l3);
          if (!list2 || !list3) continue;

          for (const w2 of list2.slice(0, 18)) {
            if (foundForW1) break;
            const c2 = candCountMaps.get(w2.word)!;
            let fits2 = true;
            for (let i = 0; i < 26; i++) {
              if (c2[i] > remAfterW1[i]) {
                fits2 = false;
                break;
              }
            }
            if (!fits2) continue;

            for (const w3 of list3.slice(0, 18)) {
              const c3 = candCountMaps.get(w3.word)!;
              let fits3 = true;
              for (let i = 0; i < 26; i++) {
                if (c2[i] + c3[i] !== remAfterW1[i]) {
                  fits3 = false;
                  break;
                }
              }
              if (!fits3) continue;

              const domain = `${w1.word}${w2.word}.${tld}`;
              const url = `${domain}/${w3.word}`;
              const freqScore =
                Math.log10((w1.freq || 1) + 1) * 10 +
                Math.log10((w2.freq || 1) + 1) * 8 +
                Math.log10((w3.freq || 1) + 1) * 8;

              addSolution({
                url,
                domain,
                tld,
                tldCategory: tldCat,
                format: 'url-path',
                words: [w1.word, w2.word, tld, w3.word],
                score: 98 + tldQuality + freqScore + w1.length * 2,
              });
              foundForW1 = true;
              break;
            }
          }
        }
      }
    }
  }

  solutions.sort((a, b) => b.score - a.score);
  return solutions.slice(0, limit);
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

  const exactClosers =
    delta.remainingLetters.length > 0 && !delta.isSurplus
      ? findExactClosers(delta.remainingLetters)
      : [];

  const rawCandidateWords = findCandidateWords(activePool);

  const {
    auditedCandidates,
    solvableWordsCount,
    deadEndWordsCount,
    finisherPairs,
  } = auditCandidateSolvability(activePool, rawCandidateWords);

  const websiteSolutions = findWebsiteSolutions(
    activePool,
    auditedCandidates,
    exactClosers
  );

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
    websiteSolutions,
  };
}
