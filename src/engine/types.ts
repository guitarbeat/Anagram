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

export interface AnagramResult {
  phrase: string;
  words: string[];
  posTags?: POS[];
  score: number;
  wordScore: number;
  grammarScore: number;
  funninessScore: number;
  isExact: boolean;
}

export interface SolveMetrics {
  elapsedMs: number;
  candidatesCount: number;
  nodesVisited: number;
  solutionsFound: number;
}

export interface SolveOptions {
  source: string;
  maxWords?: number;
  resultLimit?: number;
  allowSpicy?: boolean;
  anchorText?: string;
  customWordsText?: string;
  anchorPlacement?: 'start' | 'end' | 'natural';
  onProgress?: (count: number) => void;
}
