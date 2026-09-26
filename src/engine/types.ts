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

export interface CandidateWordItem {
  word: string;
  length: number;
  freq: number;
}

export interface HistogramBin {
  length: number;
  count: number;
}

export interface LetterBudgetTile {
  letter: string;
  total: number;
  consumed: number;
  remaining: number;
  surplus: number;
}

export interface LetterBudgetSummary {
  tiles: LetterBudgetTile[];
  totalSourceLetters: number;
  totalConsumed: number;
  totalRemaining: number;
  totalSurplus: number;
  vowelCount: number;
  consonantCount: number;
}

export interface MultisetDelta {
  sourceLetters: string[];
  targetLetters: string[];
  consumedLetters: string[];
  remainingLetters: string[];
  surplusLetters: string[];
  isExactMatch: boolean;
  isLegalPrefix: boolean;
  isSurplus: boolean;
  budget: LetterBudgetSummary;
}

export interface ConstructionState extends MultisetDelta {
  exactClosers: string[];
  candidateWords: CandidateWordItem[];
  histogramData: HistogramBin[];
}
