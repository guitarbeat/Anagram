export type VocabularyDepth = 8000 | 20000 | 50000 | 275000;

export type MotionStyle = 'arc' | 'orbit' | 'direct' | 'explosion' | 'vortex' | 'bounce';

export type AnimationSpeed = 'slow' | 'normal' | 'fast' | 'turbo';

export type LoopMode = 'pingpong' | 'restart' | 'once';

export type AspectRatio = 'wide' | 'square' | 'story' | 'banner';

export type CanvasTheme = 'dark' | 'light' | 'neon' | 'cyberpunk' | 'parchment' | 'retro' | 'emerald' | 'sunset';

export type CanvasFont = 'mono' | 'sans' | 'serif' | 'cyber' | 'pixel';

export interface WordCandidate {
  w: string;
  f: number;
  r: number;
  c: Uint8Array;
  base: number;
  custom?: boolean;
  extra?: boolean;
}

export interface AnagramResult {
  phrase: string;
  words: string[];
  score: number;
  funnyScore: number;
  categoryPattern: string[];
  tag?: string;
}

export interface LetterDiff {
  missing: [string, number][];
  extra: [string, number][];
  isExact: boolean;
  sourceCount: number;
  targetCount: number;
}

export interface SubWord {
  word: string;
  length: number;
  scrabbleScore: number;
  isFunny?: boolean;
  category?: string;
}

