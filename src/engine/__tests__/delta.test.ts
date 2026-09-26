import { describe, it, expect } from 'vitest';
import {
  computeMultisetDelta,
  findExactClosers,
  findCandidateWords,
  computeLengthHistogram,
  getConstructionState,
} from '../delta';

describe('Multiset Delta Engine', () => {
  it('correctly calculates remaining, consumed, and surplus letters', () => {
    // Source: "LASER" (A, E, L, R, S)
    // Target: "A RO" (consumed: A, R; surplus: O; remaining: E, L, S)
    const delta = computeMultisetDelta('LASER', 'A RO');

    expect(delta.consumedLetters).toEqual(['a', 'r']);
    expect(delta.remainingLetters).toEqual(['e', 'l', 's']);
    expect(delta.surplusLetters).toEqual(['o']);
    expect(delta.isExactMatch).toBe(false);
    expect(delta.isSurplus).toBe(true);
    expect(delta.isLegalPrefix).toBe(false);
  });

  it('detects exact anagram match', () => {
    // Source: "AARON WOODS", Target: "RAD ON WOODS"
    const delta = computeMultisetDelta('AARON WOODS', 'RAD ON WOODS');

    expect(delta.remainingLetters).toEqual([]);
    expect(delta.surplusLetters).toEqual([]);
    expect(delta.isExactMatch).toBe(true);
    expect(delta.isLegalPrefix).toBe(true);
  });

  it('discovers 1-click exact closers', () => {
    // Source: "LASER", User typed: "A " -> remaining: ['e', 'l', 'r', 's']
    // Closers for "elrs": "lore" ? No, "lore" has o. Valid words with e,l,r,s: "lore"? no, "lore" has o.
    // What words can be made from E,L,R,S? "erls"?
    // Let's test with a known word: "CLOUDS", user typed "C" -> remaining "LOUDS" -> closer "LOUDS" / "SOULD"
    const closers = findExactClosers(['r', 'o', 'a', 'n']);
    expect(closers).toContain('roan');
    expect(closers).toContain('nora');
  });

  it('computes complete construction state seamlessly', () => {
    const state = getConstructionState('AARON WOODS', 'AARON');
    expect(state.consumedLetters).toEqual(['a', 'a', 'n', 'o', 'r']);
    expect(state.remainingLetters).toEqual(['d', 'o', 'o', 's', 'w']);
    expect(state.exactClosers).toContain('woods');
    expect(state.candidateWords.length).toBeGreaterThan(0);
    expect(state.histogramData.length).toBeGreaterThan(0);
  });
});
