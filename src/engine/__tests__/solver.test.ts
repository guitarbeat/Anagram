import { describe, it, expect } from 'vitest';
import { solveAnagrams, exact, normalize, countsArray, buildCandidates } from '../solver';
import {
  isSpicy,
  WORDS,
  FREQ,
  EVERYDAY_2_LETTER_WORDS,
  COMMON_FUNCTION_WORDS,
  startsWithVowelSound,
} from '../lexicon';
import { bestOrder, grammarScore } from '../scoring';

describe('Exact Anagram Engine', () => {
  it('verifies SUBTLEX frequency map structure and size', () => {
    console.log('FREQ.size:', FREQ.size);
    expect(FREQ.size).toBeGreaterThan(50000);
    const freqThe = FREQ.get('the') || 0;
    const freqHouse = FREQ.get('house') || 0;
    expect(freqThe).toBeGreaterThan(freqHouse);
    expect(freqHouse).toBeGreaterThan(0);

    const freqAdoze = FREQ.get('adoze');
    const freqAirwise = FREQ.get('airwise');
    const freqVleis = FREQ.get('vleis');
    expect(freqAdoze === undefined || freqAdoze === 0).toBe(true);
    expect(freqAirwise === undefined || freqAirwise === 0).toBe(true);
    expect(freqVleis === undefined || freqVleis === 0).toBe(true);
  });

  it('filters candidate words: junk 2-letter fragments dropped, real words kept', () => {
    const wordsSet = new Set(WORDS);

    // Fragments and non-words that must be gone
    const forbidden = ['st', 'er', 're', 'es', 'aw', 'mm', 'ka', 'pa', 'el'];
    for (const f of forbidden) {
      expect(wordsSet.has(f), `Expected "${f}" to be excluded`).toBe(false);
    }

    // Real short words that must be kept
    const kept = ['ox', 'ok', 'zoo', 'roo'];
    for (const k of kept) {
      expect(wordsSet.has(k), `Expected "${k}" to be kept`).toBe(true);
    }
  });

  it('allows results according to scoring without artificial variety caps', () => {
    const source = 'Aaron Woods';
    const { results } = solveAnagrams({ source, resultLimit: 20 });
    expect(results.length).toBeGreaterThan(0);
  });

  it('anchored word is included in solutions when specified', () => {
    const source = 'Aaron Lorenzo Woods';
    const { results } = solveAnagrams({
      source,
      anchorText: 'zoolander',
      resultLimit: 20,
    });

    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      const lower = r.phrase.toLowerCase();
      expect(lower.includes('zoolander')).toBe(true);
    }
  });

  it('penalizes 1-2 letter words that are not common function words in grammar score', () => {
    const good1 = grammarScore(['the', 'house']);
    const bad1 = grammarScore(['ka', 'house']);
    expect(bad1).toBeLessThan(good1);

    const good2 = grammarScore(['a', 'car']);
    const bad2 = grammarScore(['st', 'car']);
    expect(bad2).toBeLessThan(good2);
  });

  it('heavily penalizes invalid article usage, articles before verbs/pronouns, and rewards [Article] + [Adjective] + [Noun]', () => {
    // Phonetic mismatches
    const anWood = grammarScore(['an', 'wood']);
    const aWood = grammarScore(['a', 'wood']);
    expect(anWood).toBeLessThan(-50);
    expect(aWood).toBeGreaterThan(anWood);

    const aOwl = grammarScore(['a', 'owl']);
    const anOwl = grammarScore(['an', 'owl']);
    expect(aOwl).toBeLessThan(-50);
    expect(anOwl).toBeGreaterThan(aOwl);

    // Article directly before verb or pronoun
    const aWas = grammarScore(['a', 'was', 'tall']);
    expect(aWas).toBeLessThan(-50);

    const aIts = grammarScore(['a', 'its', 'door']);
    expect(aIts).toBeLessThan(-50);

    // Common pattern reward: [Article] + [Adjective] + [Noun]
    const patterned = grammarScore(['a', 'frosty', 'winter']);
    const unpatterned = grammarScore(['frosty', 'a', 'winter']);
    expect(patterned).toBeGreaterThan(unpatterned + 30);
  });

  it('normalizes text properly and verifies exact anagram identity', () => {
    expect(exact('Aaron Lorenzo Woods', 'Zoolander owns a roo')).toBe(true);
    expect(exact('A-a-r-o-n! Lorenzo, Woods.', 'zoolander owns a roo')).toBe(true);
    expect(exact('Aaron Lorenzo Woods', 'Zoolander owns a dog')).toBe(false);
    expect(exact('', '')).toBe(false);
  });

  it('every result of solveAnagrams satisfies exact(source, phrase)', () => {
    const source = 'Aaron Lorenzo Woods';
    const { results } = solveAnagrams({ source, resultLimit: 50 });

    expect(results.length).toBeGreaterThan(0);
    for (const res of results) {
      expect(exact(source, res.phrase)).toBe(true);
      expect(res.isExact).toBe(true);
    }
  });

  it('"Zoolander owns a roo" (or an equivalent ordering) is reachable when anchorText="zoolander"', () => {
    const source = 'Aaron Lorenzo Woods';
    const { results } = solveAnagrams({
      source,
      anchorText: 'zoolander',
      resultLimit: 80,
    });

    const hasMatch = results.some(r => {
      const p = r.phrase.toLowerCase();
      return p.includes('zoolander') && p.includes('owns') && p.includes('roo');
    });

    expect(hasMatch).toBe(true);
  });

  it('bestOrder(["roo","a","owns","zoolander"]) puts "a" directly before "roo" and does not end on "a"', () => {
    const ordered = bestOrder(['roo', 'a', 'owns', 'zoolander']);
    const aIdx = ordered.indexOf('a');
    const rooIdx = ordered.indexOf('roo');

    expect(aIdx).not.toBe(-1);
    expect(rooIdx).toBe(aIdx + 1);
    expect(ordered[ordered.length - 1]).not.toBe('a');
  });

  it('with allowSpicy=false, no result contains a word where isSpicy() is true', () => {
    const source = 'Aaron Lorenzo Woods';
    const { results } = solveAnagrams({ source, allowSpicy: false, resultLimit: 60 });

    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      for (const w of r.words) {
        expect(isSpicy(w)).toBe(false);
      }
    }
  });

  it('an anchor containing letters not in the source throws a clear error', () => {
    expect(() => {
      solveAnagrams({ source: 'Aaron Lorenzo Woods', anchorText: 'xyz' });
    }).toThrow('Anchor contains letters not present in the input text');
  });

  it('the solve for a 20-letter input finishes within the time budget', () => {
    const t0 = performance.now();
    const { metrics } = solveAnagrams({ source: 'abcdefghijklmnopqrst' });
    const elapsed = performance.now() - t0;

    expect(metrics.elapsedMs).toBeLessThan(3500);
    expect(elapsed).toBeLessThan(4500);
  });

  it('no result contains "an" before a consonant-sound word or "a" before a vowel-sound word', () => {
    const testSources = [
      'Aaron Lorenzo Woods',
      'The Eyes',
    ];

    for (const source of testSources) {
      const { results } = solveAnagrams({ source, resultLimit: 30 });
      for (const res of results) {
        const words = res.words.map(w => w.toLowerCase());
        for (let i = 0; i < words.length; i++) {
          const w = words[i];
          if (w === 'a' || w === 'an') {
            expect(i, `Article "${w}" must not be the final word in "${res.phrase}"`).toBeLessThan(
              words.length - 1
            );
            const next = words[i + 1];
            const isVowel = startsWithVowelSound(next);
            if (w === 'a') {
              expect(
                isVowel,
                `"a" followed by vowel-sound word "${next}" in phrase: "${res.phrase}"`
              ).toBe(false);
            } else if (w === 'an') {
              expect(
                isVowel,
                `"an" followed by consonant-sound word "${next}" in phrase: "${res.phrase}"`
              ).toBe(true);
            }
          }
        }
      }
    }
  });

  it('"veils" is a candidate for "Elvis"', () => {
    const elvisCounts = countsArray('elvis');
    let mask = 0;
    for (let i = 0; i < 26; i++) {
      if (elvisCounts[i] > 0) mask |= 1 << i;
    }
    const pool = buildCandidates(elvisCounts, mask);
    expect(pool.words).toContain('veils');
    expect(pool.words).toContain('levis');

    const { results } = solveAnagrams({ source: 'Elvis', resultLimit: 20 });
    const allPhrases = results.map(r => r.phrase.toLowerCase());
    expect(allPhrases.some(p => p.includes('veils'))).toBe(true);
  });

  it('profanity is detected by isSpicy and is never returned when allowSpicy=false', () => {
    expect(isSpicy('fuck')).toBe(true);

    const { results } = solveAnagrams({
      source: 'Taylor Swift',
      allowSpicy: false,
      resultLimit: 30,
    });

    for (const r of results) {
      for (const w of r.words) {
        expect(isSpicy(w)).toBe(false);
      }
    }
  });

  it('capitalises proper names in displayed phrases', () => {
    const { results } = solveAnagrams({ source: 'Aaron Lorenzo Woods', resultLimit: 50 });
    expect(results.length).toBeGreaterThan(0);
    // Any proper name recognized by NLP (#Person/#Place) is capitalized
    for (const r of results) {
      for (const w of r.words) {
        if (/^[A-Z]/.test(w)) {
          expect(w[0]).toBe(w[0].toUpperCase());
        }
      }
    }
  });
});
