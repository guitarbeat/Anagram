import { ARTICLES, AUX, COMMON_3, COMMON_SHORT, CONJS, CYBER_WORDS, FANTASY_WORDS, FUNNY_WORDS, NOIR_WORDS, PREPS, PRONOUNS, SCRABBLE_POINTS, SPICY, VERBS } from '../data/lexicon';
import { UNABRIDGED_WORDS, UNABRIDGED_COUNT, getUnabridgedCountsBuffer } from '../data/unabridgedLexicon';
import { FREQUENCY_DICTIONARY, FREQUENCY_MAP } from '../data/words';
import { AnagramResult, LetterDiff, PersonalityMode, SubWord, VocabularyDepth, WordCandidate } from '../types';

export function normalize(s: string): string {
  return (s.toLowerCase().match(/[a-z]/g) || []).join('');
}

export function signature(s: string): string {
  return normalize(s).split('').sort().join('');
}

export function countsArray(s: string): Uint8Array {
  const a = new Uint8Array(26);
  for (const ch of normalize(s)) {
    const code = ch.charCodeAt(0) - 97;
    if (code >= 0 && code < 26) {
      a[code]++;
    }
  }
  return a;
}

export function arrSize(a: Uint8Array): number {
  let n = 0;
  for (let i = 0; i < 26; i++) n += a[i];
  return n;
}

export function fits(wordCounts: Uint8Array, rem: Uint8Array): boolean {
  for (let i = 0; i < 26; i++) {
    if (wordCounts[i] > rem[i]) return false;
  }
  return true;
}

export function subtract(rem: Uint8Array, wc: Uint8Array): Uint8Array {
  const out = new Uint8Array(rem);
  for (let i = 0; i < 26; i++) {
    out[i] -= wc[i];
  }
  return out;
}

export function exact(a: string, b: string): boolean {
  return signature(a) === signature(b);
}

export function calculateScrabbleScore(word: string): number {
  let total = 0;
  for (const char of normalize(word)) {
    total += SCRABBLE_POINTS[char] || 1;
  }
  return total;
}

export function getLetterStatistics(source: string) {
  const clean = normalize(source);
  const counts = countsArray(source);
  const VOWELS = new Set(['a', 'e', 'i', 'o', 'u', 'y']);
  let vowels = 0;
  let consonants = 0;
  let totalScrabble = 0;

  const letterDistribution: { char: string; count: number; points: number }[] = [];

  for (let i = 0; i < 26; i++) {
    const count = counts[i];
    if (count > 0) {
      const char = String.fromCharCode(97 + i);
      const points = (SCRABBLE_POINTS[char] || 1) * count;
      totalScrabble += points;
      if (VOWELS.has(char)) {
        vowels += count;
      } else {
        consonants += count;
      }
      letterDistribution.push({ char, count, points });
    }
  }

  letterDistribution.sort((a, b) => b.count - a.count || a.char.localeCompare(b.char));

  const vowelRatio = clean.length > 0 ? (vowels / clean.length) * 100 : 0;
  const uniqueCount = letterDistribution.length;

  return {
    totalLetters: clean.length,
    vowels,
    consonants,
    vowelRatio: Math.round(vowelRatio),
    totalScrabble,
    uniqueCount,
    distribution: letterDistribution,
  };
}

export function getLetterDiff(source: string, target: string): LetterDiff {
  const sCounts = countsArray(source);
  const tCounts = countsArray(target);
  const missing: [string, number][] = [];
  const extra: [string, number][] = [];

  for (let i = 0; i < 26; i++) {
    const diff = sCounts[i] - tCounts[i];
    const ch = String.fromCharCode(97 + i);
    if (diff > 0) missing.push([ch, diff]);
    else if (diff < 0) extra.push([ch, -diff]);
  }

  const sLen = arrSize(sCounts);
  const tLen = arrSize(tCounts);

  return {
    missing,
    extra,
    isExact: missing.length === 0 && extra.length === 0 && sLen === tLen && sLen > 0,
    sourceCount: sLen,
    targetCount: tLen,
  };
}

