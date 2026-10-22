import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Eye, EyeOff } from 'lucide-react';
import type { CandidateWordItem } from './CandidateWordsList';
import { pos, isMatchingPos } from '../engine/lexicon';
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
  selectedWord?: CandidateWordItem | null;
  onSelectWord?: (word: CandidateWordItem) => void;
  hoveredWord?: string | null;
  compatibleWordSet?: Set<string> | null;
  autoHideDimmedNames?: boolean;
  onAutoHideDimmedNamesChange?: (val: boolean) => void;
  zoomScale?: number;
  onZoomScaleChange?: (zoom: number | ((prev: number) => number)) => void;
  onResetZoomFit?: () => void;
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

export type GraphCapacityMode = '120' | '350' | 'all';

export function getPOS(word: string): 'determiner' | 'pronoun' | 'verb' | 'adjective' | 'preposition' | 'conjunction' | 'noun' {
  const w = word.toLowerCase();

  const pronouns = ['i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'its', 'our', 'their', 'who', 'whom', 'whose'];
  if (pronouns.includes(w)) return 'pronoun';

  const determiners = ['the', 'a', 'an', 'this', 'that', 'these', 'those', 'some', 'any', 'all', 'no', 'every', 'each', 'both', 'either', 'neither'];
  if (determiners.includes(w)) return 'determiner';

  const prepositions = ['to', 'in', 'on', 'at', 'by', 'for', 'with', 'about', 'of', 'from', 'into', 'through', 'after', 'before', 'under', 'over', 'up', 'down', 'out', 'off', 'without', 'like', 'as'];
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
    'live', 'lives', 'lived', 'eat', 'eats', 'ate', 'eaten', 'drink', 'drinks', 'drank', 'drunk', 'write', 'writes', 'wrote', 'written',
  ];
  if (verbs.includes(w) || w.endsWith('ing') || (w.endsWith('ed') && w.length > 4)) return 'verb';

  const adjectives = [
    'good', 'bad', 'great', 'new', 'old', 'big', 'small', 'hot', 'cold', 'happy', 'sad', 'best', 'sweet', 'nice', 'real', 'free',
    'high', 'low', 'early', 'late', 'hard', 'easy', 'young', 'right', 'wrong', 'true', 'false', 'beautiful', 'smart',
  ];
  if (
    adjectives.includes(w) ||
    w.endsWith('ful') ||
    w.endsWith('less') ||
    w.endsWith('ous') ||
    w.endsWith('ish') ||
    w.endsWith('ive') ||
    w.endsWith('al') ||
    w.endsWith('ic') ||
    w.endsWith('able') ||
    w.endsWith('ible')
  ) {
    return 'adjective';
  }

  return 'noun';
}

export function getSentenceFlow(w1: string, w2: string): { flow: boolean; reason: string } {
  const p1 = getPOS(w1);
  const p2 = getPOS(w2);

  if (p1 === 'pronoun' && p2 === 'verb') return { flow: true, reason: 'Subject → Verb' };
  if (p1 === 'noun' && p2 === 'verb') return { flow: true, reason: 'Subject → Verb' };
  if (p1 === 'verb' && ['pronoun', 'noun', 'preposition', 'adjective'].includes(p2)) {
    return { flow: true, reason: `Verb → ${p2.charAt(0).toUpperCase() + p2.slice(1)}` };
  }
  if (p1 === 'determiner' && ['adjective', 'noun'].includes(p2)) {
    return { flow: true, reason: `Determiner → ${p2.charAt(0).toUpperCase() + p2.slice(1)}` };
  }
  if (p1 === 'adjective' && p2 === 'noun') return { flow: true, reason: 'Adjective → Noun' };
  if (p1 === 'preposition' && ['determiner', 'pronoun', 'noun', 'adjective'].includes(p2)) {
    return { flow: true, reason: `Preposition → ${p2.charAt(0).toUpperCase() + p2.slice(1)}` };
  }
  if (p1 === 'conjunction' && ['pronoun', 'noun', 'determiner'].includes(p2)) {
    return { flow: true, reason: `Conjunction → ${p2.charAt(0).toUpperCase() + p2.slice(1)}` };
  }

  return { flow: false, reason: '' };
}

/**
 * Orders all candidate words in balanced round-robin waves across word lengths,
 * prioritizing sentence-flow and natural English frequency within each length bin.
 * This ensures any page slice [offset, offset + limit] has a rich mix of lengths,
 * while concatenating all pages yields 100% of candidate words.
 */
