export type PersonalityMode = 'sensible' | 'balanced' | 'unhinged' | 'punny' | 'poetic' | 'noir' | 'fantasy' | 'cyber';

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

export interface SavedAnagram {
  id: string;
  source: string;
  target: string;
  notes?: string;
  createdAt: number;
  tags?: string[];
  rating?: number;
}

export interface FamousAnagram {
  source: string;
  target: string;
  category: 'Celebrity' | 'Movies & Pop Culture' | 'Classic & Literary' | 'Hilarious' | 'Mindblowing';
  commentary: string;
}

export interface SubWord {
  word: string;
  length: number;
  scrabbleScore: number;
  isFunny?: boolean;
  category?: string;
}

export interface CustomRiddle {
  id: string;
  source: string;
  target: string;
  clue: string;
  hints: string[];
  creator?: string;
}
