import { describe, it, expect } from 'vitest';
import { solveAnagrams, exact, normalize, countsArray } from '../solver';
import { isSpicy, WORDS } from '../lexicon';
import { bestOrder } from '../scoring';

describe('Exact Anagram Engine', () => {
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

    // Time budget is 1500ms for solver search; test assertion allows reasonable overhead
    expect(metrics.elapsedMs).toBeLessThan(3500);
    expect(elapsed).toBeLessThan(4500);
  });
});
