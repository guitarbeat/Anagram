import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Crosshair, Sparkles, Filter } from 'lucide-react';
import type { CandidateWordItem } from '../engine/types';

export interface WordsGraphViewProps {
  sourceText: string;
  candidateWords: CandidateWordItem[];
  selectedLengthFilter: number[] | number | null;
  onAddWordToTarget: (word: string) => void;
  onSetWordAsTarget: (word: string) => void;
  activeTargetPhrase?: string;
  onShowToast: (text: string, type?: 'success' | 'info' | 'error') => void;
  exactClosers?: string[];
  remainingLetters?: string[];
  onSelectLengthFilter?: (lengths: number[] | null) => void;
}

interface TagNode {
  id: string;
  word: string;
  length: number;
  freq: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  isExactCloser: boolean;
  importance: number;
}

export interface TagEdge {
  source: string;
  target: string;
  isSentenceFlow?: boolean;
  reason?: string;
  directional?: boolean;
  dirSource?: string;
  dirTarget?: string;
}

// ---------------------------------------------------------------------------
// Deterministic hash helpers (NO Math.random)
// ---------------------------------------------------------------------------
function hashString(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function getDeterministicInitialPosition(word: string, length: number): { x: number; y: number } {
  const hash = hashString(word);
  // Place on concentric rings: shorter words closer to center, longer outward
  const baseRadius = 75 + Math.min(length, 9) * 36;
  const angle = ((hash % 10000) / 10000) * Math.PI * 2;
  const radialJitter = (((Math.floor(hash / 10000) % 100) / 100) - 0.5) * 35;
  const r = Math.max(30, baseRadius + radialJitter);

  return {
    x: Math.cos(angle) * r,
    y: Math.sin(angle) * r,
  };
}

// ---------------------------------------------------------------------------
// Linguistic Grammar / Part of Speech & Sentence Flow Detection
// ---------------------------------------------------------------------------
export function getPOS(word: string): 'determiner' | 'pronoun' | 'verb' | 'adjective' | 'preposition' | 'conjunction' | 'noun' {
  const w = word.toLowerCase();

  const pronouns = ['i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'its', 'our', 'their', 'who', 'whom', 'whose'];
  if (pronouns.includes(w)) return 'pronoun';

  const determiners = ['the', 'a', 'an', 'this', 'that', 'these', 'those', 'some', 'any', 'all', 'no', 'every', 'each', 'both', 'either', 'neither'];
  if (determiners.includes(w)) return 'determiner';

  const prepositions = ['to', 'in', 'on', 'at', 'by', 'for', 'with', 'about', 'of', 'from', 'into', 'through', 'after', 'before', 'under', 'over', 'up', 'down', 'out', 'off', 'like', 'as'];
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
    'high', 'low', 'early', 'late', 'hard', 'easy', 'young', 'right', 'wrong', 'true', 'false', 'beautiful', 'smart'
  ];
  if (adjectives.includes(w) || w.endsWith('ful') || w.endsWith('less') || w.endsWith('ous') || w.endsWith('ish') || w.endsWith('ive') || w.endsWith('al') || w.endsWith('ic') || w.endsWith('able') || w.endsWith('ible')) return 'adjective';

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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export const WordsGraphView: React.FC<WordsGraphViewProps> = ({
  sourceText,
  candidateWords,
  selectedLengthFilter,
  onAddWordToTarget,
  activeTargetPhrase = '',
  onShowToast,
  exactClosers = [],
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Persistent node spatial memory across filter changes (CRITICAL: preserve existing node positions!)
  const persistentPositionsRef = useRef<Map<string, { x: number; y: number; vx: number; vy: number }>>(new Map());

  // Focus-node interaction state
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const focusedNodeIdRef = useRef<string | null>(null);
  focusedNodeIdRef.current = focusedNodeId;

  // Viewport transforms (kept in refs for 60fps responsiveness without React render jitter)
  const zoomRef = useRef<number>(1.0);
  const panRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoomDisplay, setZoomDisplay] = useState<number>(1.0);

  // Smooth target panning for focus centering
  const targetPanRef = useRef<{ x: number; y: number } | null>(null);

  // Physics simulation temperature & cooling
  const temperatureRef = useRef<number>(1.0);
  const isPhysicsCoolRef = useRef<boolean>(false);
  const animFrameIdRef = useRef<number | null>(null);

  // Transient interaction refs
  const hoveredNodeRef = useRef<TagNode | null>(null);
  const isPanningRef = useRef<boolean>(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const initialPanRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const draggedNodeRef = useRef<TagNode | null>(null);
  const dragMovedRef = useRef<boolean>(false);

  // Active exact closers set
  const exactClosersSet = useMemo(() => {
    return new Set(exactClosers.map(w => w.toLowerCase()));
  }, [exactClosers]);

  // Filter candidates by length
  const activeCandidateList = useMemo(() => {
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
    // Limit to top 110 words for high spatial density while maintaining instant 60fps cooling
    return list.slice(0, 110);
  }, [candidateWords, selectedLengthFilter]);

  // Construct nodes and edges deterministically
  const { nodes, edges, directNeighborsMap, secondOrderMap } = useMemo(() => {
    const rawNodes: TagNode[] = [];
    const sourceLetters = sourceText.toLowerCase().replace(/[^a-z]/g, '');

    for (const item of activeCandidateList) {
      const id = item.word.toLowerCase();
      const isExactCloser = exactClosersSet.has(id);

      // Re-use persistent position if already laid out, or compute deterministic position
      let pos = persistentPositionsRef.current.get(id);
      if (!pos) {
        const init = getDeterministicInitialPosition(item.word, item.length);
        pos = { x: init.x, y: init.y, vx: 0, vy: 0 };
        persistentPositionsRef.current.set(id, pos);
      }

      // Compute importance score for Semantic Level of Detail (LoD)
      let importance = 0;
      if (isExactCloser) importance += 100;
      importance += Math.min(30, Math.log10(Math.max(1, item.freq)) * 10);
      importance += item.length * 3;

      const baseWidth = Math.max(38, item.word.length * 8.5 + 18);
      const baseHeight = 24;

      rawNodes.push({
        id,
        word: item.word,
        length: item.length,
        freq: item.freq,
        x: pos.x,
        y: pos.y,
        vx: pos.vx,
        vy: pos.vy,
        width: baseWidth,
        height: baseHeight,
        isExactCloser,
        importance,
      });
    }

    // Compute compatibility & sentence flow edges
    const sourceCounts = new Array(26).fill(0);
    for (let i = 0; i < sourceLetters.length; i++) {
      sourceCounts[sourceLetters.charCodeAt(i) - 97]++;
    }

    const calculatedEdges: TagEdge[] = [];
    const neighborGraph = new Map<string, Set<string>>();

    for (const n of rawNodes) {
      neighborGraph.set(n.id, new Set());
    }

    for (let i = 0; i < Math.min(rawNodes.length, 50); i++) {
      const n1 = rawNodes[i];
      let edgeCount = 0;

      for (let j = i + 1; j < Math.min(rawNodes.length, 75); j++) {
        if (edgeCount >= 3) break;
        const n2 = rawNodes[j];

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
              calculatedEdges.push({
                source: n1.id,
                target: n2.id,
                isSentenceFlow: true,
                reason: forward.reason,
                directional: true,
                dirSource: n1.id,
                dirTarget: n2.id,
              });
            } else if (backward.flow) {
              calculatedEdges.push({
                source: n2.id,
                target: n1.id,
                isSentenceFlow: true,
                reason: backward.reason,
                directional: true,
                dirSource: n2.id,
                dirTarget: n1.id,
              });
            } else {
              calculatedEdges.push({ source: n1.id, target: n2.id });
            }

            neighborGraph.get(n1.id)?.add(n2.id);
            neighborGraph.get(n2.id)?.add(n1.id);
            edgeCount++;
          }
        }
      }
    }

    // Build 2nd order neighbor lookup
    const secOrder = new Map<string, Set<string>>();
    for (const [id, directSet] of neighborGraph.entries()) {
      const secondSet = new Set<string>();
      for (const dId of directSet) {
        const dNeighbors = neighborGraph.get(dId);
        if (dNeighbors) {
          for (const sId of dNeighbors) {
            if (sId !== id && !directSet.has(sId)) {
              secondSet.add(sId);
            }
          }
        }
      }
      secOrder.set(id, secondSet);
    }

    return {
      nodes: rawNodes,
      edges: calculatedEdges,
      directNeighborsMap: neighborGraph,
      secondOrderMap: secOrder,
    };
  }, [activeCandidateList, exactClosersSet, sourceText]);

  // Keep node references up to date in physics ref
  const nodesRef = useRef<TagNode[]>(nodes);
  nodesRef.current = nodes;
  const edgesRef = useRef<TagEdge[]>(edges);
  edgesRef.current = edges;

  // Re-heat physics when node set or filter changes
  useEffect(() => {
    temperatureRef.current = 1.0;
    isPhysicsCoolRef.current = false;
  }, [nodes.length, selectedLengthFilter]);

  // Screen to World graph space coordinate conversion
  const screenToWorld = useCallback((screenX: number, screenY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const centerX = rect.width / 2 + panRef.current.x;
    const centerY = rect.height / 2 + panRef.current.y;
    return {
      x: (screenX - rect.left - centerX) / zoomRef.current,
      y: (screenY - rect.top - centerY) / zoomRef.current,
    };
  }, []);

  const getNodeAt = useCallback((worldX: number, worldY: number): TagNode | null => {
    const currentNodes = nodesRef.current;
    for (let i = currentNodes.length - 1; i >= 0; i--) {
      const node = currentNodes[i];
      const halfW = node.width / 2 + 4;
      const halfH = node.height / 2 + 4;
      if (
        worldX >= node.x - halfW &&
        worldX <= node.x + halfW &&
        worldY >= node.y - halfH &&
        worldY <= node.y + halfH
      ) {
        return node;
      }
    }
    return null;
  }, []);

  // ResizeObserver for clean DPR & container scaling without layout thrashing
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      // Trigger canvas re-measurement
      temperatureRef.current = Math.max(temperatureRef.current, 0.4);
      isPhysicsCoolRef.current = false;
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // ---------------------------------------------------------------------------
  // Main Animation & Cooling Simulation Loop
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;

    const loop = () => {
      if (!isRunning) return;

      const container = containerRef.current;
      if (!container) {
        animFrameIdRef.current = requestAnimationFrame(loop);
        return;
      }

      const width = container.clientWidth;
      const height = container.clientHeight;
      if (width <= 0 || height <= 0) {
        animFrameIdRef.current = requestAnimationFrame(loop);
        return;
      }

      // Cap backing-store DPR to 2 to prevent excessive GPU fill rate
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const targetW = Math.round(width * dpr);
      const targetH = Math.round(height * dpr);

      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      // Smooth pan recentering towards focused node if requested
      if (targetPanRef.current) {
        const dx = targetPanRef.current.x - panRef.current.x;
        const dy = targetPanRef.current.y - panRef.current.y;
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
          panRef.current.x += dx * 0.12;
          panRef.current.y += dy * 0.12;
        } else {
          panRef.current.x = targetPanRef.current.x;
          panRef.current.y = targetPanRef.current.y;
          targetPanRef.current = null;
        }
      }

      // Cooling physics step
      const currentNodes = nodesRef.current;
      const currentEdges = edgesRef.current;
      const temp = temperatureRef.current;

      if (!isPhysicsCoolRef.current && temp > 0.005) {
        let totalKineticEnergy = 0;
        const kRepulse = 1400;
        const kDamp = 0.82;

        // Node-node repulsion & collision prevention
        for (let i = 0; i < currentNodes.length; i++) {
          const n1 = currentNodes[i];

          for (let j = i + 1; j < currentNodes.length; j++) {
            const n2 = currentNodes[j];
            const dx = n1.x - n2.x;
            const dy = n1.y - n2.y;
            const minSpacingX = (n1.width + n2.width) / 2 + 12;
            const minSpacingY = (n1.height + n2.height) / 2 + 10;

            const distSq = dx * dx + dy * dy + 80;
            const dist = Math.sqrt(distSq);

            if (Math.abs(dx) < minSpacingX && Math.abs(dy) < minSpacingY) {
              const overlapX = minSpacingX - Math.abs(dx);
              const overlapY = minSpacingY - Math.abs(dy);
              const pushX = (dx >= 0 ? 1 : -1) * overlapX * 0.18;
              const pushY = (dy >= 0 ? 1 : -1) * overlapY * 0.18;

              n1.vx += pushX;
              n1.vy += pushY;
              n2.vx -= pushX;
              n2.vy -= pushY;
            } else {
              const force = (kRepulse / distSq) * temp;
              const fx = (dx / dist) * force;
              const fy = (dy / dist) * force;
              n1.vx += fx;
              n1.vy += fy;
              n2.vx -= fx;
              n2.vy -= fy;
            }
          }

          // Soft centering pull
          n1.vx -= n1.x * 0.0018 * temp;
          n1.vy -= n1.y * 0.0018 * temp;

          if (draggedNodeRef.current !== n1) {
            n1.vx *= kDamp;
            n1.vy *= kDamp;
            n1.x += n1.vx;
            n1.y += n1.vy;
          }

          totalKineticEnergy += n1.vx * n1.vx + n1.vy * n1.vy;

          // Save to persistent map
          const p = persistentPositionsRef.current.get(n1.id);
          if (p) {
            p.x = n1.x;
            p.y = n1.y;
            p.vx = n1.vx;
            p.vy = n1.vy;
          }
        }

        // Cool the simulation down
        temperatureRef.current *= 0.965;
        if (temperatureRef.current <= 0.005 || totalKineticEnergy < 0.03) {
          isPhysicsCoolRef.current = true;
          temperatureRef.current = 0;
        }
      }

      // -----------------------------------------------------------------------
      // Render Frame
      // -----------------------------------------------------------------------
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // Clean, paper-white analytical workbench background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      // Subtle mechanical grid pattern
      const zoom = zoomRef.current;
      const pan = panRef.current;
      const centerX = width / 2 + pan.x;
      const centerY = height / 2 + pan.y;

      const gridSize = 32 * zoom;
      if (gridSize > 12) {
        ctx.save();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.035)';
        ctx.lineWidth = 1;
        const startX = (centerX % gridSize + gridSize) % gridSize;
        const startY = (centerY % gridSize + gridSize) % gridSize;

        ctx.beginPath();
        for (let x = startX; x < width; x += gridSize) {
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
        }
        for (let y = startY; y < height; y += gridSize) {
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
        }
        ctx.stroke();
        ctx.restore();
      }

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.scale(zoom, zoom);

      const focusedId = focusedNodeIdRef.current;
      const hoveredNode = hoveredNodeRef.current;
      const directNeighbors = focusedId ? directNeighborsMap.get(focusedId) : null;
      const secondOrderNeighbors = focusedId ? secondOrderMap.get(focusedId) : null;

      // Draw Edges
      const now = performance.now();
      const nodeMap = new Map(currentNodes.map(n => [n.id, n]));

      for (const edge of currentEdges) {
        const s = nodeMap.get(edge.source);
        const t = nodeMap.get(edge.target);
        if (!s || !t) continue;

        const isRelatedToFocus = focusedId
          ? (s.id === focusedId || t.id === focusedId)
          : false;

        const isConnectedToHover = hoveredNode && (hoveredNode.id === s.id || hoveredNode.id === t.id);

        let edgeAlpha = 1.0;
        if (focusedId) {
          if (isRelatedToFocus) edgeAlpha = 1.0;
          else if (directNeighbors && (directNeighbors.has(s.id) || directNeighbors.has(t.id))) edgeAlpha = 0.35;
          else edgeAlpha = 0.05;
        }

        ctx.save();
        ctx.globalAlpha = edgeAlpha;

        if (edge.isSentenceFlow) {
          const fromNode = edge.directional ? nodeMap.get(edge.dirSource!) : s;
          const toNode = edge.directional ? nodeMap.get(edge.dirTarget!) : t;

          if (fromNode && toNode) {
            const dirAngle = Math.atan2(toNode.y - fromNode.y, toNode.x - fromNode.x);
            const cos = Math.abs(Math.cos(dirAngle));
            const sin = Math.abs(Math.sin(dirAngle));

            const sOffset = Math.min((fromNode.width / 2) / (cos || 0.001), (fromNode.height / 2) / (sin || 0.001)) + 4;
            const tOffset = Math.min((toNode.width / 2) / (cos || 0.001), (toNode.height / 2) / (sin || 0.001)) + 6;

            const startX = fromNode.x + Math.cos(dirAngle) * sOffset;
            const startY = fromNode.y + Math.sin(dirAngle) * sOffset;
            const endX = toNode.x - Math.cos(dirAngle) * tOffset;
            const endY = toNode.y - Math.sin(dirAngle) * tOffset;

            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);

            if (isRelatedToFocus || isConnectedToHover) {
              ctx.strokeStyle = '#059669'; // Rich emerald
              ctx.lineWidth = 2.0;
              ctx.setLineDash([5, 4]);
              ctx.lineDashOffset = -now / 20;
            } else {
              ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
              ctx.lineWidth = 1.0;
              ctx.setLineDash([4, 4]);
              ctx.lineDashOffset = -now / 50;
            }
            ctx.stroke();

            // Arrowhead
            ctx.save();
            ctx.fillStyle = isRelatedToFocus || isConnectedToHover ? '#059669' : 'rgba(16, 185, 129, 0.5)';
            ctx.translate(endX, endY);
            ctx.rotate(dirAngle);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-7, -4);
            ctx.lineTo(-7, 4);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          }
        } else {
          // Standard compatibility edge
          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(t.x, t.y);

          if (isRelatedToFocus || isConnectedToHover) {
            ctx.strokeStyle = 'rgba(5, 150, 105, 0.6)';
            ctx.lineWidth = 1.5;
          } else {
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.06)';
            ctx.lineWidth = 0.8;
          }
          ctx.stroke();
        }

        ctx.restore();
      }

      // Draw Nodes with Semantic Level-of-Detail (LoD)
      for (const node of currentNodes) {
        const isHovered = hoveredNode?.id === node.id;
        const isFocused = focusedId === node.id;
        const isDirectNeighbor = directNeighbors ? directNeighbors.has(node.id) : false;
        const isSecondOrder = secondOrderNeighbors ? secondOrderNeighbors.has(node.id) : false;
        const isTarget = activeTargetPhrase.toLowerCase().includes(node.word.toLowerCase());

        // Semantic focus opacity calculation
        let nodeOpacity = 1.0;
        if (focusedId) {
          if (isFocused) nodeOpacity = 1.0;
          else if (isDirectNeighbor) nodeOpacity = 0.95;
          else if (isSecondOrder) nodeOpacity = 0.35;
          else nodeOpacity = 0.12; // Heavily faded for clarity
        }

        // Semantic Level-of-Detail visibility
        // Far zoom (< 0.65): show only important nodes
        // Medium zoom (0.65 - 1.15): show neighbors & high-value candidates
        // Near zoom (> 1.15): reveal all
        let showLabel = true;
        let labelAlpha = 1.0;

        if (zoom < 0.65) {
          if (isFocused || isDirectNeighbor || node.isExactCloser || node.importance >= 80) {
            showLabel = true;
            labelAlpha = 1.0;
          } else if (zoom < 0.45) {
            showLabel = false;
          } else {
            labelAlpha = (zoom - 0.45) / 0.2;
          }
        }

        ctx.save();
        ctx.globalAlpha = nodeOpacity;

        const scale = isHovered ? 1.08 : 1.0;
        const width = node.width * scale;
        const height = node.height * scale;
        const rx = node.x - width / 2;
        const ry = node.y - height / 2;

        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(rx, ry, width, height, 6);
        } else {
          ctx.rect(rx, ry, width, height);
        }

        if (isFocused) {
          ctx.fillStyle = '#09090b'; // Mechanical dark chassis highlight
          ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
          ctx.shadowBlur = 8;
          ctx.fill();
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 2;
          ctx.stroke();
        } else if (isHovered) {
          ctx.fillStyle = '#059669';
          ctx.shadowColor = 'rgba(5, 150, 105, 0.3)';
          ctx.shadowBlur = 8;
          ctx.fill();
          ctx.strokeStyle = '#047857';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        } else if (node.isExactCloser) {
          // Exact closer: prominent emerald indicator
          ctx.fillStyle = '#ecfdf5';
          ctx.fill();
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 1.6;
          ctx.stroke();
        } else if (isDirectNeighbor) {
          ctx.fillStyle = '#f0fdf4';
          ctx.fill();
          ctx.strokeStyle = '#86efac';
          ctx.lineWidth = 1.2;
          ctx.stroke();
        } else if (isTarget) {
          ctx.fillStyle = '#f4f4f5';
          ctx.fill();
          ctx.strokeStyle = '#71717a';
          ctx.lineWidth = 1.2;
          ctx.stroke();
        } else {
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          ctx.strokeStyle = '#e4e4e7';
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // Draw node label
        if (showLabel) {
          ctx.save();
          ctx.globalAlpha = nodeOpacity * labelAlpha;
          ctx.font = `${isFocused || isHovered || node.isExactCloser ? '700' : '500'} ${Math.round(11 * scale)}px 'JetBrains Mono', monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          if (isFocused) {
            ctx.fillStyle = '#34d399'; // Bright emerald text on black
          } else if (isHovered) {
            ctx.fillStyle = '#ffffff';
          } else if (node.isExactCloser) {
            ctx.fillStyle = '#047857';
          } else if (isDirectNeighbor) {
            ctx.fillStyle = '#15803d';
          } else if (isTarget) {
            ctx.fillStyle = '#52525b';
          } else {
            ctx.fillStyle = '#18181b';
          }

          ctx.fillText(node.word.toUpperCase(), node.x, node.y + 0.5);
          ctx.restore();
        } else {
          // Micro dot when zoomed far out
          ctx.beginPath();
          ctx.arc(node.x, node.y, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = node.isExactCloser ? '#10b981' : '#a1a1aa';
          ctx.fill();
        }

        ctx.restore();
      }

      ctx.restore(); // restore translated world
      ctx.restore(); // restore scaled DPR

      animFrameIdRef.current = requestAnimationFrame(loop);
    };

    animFrameIdRef.current = requestAnimationFrame(loop);
    return () => {
      isRunning = false;
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [directNeighborsMap, secondOrderMap, activeTargetPhrase]);

  // ---------------------------------------------------------------------------
  // Smooth Cursor-Anchored Zoom
  // ---------------------------------------------------------------------------
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const currentZoom = zoomRef.current;
    const currentPan = panRef.current;

    // World graph coordinates directly under cursor
    const centerX = rect.width / 2 + currentPan.x;
    const centerY = rect.height / 2 + currentPan.y;
    const worldX = (mouseX - centerX) / currentZoom;
    const worldY = (mouseY - centerY) / currentZoom;

    // Smooth logarithmic zoom curve with strict limits
    const zoomDelta = -e.deltaY * 0.0018;
    const factor = Math.exp(zoomDelta);
    const minZoom = 0.25;
    const maxZoom = 3.0;
    const newZoom = Math.max(minZoom, Math.min(maxZoom, currentZoom * factor));

    // Shift pan so the world coordinates under the cursor stay stationary
    const newCenterX = mouseX - worldX * newZoom;
    const newCenterY = mouseY - worldY * newZoom;

    panRef.current = {
      x: newCenterX - rect.width / 2,
      y: newCenterY - rect.height / 2,
    };
    zoomRef.current = newZoom;
    setZoomDisplay(Math.round(newZoom * 100) / 100);

    // Awaken physics loop
    temperatureRef.current = Math.max(temperatureRef.current, 0.15);
    isPhysicsCoolRef.current = false;
  };

  // ---------------------------------------------------------------------------
  // Pointer Events (Pan, Node Drag, and Focus Migration)
  // ---------------------------------------------------------------------------
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const world = screenToWorld(e.clientX, e.clientY);
    const node = getNodeAt(world.x, world.y);
    dragMovedRef.current = false;

    if (node) {
      draggedNodeRef.current = node;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Ignore
      }
    } else {
      isPanningRef.current = true;
      panStartRef.current = { x: e.clientX, y: e.clientY };
      initialPanRef.current = { ...panRef.current };
      targetPanRef.current = null; // Cancel any active smooth pan
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const world = screenToWorld(e.clientX, e.clientY);

    if (draggedNodeRef.current) {
      dragMovedRef.current = true;
      draggedNodeRef.current.x = world.x;
      draggedNodeRef.current.y = world.y;
      draggedNodeRef.current.vx = 0;
      draggedNodeRef.current.vy = 0;

      // Wake physics
      temperatureRef.current = 0.4;
      isPhysicsCoolRef.current = false;
    } else if (isPanningRef.current) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;

      // Soft resistance when panning extremely far away from the origin
      const currentDist = Math.hypot(initialPanRef.current.x + dx, initialPanRef.current.y + dy);
      const maxDistance = 1400;
      let effectiveDx = dx;
      let effectiveDy = dy;

      if (currentDist > maxDistance) {
        const excess = currentDist - maxDistance;
        const damp = 1 / (1 + excess * 0.003);
        effectiveDx = dx * damp;
        effectiveDy = dy * damp;
      }

      panRef.current = {
        x: initialPanRef.current.x + effectiveDx,
        y: initialPanRef.current.y + effectiveDy,
      };
    } else {
      const node = getNodeAt(world.x, world.y);
      hoveredNodeRef.current = node;
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore
    }

    if (draggedNodeRef.current) {
      const node = draggedNodeRef.current;
      draggedNodeRef.current = null;

      if (!dragMovedRef.current) {
        // Node was clicked (not dragged): Migrate or set Focus
        if (focusedNodeIdRef.current === node.id) {
          // Clicking already-focused node adds it to target
          onAddWordToTarget(node.word);
          onShowToast(`Added "${node.word}" to target phrase`, 'success');
        } else {
          // Focus-node interaction: Focus node & smoothly center viewport
          setFocusedNodeId(node.id);
          targetPanRef.current = {
            x: -node.x * zoomRef.current,
            y: -node.y * zoomRef.current,
          };
        }
      }
    } else if (isPanningRef.current) {
      // If user clicked empty space without dragging, clear focus
      const dx = Math.abs(e.clientX - panStartRef.current.x);
      const dy = Math.abs(e.clientY - panStartRef.current.y);
      if (dx < 3 && dy < 3) {
        setFocusedNodeId(null);
      }
    }

    isPanningRef.current = false;
  };

  // Recenter Viewport
  const handleRecenter = () => {
    targetPanRef.current = { x: 0, y: 0 };
    zoomRef.current = 1.0;
    setZoomDisplay(1.0);
    setFocusedNodeId(null);
  };

  const handleZoomIn = () => {
    const newZoom = Math.min(3.0, zoomRef.current * 1.25);
    zoomRef.current = newZoom;
    setZoomDisplay(Math.round(newZoom * 100) / 100);
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(0.25, zoomRef.current * 0.8);
    zoomRef.current = newZoom;
    setZoomDisplay(Math.round(newZoom * 100) / 100);
  };

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-white select-none">
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => {
          isPanningRef.current = false;
          draggedNodeRef.current = null;
          hoveredNodeRef.current = null;
        }}
        onWheel={handleWheel}
        className="w-full h-full cursor-grab active:cursor-grabbing touch-none block"
      />

      {/* Floating Spatial Controls (Minimalist mechanical HUD) */}
      <div className="absolute top-3 left-3 flex items-center gap-1.5 z-20 bg-white/90 backdrop-blur-md border border-zinc-200 shadow-sm rounded-lg p-1 text-zinc-700">
        <button
          type="button"
          onClick={handleZoomIn}
          title="Zoom In"
          aria-label="Zoom In"
          className="p-1.5 hover:bg-zinc-100 rounded text-zinc-600 hover:text-zinc-900 transition-colors"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <span className="text-[10px] font-mono font-medium text-zinc-500 px-1 min-w-[36px] text-center tabular-nums">
          {Math.round(zoomDisplay * 100)}%
        </span>
        <button
          type="button"
          onClick={handleZoomOut}
          title="Zoom Out"
          aria-label="Zoom Out"
          className="p-1.5 hover:bg-zinc-100 rounded text-zinc-600 hover:text-zinc-900 transition-colors"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <div className="w-[1px] h-3.5 bg-zinc-200 mx-0.5" />
        <button
          type="button"
          onClick={handleRecenter}
          title="Recenter Map & Reset Focus"
          aria-label="Recenter Map"
          className="p-1.5 hover:bg-zinc-100 rounded text-zinc-600 hover:text-zinc-900 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Active Focus Node Pill & HUD */}
      {focusedNodeId && (
        <div className="absolute top-3 right-3 flex items-center gap-2 z-20 bg-[#09090b] text-white border border-zinc-700/80 shadow-md rounded-lg px-3 py-1.5">
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold tracking-wider">
            <Crosshair className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="text-zinc-400">FOCUS:</span>
            <span className="text-emerald-400 uppercase">{focusedNodeId}</span>
          </div>
          <button
            type="button"
            onClick={() => onAddWordToTarget(focusedNodeId)}
            className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
          >
            + Add
          </button>
          <button
            type="button"
            onClick={() => setFocusedNodeId(null)}
            className="text-zinc-400 hover:text-white text-xs px-1"
            title="Clear focus"
          >
            ✕
          </button>
        </div>
      )}

      {/* Empty State Banner if no source */}
      {!sourceText.trim() && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center pointer-events-none bg-white/70 backdrop-blur-[1px]">
          <div className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-400 mb-1">
            Spatial Anagram Instrument
          </div>
          <div className="text-sm font-semibold text-zinc-600">
            Enter a source phrase in the header to explore candidate words in coordinate space.
          </div>
        </div>
      )}
    </div>
  );
};
