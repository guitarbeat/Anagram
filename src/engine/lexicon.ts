import rawWords from 'an-array-of-english-words';
import subtlexEntries from 'subtlex-word-frequencies';
import nlp from 'compromise';
import {
  RegExpMatcher,
  englishDataset,
  englishRecommendedTransformers,
} from 'obscenity';
import type { POS } from './types';

export type { POS };

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

// Common function words (1-2 letters)
export const COMMON_FUNCTION_WORDS = new Set([
  'a', 'i', 'an', 'am', 'as', 'at', 'be', 'by', 'do', 'go', 'he', 'if', 'in', 'is', 'it', 'me', 'my', 'no', 'of', 'on', 'or', 'so', 'to', 'up', 'us', 'we'
]);

// Real everyday 2-letter words allowed in anagrams
export const EVERYDAY_2_LETTER_WORDS = new Set([
  ...COMMON_FUNCTION_WORDS,
  'ox',
  'ok'
]);

// Protected 3-letter words that must remain even if frequency is moderate
const PROTECTED_3_LETTER_WORDS = new Set([
  'roo', 'zoo'
]);

// Build frequency map from subtlex-word-frequencies
export const FREQ = new Map<string, number>();
for (let i = 0; i < subtlexEntries.length; i++) {
  const entry = subtlexEntries[i];
  FREQ.set(entry.word.toLowerCase(), entry.count);
}

// Minimum SUBTLEX frequency for candidate words
// 3-letter words need a higher threshold (120+) to weed out rare abbreviations
export const MIN_SUBTLEX_FREQ_3_LETTER = 120;
// Longer words (>= 4 letters): threshold is ~0.15 per million (~6 count in 51M corpus),
// preserving real common words like 'veils' (19) and 'levis' (7) while dropping zero-frequency junk (adoze, airwise, vleis)
export const MIN_SUBTLEX_FREQ = 6;

// Filter WORDS according to quality rules
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
    // Only allow real everyday 2-letter words (removes st, er, re, es, aw, mm, ka, pa, el)
    if (EVERYDAY_2_LETTER_WORDS.has(w)) {
      filteredWords.push(w);
    }
    continue;
  }

  const f = FREQ.get(w) || 0;

  if (w.length === 3) {
    if (PROTECTED_3_LETTER_WORDS.has(w) || f >= MIN_SUBTLEX_FREQ_3_LETTER) {
      filteredWords.push(w);
    }
    continue;
  }

  // Length >= 4
  if (f >= MIN_SUBTLEX_FREQ) {
    filteredWords.push(w);
  }
}

// Ensure all allowed everyday 2-letter words (e.g. 'ok', 'ox') and protected words are included
const wordSet = new Set(filteredWords);
for (const w2 of EVERYDAY_2_LETTER_WORDS) {
  if (!wordSet.has(w2)) {
    filteredWords.push(w2);
    wordSet.add(w2);
  }
}
for (const p3 of PROTECTED_3_LETTER_WORDS) {
  if (!wordSet.has(p3)) {
    filteredWords.push(p3);
    wordSet.add(p3);
  }
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

const FAST_POS: Record<string, POS> = {
  a: 'art', an: 'art', the: 'art',
  i: 'pron', he: 'pron', she: 'pron', it: 'pron', we: 'pron', they: 'pron', me: 'pron', you: 'pron', us: 'pron', him: 'pron', her: 'pron', them: 'pron',
  in: 'prep', on: 'prep', at: 'prep', to: 'prep', for: 'prep', with: 'prep', from: 'prep', of: 'prep', by: 'prep', as: 'prep',
  and: 'conj', or: 'conj', but: 'conj', nor: 'conj', so: 'conj', yet: 'conj',
  not: 'adv', very: 'adv', now: 'adv', too: 'adv', well: 'adv',
  is: 'verb', was: 'verb', are: 'verb', were: 'verb', am: 'verb', be: 'verb', do: 'verb', did: 'verb', can: 'verb', will: 'verb',
};

export function pos(word: string): POS {
  const clean = word.toLowerCase().trim();
  if (!clean) return 'other';
  if (FAST_POS[clean]) return FAST_POS[clean];
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

/**
 * Determines whether a word begins with a vowel sound in spoken English.
 * Accounts for silent 'h' (hour, honor) and consonant 'y' / 'w' initial sounds (unit, user, one).
 */
export function startsWithVowelSound(word: string): boolean {
  const w = word.toLowerCase().trim();
  if (!w) return false;
  if (/^u(ni|ser|se|ti|na|ra|tc)/.test(w) && !/^un[aeiou]/.test(w) && !/^und/.test(w) && !/^unk/.test(w)) {
    return false;
  }
  if (/^on(e|ce)/.test(w)) return false;
  if (/^eu/.test(w)) return false;
  if (/^h(our|onor|onest|eir)/.test(w)) return true;
  return /^[aeiou]/.test(w);
}

/**
 * Validates article usage:
 * - 'a' must be followed by singular noun / adjective starting with a consonant sound
 * - 'an' must be followed by singular noun / adjective starting with a vowel sound
 * - Neither may precede verbs, pronouns, or plural nouns
 * - Neither may be the final word of a phrase
 */
export function hasInvalidArticle(words: string[]): boolean {
  for (let i = 0; i < words.length; i++) {
    const w = words[i].toLowerCase();
    if (w === 'a' || w === 'an') {
      if (i === words.length - 1) return true;
      const next = words[i + 1].toLowerCase();
      const nextDoc = nlp(next);

      if (nextDoc.has('#Plural') || nextDoc.has('#Pronoun')) return true;
      if (nextDoc.has('#Verb') && !nextDoc.has('#Noun') && !nextDoc.has('#Adjective')) return true;

      const isVowel = startsWithVowelSound(next);
      if (w === 'a' && isVowel) return true;
      if (w === 'an' && !isVowel) return true;
    }
  }
  return false;
}

/**
 * Checks if a word is recognized as a proper name (#Person or #Place).
 */
export function isProperName(word: string): boolean {
  const clean = word.toLowerCase().trim();
  const doc = nlp(clean);
  return doc.has('#Person') || doc.has('#Place');
}

/**
 * Capitalises proper names for display while keeping regular words in lowercase.
 */
export function formatWordForDisplay(word: string): string {
  const clean = word.toLowerCase().trim();
  if (isProperName(clean)) {
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  }
  return clean;
}