export function getWordCategory(w: string): string {
  if (PRONOUNS.has(w)) return 'pron';
  if (ARTICLES.has(w)) return 'art';
  if (AUX.has(w)) return 'aux';
  if (VERBS.has(w)) return 'verb';
  if (PREPS.has(w)) return 'prep';
  if (CONJS.has(w)) return 'conj';
  return 'content';
}

function wordBaseScore(x: { w: string; f: number; r: number; custom?: boolean; extra?: boolean }): number {
  const common = Math.max(0, 10 - Math.log10(x.r + 20) * 2);
  let score = Math.log10(x.f + 1) * 1.6 + Math.min(x.w.length, 10) * 0.4 + common * 1.2;
  if (getWordCategory(x.w) !== 'content') score += 1.8;
  if (x.custom) score += 4.5;
  if (FUNNY_WORDS.has(x.w)) score += 3.5;
  return score;
}

function isSaneWord(w: string, rank: number, depth: VocabularyDepth): boolean {
  const len = w.length;
  if (len === 1 && w !== 'a' && w !== 'i') return false;
  if (len === 2 && !COMMON_SHORT.has(w) && !FUNNY_WORDS.has(w)) return false;
  if (len === 3 && !COMMON_3.has(w) && !FUNNY_WORDS.has(w)) return false;
  if (len > 16) return false;
  if (rank >= depth && !FUNNY_WORDS.has(w)) return false;
  return true;
}

export function buildCandidates(
  source: string,
  depth: VocabularyDepth = 275000,
  customWordsText: string = '',
  anchorText: string = ''
): WordCandidate[] {
  const sourceCounts = countsArray(source);
  const map = new Map<string, WordCandidate>();

  // Add words from the high-frequency dictionary first
  for (const row of FREQUENCY_DICTIONARY) {
    if (!isSaneWord(row.w, row.r, depth)) continue;
    const wc = countsArray(row.w);
    if (fits(wc, sourceCounts)) {
      map.set(row.w, {
        w: row.w,
        f: row.f,
        r: row.r,
        c: wc,
        base: 0,
      });
    }
  }

  // Scan the entire 275,000-word unabridged lexicon using the fast flat buffer
  const totalUnabridged = UNABRIDGED_WORDS.length;
  const countsBuf = getUnabridgedCountsBuffer();

  for (let i = 0; i < totalUnabridged; i++) {
    const offset = i * 26;
    let wordFits = true;
    for (let c = 0; c < 26; c++) {
      if (countsBuf[offset + c] > sourceCounts[c]) {
        wordFits = false;
        break;
      }
    }
    if (wordFits) {
      const w = UNABRIDGED_WORDS[i];
      if (!map.has(w)) {
        const wc = countsArray(w);
        const known = FREQUENCY_MAP.get(w);
        map.set(w, {
          w,
          f: known ? known.f : Math.max(10, 500 - w.length * 40),
          r: known ? known.r : 25000 + i % 10000,
          c: wc,
          base: 0,
          extra: true,
        });
      }
    }
  }

  // Add custom words and anchor words
  const customList = customWordsText.split(/[\s,]+/).map(normalize).filter(Boolean);
  const anchorList = anchorText.split(/[\s,]+/).map(normalize).filter(Boolean);
  for (const raw of [...customList, ...anchorList]) {
    if (!raw) continue;
    const wc = countsArray(raw);
    if (fits(wc, sourceCounts)) {
      const known = FREQUENCY_MAP.get(raw);
      map.set(raw, {
        w: raw,
        f: known ? known.f : 600,
        r: known ? known.r : 12000,
        c: wc,
        base: 0,
        custom: true,
      });
    }
  }

  const list = Array.from(map.values());
  for (const item of list) {
    item.base = wordBaseScore(item);
  }

  list.sort((a, b) => b.base - a.base || b.w.length - a.w.length || a.w.localeCompare(b.w));
  return list;
}

function phraseScore(order: number[], cands: WordCandidate[]): number {
  const words = order.map(i => cands[i].w);
  let score = order.reduce((s, i) => s + cands[i].base, 0);

  // Penalize duplicate words
  score -= (words.length - new Set(words).size) * 5;
  return score;
}

function bestOrder(combo: number[], cands: WordCandidate[]): { order: number[]; score: number } {
  return {
    order: combo,
    score: phraseScore(combo, cands),
  };
}

