import nlp from 'compromise';
import { FREQ, pos, type POS } from './lexicon';

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
 * Sound-based funniness heuristic with no hardcoded word lists:
 * - Points for k/z/q/x/j letters
 * - Points for oo|ee|uck|ump|onk|izz|oodle|ble|ffle patterns
 * - Points for doubled letters
 * - Small bonus for length 4-7
 */
export function funniness(w: string): number {
  const clean = w.toLowerCase().trim();
  if (!clean) return 0;
  let score = 0;

  // k/z/q/x/j letters
  const funnyLetters = clean.match(/[kzqxj]/g);
  if (funnyLetters) {
    score += funnyLetters.length * 1.5;
  }

  // Sound patterns
  const soundPatterns = clean.match(/oodle|ffle|uck|ump|onk|izz|ble|oo|ee/g);
  if (soundPatterns) {
    score += soundPatterns.length * 2.0;
  }

  // Doubled letters
  const doubled = clean.match(/(.)\1/g);
  if (doubled) {
    score += doubled.length * 1.2;
  }

  // Length 4-7 bonus
  if (clean.length >= 4 && clean.length <= 7) {
    score += 1.0;
  }

  return Math.round(score * 10) / 10;
}

/**
 * Individual word scoring:
 * log10(freq+1)*2, -4 if freq is 0, +min(len,8)*0.3, +funniness, +5 if custom/anchor word
 */
export function wordScore(w: string, custom = false): number {
  const clean = w.toLowerCase().trim();
  if (!clean) return 0;
  const freq = FREQ.get(clean) || 0;
  let score = 0;

  if (freq === 0) {
    score -= 4;
  } else {
    score += Math.log10(freq + 1) * 2;
  }

  score += Math.min(clean.length, 8) * 0.3;
  score += funniness(clean);

  if (custom) {
    score += 5;
  }

  return Math.round(score * 10) / 10;
}

/**
 * Grammar scoring based on neighbouring POS transitions and compromise patterns:
 * - art -> adj/noun: +3 (+0.5 tie-breaker for recognized vocabulary noun)
 * - adj -> noun: +3
 * - noun/pron -> verb: +3
 * - verb -> art/noun: +2
 * - repeated identical non-noun POS: -2
 * - ending on art/prep/conj: -4
 * - +2 if compromise matches '#Noun #Verb' on the joined phrase
 */
export function grammarScore(words: string[]): number {
  if (words.length === 0) return 0;
  let score = 0;
  const tags: POS[] = words.map(w => pos(w));

  for (let i = 0; i < tags.length - 1; i++) {
    const a = tags[i];
    const b = tags[i + 1];

    if (a === 'art' && (b === 'adj' || b === 'noun')) {
      score += 3;
      if ((FREQ.get(words[i + 1].toLowerCase()) || 0) > 0) {
        score += 0.5;
      }
    }
    if (a === 'adj' && b === 'noun') score += 3;
    if ((a === 'noun' || a === 'pron') && b === 'verb') score += 3;
    if (a === 'verb' && (b === 'art' || b === 'noun')) score += 2;
    if (a === b && a !== 'noun') score -= 2;
  }

  const lastTag = tags[tags.length - 1];
  if (lastTag === 'art' || lastTag === 'prep' || lastTag === 'conj') {
    score -= 4;
  }

  // +2 if compromise matches '#Noun #Verb' on the joined phrase
  const joined = words.join(' ');
  if (nlp(joined).has('#Noun #Verb')) {
    score += 2;
  }

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
    const nonAnchorWords = words.filter((_, idx) => {
      // If words array already contains anchorWords, separate them
      // otherwise nonAnchorWords is just words
      return true;
    });

    // Check if words already contains anchor words or if anchor words are separate
    const cleanAnchors = anchorWords.map(w => w.toLowerCase());
    const isAnchorWord = (w: string) => cleanAnchors.includes(w.toLowerCase());

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
 * sum(wordScore) + grammarScore - 5 per duplicate word
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

  const totalScore = Math.round((wordScoreTotal + grammar - duplicatePenalty) * 10) / 10;
  const posTags: POS[] = words.map(w => pos(w));

  return {
    phrase: words.join(' '),
    words,
    posTags,
    score: totalScore,
    wordScoreTotal: Math.round(wordScoreTotal * 10) / 10,
    grammarScore: grammar,
    funninessScore: Math.round(funninessScore * 10) / 10,
  };
}
