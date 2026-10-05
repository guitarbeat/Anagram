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

// Build frequency map from subtlex-word-frequencies (51M word corpus)
export const FREQ = new Map<string, number>();
for (let i = 0; i < subtlexEntries.length; i++) {
  const entry = subtlexEntries[i];
  FREQ.set(entry.word.toLowerCase(), entry.count);
}

/**
 * Returns raw SUBTLEX-US frequency count for any word (0 if rare/dictionary-only).
 */
export function getWordFrequency(word: string): number {
  return FREQ.get(word.toLowerCase()) || 0;
}

export type FrequencyTier = 'all' | 'top' | 'common' | 'uncommon' | 'rare' | 'obscure';

export interface FrequencyTierInfo {
  id: FrequencyTier;
  label: string;
  shortLabel: string;
  minFreq: number;
  maxFreq: number;
  description: string;
}

export const FREQUENCY_TIERS: readonly FrequencyTierInfo[] = [
  {
    id: 'top',
    label: 'Top Everyday',
    shortLabel: 'TOP',
    minFreq: 1000,
    maxFreq: Infinity,
    description: 'High-frequency everyday words (1,000+ occurrences in 51M subtitles)',
  },
  {
    id: 'common',
    label: 'Common',
    shortLabel: 'COMMON',
    minFreq: 100,
    maxFreq: 999,
    description: 'Regular spoken vocabulary (100–999 occurrences)',
  },
  {
    id: 'uncommon',
    label: 'Uncommon',
    shortLabel: 'UNCOMMON',
    minFreq: 10,
    maxFreq: 99,
    description: 'Recognizable but less frequent vocabulary (10–99 occurrences)',
  },
  {
    id: 'rare',
    label: 'Rare',
    shortLabel: 'RARE',
    minFreq: 1,
    maxFreq: 9,
    description: 'Literary, technical, or specialized words (1–9 occurrences)',
  },
  {
    id: 'obscure',
    label: 'Obscure / Scrabble',
    shortLabel: 'OBSCURE',
    minFreq: 0,
    maxFreq: 0,
    description: 'Dictionary & Scrabble words absent from modern subtitle dialogue',
  },
] as const;

export function getFrequencyTier(freq: number): FrequencyTier {
  if (freq >= 1000) return 'top';
  if (freq >= 100) return 'common';
  if (freq >= 10) return 'uncommon';
  if (freq >= 1) return 'rare';
  return 'obscure';
}

// Full English Lexicon without hardcoded frequency cuts (~272,000 real words)
const validWords: string[] = [];
for (let i = 0; i < rawWords.length; i++) {
  const w = rawWords[i].toLowerCase();
  if (!/^[a-z]+$/.test(w)) continue;
  if (w.length > 16) continue;
  if (w.length === 1 && w !== 'a' && w !== 'i') continue;
  validWords.push(w);
}

export const WORDS: readonly string[] = validWords;

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

/**
 * Checks if a word's part-of-speech matches an active POS filter.
 * Treats 'other' as including non-content word classes: 'pron', 'prep', 'art', 'conj', and 'other'.
 */
export function isMatchingPos(wordPos: POS, filter: POS | 'all' | null | undefined): boolean {
  if (!filter || filter === 'all') return true;
  if (filter === 'other') {
    return (
      wordPos === 'other' ||
      wordPos === 'pron' ||
      wordPos === 'prep' ||
      wordPos === 'art' ||
      wordPos === 'conj'
    );
  }
  return wordPos === filter;
}