function orderCandidatesBalancedByLength(
  words: CandidateWordItem[],
  lastTargetWord?: string | null
): CandidateWordItem[] {
  if (words.length <= 1) return words;

  const byLength = new Map<number, CandidateWordItem[]>();
  for (const w of words) {
    let group = byLength.get(w.length);
    if (!group) {
      group = [];
      byLength.set(w.length, group);
    }
    group.push(w);
  }

  for (const group of byLength.values()) {
    group.sort((a, b) => {
      if (a.isExactCloser !== b.isExactCloser) return a.isExactCloser ? -1 : 1;
      const aFlow = lastTargetWord ? getSentenceFlow(lastTargetWord, a.word).flow : false;
      const bFlow = lastTargetWord ? getSentenceFlow(lastTargetWord, b.word).flow : false;
      if (aFlow !== bFlow) return bFlow ? 1 : -1;
      return (b.freq || 1) - (a.freq || 1);
    });
  }

  // Sort lengths longest-first so substantial words anchor the center of each wave
  const lengths = Array.from(byLength.keys()).sort((a, b) => b - a);
  const pointers = new Map<number, number>();
  for (const len of lengths) pointers.set(len, 0);

  const result: CandidateWordItem[] = [];
  const total = words.length;

  while (result.length < total) {
    let addedInWave = false;
    for (const len of lengths) {
      const group = byLength.get(len)!;
      const ptr = pointers.get(len)!;
      if (ptr < group.length) {
        // Take up to 2 from longer/larger bins per wave for natural proportion
        const batch = Math.min(group.length - ptr, len >= 5 ? 2 : 1);
        for (let k = 0; k < batch; k++) {
          result.push(group[ptr + k]);
        }
        pointers.set(len, ptr + batch);
        addedInWave = true;
      }
    }
    if (!addedInWave) break;
  }

  return result;
}

/**
 * Draws an organic, smooth fluid blob that comfortably envelops the word.
 */
export function drawBlob(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  w: number,
  h: number,
  seed = 0,
  time = 0,
  expand = 0,
  fastMode = false
) {
  const rx = (w + expand * 2) / 2;
  const ry = (h + expand * 2) / 2;

  if (fastMode) {
    ctx.beginPath();
    const r = Math.min(rx, ry);
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(cx - rx, cy - ry, rx * 2, ry * 2, r);
    } else {
      ctx.rect(cx - rx, cy - ry, rx * 2, ry * 2);
    }
    ctx.closePath();
    return;
  }

  const p = 3.4;
  const seed1 = ((seed % 1000) / 1000) * Math.PI * 2;
  const seed2 = (((seed >> 4) % 1000) / 1000) * Math.PI * 2;
  const seed3 = (((seed >> 8) % 1000) / 1000) * Math.PI * 2;

  const numPoints = 20;
  const points: { x: number; y: number }[] = [];

  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const absCos = Math.abs(cosA);
    const absSin = Math.abs(sinA);

    const denom = Math.pow(absCos / rx, p) + Math.pow(absSin / ry, p);
    const baseR = Math.pow(denom, -1 / p);

    const wave =
      0.025 * Math.sin(2 * angle + seed1 + time * 0.8) +
      0.016 * Math.cos(3 * angle + seed2 - time * 0.6) +
      0.01 * Math.sin(4 * angle + seed3 + time * 0.4) +
      0.018;

    const finalR = baseR * (1 + wave);
    points.push({
      x: cx + cosA * finalR,
      y: cy + sinA * finalR,
    });
  }

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

export const drawCapsule = drawBlob;

