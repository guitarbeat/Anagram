import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Sparkles, CheckCircle2 } from 'lucide-react';
import type { CandidateWordItem } from './CandidateWordsList';
import { LETTER_COUNTS, LETTER_MASKS, WORDS, pos, isMatchingPos } from '../engine/lexicon';
import type { POS } from '../engine/types';
import type { WordFilterMode } from '../types/split';

export interface WordsGraphViewProps {
  sourceText: string;
  candidateWords: CandidateWordItem[];
  selectedLengthFilter: number[] | number | null;
  selectedPosFilter?: POS | 'all' | null;
  onAddWordToTarget: (word: string) => void;
  onSetWordAsTarget: (word: string) => void;
  activeTargetPhrase?: string;
  onShowToast: (text: string, type?: 'success' | 'info' | 'error') => void;
  onHoverWordChange?: (word: string | null) => void;
  hoveredPosFilter?: POS | null;
  hoveredLengthFilter?: number | null;
  wordFilterMode?: WordFilterMode;
  wordFilterCount?: number;
  onCycleWordFilter?: () => void;
}

interface TagNode {
  id: string;
  word: string;
  length: number;
  freq: number;
  baseRadius: number;
  radius: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  color: string;
  borderColor: string;
  hoverT: number;
  neighborT: number;
  externalT: number;
  phaseOffset: number;
  isSolvable?: boolean;
  isExactCloser?: boolean;
  completionSample?: string[];
}

export interface TagEdge {
  source: string;
  target: string;
  isSentenceFlow?: boolean;
  reason?: string;
  directional?: boolean;
  dirSource?: string;
  dirTarget?: string;
  hoverT?: number;
  externalT?: number;
}

export function getPOS(word: string): 'determiner' | 'pronoun' | 'verb' | 'adjective' | 'preposition' | 'conjunction' | 'noun' {
  const w = word.toLowerCase();
  
  const pronouns = ['i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'its', 'our', 'their', 'who', 'whom', 'whose'];
  if (pronouns.includes(w)) return 'pronoun';

  const determiners = ['the', 'a', 'an', 'this', 'that', 'these', 'those', 'some', 'any', 'all', 'no', 'every', 'each', 'both', 'either', 'neither'];
  if (determiners.includes(w)) return 'determiner';

  const prepositions = ['to', 'in', 'on', 'at', 'by', 'for', 'with', 'about', 'of', 'from', 'into', 'through', 'after', 'before', 'under', 'over', 'up', 'down', 'out', 'off', 'over', 'under', 'with', 'without', 'like', 'as'];
  if (prepositions.includes(w)) return 'preposition';

  const conjunctions = ['and', 'but', 'or', 'so', 'for', 'yet', 'nor', 'because', 'although', 'if', 'since', 'unless', 'until', 'while'];
  if (conjunctions.includes(w)) return 'conjunction';

  const verbs = [
    'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 
    'can', 'could', 'will', 'would', 'shall', 'should', 'may', 'might', 'must', 'go', 'goes', 'went', 'gone',
    'get', 'gets', 'got', 'make', 'makes', 'made', 'take', 'takes', 'took', 'see', 'sees', 'saw', 'seen',
    'find', 'finds', 'found', 'keep', 'keeps', 'kept', 'know', 'knows', 'knew', 'known', 'say', 'says', 'said',
    'think', 'thinks', 'thought', 'come', 'comes', 'came', 'give', 'gives', 'gave', 'given', 'use', 'uses', 'used',
    'love', 'loves', 'loved', 'like', 'likes', 'liked', 'want', 'wants', 'wanted', 'run', 'runs', 'ran',
    'tell', 'tells', 'told', 'play', 'plays', 'played', 'show', 'shows', 'showed', 'shown', 'call', 'calls', 'called',
    'live', 'lives', 'lived', 'eat', 'eats', 'ate', 'eaten', 'drink', 'drinks', 'drank', 'drunk', 'write', 'writes', 'wrote', 'written'
  ];
  if (verbs.includes(w) || w.endsWith('ing') || (w.endsWith('ed') && w.length > 4)) return 'verb';

  const adjectives = [
    'good', 'bad', 'great', 'new', 'old', 'big', 'small', 'hot', 'cold', 'happy', 'sad', 'best', 'sweet', 'nice', 'real', 'free',
    'high', 'low', 'early', 'late', 'hard', 'easy', 'young', 'old', 'right', 'wrong', 'true', 'false', 'beautiful', 'smart'
  ];
  if (adjectives.includes(w) || w.endsWith('ful') || w.endsWith('less') || w.endsWith('ous') || w.endsWith('ish') || w.endsWith('ive') || w.endsWith('al') || w.endsWith('ic') || w.endsWith('able') || w.endsWith('ible')) return 'adjective';

  return 'noun';
}

export function getSentenceFlow(w1: string, w2: string): { flow: boolean; reason: string } {
  const p1 = getPOS(w1);
  const p2 = getPOS(w2);

  // Subject/Pronoun -> Verb
  if (p1 === 'pronoun' && p2 === 'verb') return { flow: true, reason: 'Subject → Verb' };
  
  // Noun -> Verb
  if (p1 === 'noun' && p2 === 'verb') return { flow: true, reason: 'Subject → Verb' };

  // Verb -> Object (Pronoun, Noun) or Preposition or Adjective
  if (p1 === 'verb' && ['pronoun', 'noun', 'preposition', 'adjective'].includes(p2)) {
    return { flow: true, reason: `Verb → ${p2.charAt(0).toUpperCase() + p2.slice(1)}` };
  }

  // Determiner -> Adjective or Noun
  if (p1 === 'determiner' && ['adjective', 'noun'].includes(p2)) {
    return { flow: true, reason: `Determiner → ${p2.charAt(0).toUpperCase() + p2.slice(1)}` };
  }

  // Adjective -> Noun
  if (p1 === 'adjective' && p2 === 'noun') return { flow: true, reason: 'Adjective → Noun' };

  // Preposition -> Determiner, Pronoun, Noun, Adjective
  if (p1 === 'preposition' && ['determiner', 'pronoun', 'noun', 'adjective'].includes(p2)) {
    return { flow: true, reason: `Preposition → ${p2.charAt(0).toUpperCase() + p2.slice(1)}` };
  }

  // Conjunction -> Subject/Determiner/Pronoun/Noun
  if (p1 === 'conjunction' && ['pronoun', 'noun', 'determiner'].includes(p2)) {
    return { flow: true, reason: `Conjunction → ${p2.charAt(0).toUpperCase() + p2.slice(1)}` };
  }

  return { flow: false, reason: '' };
}

/**
 * Selects a balanced, diverse set of candidate words across all available lengths,
 * prioritizing natural high-frequency English words and sentence-flow suggestions.
 */
function getBalancedCandidateSample(
  words: CandidateWordItem[],
  targetCount = 95,
  lastTargetWord?: string | null
): CandidateWordItem[] {
  if (words.length <= targetCount) return words;

  // Group by word length
  const byLength = new Map<number, CandidateWordItem[]>();
  for (const w of words) {
    let group = byLength.get(w.length);
    if (!group) {
      group = [];
      byLength.set(w.length, group);
    }
    group.push(w);
  }

  // Sort each length group: sentence flow recommendations first, then frequency descending
  for (const group of byLength.values()) {
    group.sort((a, b) => {
      const aFlow = lastTargetWord ? getSentenceFlow(lastTargetWord, a.word).flow : false;
      const bFlow = lastTargetWord ? getSentenceFlow(lastTargetWord, b.word).flow : false;
      if (aFlow !== bFlow) return bFlow ? 1 : -1;
      return (b.freq || 1) - (a.freq || 1);
    });
  }

  const lengths = Array.from(byLength.keys()).sort((a, b) => a - b);
  if (lengths.length === 0) return [];
  if (lengths.length === 1) {
    return byLength.get(lengths[0])!.slice(0, targetCount);
  }

  // 1. Minimum guarantee for each available length so every length has visible bubbles in the graph
  const allocation = new Map<number, number>();
  let remainingBudget = targetCount;

  for (const len of lengths) {
    const totalInBin = byLength.get(len)!.length;
    const baseMin = Math.min(totalInBin, Math.max(3, Math.floor(targetCount / (lengths.length * 2))));
    allocation.set(len, baseMin);
    remainingBudget -= baseMin;
  }

  // 2. Distribute remaining budget proportionally according to bin size
  const totalEligible = words.length;
  for (const len of lengths) {
    if (remainingBudget <= 0) break;
    const totalInBin = byLength.get(len)!.length;
    const currentAlloc = allocation.get(len)!;
    const available = totalInBin - currentAlloc;
    if (available <= 0) continue;

    const proportion = totalInBin / totalEligible;
    const extra = Math.min(available, Math.round(targetCount * proportion * 0.85));
    const toAdd = Math.min(extra, remainingBudget);
    allocation.set(len, currentAlloc + toAdd);
    remainingBudget -= toAdd;
  }

  // 3. Round-robin any remaining budget to bins that still have words
  let distributed = true;
  while (remainingBudget > 0 && distributed) {
    distributed = false;
    for (const len of lengths) {
      if (remainingBudget <= 0) break;
      const totalInBin = byLength.get(len)!.length;
      const currentAlloc = allocation.get(len)!;
      if (currentAlloc < totalInBin) {
        allocation.set(len, currentAlloc + 1);
        remainingBudget -= 1;
        distributed = true;
      }
    }
  }

  // Collect selected words
  const selected: CandidateWordItem[] = [];
  for (const len of lengths) {
    const count = allocation.get(len)!;
    const group = byLength.get(len)!;
    selected.push(...group.slice(0, count));
  }

  return selected;
}

/**
 * Draws an organic, smooth fluid blob that comfortably envelops the word.
 * Distributes control points along the top, bottom, and rounded end-caps with outward normal offsets.
 * Strictly guarantees that 100% of all letters remain deeply inside the blob with zero text overflow.
 */
export function drawBlob(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  w: number,
  h: number,
  seed = 0,
  time = 0,
  expand = 0
) {
  const rx = (w + expand * 2) / 2;
  const ry = (h + expand * 2) / 2;
  const p = 3.4; // Superellipse exponent for snug, soft organic pebble shape

  const seed1 = ((seed % 1000) / 1000) * Math.PI * 2;
  const seed2 = (((seed >> 4) % 1000) / 1000) * Math.PI * 2;
  const seed3 = (((seed >> 8) % 1000) / 1000) * Math.PI * 2;

  const numPoints = 28;
  const points: { x: number; y: number }[] = [];

  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const absCos = Math.abs(cosA);
    const absSin = Math.abs(sinA);

    // Superellipse radial distance to boundary
    const denom = Math.pow(absCos / rx, p) + Math.pow(absSin / ry, p);
    const baseR = Math.pow(denom, -1 / p);

    // Snug, subtle organic wave perturbation
    const wave =
      0.028 * Math.sin(2 * angle + seed1 + time * 0.8) +
      0.018 * Math.cos(3 * angle + seed2 - time * 0.6) +
      0.01 * Math.sin(4 * angle + seed3 + time * 0.4) +
      0.02;

    const finalR = baseR * (1 + wave);
    points.push({
      x: cx + cosA * finalR,
      y: cy + sinA * finalR,
    });
  }

  // Draw smooth closed spline curve through midpoints
  ctx.beginPath();
  const n = points.length;
  const firstMidX = (points[0].x + points[1].x) / 2;
  const firstMidY = (points[0].y + points[1].y) / 2;
  ctx.moveTo(firstMidX, firstMidY);

  for (let i = 1; i <= n; i++) {
    const pCurr = points[i % n];
    const pNext = points[(i + 1) % n];
    const midX = (pCurr.x + pNext.x) / 2;
    const midY = (pCurr.y + pNext.y) / 2;
    ctx.quadraticCurveTo(pCurr.x, pCurr.y, midX, midY);
  }

  ctx.closePath();
}