export function polishPhrase(words: string[]): string {
  if (words.length === 0) return '';
  return words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export interface SolveOptions {
  source: string;
  depth?: VocabularyDepth;
  mode?: PersonalityMode;
  maxWords?: number;
  resultLimit?: number;
  allowSpicy?: boolean;
  preferSentence?: boolean;
  anchorText?: string;
  customWordsText?: string;
  anchorPlacement?: 'start' | 'end' | 'natural';
  onProgress?: (progress: number, msg: string) => void;
}

export interface SolveMetrics {
  nodes: number;
  solutionsCount: number;
  elapsedMs: number;
  candidatesCount: number;
}

export async function solveAnagrams(options: SolveOptions): Promise<{ results: AnagramResult[]; metrics: SolveMetrics }> {
  const {
    source,
    depth = 50000,
    maxWords,
    resultLimit,
    anchorText = '',
    customWordsText = '',
    anchorPlacement = 'start',
    onProgress,
  } = options;

  const effectiveMaxWords = typeof maxWords === 'number' && maxWords > 0 ? maxWords : 99;
  const effectiveResultLimit = typeof resultLimit === 'number' && resultLimit > 0 ? resultLimit : Infinity;

  const started = performance.now();
  const normSource = normalize(source);
  if (!normSource) {
    return {
      results: [],
      metrics: { nodes: 0, solutionsCount: 0, elapsedMs: 0, candidatesCount: 0 },
    };
  }

  const cands = buildCandidates(source, depth, customWordsText, anchorText);
  const sourceCounts = countsArray(source);

  // Process anchor
  const anchorTokens = anchorText.trim().split(/[\s,]+/).map(normalize).filter(Boolean);
  const anchorCounts = countsArray(anchorTokens.join(''));

  if (!fits(anchorCounts, sourceCounts)) {
    throw new Error('The "Must include" text contains letters not found in the source phrase.');
  }

  const remAfterAnchor = subtract(sourceCounts, anchorCounts);
  if (anchorTokens.length > effectiveMaxWords) {
    throw new Error(`The required anchor already contains ${anchorTokens.length} words, which exceeds the allowed words limit.`);
  }

  const byLetter: number[][] = Array.from({ length: 26 }, () => []);
  cands.forEach((x, i) => {
    for (let k = 0; k < 26; k++) {
      if (x.c[k]) byLetter[k].push(i);
    }
  });

  const solutionKeys = new Set<string>();
  const solutions: number[][] = [];
  let nodes = 0;
  const hardNodeCap = 500000;
  const timeBudget = depth === 50000 ? 3000 : 2000;
  const exactTargetCount = isFinite(effectiveResultLimit) ? effectiveResultLimit * 15 : 25000;

  onProgress?.(20, 'Exploring exact combinatorial tree...');

  function dfs(rem: Uint8Array, chosen: number[]) {
    nodes++;
    if (nodes > hardNodeCap || performance.now() - started > timeBudget || solutions.length >= exactTargetCount) {
      return;
    }

    const remLetters = arrSize(rem);
    if (remLetters === 0) {
      const totalWords = anchorTokens.length + chosen.length;
      if (totalWords >= 1 && totalWords <= effectiveMaxWords) {
        const key = [...chosen].sort((a, b) => a - b).join(',');
        if (!solutionKeys.has(key)) {
          solutionKeys.add(key);
          solutions.push([...chosen]);
        }
      }
      return;
    }

    if (anchorTokens.length + chosen.length >= effectiveMaxWords) return;

    let bestOptions: number[] | null = null;
    for (let letter = 0; letter < 26; letter++) {
      if (!rem[letter]) continue;
      const opts: number[] = [];
      for (const idx of byLetter[letter]) {
        if (fits(cands[idx].c, rem)) opts.push(idx);
      }
      if (opts.length === 0) return; // No word can cover this letter
      if (bestOptions === null || opts.length < bestOptions.length) {
        bestOptions = opts;
      }
    }

    if (!bestOptions) return;
    const branchCap = depth === 50000 ? 350 : 260;
    for (const idx of bestOptions.slice(0, branchCap)) {
      dfs(subtract(rem, cands[idx].c), [...chosen, idx]);
      if (nodes > hardNodeCap || performance.now() - started > timeBudget || solutions.length >= exactTargetCount) {
        return;
      }
    }
  }

  dfs(remAfterAnchor, []);
  onProgress?.(70, 'Ranking and structuring humorous sentences...');

  // Deduplicate and rank
  const uniqueMap = new Map<string, number[]>();
  for (const sol of solutions) {
    const words = [...anchorTokens, ...sol.map(i => cands[i].w)].sort();
    uniqueMap.set(words.join('|'), sol);
  }

  const ranked: AnagramResult[] = [];
  for (const sol of uniqueMap.values()) {
    const tempCands = cands.slice();
    const anchorIdxs: number[] = [];
    for (const w of anchorTokens) {
      let idx = tempCands.findIndex(x => x.w === w);
      if (idx < 0) {
        tempCands.push({
          w,
          f: 600,
          r: 12000,
          c: countsArray(w),
          base: 5,
        });
        idx = tempCands.length - 1;
      }
      anchorIdxs.push(idx);
    }

    const solIdxs = sol.slice();
    let combo: number[];
    if (anchorPlacement === 'end') {
      combo = [...solIdxs, ...anchorIdxs];
    } else {
      // 'start' or 'natural': place locked anchor words first in their exact specified order
      combo = [...anchorIdxs, ...solIdxs];
    }

    const best = bestOrder(combo, tempCands);
    const words = best.order.map(i => tempCands[i].w);
    const phrase = polishPhrase(words);

    if (exact(source, phrase)) {
      const funnyWordsCount = words.filter(w => FUNNY_WORDS.has(w)).length;
      ranked.push({
        phrase,
        words,
        score: best.score,
        funnyScore: funnyWordsCount,
        categoryPattern: words.map(getWordCategory),
      });
    }
  }

  ranked.sort((a, b) => b.score - a.score || b.funnyScore - a.funnyScore || a.phrase.localeCompare(b.phrase));

  const seen = new Set<string>();
  const finalResults: AnagramResult[] = [];
  for (const item of ranked) {
    const key = item.phrase.toLowerCase().replace(/[^a-z]/g, '');
    if (seen.has(key)) continue;
    seen.add(key);
    finalResults.push(item);
    if (finalResults.length >= effectiveResultLimit) break;
  }

  const elapsedMs = Math.round(performance.now() - started);
  onProgress?.(100, `Found ${finalResults.length} exact results.`);

  return {
    results: finalResults,
    metrics: {
      nodes,
      solutionsCount: uniqueMap.size,
      elapsedMs,
      candidatesCount: cands.length,
    },
  };
}

export function findAnchorSuggestions(
  source: string,
  depth: VocabularyDepth = 50000
): { word: string; category: string; funny: boolean }[] {
  const cands = buildCandidates(source, depth, '', '');
  const sCounts = countsArray(source);
  const rareWeight = new Array(26).fill(0).map((_, i) => (sCounts[i] ? 1 / sCounts[i] : 0));

  const scored = cands
    .filter(x => x.w.length >= 4)
    .map(x => {
      let rare = 0;
      for (let i = 0; i < 26; i++) {
        if (x.c[i]) rare += rareWeight[i] * x.c[i];
      }
      const funny = FUNNY_WORDS.has(x.w);
      const score = x.base + x.w.length * 0.8 + rare * 2.5 + (funny ? 6 : 0);
      return {
        word: x.w,
        category: getWordCategory(x.w),
        funny,
        score,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 24);

  return scored;
}

export function autocompleteMissingLetters(source: string, partial: string): string[] {
  const diff = getLetterDiff(source, partial);
  if (diff.isExact || diff.missing.length === 0 || diff.extra.length > 0) {
    return [];
  }

  const missingRem = new Uint8Array(26);
  for (const [ch, n] of diff.missing) {
    const code = ch.charCodeAt(0) - 97;
    if (code >= 0 && code < 26) missingRem[code] = n;
  }

  const countsBuf = getUnabridgedCountsBuffer();
  const totalUnabridged = UNABRIDGED_WORDS.length;
  const matches: { w: string; score: number }[] = [];

  for (let i = 0; i < totalUnabridged; i++) {
    const offset = i * 26;
    let wordFits = true;
    for (let c = 0; c < 26; c++) {
      if (countsBuf[offset + c] > missingRem[c]) {
        wordFits = false;
        break;
      }
    }
    if (wordFits) {
      const w = UNABRIDGED_WORDS[i];
      const known = FREQUENCY_MAP.get(w);
      const freq = known ? known.f : 50;
      matches.push({
        w,
        score: Math.log10(freq + 1) * 2 + (FUNNY_WORDS.has(w) ? 5 : 0) + w.length * 1.2,
      });
    }
  }

  matches.sort((a, b) => b.score - a.score);
  return matches.slice(0, 10).map(m => m.w);
}

export function getAllSubWords(
  source: string,
  _depth: VocabularyDepth = 275000
): SubWord[] {
  const sourceCounts = countsArray(source);
  const results: SubWord[] = [];
  const totalUnabridged = UNABRIDGED_WORDS.length;
  const countsBuf = getUnabridgedCountsBuffer();

  for (let i = 0; i < totalUnabridged; i++) {
    const w = UNABRIDGED_WORDS[i];
    if (w.length < 3) continue;

    const offset = i * 26;
    let wordFits = true;
    for (let c = 0; c < 26; c++) {
      if (countsBuf[offset + c] > sourceCounts[c]) {
        wordFits = false;
        break;
      }
    }

    if (wordFits) {
      results.push({
        word: w,
        length: w.length,
        scrabbleScore: calculateScrabbleScore(w),
        isFunny: FUNNY_WORDS.has(w),
        category: getWordCategory(w),
      });
    }
  }

  // Sort by length descending, then scrabble score descending, then alphabetical
  results.sort((a, b) => b.length - a.length || b.scrabbleScore - a.scrabbleScore || a.word.localeCompare(b.word));

  return results;
}

export function filterAnagramsByPattern(results: AnagramResult[], pattern: string): AnagramResult[] {
  const cleanPat = pattern.trim().toLowerCase();
  if (!cleanPat) return results;

  // Wildcard match where '*' matches any characters and '?' or '_' matches one letter
  // Convert glob to regex
  const regexStr = '^' + cleanPat
    .replace(/\s+/g, '\\s+')
    .replace(/\*/g, '.*')
    .replace(/[?_]/g, '[a-z]') + '$';

  try {
    const rx = new RegExp(regexStr, 'i');
    return results.filter(r => rx.test(r.phrase) || r.words.some(w => rx.test(w)));
  } catch {
    return results.filter(r => r.phrase.toLowerCase().includes(cleanPat));
  }
}

export function getValidNextWords(
  remainingLetters: Uint8Array,
  _depth: VocabularyDepth = 275000
): { word: string; length: number; score: number; isExactFinal: boolean }[] {
  const remSize = arrSize(remainingLetters);
  if (remSize === 0) return [];

  const candidates: { word: string; length: number; score: number; isExactFinal: boolean }[] = [];
  const totalUnabridged = UNABRIDGED_WORDS.length;
  const countsBuf = getUnabridgedCountsBuffer();

  for (let i = 0; i < totalUnabridged; i++) {
    const w = UNABRIDGED_WORDS[i];
    if (w.length > remSize) continue;
    if (w.length < 2 && w !== 'a' && w !== 'i') continue;

    const offset = i * 26;
    let wordFits = true;
    for (let c = 0; c < 26; c++) {
      if (countsBuf[offset + c] > remainingLetters[c]) {
        wordFits = false;
        break;
      }
    }

    if (wordFits) {
      const isExactFinal = w.length === remSize;
      const known = FREQUENCY_MAP.get(w);
      const freq = known ? known.f : 50;
      const funny = FUNNY_WORDS.has(w);
      const score = Math.log10(freq + 1) * 2 + w.length * 1.5 + (funny ? 8 : 0) + (isExactFinal ? 25 : 0);
      candidates.push({
        word: w,
        length: w.length,
        score,
        isExactFinal,
      });
    }
  }

  candidates.sort((a, b) => b.score - a.score || b.length - a.length);
  return candidates.slice(0, 48);
}
