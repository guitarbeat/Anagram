import { useMemo } from 'react';
import { getConstructionState } from '../engine/delta';
import type { ConstructionState } from '../engine/types';

export interface UseAnagramDeltaResult extends ConstructionState {
  /**
   * Helper to append an exact closer or candidate word to the current target phrase
   */
  getAppendedPhrase: (currentPhrase: string, wordToAppend: string) => string;
}

/**
 * Reactive custom hook managing the multiset delta between source and target phrases.
 * Powers the construction telemetry, closer suggestions, letter budgets, and word graphs.
 */
export function useAnagramDelta(sourceText: string, targetText: string): UseAnagramDeltaResult {
  const constructionState = useMemo(() => {
    return getConstructionState(sourceText, targetText);
  }, [sourceText, targetText]);

  const getAppendedPhrase = (currentPhrase: string, wordToAppend: string): string => {
    const trimmed = currentPhrase.trim();
    if (!trimmed) return wordToAppend.toUpperCase();
    return `${trimmed} ${wordToAppend.toUpperCase()}`;
  };

  return {
    ...constructionState,
    getAppendedPhrase,
  };
}
