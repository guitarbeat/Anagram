import rawWords from 'an-array-of-english-words';
import subtlexEntries from 'subtlex-word-frequencies';
import nlp from 'compromise';
import {
  RegExpMatcher,
  englishDataset,
  englishRecommendedTransformers,
} from 'obscenity';

export type POS =
  | 'noun'
  | 'verb'
  | 'adj'
  | 'adv'
  | 'pron'
  | 'prep'
  | 'art'
  | 'conj'
  | 'other';

// Contraction fragments rule (not a dictionary)
const CONTRACTION_FRAGMENTS = new Set([
  'don',
  'didn',
  'doesn',
  'isn',
  'wasn',
  'couldn',
  'shouldn',
  'wouldn',
  'hasn',
  'haven',
  'aren',
  'weren',
  'ain',
]);

// Build frequency map from subtlex-word-frequencies
export const FREQ = new Map<string, number>();
for (let i = 0; i < subtlexEntries.length; i++) {
  const entry = subtlexEntries[i];
  FREQ.set(entry.word.toLowerCase(), entry.count);
}

// Subtlex frequency cutoff for 2-3 letter words:
// Excludes junk like "aa", "zo", "ae", "oe" while keeping valid short words like "ox", "ok", "zoo", "roo"
const SHORT_2_LETTER_FREQ_THRESHOLD = 100;
const SHORT_3_LETTER_FREQ_THRESHOLD = 80;

// Filter WORDS according to Phase 3 rules
const filteredWords: string[] = [];
for (let i = 0; i < rawWords.length; i++) {
  const w = rawWords[i].toLowerCase();
  if (!/^[a-z]+$/.test(w)) continue;
  if (w.length > 16) continue;
  if (CONTRACTION_FRAGMENTS.has(w)) continue;

  if (w.length === 1) {
    if (w === 'a' || w === 'i') {
      filteredWords.push(w);
    }
    continue;
  }

  if (w.length === 2) {
    const f = FREQ.get(w) || 0;
    if (f >= SHORT_2_LETTER_FREQ_THRESHOLD) {
      filteredWords.push(w);
    }
    continue;
  }

  if (w.length === 3) {
    const f = FREQ.get(w) || 0;
    if (f >= SHORT_3_LETTER_FREQ_THRESHOLD) {
      filteredWords.push(w);
    }
    continue;
  }

  filteredWords.push(w);
}

export const WORDS: readonly string[] = filteredWords;

// Precompute flat Uint8Array letter-count buffer (WORDS.length * 26) and 26-bit masks
export const LETTER_COUNTS = new Uint8Array(WORDS.length * 26);
export const LETTER_MASKS = new Uint32Array(WORDS.length);

for (let i = 0; i < WORDS.length; i++) {
  const w = WORDS[i];
  let mask = 0;
  const offset = i * 26;
  for (let j = 0; j < w.length; j++) {
    const code = w.charCodeAt(j) - 97;
    if (code >= 0 && code < 26) {
      LETTER_COUNTS[offset + code]++;
      mask |= 1 << code;
    }
  }
  LETTER_MASKS[i] = mask;
}

// Obscenity profanity matcher
const obscenityMatcher = new RegExpMatcher({
  ...englishDataset.build(),
  ...englishRecommendedTransformers,
});

const spicyCache = new Map<string, boolean>();

export function isSpicy(word: string): boolean {
  const clean = word.toLowerCase().trim();
  if (!clean) return false;
  const cached = spicyCache.get(clean);
  if (cached !== undefined) return cached;

  const result = obscenityMatcher.hasMatch(clean);
  spicyCache.set(clean, result);
  return result;
}

// POS tagger with cache
const posCache = new Map<string, POS>();

export function pos(word: string): POS {
  const clean = word.toLowerCase().trim();
  if (!clean) return 'other';
  const cached = posCache.get(clean);
  if (cached) return cached;

  const doc = nlp(clean);
  let res: POS = 'other';
  if (doc.has('#Determiner')) res = 'art';
  else if (doc.has('#Pronoun')) res = 'pron';
  else if (doc.has('#Preposition')) res = 'prep';
  else if (doc.has('#Conjunction')) res = 'conj';
  else if (doc.has('#Adverb')) res = 'adv';
  else if (doc.has('#Adjective')) res = 'adj';
  else if (doc.has('#Verb')) res = 'verb';
  else if (doc.has('#Noun')) res = 'noun';

  posCache.set(clean, res);
  return res;
}