export const WordsGraphView: React.FC<WordsGraphViewProps> = ({
  sourceText,
  candidateWords,
  selectedLengthFilter,
  selectedPosFilter,
  onAddWordToTarget,
  activeTargetPhrase = '',
  onShowToast,
  onHoverWordChange,
  hoveredPosFilter,
  hoveredLengthFilter,
  wordFilterMode = 'safe',
  selectedWord,
  onSelectWord,
  hoveredWord: externalHoveredWord,
  compatibleWordSet,
  autoHideDimmedNames: externalAutoHideDimmedNames,
  onAutoHideDimmedNamesChange,
  zoomScale: externalZoomScale,
  onZoomScaleChange,
  onResetZoomFit,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [internalAutoHideDimmedNames, setInternalAutoHideDimmedNames] = useState<boolean>(true);
  const autoHideDimmedNames =
    externalAutoHideDimmedNames !== undefined
      ? externalAutoHideDimmedNames
      : internalAutoHideDimmedNames;
  const autoHideDimmedNamesRef = useRef<boolean>(autoHideDimmedNames);
  autoHideDimmedNamesRef.current = autoHideDimmedNames;

  const selectedWordRef = useRef(selectedWord);
  selectedWordRef.current = selectedWord;

  const externalHoveredWordRef = useRef(externalHoveredWord);
  externalHoveredWordRef.current = externalHoveredWord;

  const compatibleWordSetRef = useRef(compatibleWordSet);
  compatibleWordSetRef.current = compatibleWordSet;

  const lastTargetWord = useMemo(() => {
    const words = activeTargetPhrase.trim().split(/\s+/).filter(Boolean);
    return words.length > 0 ? words[words.length - 1] : null;
  }, [activeTargetPhrase]);

  // Interactive User Zoom and Pan State
  const [internalZoomScale, setInternalZoomScale] = useState<number>(1.0);
  const zoomScale = externalZoomScale !== undefined ? externalZoomScale : internalZoomScale;
  const setZoomScale = onZoomScaleChange || setInternalZoomScale;
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const zoomScaleRef = useRef<number>(1.0);
  zoomScaleRef.current = zoomScale;
  const panOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  panOffsetRef.current = panOffset;

  // Track canvas viewport dimensions so rectangular packing matches the screen aspect ratio
  const [viewportSize, setViewportSize] = useState<{ width: number; height: number }>({
    width: 960,
    height: 540,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const updateSize = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w > 40 && h > 40) {
        setViewportSize((prev) =>
          Math.abs(prev.width - w) > 16 || Math.abs(prev.height - h) > 16
            ? { width: w, height: h }
            : prev
        );
      }
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  // Base auto-fit scale computed from the world bounding box of all active nodes
  const baseFitScaleRef = useRef<number>(1.0);
  const externalDimTRef = useRef<number>(0);

  // Panning interaction state
  const isPanningRef = useRef<boolean>(false);
  const panStartRef = useRef<{ clientX: number; clientY: number; startX: number; startY: number }>({
    clientX: 0,
    clientY: 0,
    startX: 0,
    startY: 0,
  });

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

  const nodesRef = useRef<TagNode[]>([]);
  const edgesRef = useRef<TagEdge[]>([]);

  // All eligible words after length & POS filtering — always show 100% of them in Graph View
  const eligibleWords = useMemo(() => {
    let list = candidateWords;
    if (selectedLengthFilter !== null && selectedLengthFilter !== undefined) {
      if (Array.isArray(selectedLengthFilter)) {
        if (selectedLengthFilter.length > 0) {
          const filterSet = new Set(selectedLengthFilter);
          list = list.filter((w) => filterSet.has(w.length));
        }
      } else {
        list = list.filter((w) => w.length === selectedLengthFilter);
      }
    }
    if (selectedPosFilter && selectedPosFilter !== 'all') {
      list = list.filter((w) => isMatchingPos(pos(w.word), selectedPosFilter));
    }
    return orderCandidatesBalancedByLength(list, lastTargetWord);
  }, [candidateWords, selectedLengthFilter, selectedPosFilter, lastTargetWord]);

  // Active words displayed in the graph: always all eligible words
  const activeWords = eligibleWords;

  // Compute horizontal organic blob dimensions in world pixels
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
    const padX = word.length <= 3 ? 9 : word.length <= 6 ? 11 : 13;
    const width = Math.max(42, Math.round(textWidth + padX * 2));
    const height = 26;
    const radius = Math.round(height / 2);
    return { width, height, radius };
  }, []);

  const getWordHash = useCallback((word: string): number => {
    let hash = 2166136261;
    for (let i = 0; i < word.length; i++) {
      hash ^= word.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }, []);

  const getNodeBorderColor = useCallback((_word: string, length: number): string => {
    if (length >= 6) return '#18181b';
    return '#52525b';
  }, []);

  /**
   * Dense Rectangular Full-Screen Packing Engine.
   * Packs 100% of candidate words into a tight rectangular brick mosaic whose
   * width-to-height ratio matches the exact canvas aspect ratio so that all words
   * fill the screen edge-to-edge with zero overlaps.
   */
  const layoutNodesInWorldSpace = useCallback(
    (items: CandidateWordItem[], canvasW: number, canvasH: number): TagNode[] => {
      const n = items.length;
      if (n === 0) return [];

      const existingMap = new Map<string, TagNode>();
      for (let i = 0; i < nodesRef.current.length; i++) {
        const prev = nodesRef.current[i];
        existingMap.set(prev.id, prev);
      }

      const gapX = 5;
      const gapY = 5;
      const nodeHeight = 26;
      const rowPitch = nodeHeight + gapY;

      const dimsList = new Array<{ width: number; height: number; radius: number }>(n);
      let totalWidthSum = 0;
      for (let i = 0; i < n; i++) {
        const d = computeNodeDimensions(items[i].word);
        dimsList[i] = d;
        totalWidthSum += d.width + gapX;
      }

      const aspect = Math.max(0.35, Math.min(4.0, (canvasW || 960) / (canvasH || 540)));
      // Solve (totalWidthSum / numRows) / (numRows * rowPitch) = aspect
      const numRows = Math.max(1, Math.min(n, Math.round(Math.sqrt(totalWidthSum / (aspect * rowPitch)))));

      // Partition items into `numRows` balanced rows so every row has nearly identical width
      const rows: number[][] = Array.from({ length: numRows }, () => []);
      let accWidth = 0;
      let currentRow = 0;

      for (let i = 0; i < n; i++) {
        const itemSpan = dimsList[i].width + gapX;
        const targetBoundary = ((currentRow + 1) / numRows) * totalWidthSum;
        rows[currentRow].push(i);
        accWidth += itemSpan;
        if (
          currentRow < numRows - 1 &&
          accWidth >= targetBoundary &&
          n - (i + 1) >= numRows - (currentRow + 1)
        ) {
          currentRow++;
        }
      }

      // Place highest-priority batches near the vertical center of the rectangle,
      // alternating outward so top and bottom edges are equally dense.
      const rowVerticalOrder: number[] = new Array(numRows);
      const midRow = Math.floor((numRows - 1) / 2);
      for (let r = 0; r < numRows; r++) {
        const offset = r % 2 === 0 ? -(r >> 1) : (r + 1) >> 1;
        const targetYIndex = midRow + offset;
        rowVerticalOrder[r] = Math.max(0, Math.min(numRows - 1, targetYIndex));
      }

      const totalBlockHeight = numRows * nodeHeight + Math.max(0, numRows - 1) * gapY;
      const startY = -totalBlockHeight * 0.5 + nodeHeight * 0.5;

      const nodes: TagNode[] = new Array(n);

      for (let r = 0; r < numRows; r++) {
        const rowIndices = rows[r];
        const ySlot = rowVerticalOrder[r];
        const rowY = startY + ySlot * rowPitch;

        let rowTotalW = 0;
        for (let k = 0; k < rowIndices.length; k++) {
          rowTotalW += dimsList[rowIndices[k]].width;
        }
        if (rowIndices.length > 1) {
          rowTotalW += (rowIndices.length - 1) * gapX;
        }

        let cursorX = -rowTotalW * 0.5;
        for (let k = 0; k < rowIndices.length; k++) {
          const idx = rowIndices[k];
          const item = items[idx];
          const dims = dimsList[idx];
          const existing = existingMap.get(item.word);
          const centerX = cursorX + dims.width * 0.5;
          cursorX += dims.width + gapX;

          nodes[idx] = {
            id: item.word,
            word: item.word,
            length: item.length,
            freq: item.freq,
            baseRadius: dims.radius,
            radius: dims.radius,
            x: centerX,
            y: rowY,
            vx: 0,
            vy: 0,
            width: dims.width,
            height: dims.height,
            color: '#ffffff',
            borderColor: getNodeBorderColor(item.word, item.length),
            hoverT: existing?.hoverT ?? 0,
            neighborT: existing?.neighborT ?? 0,
            externalT: existing?.externalT ?? 0,
            phaseOffset:
              (((item.word.charCodeAt(0) * 17 + item.length * 31) % 100) / 100) * Math.PI * 2,
            isSolvable: item.isSolvable,
            isExactCloser: item.isExactCloser,
            completionSample: item.completionSample,
          };
        }
      }

      return nodes;
    },
    [computeNodeDimensions, getNodeBorderColor]
  );

  // Re-layout nodes when activeWords or viewport aspect ratio changes
  useEffect(() => {
    const canvas = canvasRef.current;
    const cw = canvas?.clientWidth || viewportSize.width || 960;
    const ch = canvas?.clientHeight || viewportSize.height || 540;

    const nodes = layoutNodesInWorldSpace(activeWords, cw, ch);

    // Build sentence-flow edges among top 60 nodes for hover pulse arrows
    const sourceLetters = sourceText.toLowerCase().replace(/[^a-z]/g, '');
    const sourceCounts = new Array(26).fill(0);
    for (let i = 0; i < sourceLetters.length; i++) {
      sourceCounts[sourceLetters.charCodeAt(i) - 97]++;
    }

    const edges: TagEdge[] = [];
    const activeLimit = Math.min(nodes.length, 60);
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

            if (forward.flow) {
              edges.push({
                source: n1.id,
                target: n2.id,
                isSentenceFlow: true,
                reason: forward.reason,
                directional: true,
                dirSource: n1.id,
                dirTarget: n2.id,
                hoverT: 0,
                externalT: 0,
              });
              edgeCount++;
            } else if (backward.flow) {
              edges.push({
                source: n2.id,
                target: n1.id,
                isSentenceFlow: true,
                reason: backward.reason,
                directional: true,
                dirSource: n2.id,
                dirTarget: n1.id,
                hoverT: 0,
                externalT: 0,
              });
              edgeCount++;
            }
          }
        }
      }
    }

    nodesRef.current = nodes;
    edgesRef.current = edges;
    // Reset user pan/zoom when switching word sets so the full rectangular pack is framed
    setPanOffset({ x: 0, y: 0 });
    setZoomScale(1.0);
  }, [activeWords, sourceText, viewportSize.width, viewportSize.height, layoutNodesInWorldSpace]);

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
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

        const currentPosFilter = hoveredPosFilterRef.current;
        const currentLengthFilter = hoveredLengthFilterRef.current;
        const isExternalHoverActive = Boolean(
          currentPosFilter || (currentLengthFilter !== null && currentLengthFilter !== undefined)
        );
        const targetDim = isExternalHoverActive ? 1.0 : 0.0;
        externalDimTRef.current += (targetDim - externalDimTRef.current) * fluidFactor;
        externalDimT = externalDimTRef.current;

        // Calculate world bounding box of nodes to determine auto-fit scale
        let nMinX = Infinity;
        let nMaxX = -Infinity;
        let nMinY = Infinity;
        let nMaxY = -Infinity;

        for (let i = 0; i < nodes.length; i++) {
          const n = nodes[i];
          const isHovered = n.id === hoveredId;
          const isNeighbor = neighborIds.has(n.id);
          const targetHoverT = isHovered ? 1.0 : 0.0;
          const targetNeighborT = isNeighbor ? 1.0 : 0.0;

          let isMatchingExternal = false;
          if (currentPosFilter && currentLengthFilter !== null && currentLengthFilter !== undefined) {
            isMatchingExternal =
              isMatchingPos(pos(n.word), currentPosFilter) && n.length === currentLengthFilter;
          } else if (currentPosFilter) {
            isMatchingExternal = isMatchingPos(pos(n.word), currentPosFilter);
          } else if (currentLengthFilter !== null && currentLengthFilter !== undefined) {
            isMatchingExternal = n.length === currentLengthFilter;
          }
          const targetExternalT = isMatchingExternal ? 1.0 : 0.0;

          n.hoverT = (n.hoverT ?? 0) + (targetHoverT - (n.hoverT ?? 0)) * fluidFactor;
          n.neighborT = (n.neighborT ?? 0) + (targetNeighborT - (n.neighborT ?? 0)) * fluidFactor;
          n.externalT = (n.externalT ?? 0) + (targetExternalT - (n.externalT ?? 0)) * fluidFactor;

          const hw = n.width * 0.5;
          const hh = n.height * 0.5;
          if (n.x - hw < nMinX) nMinX = n.x - hw;
          if (n.x + hw > nMaxX) nMaxX = n.x + hw;
          if (n.y - hh < nMinY) nMinY = n.y - hh;
          if (n.y + hh > nMaxY) nMaxY = n.y + hh;
        }

        for (let i = 0; i < edges.length; i++) {
          const e = edges[i];
          const isConnected = Boolean(hoveredId && (e.source === hoveredId || e.target === hoveredId));
          const targetEdgeT = isConnected ? 1.0 : 0.0;
          e.hoverT = (e.hoverT ?? 0) + (targetEdgeT - (e.hoverT ?? 0)) * fluidFactor;
        }

        // Compute auto-fit scale so the entire dense rectangular pack fills the viewport edge-to-edge
        const worldW = Math.max(80, nMaxX - nMinX);
        const worldH = Math.max(60, nMaxY - nMinY);
        const fitScaleX = Math.max(40, width - 16) / worldW;
        const fitScaleY = Math.max(40, height - 16) / worldH;
        const targetFitScale = Math.max(0.02, Math.min(1.35, Math.min(fitScaleX, fitScaleY)));
        baseFitScaleRef.current += (targetFitScale - baseFitScaleRef.current) * 0.35;

        // If user is dragging a single node, resolve local collisions with nearby nodes
        if (draggedNodeRef.current) {
          const dNode = draggedNodeRef.current;
          for (let i = 0; i < nodes.length; i++) {
            const other = nodes[i];
            if (other.id === dNode.id) continue;
            const reqX = (dNode.width + other.width) * 0.5 + 6;
            const reqY = (dNode.height + other.height) * 0.5 + 5;
            const dx = other.x - dNode.x;
            const dy = other.y - dNode.y;
            const overlapX = reqX - Math.abs(dx);
            const overlapY = reqY - Math.abs(dy);
            if (overlapX > 0 && overlapY > 0) {
              if (overlapX / reqX < overlapY / reqY) {
                other.x += (dx >= 0 ? 1 : -1) * overlapX * 0.6;
              } else {
                other.y += (dy >= 0 ? 1 : -1) * overlapY * 0.6;
              }
            }
          }
        }
      }

      const totalScale = baseFitScaleRef.current * zoomScaleRef.current;
      const panX = panOffsetRef.current.x;
      const panY = panOffsetRef.current.y;
      const useFastCapsules = nodes.length > 160;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // Transform to world space
      ctx.translate(width / 2 + panX, height / 2 + panY);
      ctx.scale(totalScale, totalScale);

      // Draw active hover edges
      const nodeMap = new Map(nodes.map((n) => [n.id, n]));
      const currentHoveredId = hoveredNodeRef.current?.id;

      for (const edge of edges) {
        const hT = edge.hoverT ?? 0;
        if (hT <= 0.05) continue;

        const s = nodeMap.get(edge.source);
        const t = nodeMap.get(edge.target);
        if (!s || !t) continue;

        ctx.save();
        const fromNode = edge.directional ? nodeMap.get(edge.dirSource!) : s;
        const toNode = edge.directional ? nodeMap.get(edge.dirTarget!) : t;

        if (fromNode && toNode) {
          const dirAngle = Math.atan2(toNode.y - fromNode.y, toNode.x - fromNode.x);
          const cosA = Math.max(0.001, Math.abs(Math.cos(dirAngle)));
          const sinA = Math.max(0.001, Math.abs(Math.sin(dirAngle)));
          const sOffset = Math.min(fromNode.width / 2 / cosA, fromNode.height / 2 / sinA) + 3;
          const tOffset = Math.min(toNode.width / 2 / cosA, toNode.height / 2 / sinA) + 5;

          const startX = fromNode.x + Math.cos(dirAngle) * sOffset;
          const startY = fromNode.y + Math.sin(dirAngle) * sOffset;
          const endX = toNode.x - Math.cos(dirAngle) * tOffset;
          const endY = toNode.y - Math.sin(dirAngle) * tOffset;

          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);

          const strokeA = 0.35 + 0.65 * hT;
          ctx.strokeStyle = `rgba(24, 24, 27, ${strokeA})`;
          ctx.lineWidth = (1.2 + 1.0 * hT) / Math.max(0.5, totalScale);
          ctx.setLineDash([4, 4]);
          ctx.lineDashOffset = -now / 25;
          ctx.stroke();

          const beadPhase = (now * 0.0014) % 1;
          const isOutbound = edge.source === currentHoveredId;
          const tPos = isOutbound ? beadPhase : 1 - beadPhase;
          const beadX = startX + (endX - startX) * tPos;
          const beadY = startY + (endY - startY) * tPos;
          ctx.beginPath();
          ctx.arc(beadX, beadY, 2.5 / Math.max(0.5, totalScale), 0, Math.PI * 2);
          ctx.fillStyle = `rgba(24, 24, 27, ${0.95 * hT})`;
          ctx.fill();
        }
        ctx.restore();
      }

      const currentTargetPhrase = activeTargetPhraseRef.current;
      const currentLastTargetWord = lastTargetWordRef.current;
      const activeHoverWord = hoveredNodeRef.current?.word || externalHoveredWordRef.current;
      const compatSet = compatibleWordSetRef.current;

      // Visible world frustum bounds for culling off-screen nodes when zoomed in
      const halfViewWorldW = (width * 0.5 + 80) / totalScale;
      const halfViewWorldH = (height * 0.5 + 60) / totalScale;
      const viewCenterWorldX = -panX / totalScale;
      const viewCenterWorldY = -panY / totalScale;

      const drawSingleNode = (node: TagNode) => {
        // Frustum culling check
        if (
          Math.abs(node.x - viewCenterWorldX) > halfViewWorldW + node.width ||
          Math.abs(node.y - viewCenterWorldY) > halfViewWorldH + node.height
        ) {
          return;
        }

        const isTarget = currentTargetPhrase.toLowerCase().includes(node.word.toLowerCase());
        const isRecommended =
          currentLastTargetWord && getSentenceFlow(currentLastTargetWord, node.word).flow;
        const hT = node.hoverT ?? 0;
        const extT = node.externalT ?? 0;
        const activeHighlightT = Math.max(hT, extT);
        const nodeSeed = getWordHash(node.word);
        const nodeTime = now * 0.0012 + (node.phaseOffset || 0);
        const isSelected = selectedWordRef.current?.word.toLowerCase() === node.word.toLowerCase();

        ctx.save();

        // Dim incompatible words when any word is hovered
        let isDimmedNode = false;
        if (activeHoverWord && compatSet) {
          const isSelfHovered = node.word.toLowerCase() === activeHoverWord.toLowerCase();
          const isCompat = isSelfHovered || compatSet.has(node.word.toLowerCase());
          if (!isCompat) {
            ctx.globalAlpha = 0.14;
            isDimmedNode = true;
          }
        } else if (externalDimT > 0.01) {
          const alpha = 1.0 - 0.78 * externalDimT * (1 - extT);
          ctx.globalAlpha = Math.max(0.16, alpha);
          if (extT < 0.35) {
            isDimmedNode = true;
          }
        } else if (node.isSolvable === false && wordFilterMode === 'safe') {
          isDimmedNode = true;
        }

        if (totalScale < 0.45 && activeHighlightT < 0.25) {
          isDimmedNode = true;
        }

        // Fixed scale for all words (no hover magnification; rely on manual zoom)
        const curW = node.width;
        const curH = node.height;
        const fontSize = node.word.length >= 12 ? 10.5 : node.word.length >= 8 ? 11.5 : 12;

        drawBlob(
          ctx,
          node.x,
          node.y,
          curW,
          curH,
          nodeSeed,
          nodeTime,
          0,
          useFastCapsules && !node.isExactCloser
        );

        if (isSelected || isTarget || activeHighlightT > 0.25) {
          ctx.fillStyle = '#09090b';
          ctx.fill();
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1.6 / Math.max(0.35, totalScale);
          ctx.stroke();
        } else {
          ctx.fillStyle = isRecommended ? '#fafafa' : '#ffffff';
          ctx.fill();
          ctx.strokeStyle = isRecommended ? '#18181b' : node.borderColor;
          ctx.lineWidth = (isRecommended ? 1.35 : 1.0) / Math.max(0.35, totalScale);
          ctx.stroke();

          if (node.isExactCloser) {
            ctx.save();
            drawBlob(ctx, node.x, node.y, curW, curH, nodeSeed, nodeTime, 3, useFastCapsules);
            ctx.strokeStyle = '#18181b';
            ctx.lineWidth = 1.1 / Math.max(0.35, totalScale);
            ctx.stroke();
            ctx.restore();
          }
        }

        const shouldHideLabel =
          autoHideDimmedNamesRef.current &&
          isDimmedNode &&
          !isSelected &&
          !isTarget &&
          !isRecommended &&
          activeHighlightT < 0.25 &&
          node.id !== currentHoveredId;

        if (!shouldHideLabel) {
          ctx.font = `${
            activeHighlightT > 0.25 || isTarget || isSelected || isRecommended ? '600' : '500'
          } ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = isSelected || isTarget || activeHighlightT > 0.25 ? '#ffffff' : '#09090b';
          ctx.fillText(node.word, node.x, node.y + 0.5);
        }
        ctx.restore();
      };

      for (let i = 0; i < nodes.length; i++) {
        drawSingleNode(nodes[i]);
      }

      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [activeWords, getWordHash]);

  // Convert screen coordinates to world coordinates accounting for panOffset, baseFitScale, and zoomScale
  const screenToWorld = useCallback((screenX: number, screenY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const totalScale = Math.max(0.01, baseFitScaleRef.current * zoomScaleRef.current);
    return {
      x: (screenX - rect.left - rect.width / 2 - panOffsetRef.current.x) / totalScale,
      y: (screenY - rect.top - rect.height / 2 - panOffsetRef.current.y) / totalScale,
    };
  }, []);

  const getNodeAt = useCallback((worldX: number, worldY: number): TagNode | null => {
    const nodes = nodesRef.current;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];
      const dx = worldX - node.x;
      const dy = worldY - node.y;
      const rx = node.width / 2 + 2.5;
      const ry = node.height / 2 + 2.5;

      if (Math.abs(dx) <= rx && Math.abs(dy) <= ry) {
        return node;
      }
    }
    return null;
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const world = screenToWorld(e.clientX, e.clientY);
    const node = getNodeAt(world.x, world.y);
    dragMovedRef.current = false;

    if (node) {
      draggedNodeRef.current = node;
      isPanningRef.current = false;
    } else {
      isPanningRef.current = true;
      panStartRef.current = {
        clientX: e.clientX,
        clientY: e.clientY,
        startX: panOffsetRef.current.x,
        startY: panOffsetRef.current.y,
      };
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (draggedNodeRef.current) {
      dragMovedRef.current = true;
      const world = screenToWorld(e.clientX, e.clientY);
      const node = draggedNodeRef.current;
      node.x = world.x;
      node.y = world.y;
      node.vx = 0;
      node.vy = 0;
    } else if (isPanningRef.current) {
      const dx = e.clientX - panStartRef.current.clientX;
      const dy = e.clientY - panStartRef.current.clientY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        dragMovedRef.current = true;
      }
      setPanOffset({
        x: panStartRef.current.startX + dx,
        y: panStartRef.current.startY + dy,
      });
    } else {
      const world = screenToWorld(e.clientX, e.clientY);
      const node = getNodeAt(world.x, world.y);
      if (node?.id !== hoveredNodeRef.current?.id) {
        setHoveredNode(node);
      }
    }
  };

  const handlePointerUp = () => {
    if (draggedNodeRef.current) {
      const node = draggedNodeRef.current;
      draggedNodeRef.current = null;

      if (!dragMovedRef.current) {
        onAddWordToTarget(node.word);
        const item =
          candidateWords.find((c) => c.word.toLowerCase() === node.word.toLowerCase()) || {
            word: node.word,
            length: node.length,
            freq: node.freq,
            isExactCloser: node.isExactCloser,
            isSolvable: node.isSolvable,
          };

        if (onSelectWord) {
          onSelectWord(item);
        }
        onShowToast(`Added "${node.word}" to sentence`, 'success');
      }
    }
    isPanningRef.current = false;
  };

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left - rect.width / 2;
    const my = e.clientY - rect.top - rect.height / 2;

    const zoomFactor = e.deltaY < 0 ? 1.16 : 0.86;
    const prevZoom = zoomScaleRef.current;
    const nextZoom = Math.max(0.25, Math.min(12.0, prevZoom * zoomFactor));
    const ratio = nextZoom / prevZoom;

    if (Math.abs(ratio - 1) > 0.001) {
      setZoomScale(nextZoom);
      setPanOffset((prev) => ({
        x: mx - (mx - prev.x) * ratio,
        y: my - (my - prev.y) * ratio,
      }));
    }
  }, []);

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

  const totalEligible = eligibleWords.length;

  return (
    <div className="w-full h-full relative overflow-hidden bg-white flex flex-col select-none">
      {/* Hovered word readout in top-left corner so fixed-scale words remain effortless to inspect when zoomed out */}
      {hoveredNode && (
        <div className="absolute top-2.5 left-2.5 z-20 pointer-events-none flex items-center gap-1.5 bg-black text-white px-2.5 py-1 rounded-lg shadow-[2px_2px_0px_rgba(0,0,0,0.2)] text-xs font-mono font-bold tracking-wide">
          <span>{hoveredNode.word}</span>
          <span className="text-zinc-400 text-[10px] font-normal">· {hoveredNode.length}L</span>
        </div>
      )}

      {/* Floating external hover highlight indicator */}
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
        !sourceText.trim() || !activeTargetPhrase.trim() || remainingLetters.length === 0 ? (
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
              The letters{' '}
              <span className="text-zinc-950 font-black uppercase tracking-widest underline underline-offset-2">
                {remainingLetters.join(', ').toUpperCase()}
              </span>{' '}
              cannot form any other dictionary words.
            </p>
          </div>
        )
      ) : (
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onWheel={handleWheel}
          onPointerLeave={() => {
            draggedNodeRef.current = null;
            isPanningRef.current = false;
            setHoveredNode(null);
          }}
          className="w-full h-full cursor-grab active:cursor-grabbing touch-none bg-white"
        />
      )}
    </div>
  );
};