/**
 * Backwards compatible alias
 */
export const drawCapsule = drawBlob;

export const WordsGraphView: React.FC<WordsGraphViewProps> = ({
  sourceText,
  candidateWords,
  selectedLengthFilter,
  selectedPosFilter,
  onAddWordToTarget,
  onSetWordAsTarget,
  activeTargetPhrase = '',
  onShowToast,
  onHoverWordChange,
  hoveredPosFilter,
  hoveredLengthFilter,
  wordFilterMode = 'safe',
  wordFilterCount,
  onCycleWordFilter,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const wordFilterModeRef = useRef(wordFilterMode);
  wordFilterModeRef.current = wordFilterMode;

  const wordFilterCountRef = useRef(wordFilterCount);
  wordFilterCountRef.current = wordFilterCount;

  const onCycleWordFilterRef = useRef(onCycleWordFilter);
  onCycleWordFilterRef.current = onCycleWordFilter;

  const lastTargetWord = useMemo(() => {
    const words = activeTargetPhrase.trim().split(/\s+/).filter(Boolean);
    return words.length > 0 ? words[words.length - 1] : null;
  }, [activeTargetPhrase]);

  // Density state for comfortable readability vs dense exploration
  const [density, setDensity] = useState<'spacious' | 'balanced' | 'dense'>('spacious');

  // Interactive Zoom and Pan State
  const [zoomScale, setZoomScale] = useState<number>(1.0);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const zoomScaleRef = useRef<number>(1.0);
  zoomScaleRef.current = zoomScale;
  const panOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  panOffsetRef.current = panOffset;

  const isPanningRef = useRef<boolean>(false);
  const panStartRef = useRef<{ clientX: number; clientY: number; startX: number; startY: number }>({ clientX: 0, clientY: 0, startX: 0, startY: 0 });

  // Dynamic Scale and Physics Container
  const currentScaleRef = useRef<number>(1.0);
  const prevContainerDimRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });
  const externalDimTRef = useRef<number>(0);

  // Hover and dragging
  const [hoveredNode, setHoveredNode] = useState<TagNode | null>(null);
  const hoveredNodeRef = useRef<TagNode | null>(null);
  hoveredNodeRef.current = hoveredNode;

  const hoveredPosFilterRef = useRef<POS | null | undefined>(hoveredPosFilter);
  hoveredPosFilterRef.current = hoveredPosFilter;

  const hoveredLengthFilterRef = useRef<number | null | undefined>(hoveredLengthFilter);
  hoveredLengthFilterRef.current = hoveredLengthFilter;

  const activeTargetPhraseRef = useRef(activeTargetPhrase);
  activeTargetPhraseRef.current = activeTargetPhrase;

  const lastTargetWordRef = useRef(lastTargetWord);
  lastTargetWordRef.current = lastTargetWord;

  const draggedNodeRef = useRef<TagNode | null>(null);
  const dragMovedRef = useRef(false);

  // Notify parent of hover state changes in graph
  useEffect(() => {
    onHoverWordChange?.(hoveredNode ? hoveredNode.word : null);
  }, [hoveredNode, onHoverWordChange]);

  // Nodes and Edges State
  const nodesRef = useRef<TagNode[]>([]);
  const edgesRef = useRef<TagEdge[]>([]);

  // Filter words according to density setting
  const activeWords = useMemo(() => {
    let list = candidateWords;
    if (selectedLengthFilter !== null && selectedLengthFilter !== undefined) {
      if (Array.isArray(selectedLengthFilter)) {
        if (selectedLengthFilter.length > 0) {
          const filterSet = new Set(selectedLengthFilter);
          list = list.filter(w => filterSet.has(w.length));
        }
      } else {
        list = list.filter(w => w.length === selectedLengthFilter);
      }
    }
    if (selectedPosFilter && selectedPosFilter !== 'all') {
      list = list.filter(w => isMatchingPos(pos(w.word), selectedPosFilter));
    }
    // Density target counts: spacious (36 words, best readability), balanced (56), dense (90)
    const targetCount = density === 'spacious' ? 36 : density === 'balanced' ? 56 : 90;
    return getBalancedCandidateSample(list, targetCount, lastTargetWord);
  }, [candidateWords, selectedLengthFilter, selectedPosFilter, lastTargetWord, density]);

  // Compute horizontal organic blob dimensions with snug, clean text margins
  const computeNodeDimensions = useCallback((word: string) => {
    let charWidth = 0;
    for (let i = 0; i < word.length; i++) {
      const c = word[i].toLowerCase();
      if ('iljt'.includes(c)) charWidth += 5.5;
      else if ('mw'.includes(c)) charWidth += 11.0;
      else if ('rf'.includes(c)) charWidth += 7.0;
      else charWidth += 8.5;
    }
    const textWidth = Math.max(20, charWidth);
    // Snug, clean padding: 10px on each side for short words, up to 14px for longer words
    const padX = word.length <= 3 ? 10 : word.length <= 6 ? 12 : 14;
    const width = Math.max(46, Math.round(textWidth + padX * 2));
    const height = 26;
    const radius = Math.round(height / 2);
    return { width, height, radius };
  }, []);

  // Master position cache to ensure stable positions across filter changes
  const masterPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const prevSourceTextRef = useRef<string>('');

  // Deterministic hash function based on word characters
  const getWordHash = useCallback((word: string): number => {
    let hash = 2166136261;
    for (let i = 0; i < word.length; i++) {
      hash ^= word.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }, []);

  // Deterministic initial position derivation using word content & container aspect ratio
  const deriveWordInitialPosition = useCallback((word: string, stableIndex: number): { x: number; y: number } => {
    const hash = getWordHash(word);
    const goldenAngle = 2.399963229728653; // Golden angle (~137.5 deg)
    const angleOffset = (((hash % 1000) / 1000) - 0.5) * 0.35;
    const theta = stableIndex * goldenAngle + angleOffset;
    const rOffset = ((hash >>> 10) % 24) - 12;
    const radius = Math.sqrt(stableIndex + 1) * 64 + 36 + rOffset;

    let aspectScaleX = 1.2;
    let aspectScaleY = 0.85;
    if (canvasRef.current) {
      const w = canvasRef.current.clientWidth || 400;
      const h = canvasRef.current.clientHeight || 600;
      const aspect = w / h;
      aspectScaleX = Math.max(0.6, Math.min(2.2, Math.sqrt(aspect) * 1.15));
      aspectScaleY = Math.max(0.6, Math.min(2.2, 1 / (aspectScaleX * 0.85)));
    }

    return {
      x: Math.cos(theta) * radius * aspectScaleX,
      y: Math.sin(theta) * radius * aspectScaleY,
    };
  }, [getWordHash]);

  // Deterministic cooling simulation with capsule-aware non-overlapping separation
  const runDeterministicCoolingSimulation = useCallback((
    nodes: TagNode[],
    edges: TagEdge[],
    steps = 120,
    initialTemp = 32,
    coolingRate = 0.94
  ) => {
    if (nodes.length <= 1) return;
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    let temp = initialTemp;

    for (let step = 0; step < steps; step++) {
      // 1. Repulsive forces (capsule-aware non-overlapping separation)
      for (let i = 0; i < nodes.length; i++) {
        const n1 = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const n2 = nodes[j];
          const dx = n1.x - n2.x;
          const dy = n1.y - n2.y;

          // Capsule-aware boundary clearances with generous margins
          const marginX = 12;
          const marginY = 10;
          const reqDistX = (n1.width + n2.width) / 2 + marginX;
          const reqDistY = (n1.height + n2.height) / 2 + marginY;

          const absDx = Math.abs(dx);
          const absDy = Math.abs(dy);

          const overlapX = reqDistX - absDx;
          const overlapY = reqDistY - absDy;

          if (overlapX > 0 && overlapY > 0) {
            // Overlapping in 2D bounding space! Push apart along axis of least penetration
            const ratioX = overlapX / reqDistX;
            const ratioY = overlapY / reqDistY;

            if (ratioX < ratioY) {
              const sign = dx >= 0 ? 1 : -1;
              const push = overlapX * 0.65;
              n1.vx += sign * push;
              n2.vx -= sign * push;
            } else {
              const sign = dy >= 0 ? 1 : -1;
              const push = overlapY * 0.65;
              n1.vy += sign * push;
              n2.vy -= sign * push;
            }
          } else {
            const normDistX = absDx / reqDistX;
            const normDistY = absDy / reqDistY;
            const normDistSq = normDistX * normDistX + normDistY * normDistY;
            if (normDistSq < 2.5 && normDistSq > 0.001) {
              const force = (2.5 - normDistSq) * 1.6;
              const fx = (dx / (absDx + 0.1)) * force;
              const fy = (dy / (absDy + 0.1)) * force;
              n1.vx += fx;
              n1.vy += fy;
              n2.vx -= fx;
              n2.vy -= fy;
            }
          }
        }
      }

      // 2. Attractive spring forces along edges
      for (let e = 0; e < edges.length; e++) {
        const edge = edges[e];
        const s = nodeMap.get(edge.source);
        const t = nodeMap.get(edge.target);
        if (!s || !t) continue;

        const dx = t.x - s.x;
        const dy = t.y - s.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const idealDist = edge.isSentenceFlow
          ? (s.width + t.width) / 2 + 16
          : (s.width + t.width) / 2 + 24;
        const force = (dist - idealDist) * 0.04;

        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        s.vx += fx;
        s.vy += fy;
        t.vx -= fx;
        t.vy -= fy;
      }

      // 3. Center gravity and displacement with temperature decay
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        n.vx -= n.x * 0.003;
        n.vy -= n.y * 0.003;

        const dispLength = Math.sqrt(n.vx * n.vx + n.vy * n.vy) || 1;
        const actualDisp = Math.min(dispLength, temp);

        n.x += (n.vx / dispLength) * actualDisp;
        n.y += (n.vy / dispLength) * actualDisp;

        n.vx *= 0.6;
        n.vy *= 0.6;
      }

      temp *= coolingRate;
    }
  }, []);

  // Compute node style helper: unified black & white design language
  const getNodeBorderColor = useCallback((word: string, length: number): string => {
    if (length >= 6) return '#18181b'; // strong dark zinc border
    return '#52525b'; // medium zinc hairline border
  }, []);

  // Initialize or re-layout nodes with deterministic cooling simulation
  useEffect(() => {
    // Reset positions if puzzle source text changed
    if (sourceText !== prevSourceTextRef.current) {
      prevSourceTextRef.current = sourceText;
      masterPositionsRef.current.clear();
    }

    // Ensure all active and candidate words have deterministic simulated positions in master cache
    const candidateSubset = Array.from(
      new Map([...activeWords, ...candidateWords.slice(0, 80)].map(w => [w.word, w])).values()
    );
    const missingCandidates = candidateSubset.filter(
      item => !masterPositionsRef.current.has(item.word)
    );

    if (missingCandidates.length > 0) {
      // Build candidate node graph for simulation
      const simulationNodes: TagNode[] = candidateSubset.map((item, index) => {
        const existing = masterPositionsRef.current.get(item.word);
        const initialPos = existing || deriveWordInitialPosition(item.word, index);
        const dims = computeNodeDimensions(item.word);

        return {
          id: item.word,
          word: item.word,
          length: item.length,
          freq: item.freq,
          baseRadius: dims.radius,
          radius: dims.radius,
          x: initialPos.x,
          y: initialPos.y,
          vx: 0,
          vy: 0,
          width: dims.width,
          height: dims.height,
          color: '#ffffff',
          borderColor: getNodeBorderColor(item.word, item.length),
          hoverT: 0,
          neighborT: 0,
          externalT: 0,
          phaseOffset: ((item.word.charCodeAt(0) * 17 + item.length * 31) % 100) / 100 * Math.PI * 2,
          isSolvable: item.isSolvable,
          isExactCloser: item.isExactCloser,
          completionSample: item.completionSample,
        };
      });

      // Build edges for candidate graph
      const sourceLetters = sourceText.toLowerCase().replace(/[^a-z]/g, '');
      const sourceCounts = new Array(26).fill(0);
      for (let i = 0; i < sourceLetters.length; i++) {
        sourceCounts[sourceLetters.charCodeAt(i) - 97]++;
      }

      const simEdges: TagEdge[] = [];
      const edgeLimit = Math.min(simulationNodes.length, 50);
      for (let i = 0; i < edgeLimit; i++) {
        const n1 = simulationNodes[i];
        let edgeCount = 0;
        for (let j = i + 1; j < edgeLimit; j++) {
          if (edgeCount >= 3) break;
          const n2 = simulationNodes[j];
          const combined = (n1.word + n2.word).toLowerCase();
          if (combined.length <= sourceLetters.length) {
            const counts = new Array(26).fill(0);
            let fits = true;
            for (let k = 0; k < combined.length; k++) {
              const code = combined.charCodeAt(k) - 97;
              counts[code]++;
              if (counts[code] > sourceCounts[code]) {
                fits = false;
                break;
              }
            }
            if (fits) {
              const forward = getSentenceFlow(n1.word, n2.word);
              const backward = getSentenceFlow(n2.word, n1.word);
              if (forward.flow) {
                simEdges.push({
                  source: n1.id,
                  target: n2.id,
                  isSentenceFlow: true,
                  reason: forward.reason,
                  directional: true,
                  dirSource: n1.id,
                  dirTarget: n2.id,
                  hoverT: 0,
                });
              } else if (backward.flow) {
                simEdges.push({
                  source: n2.id,
                  target: n1.id,
                  isSentenceFlow: true,
                  reason: backward.reason,
                  directional: true,
                  dirSource: n2.id,
                  dirTarget: n1.id,
                  hoverT: 0,
                });
              } else {
                simEdges.push({ source: n1.id, target: n2.id, hoverT: 0 });
              }
              edgeCount++;
            }
          }
        }
      }

      // Run deterministic cooling simulation
      runDeterministicCoolingSimulation(simulationNodes, simEdges, 90, 24, 0.94);

      // Save calculated equilibrium positions into master position cache
      for (const node of simulationNodes) {
        masterPositionsRef.current.set(node.id, { x: node.x, y: node.y });
      }
    }

    // Construct active visible nodes with stable positions from master cache
    const nodes: TagNode[] = activeWords.map((item, index) => {
      const pos = masterPositionsRef.current.get(item.word) || deriveWordInitialPosition(item.word, index);
      const dims = computeNodeDimensions(item.word);
      const existing = nodesRef.current.find(n => n.id === item.word);
      return {
        id: item.word,
        word: item.word,
        length: item.length,
        freq: item.freq,
        baseRadius: dims.radius,
        radius: dims.radius,
        x: pos.x,
        y: pos.y,
        vx: 0,
        vy: 0,
        width: dims.width,
        height: dims.height,
        color: '#ffffff',
        borderColor: getNodeBorderColor(item.word, item.length),
        hoverT: existing?.hoverT ?? 0,
        neighborT: existing?.neighborT ?? 0,
        externalT: existing?.externalT ?? 0,
        phaseOffset: ((item.word.charCodeAt(0) * 17 + item.length * 31) % 100) / 100 * Math.PI * 2,
        isSolvable: item.isSolvable,
        isExactCloser: item.isExactCloser,
        completionSample: item.completionSample,
      };
    });

    // Compute compatibility and sentence flow edges between active visible nodes
    const sourceLetters = sourceText.toLowerCase().replace(/[^a-z]/g, '');
    const sourceCounts = new Array(26).fill(0);
    for (let i = 0; i < sourceLetters.length; i++) {
      sourceCounts[sourceLetters.charCodeAt(i) - 97]++;
    }

    const edges: TagEdge[] = [];
    const activeLimit = Math.min(nodes.length, 50);
    for (let i = 0; i < activeLimit; i++) {
      const n1 = nodes[i];
      let edgeCount = 0;

      for (let j = i + 1; j < activeLimit; j++) {
        if (edgeCount >= 3) break;
        const n2 = nodes[j];

        const combined = (n1.word + n2.word).toLowerCase();
        if (combined.length <= sourceLetters.length) {
          const counts = new Array(26).fill(0);
          let fits = true;
          for (let k = 0; k < combined.length; k++) {
            const code = combined.charCodeAt(k) - 97;
            counts[code]++;
            if (counts[code] > sourceCounts[code]) {
              fits = false;
              break;
            }
          }
          if (fits) {
            const forward = getSentenceFlow(n1.word, n2.word);
            const backward = getSentenceFlow(n2.word, n1.word);

            const existingEdge = edgesRef.current.find(e => (e.source === n1.id && e.target === n2.id) || (e.source === n2.id && e.target === n1.id));
            const prevHoverT = existingEdge?.hoverT ?? 0;
            const prevExternalT = existingEdge?.externalT ?? 0;

            if (forward.flow) {
              edges.push({
                source: n1.id,
                target: n2.id,
                isSentenceFlow: true,
                reason: forward.reason,
                directional: true,
                dirSource: n1.id,
                dirTarget: n2.id,
                hoverT: prevHoverT,
                externalT: prevExternalT,
              });
            } else if (backward.flow) {
              edges.push({
                source: n2.id,
                target: n1.id,
                isSentenceFlow: true,
                reason: backward.reason,
                directional: true,
                dirSource: n2.id,
                dirTarget: n1.id,
                hoverT: prevHoverT,
                externalT: prevExternalT,
              });
            } else {
              edges.push({ source: n1.id, target: n2.id, hoverT: prevHoverT, externalT: prevExternalT });
            }
            edgeCount++;
          }
        }
      }
    }

    nodesRef.current = nodes;
    edgesRef.current = edges;
  }, [
    activeWords,
    candidateWords,
    sourceText,
    computeNodeDimensions,
    deriveWordInitialPosition,
    getNodeBorderColor,
    runDeterministicCoolingSimulation,
  ]);

  // Main Canvas Render Loop with Live Container Physics & Dynamic Packing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let dpr = window.devicePixelRatio || 1;
    let animationFrameId: number;
    let lastRenderTime = performance.now();

    const render = () => {
      const now = performance.now();
      const dt = Math.min(32, Math.max(8, now - lastRenderTime));
      lastRenderTime = now;
      const fluidFactor = 1 - Math.exp(-dt * 0.046);

      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      const nodes = nodesRef.current;
      const edges = edgesRef.current;
      let externalDimT = externalDimTRef.current;

      if (width > 0 && height > 0 && nodes.length > 0) {
        // Compute connected neighbors for liquid wave propagation
        const currentHoveredNode = hoveredNodeRef.current;
        const hoveredId = currentHoveredNode?.id;
        const neighborIds = new Set<string>();
        if (hoveredId) {
          for (let i = 0; i < edges.length; i++) {
            const e = edges[i];
            if (e.source === hoveredId) neighborIds.add(e.target);
            else if (e.target === hoveredId) neighborIds.add(e.source);
          }
        }

        // External hover active status (from treemap tile hovering)
        const currentPosFilter = hoveredPosFilterRef.current;
        const currentLengthFilter = hoveredLengthFilterRef.current;
        const isExternalHoverActive = Boolean(currentPosFilter || (currentLengthFilter !== null && currentLengthFilter !== undefined));
        const targetDim = isExternalHoverActive ? 1.0 : 0.0;
        externalDimTRef.current += (targetDim - externalDimTRef.current) * fluidFactor;
        externalDimT = externalDimTRef.current;

        // Smoothly update continuous hoverT, neighborT, and externalT on all nodes
        for (let i = 0; i < nodes.length; i++) {
          const n = nodes[i];
          const isHovered = n.id === hoveredId;
          const isNeighbor = neighborIds.has(n.id);
          const targetHoverT = isHovered ? 1.0 : 0.0;
          const targetNeighborT = isNeighbor ? 1.0 : 0.0;

          let isMatchingExternal = false;
          if (currentPosFilter && currentLengthFilter !== null && currentLengthFilter !== undefined) {
            isMatchingExternal = isMatchingPos(pos(n.word), currentPosFilter) && n.length === currentLengthFilter;
          } else if (currentPosFilter) {
            isMatchingExternal = isMatchingPos(pos(n.word), currentPosFilter);
          } else if (currentLengthFilter !== null && currentLengthFilter !== undefined) {
            isMatchingExternal = n.length === currentLengthFilter;
          }
          const targetExternalT = isMatchingExternal ? 1.0 : 0.0;

          n.hoverT = (n.hoverT ?? 0) + (targetHoverT - (n.hoverT ?? 0)) * fluidFactor;
          n.neighborT = (n.neighborT ?? 0) + (targetNeighborT - (n.neighborT ?? 0)) * fluidFactor;
          n.externalT = (n.externalT ?? 0) + (targetExternalT - (n.externalT ?? 0)) * fluidFactor;
        }

        // Smoothly update continuous hoverT on all edges
        for (let i = 0; i < edges.length; i++) {
          const e = edges[i];
          const isConnected = Boolean(hoveredId && (e.source === hoveredId || e.target === hoveredId));
          const targetEdgeT = isConnected ? 1.0 : 0.0;
          e.hoverT = (e.hoverT ?? 0) + (targetEdgeT - (e.hoverT ?? 0)) * fluidFactor;
        }

        // Physical container bounds inside the panel
        const padding = 20;
        const halfW = width / 2;
        const halfH = height / 2;
        const minBoundX = -halfW + padding;
        const maxBoundX = halfW - padding;
        const minBoundY = -halfH + padding;
        const maxBoundY = halfH - padding;
        const containerW = Math.max(20, maxBoundX - minBoundX);
        const containerH = Math.max(20, maxBoundY - minBoundY);
        const containerArea = containerW * containerH;

        // Detect container resize / aspect shift and dynamically stretch positions into open dimensions
        const prevW = prevContainerDimRef.current.w;
        const prevH = prevContainerDimRef.current.h;
        if (prevW > 0 && prevH > 0 && (Math.abs(prevW - width) > 1 || Math.abs(prevH - height) > 1)) {
          const prevAspect = prevW / prevH;
          const currAspect = width / height;
          // If container became narrower/taller, stretch nodes along Y so they immediately take space above and below
          if (currAspect < prevAspect * 0.98) {
            const stretchY = Math.min(1.8, Math.sqrt(prevAspect / currAspect));
            const compressX = Math.max(0.6, Math.sqrt(currAspect / prevAspect));
            for (let i = 0; i < nodes.length; i++) {
              if (draggedNodeRef.current?.id === nodes[i].id) continue;
              nodes[i].x *= compressX;
              nodes[i].y *= stretchY;
            }
          } else if (currAspect > prevAspect * 1.02) {
            const stretchX = Math.min(1.8, Math.sqrt(currAspect / prevAspect));
            const compressY = Math.max(0.6, Math.sqrt(prevAspect / currAspect));
            for (let i = 0; i < nodes.length; i++) {
              if (draggedNodeRef.current?.id === nodes[i].id) continue;
              nodes[i].x *= stretchX;
              nodes[i].y *= compressY;
            }
          }
        }
        prevContainerDimRef.current = { w: width, h: height };

        // Calculate occupied cluster bounds & total area needed using capsule dimensions
        let nMinX = Infinity, nMaxX = -Infinity;
        let nMinY = Infinity, nMaxY = -Infinity;
        let totalBaseArea = 0;
        let maxBaseRadius = 0;
        for (let i = 0; i < nodes.length; i++) {
          const n = nodes[i];
          const dims = computeNodeDimensions(n.word);
          totalBaseArea += (dims.width + 16) * (dims.height + 12);
          if (dims.radius > maxBaseRadius) maxBaseRadius = dims.radius;
          const halfW = (n.width || dims.width) / 2;
          const halfH = (n.height || dims.height) / 2;
          if (n.x - halfW < nMinX) nMinX = n.x - halfW;
          if (n.x + halfW > nMaxX) nMaxX = n.x + halfW;
          if (n.y - halfH < nMinY) nMinY = n.y - halfH;
          if (n.y + halfH > nMaxY) nMaxY = n.y + halfH;
        }

        const unusedTop = Math.max(0, nMinY - minBoundY);
        const unusedBottom = Math.max(0, maxBoundY - nMaxY);
        const unusedLeft = Math.max(0, nMinX - minBoundX);
        const unusedRight = Math.max(0, maxBoundX - nMaxX);

        const occupiedW = Math.max(10, nMaxX - nMinX);
        const occupiedH = Math.max(10, nMaxY - nMinY);

        // 2D Capsule packing capacity limit (~0.72)
        const packingCapacity = containerArea * 0.72;

        // When container has enough space: targetScale = 1.0!
        let targetScale = 1.0;
        if (packingCapacity < totalBaseArea) {
          targetScale = Math.sqrt(packingCapacity / totalBaseArea);
        }

        // Ensure individual capsules fit comfortably within container dimensions
        const maxDimScale = Math.min(
          (containerW * 0.92) / (2 * Math.max(1, maxBaseRadius)),
          (containerH * 0.92) / (2 * Math.max(1, maxBaseRadius))
        );
        targetScale = Math.min(targetScale, maxDimScale);
        targetScale = Math.max(0.35, Math.min(1.0, targetScale));

        // Smooth elasticity transition for scale
        currentScaleRef.current += (targetScale - currentScaleRef.current) * 0.35;
        const currentScale = currentScaleRef.current;

        // Update active radius & true capsule dimensions of all nodes
        for (let i = 0; i < nodes.length; i++) {
          const dims = computeNodeDimensions(nodes[i].word);
          nodes[i].radius = dims.radius * currentScale;
          nodes[i].width = dims.width * currentScale;
          nodes[i].height = dims.height * currentScale;
        }

        // Live Dynamic Physics Simulation: only run when dragging or when nodes are settling
        const isDraggingAny = Boolean(draggedNodeRef.current);
        const steps = isDraggingAny ? 3 : 1;

        for (let sIdx = 0; sIdx < steps; sIdx++) {
          // A. Capsule-to-capsule anti-overlap collision (only pushes when overlapping)
          for (let i = 0; i < nodes.length; i++) {
            const n1 = nodes[i];
            const halfW1 = n1.width / 2;
            const halfH1 = n1.height / 2;

            for (let j = i + 1; j < nodes.length; j++) {
              const n2 = nodes[j];
              const halfW2 = n2.width / 2;
              const halfH2 = n2.height / 2;

              const marginX = 10 * currentScale;
              const marginY = 8 * currentScale;
              const reqDistX = halfW1 + halfW2 + marginX;
              const reqDistY = halfH1 + halfH2 + marginY;

              const dx = n1.x - n2.x;
              const dy = n1.y - n2.y;
              const absDx = Math.abs(dx);
              const absDy = Math.abs(dy);

              const overlapX = reqDistX - absDx;
              const overlapY = reqDistY - absDy;

              if (overlapX > 0 && overlapY > 0) {
                // Direct overlap between two capsules! Strictly push apart
                const ratioX = overlapX / reqDistX;
                const ratioY = overlapY / reqDistY;

                let pushX = 0;
                let pushY = 0;

                if (ratioX < ratioY) {
                  const signX = dx >= 0 ? 1 : -1;
                  pushX = signX * overlapX;
                } else {
                  const signY = dy >= 0 ? 1 : -1;
                  pushY = signY * overlapY;
                }

                const isDragged1 = draggedNodeRef.current?.id === n1.id;
                const isDragged2 = draggedNodeRef.current?.id === n2.id;

                if (isDragged1 && !isDragged2) {
                  n2.x -= pushX;
                  n2.y -= pushY;
                  n2.vx -= pushX * 0.35;
                  n2.vy -= pushY * 0.35;
                } else if (isDragged2 && !isDragged1) {
                  n1.x += pushX;
                  n1.y += pushY;
                  n1.vx += pushX * 0.35;
                  n1.vy += pushY * 0.35;
                } else {
                  n1.x += pushX * 0.5;
                  n1.y += pushY * 0.5;
                  n2.x -= pushX * 0.5;
                  n2.y -= pushY * 0.5;

                  n1.vx += pushX * 0.15;
                  n1.vy += pushY * 0.15;
                  n2.vx -= pushX * 0.15;
                  n2.vy -= pushY * 0.15;
                }
              }
            }
          }

          // B. Physical Container Wall Push & Normalized Gravity
          for (let i = 0; i < nodes.length; i++) {
            const n = nodes[i];
            if (draggedNodeRef.current?.id === n.id) continue;

            const halfW = n.width / 2;
            const halfH = n.height / 2;
            // Left boundary wall
            if (n.x - halfW < minBoundX) {
              const push = (minBoundX + halfW) - n.x;
              n.x = minBoundX + halfW;
              n.vx = Math.abs(n.vx) * 0.1 + push * 0.25;
            }
            // Right boundary wall
            if (n.x + halfW > maxBoundX) {
              const push = n.x - (maxBoundX - halfW);
              n.x = maxBoundX - halfW;
              n.vx = -Math.abs(n.vx) * 0.1 - push * 0.25;
            }
            // Top boundary wall
            if (n.y - halfH < minBoundY) {
              const push = (minBoundY + halfH) - n.y;
              n.y = minBoundY + halfH;
              n.vy = Math.abs(n.vy) * 0.1 + push * 0.25;
            }
            // Bottom boundary wall
            if (n.y + halfH > maxBoundY) {
              const push = n.y - (maxBoundY - halfH);
              n.y = maxBoundY - halfH;
              n.vy = -Math.abs(n.vy) * 0.1 - push * 0.25;
            }

            // Strong exponential damping to quickly settle into rock-solid rest
            n.vx *= 0.65;
            n.vy *= 0.65;

            // Rest threshold: freeze movement when velocity is minimal
            if (Math.abs(n.vx) < 0.02) n.vx = 0;
            if (Math.abs(n.vy) < 0.02) n.vy = 0;

            n.x += n.vx;
            n.y += n.vy;
          }
        }
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // Translate to container center + pan offset, then scale by zoom factor
      ctx.translate(width / 2 + panOffsetRef.current.x, height / 2 + panOffsetRef.current.y);
      ctx.scale(zoomScaleRef.current, zoomScaleRef.current);

      // Draw Edges with Liquid Smoothing and Flowing Energy Beads
      const nodeMap = new Map(nodes.map(n => [n.id, n]));
      const currentHoveredId = hoveredNodeRef.current?.id;

      for (const edge of edges) {
        const s = nodeMap.get(edge.source);
        const t = nodeMap.get(edge.target);
        if (!s || !t) continue;

        const isSentenceFlow = edge.isSentenceFlow;
        const hT = edge.hoverT ?? 0;
        const sExtT = s.externalT ?? 0;
        const tExtT = t.externalT ?? 0;
        const bothExt = Math.min(sExtT, tExtT);
        const activeEdgeT = Math.max(hT, bothExt * 0.85);

        // DESLOP: Only draw edges when a word is hovered/highlighted to eliminate spiderwebs
        if (activeEdgeT <= 0.05) {
          continue;
        }

        ctx.save();

        if (isSentenceFlow) {
          ctx.beginPath();
          const fromNode = edge.directional ? nodeMap.get(edge.dirSource!) : s;
          const toNode = edge.directional ? nodeMap.get(edge.dirTarget!) : t;

          if (fromNode && toNode) {
            const dirAngle = Math.atan2(toNode.y - fromNode.y, toNode.x - fromNode.x);
            const cosA = Math.max(0.001, Math.abs(Math.cos(dirAngle)));
            const sinA = Math.max(0.001, Math.abs(Math.sin(dirAngle)));
            const sOffset = Math.min((fromNode.width / 2) / cosA, (fromNode.height / 2) / sinA) + 3;
            const tOffset = Math.min((toNode.width / 2) / cosA, (toNode.height / 2) / sinA) + 5;

            const startX = fromNode.x + Math.cos(dirAngle) * sOffset;
            const startY = fromNode.y + Math.sin(dirAngle) * sOffset;
            const endX = toNode.x - Math.cos(dirAngle) * tOffset;
            const endY = toNode.y - Math.sin(dirAngle) * tOffset;

            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);

            // Smoothly interpolated stroke styling (Monochrome Black & White)
            const strokeA = 0.35 + 0.65 * activeEdgeT;
            ctx.strokeStyle = `rgba(24, 24, 27, ${strokeA})`;
            ctx.lineWidth = 1.0 + 1.2 * activeEdgeT;
            ctx.setLineDash([4 + 2 * activeEdgeT, 4]);
            ctx.lineDashOffset = -now / (45 - 26 * activeEdgeT);
            if (activeEdgeT > 0.05) {
              ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
              ctx.shadowBlur = 6 * activeEdgeT;
            }
            ctx.stroke();

            // Arrowhead with fluid scaling
            ctx.save();
            ctx.fillStyle = `rgba(24, 24, 27, ${0.45 + 0.55 * activeEdgeT})`;
            ctx.translate(endX, endY);
            ctx.rotate(dirAngle);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-6 - 2 * activeEdgeT, -3.5 - 1 * activeEdgeT);
            ctx.lineTo(-6 - 2 * activeEdgeT, 3.5 + 1 * activeEdgeT);
            ctx.closePath();
            ctx.fill();
            ctx.restore();

            // Flowing liquid pulse bead traveling across the connected edge
            if (activeEdgeT > 0.04) {
              const beadPhase = (now * 0.0014) % 1;
              const isOutbound = edge.source === currentHoveredId;
              const tPos = isOutbound ? beadPhase : (1 - beadPhase);
              const beadX = startX + (endX - startX) * tPos;
              const beadY = startY + (endY - startY) * tPos;
              const beadRadius = (2.2 + Math.sin(now * 0.008) * 0.5) * activeEdgeT;

              ctx.save();
              ctx.beginPath();
              ctx.arc(beadX, beadY, beadRadius, 0, Math.PI * 2);
              ctx.fillStyle = `rgba(24, 24, 27, ${0.95 * activeEdgeT})`;
              ctx.shadowColor = '#09090b';
              ctx.shadowBlur = 6 * activeEdgeT;
              ctx.fill();
              ctx.restore();
            }
          }
        } else {
          // Compatibility edge
          const dirAngle = Math.atan2(t.y - s.y, t.x - s.x);
          const cosA = Math.max(0.001, Math.abs(Math.cos(dirAngle)));
          const sinA = Math.max(0.001, Math.abs(Math.sin(dirAngle)));
          const sOffset = Math.min((s.width / 2) / cosA, (s.height / 2) / sinA) + 2;
          const tOffset = Math.min((t.width / 2) / cosA, (t.height / 2) / sinA) + 2;

          const startX = s.x + Math.cos(dirAngle) * sOffset;
          const startY = s.y + Math.sin(dirAngle) * sOffset;
          const endX = t.x - Math.cos(dirAngle) * tOffset;
          const endY = t.y - Math.sin(dirAngle) * tOffset;

          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);

          const strokeA = 0.06 + 0.38 * activeEdgeT;
          ctx.strokeStyle = `rgba(24, 24, 27, ${strokeA})`;
          ctx.lineWidth = 0.6 + 0.8 * activeEdgeT;
          if (activeEdgeT > 0.05) {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
            ctx.shadowBlur = 4 * activeEdgeT;
          }
          ctx.stroke();

          // Flowing liquid pulse bead (Monochrome black)
          if (activeEdgeT > 0.04) {
            const beadPhase = (now * 0.0012) % 1;
            const isOutbound = edge.source === currentHoveredId;
            const tPos = isOutbound ? beadPhase : (1 - beadPhase);
            const beadX = startX + (endX - startX) * tPos;
            const beadY = startY + (endY - startY) * tPos;
            const beadRadius = 1.6 * activeEdgeT;

            ctx.save();
            ctx.beginPath();
            ctx.arc(beadX, beadY, beadRadius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(24, 24, 27, ${0.9 * activeEdgeT})`;
            ctx.shadowColor = '#09090b';
            ctx.shadowBlur = 4 * activeEdgeT;
            ctx.fill();
            ctx.restore();
          }
        }

        ctx.restore();
      }

      const currentTargetPhrase = activeTargetPhraseRef.current;
      const currentLastTargetWord = lastTargetWordRef.current;

      // Draw Organic Word Blobs with Generous Padding, Crisp Typography, and Halos
      for (const node of nodes) {
        const isTarget = currentTargetPhrase.toLowerCase().includes(node.word.toLowerCase());
        const isRecommended = currentLastTargetWord && getSentenceFlow(currentLastTargetWord, node.word).flow;
        const hT = node.hoverT ?? 0;
        const nT = node.neighborT ?? 0;
        const extT = node.externalT ?? 0;
        const activeHighlightT = Math.max(hT, extT);
        const nodeSeed = getWordHash(node.word);
        const nodeTime = now * 0.0012 + (node.phaseOffset || 0);

        ctx.save();

        // When external treemap is hovered, gracefully dim non-matching bubbles
        if (externalDimT > 0.01) {
          const alpha = 1.0 - 0.78 * externalDimT * (1 - extT);
          ctx.globalAlpha = Math.max(0.18, alpha);
        }

        // 4. Set font & measure actual text width to guarantee 100% blob envelope enclosure
        const fontSize = node.word.length >= 12 ? 10.5 : node.word.length >= 8 ? 11.5 : 12;
        ctx.font = `${(activeHighlightT > 0.3 || isTarget || isRecommended) ? '600' : '500'} ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif`;
        const textMetrics = ctx.measureText(node.word);
        const measuredTextWidth = textMetrics.width;

        // Snug, tailored padding: 12px on left and right sides so text fits cleanly and tightly
        const dynamicMinWidth = measuredTextWidth + 24;
        const dynamicMinHeight = 26;
        const effectiveW = Math.max(node.width || 0, dynamicMinWidth);
        const effectiveH = Math.max(node.height || 0, dynamicMinHeight);

        // Fluid scale expansion on hover
        const scaleExpansion = 0.06 * Math.sin(hT * Math.PI / 2) + 0.08 * Math.sin(extT * Math.PI / 2);
        const curW = effectiveW * (1.0 + scaleExpansion);
        const curH = effectiveH * (1.0 + scaleExpansion);

        // 1. Subtle Outer Aura on Hovered or Highlighted Blob
        if (activeHighlightT > 0.02) {
          ctx.save();
          drawBlob(ctx, node.x, node.y, curW, curH, nodeSeed, nodeTime, 8);
          ctx.fillStyle = `rgba(24, 24, 27, ${0.12 * activeHighlightT})`;
          ctx.fill();

          // Delicate animated dashed border on hover
          drawBlob(ctx, node.x, node.y, curW, curH, nodeSeed, nodeTime, 4);
          ctx.strokeStyle = `rgba(24, 24, 27, ${0.75 * activeHighlightT})`;
          ctx.lineWidth = 1.2;
          ctx.setLineDash([4, 3]);
          ctx.lineDashOffset = -now * 0.025;
          ctx.stroke();
          ctx.restore();
        }

        // 2. Neighbor Blob Subtle Aura for connected flow words
        if (nT > 0.04 && activeHighlightT < 0.2) {
          ctx.save();
          drawBlob(ctx, node.x, node.y, curW, curH, nodeSeed, nodeTime, 4);
          ctx.strokeStyle = `rgba(82, 82, 91, ${0.4 * nT})`;
          ctx.lineWidth = 1.0;
          ctx.stroke();
          ctx.restore();
        }

        // 3. Fluid Blob Body (High-contrast pure Black & White)
        drawBlob(ctx, node.x, node.y, curW, curH, nodeSeed, nodeTime, 0);

        if (isTarget) {
          // Words already placed in the target phrase: solid black inverted
          ctx.fillStyle = '#18181b';
          ctx.shadowColor = 'rgba(0, 0, 0, 0.16)';
          ctx.shadowBlur = 6;
          ctx.fill();
          ctx.strokeStyle = '#09090b';
          ctx.lineWidth = 1.6;
          ctx.stroke();
        } else if (activeHighlightT > 0.04) {
          // Hovered / Highlighted node: inverts dynamically to solid dark black
          const cVal = Math.round(255 * (1 - activeHighlightT) + 15 * activeHighlightT);
          ctx.fillStyle = `rgb(${cVal}, ${cVal}, ${cVal})`;
          ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
          ctx.shadowBlur = 6;
          ctx.fill();
          ctx.strokeStyle = '#09090b';
          ctx.lineWidth = 1.6;
          ctx.stroke();
        } else {
          // Regular node: pure white background with clean crisp monochrome border
          ctx.fillStyle = isRecommended ? '#fcfcfc' : '#ffffff';
          ctx.shadowColor = 'rgba(0, 0, 0, 0.04)';
          ctx.shadowBlur = 3;
          ctx.fill();

          ctx.save();
          if (node.isSolvable === false) {
            ctx.setLineDash([3, 2]);
            ctx.strokeStyle = '#71717a';
            ctx.lineWidth = 1.0;
          } else {
            ctx.strokeStyle = isRecommended ? '#18181b' : node.borderColor;
            ctx.lineWidth = isRecommended ? 1.5 : 1.1;
          }
          ctx.stroke();
          ctx.restore();

          // Exact Closer outer double ring blob (guarantees 100% 0-leftover finish)
          if (node.isExactCloser) {
            ctx.save();
            drawBlob(ctx, node.x, node.y, curW, curH, nodeSeed, nodeTime, 5);
            ctx.strokeStyle = '#18181b';
            ctx.lineWidth = 1.2;
            ctx.stroke();
            ctx.restore();
          }
        }

        // Draw crisp typography centered inside blob
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (isTarget || activeHighlightT > 0.35) {
          ctx.fillStyle = '#ffffff'; // White text on dark node
        } else {
          ctx.fillStyle = '#09090b'; // Crisp black text on white node
        }

        ctx.fillText(node.word, node.x, node.y + 0.5);
        ctx.restore();
      }

      ctx.restore();

      // Minimal In-Canvas Watermark Label for Active Word Filter Mode
      ctx.save();
      ctx.scale(dpr, dpr);

      const mode = wordFilterModeRef.current || 'safe';
      const modeLabel =
        mode === 'safe'
          ? 'SAFE WORDS'
          : mode === 'all'
          ? 'ALL WORDS'
          : mode === 'closers'
          ? 'EXACT CLOSERS'
          : mode === 'pairs'
          ? 'FINISHER PAIRS'
          : mode === 'common'
          ? 'COMMON WORDS'
          : mode === 'long'
          ? 'LONG WORDS'
          : 'WORDS';

      const countVal =
        wordFilterCountRef.current !== undefined
          ? wordFilterCountRef.current
          : activeWords.length;
      const watermarkText = `${modeLabel} · ${countVal} WORDS`;

      // Render crisp, understated monospace text directly on the canvas surface in top-left
      ctx.font = '700 10.5px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
      ctx.fillStyle = 'rgba(24, 24, 27, 0.45)';
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';
      ctx.fillText(watermarkText, 14, 14);

      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [activeWords]);

  const screenToWorld = useCallback((screenX: number, screenY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: screenX - rect.left - rect.width / 2,
      y: screenY - rect.top - rect.height / 2,
    };
  }, []);

  const getNodeAt = useCallback((worldX: number, worldY: number): TagNode | null => {
    const nodes = nodesRef.current;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];
      const dx = worldX - node.x;
      const dy = worldY - node.y;
      const rx = node.width / 2 + 6;
      const ry = node.height / 2 + 6;

      if ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1.0) {
        return node;
      }
    }
    return null;
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      // If clicking near the top-left in-canvas label watermark, cycle filter mode!
      if (clickX < 210 && clickY < 32 && onCycleWordFilterRef.current) {
        onCycleWordFilterRef.current();
        return;
      }
    }

    const world = screenToWorld(e.clientX, e.clientY);
    const node = getNodeAt(world.x, world.y);
    dragMovedRef.current = false;

    if (node) {
      draggedNodeRef.current = node;
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const world = screenToWorld(e.clientX, e.clientY);

    if (draggedNodeRef.current && canvasRef.current) {
      dragMovedRef.current = true;
      const canvas = canvasRef.current;
      const padding = 20;
      const halfW = canvas.clientWidth / 2;
      const halfH = canvas.clientHeight / 2;
      const node = draggedNodeRef.current;

      // Keep dragged node strictly within visible panel boundaries
      node.x = Math.max(-halfW + padding + node.radius, Math.min(halfW - padding - node.radius, world.x));
      node.y = Math.max(-halfH + padding + node.radius, Math.min(halfH - padding - node.radius, world.y));
      node.vx = 0;
      node.vy = 0;
    } else {
      const node = getNodeAt(world.x, world.y);
      if (node?.id !== hoveredNodeRef.current?.id) {
        setHoveredNode(node);
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (draggedNodeRef.current) {
      const node = draggedNodeRef.current;
      draggedNodeRef.current = null;

      if (dragMovedRef.current) {
        masterPositionsRef.current.set(node.id, { x: node.x, y: node.y });
      } else {
        onAddWordToTarget(node.word);
        onShowToast(`Added "${node.word}" to target phrase`, 'success');
      }
    }
  };

  // Compute remaining letters between source text and active target phrase
  const remainingLetters = useMemo(() => {
    const sourceLetters = sourceText.toLowerCase().replace(/[^a-z]/g, '').split('');
    const targetLetters = activeTargetPhrase.toLowerCase().replace(/[^a-z]/g, '').split('');

    const sourceCounts = new Map<string, number>();
    for (const char of sourceLetters) {
      sourceCounts.set(char, (sourceCounts.get(char) || 0) + 1);
    }

    const targetCounts = new Map<string, number>();
    for (const char of targetLetters) {
      targetCounts.set(char, (targetCounts.get(char) || 0) + 1);
    }

    const remaining: string[] = [];
    for (const [char, count] of sourceCounts.entries()) {
      const used = targetCounts.get(char) || 0;
      if (used < count) {
        for (let i = 0; i < count - used; i++) {
          remaining.push(char);
        }
      }
    }
    return remaining.sort();
  }, [sourceText, activeTargetPhrase]);

  const isSetupEmpty = !sourceText.trim() || !activeTargetPhrase.trim();

  return (
    <div className="w-full h-full relative overflow-hidden bg-white flex flex-col select-none">
      {/* Floating external hover highlight indicator - Refined non-intrusive glass capsule */}
      {(hoveredPosFilter || (hoveredLengthFilter !== null && hoveredLengthFilter !== undefined)) && (
        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-20 pointer-events-none px-3 py-0.5 bg-zinc-950/80 backdrop-blur-md text-zinc-100 text-[10px] font-mono font-medium rounded-full shadow-lg border border-white/10 select-none animate-in fade-in duration-150">
          <span>
            {hoveredPosFilter && hoveredLengthFilter !== null && hoveredLengthFilter !== undefined
              ? `Highlighting: ${hoveredLengthFilter}-letter ${hoveredPosFilter.toUpperCase()}S`
              : hoveredPosFilter
              ? `Highlighting: ${
                  hoveredPosFilter === 'adj'
                    ? 'ADJECTIVES'
                    : hoveredPosFilter === 'adv'
                    ? 'ADVERBS'
                    : hoveredPosFilter === 'other'
                    ? 'OTHER WORDS'
                    : `${hoveredPosFilter.toUpperCase()}S`
                }`
              : hoveredLengthFilter !== null && hoveredLengthFilter !== undefined
              ? `Highlighting: ${hoveredLengthFilter}-LETTER WORDS`
              : ''}
          </span>
        </div>
      )}

      {/* If no leftover candidate words exist */}
      {candidateWords.length === 0 ? (
        !sourceText.trim() ? (
          <div className="w-full h-full bg-white" />
        ) : !activeTargetPhrase.trim() ? (
          <div className="w-full h-full bg-white" />
        ) : remainingLetters.length === 0 ? (
          <div className="w-full h-full bg-white" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center z-10 space-y-3 bg-white">
            <div className="w-10 h-10 rounded-full bg-zinc-100 border border-zinc-300 flex items-center justify-center text-zinc-900 shadow-xs font-mono font-black text-lg">
              !
            </div>
            <div className="font-black text-zinc-900 uppercase tracking-widest unified-app-text">
              Leftover Letters Remain
            </div>
            <p className="text-zinc-600 max-w-sm font-semibold unified-app-text">
              The letters <span className="text-zinc-950 font-black uppercase tracking-widest underline underline-offset-2">{remainingLetters.join(', ').toUpperCase()}</span> cannot form any other dictionary words.
            </p>
          </div>
        )
      ) : (
        /* Canvas */
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={() => {
            draggedNodeRef.current = null;
            setHoveredNode(null);
          }}
          className="w-full h-full cursor-grab active:cursor-grabbing touch-none bg-white"
        />
      )}
    </div>
  );
};
