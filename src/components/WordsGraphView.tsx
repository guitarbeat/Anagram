import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Sparkles, CheckCircle2 } from 'lucide-react';
import type { CandidateWordItem } from './CandidateWordsList';
import { LETTER_COUNTS, LETTER_MASKS, WORDS } from '../engine/lexicon';

export interface WordsGraphViewProps {
  sourceText: string;
  candidateWords: CandidateWordItem[];
  selectedLengthFilter: number | null;
  onAddWordToTarget: (word: string) => void;
  onSetWordAsTarget: (word: string) => void;
  activeTargetPhrase?: string;
  onShowToast: (text: string, type?: 'success' | 'info' | 'error') => void;
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
  color: string;
  borderColor: string;
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

export const WordsGraphView: React.FC<WordsGraphViewProps> = ({
  sourceText,
  candidateWords,
  selectedLengthFilter,
  onAddWordToTarget,
  onSetWordAsTarget,
  activeTargetPhrase = '',
  onShowToast,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const lastTargetWord = useMemo(() => {
    const words = activeTargetPhrase.trim().split(/\s+/).filter(Boolean);
    return words.length > 0 ? words[words.length - 1] : null;
  }, [activeTargetPhrase]);

  // Pan and Zoom
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const initialPanRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Hover and dragging
  const [hoveredNode, setHoveredNode] = useState<TagNode | null>(null);
  const draggedNodeRef = useRef<TagNode | null>(null);
  const dragMovedRef = useRef(false);

  // Nodes and Edges State
  const nodesRef = useRef<TagNode[]>([]);
  const edgesRef = useRef<TagEdge[]>([]);

  // Filter words
  const activeWords = useMemo(() => {
    let list = candidateWords;
    if (selectedLengthFilter !== null) {
      list = list.filter(w => w.length === selectedLengthFilter);
    }
    // Limit to top 90 most relevant/longest words for butter-smooth physics
    return list.slice(0, 90);
  }, [candidateWords, selectedLengthFilter]);

  // Compute width for a word chip in monospace
  const getApproxWidth = (word: string) => {
    return Math.max(36, word.length * 7.5 + 14);
  };

  // Initialize or re-layout nodes in an organic spiral cluster
  useEffect(() => {
    const nodes: TagNode[] = [];
    const goldenRatio = (1 + Math.sqrt(5)) / 2;

    activeWords.forEach((item, index) => {
      const theta = index * goldenRatio * Math.PI * 2;
      const r = Math.sqrt(index + 1) * 38 + 20;

      const w = getApproxWidth(item.word);
      const h = 22;

      let color = '#ffffff';
      let borderColor = '#cbd5e1';
      if (item.length >= 10) {
        borderColor = '#059669';
      } else if (item.length >= 7) {
        borderColor = '#0d9488';
      } else if (item.length >= 5) {
        borderColor = '#0284c7';
      }

      nodes.push({
        id: item.word,
        word: item.word,
        length: item.length,
        freq: item.freq,
        x: Math.cos(theta) * r + (Math.random() - 0.5) * 15,
        y: Math.sin(theta) * r + (Math.random() - 0.5) * 15,
        vx: 0,
        vy: 0,
        width: w,
        height: h,
        color,
        borderColor,
      });
    });

    // Compute compatibility and sentence flow edges
    const sourceLetters = sourceText.toLowerCase().replace(/[^a-z]/g, '');
    const sourceCounts = new Array(26).fill(0);
    for (let i = 0; i < sourceLetters.length; i++) {
      sourceCounts[sourceLetters.charCodeAt(i) - 97]++;
    }

    const edges: TagEdge[] = [];
    for (let i = 0; i < Math.min(nodes.length, 40); i++) {
      const n1 = nodes[i];
      let edgeCount = 0;

      for (let j = i + 1; j < Math.min(nodes.length, 60); j++) {
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
              });
            } else {
              edges.push({ source: n1.id, target: n2.id });
            }
            edgeCount++;
          }
        }
      }
    }

    nodesRef.current = nodes;
    edgesRef.current = edges;
  }, [activeWords, sourceText]);

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let dpr = window.devicePixelRatio || 1;
    let animationFrameId: number;

    const render = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // Pan & Zoom
      const centerX = width / 2 + pan.x;
      const centerY = height / 2 + pan.y;

      ctx.translate(centerX, centerY);
      ctx.scale(zoom, zoom);

      const nodes = nodesRef.current;
      const edges = edgesRef.current;

      const kRepulse = 1800;
      const kDamp = 0.82;

      for (let i = 0; i < nodes.length; i++) {
        const n1 = nodes[i];

        for (let j = i + 1; j < nodes.length; j++) {
          const n2 = nodes[j];
          const dx = n1.x - n2.x;
          const dy = n1.y - n2.y;
          const minSpacingX = (n1.width + n2.width) / 2 + 10;
          const minSpacingY = (n1.height + n2.height) / 2 + 8;

          const distSq = dx * dx + dy * dy + 100;
          const dist = Math.sqrt(distSq);

          if (Math.abs(dx) < minSpacingX && Math.abs(dy) < minSpacingY) {
            const overlapX = minSpacingX - Math.abs(dx);
            const overlapY = minSpacingY - Math.abs(dy);
            const pushX = (dx > 0 ? 1 : -1) * overlapX * 0.15;
            const pushY = (dy > 0 ? 1 : -1) * overlapY * 0.15;

            n1.vx += pushX;
            n1.vy += pushY;
            n2.vx -= pushX;
            n2.vy -= pushY;
          } else {
            const force = kRepulse / distSq;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            n1.vx += fx;
            n1.vy += fy;
            n2.vx -= fx;
            n2.vy -= fy;
          }
        }

        n1.vx -= n1.x * 0.002;
        n1.vy -= n1.y * 0.002;

        if (draggedNodeRef.current !== n1) {
          n1.vx *= kDamp;
          n1.vy *= kDamp;
          n1.x += n1.vx;
          n1.y += n1.vy;
        }
      }

      // Draw Edges
      const nodeMap = new Map(nodes.map(n => [n.id, n]));
      const now = performance.now();
      for (const edge of edges) {
        const s = nodeMap.get(edge.source);
        const t = nodeMap.get(edge.target);
        if (!s || !t) continue;

        const isSentenceFlow = edge.isSentenceFlow;
        const isConnectedToHover = hoveredNode && (hoveredNode.id === s.id || hoveredNode.id === t.id);

        ctx.save();

        if (isSentenceFlow) {
          ctx.beginPath();
          // Use dirSource and dirTarget for correct arrow direction
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

            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);

            if (isConnectedToHover) {
              ctx.strokeStyle = '#10b981'; // Vibrant green
              ctx.lineWidth = 1.8;
              ctx.setLineDash([5, 4]);
              ctx.lineDashOffset = -now / 18;
              ctx.shadowColor = 'rgba(16, 185, 129, 0.45)';
              ctx.shadowBlur = 6;
            } else {
              ctx.strokeStyle = 'rgba(16, 185, 129, 0.35)'; // Subtle translucent green
              ctx.lineWidth = 1.0;
              ctx.setLineDash([4, 4]);
              ctx.lineDashOffset = -now / 45;
            }
            ctx.stroke();

            // Draw an arrowhead pointing at the target word of the sentence flow
            ctx.save();
            ctx.fillStyle = isConnectedToHover ? '#10b981' : 'rgba(16, 185, 129, 0.4)';
            ctx.translate(endX, endY);
            ctx.rotate(dirAngle);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-6, -3.5);
            ctx.lineTo(-6, 3.5);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          }
        } else {
          // Ordinary compatibility line
          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(t.x, t.y);

          if (isConnectedToHover) {
            ctx.strokeStyle = 'rgba(5, 150, 105, 0.45)';
            ctx.lineWidth = 1.2;
          } else {
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)';
            ctx.lineWidth = 0.6;
          }
          ctx.stroke();
        }

        ctx.restore();
      }

      // Draw Word Tags
      for (const node of nodes) {
        const isHovered = hoveredNode?.id === node.id;
        const isTarget = activeTargetPhrase.toLowerCase().includes(node.word.toLowerCase());
        const isRecommended = lastTargetWord && getSentenceFlow(lastTargetWord, node.word).flow;

        ctx.save();
        const scale = isHovered ? 1.12 : 1.0;
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

        if (isHovered) {
          ctx.fillStyle = '#059669';
          ctx.shadowColor = 'rgba(5, 150, 105, 0.45)';
          ctx.shadowBlur = 12;
          ctx.fill();
          ctx.strokeStyle = '#047857';
          ctx.lineWidth = 1.8;
          ctx.stroke();
        } else if (isTarget) {
          ctx.fillStyle = '#ecfdf5';
          ctx.shadowColor = 'rgba(16, 185, 129, 0.2)';
          ctx.shadowBlur = 8;
          ctx.fill();
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        } else if (isRecommended) {
          ctx.fillStyle = '#f0fdf4';
          ctx.shadowColor = 'rgba(34, 197, 94, 0.25)';
          ctx.shadowBlur = 6;
          ctx.fill();
          ctx.strokeStyle = '#22c55e'; // Vibrant active green
          ctx.lineWidth = 1.6;
          ctx.stroke();
        } else {
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = 'rgba(0, 0, 0, 0.04)';
          ctx.shadowBlur = 4;
          ctx.fill();
          ctx.strokeStyle = node.borderColor;
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        ctx.font = `${(isHovered || isRecommended) ? '600' : '500'} ${Math.round(11 * scale)}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = isHovered 
          ? '#ffffff' 
          : isTarget 
            ? '#047857' 
            : isRecommended 
              ? '#15803d' 
              : '#0f172a';
        ctx.fillText(node.word, node.x, node.y + 0.5);
        ctx.restore();
      }

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [pan, zoom, hoveredNode, activeTargetPhrase, lastTargetWord]);

  const screenToWorld = useCallback((screenX: number, screenY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const centerX = rect.width / 2 + pan.x;
    const centerY = rect.height / 2 + pan.y;
    return {
      x: (screenX - rect.left - centerX) / zoom,
      y: (screenY - rect.top - centerY) / zoom,
    };
  }, [pan, zoom]);

  const getNodeAt = useCallback((worldX: number, worldY: number): TagNode | null => {
    const nodes = nodesRef.current;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];
      const rx = node.x - node.width / 2 - 3;
      const ry = node.y - node.height / 2 - 3;
      const rw = node.width + 6;
      const rh = node.height + 6;

      if (worldX >= rx && worldX <= rx + rw && worldY >= ry && worldY <= ry + rh) {
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
    } else {
      isPanningRef.current = true;
      panStartRef.current = { x: e.clientX, y: e.clientY };
      initialPanRef.current = { ...pan };
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
    } else if (isPanningRef.current) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      setPan({
        x: initialPanRef.current.x + dx,
        y: initialPanRef.current.y + dy,
      });
    } else {
      const node = getNodeAt(world.x, world.y);
      setHoveredNode(node);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (draggedNodeRef.current) {
      const node = draggedNodeRef.current;
      draggedNodeRef.current = null;

      if (!dragMovedRef.current) {
        onAddWordToTarget(node.word);
        onShowToast(`Added "${node.word}" to target phrase`, 'success');
      }
    }
    isPanningRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom(prev => Math.max(0.3, Math.min(2.5, prev * zoomFactor)));
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

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const isSetupEmpty = !sourceText.trim() || !activeTargetPhrase.trim();

  return (
    <div className="w-full h-full relative overflow-hidden bg-white flex flex-col select-none">
      {/* If no leftover candidate words exist */}
      {candidateWords.length === 0 ? (
        !sourceText.trim() ? (
          <div className="w-full h-full bg-white" />
        ) : !activeTargetPhrase.trim() ? (
          <div className="w-full h-full bg-white" />
        ) : remainingLetters.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center z-10 space-y-2 bg-white">
            <CheckCircle2 className="w-7 h-7 text-emerald-500" />
            <div className="font-bold text-zinc-900 uppercase tracking-wide unified-app-text">
               Perfect Match
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center z-10 space-y-3 bg-white">
            <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-300 flex items-center justify-center text-amber-600 shadow-sm font-mono font-extrabold text-lg">
              !
            </div>
            <div className="font-bold text-amber-950 uppercase tracking-wide unified-app-text">
              Leftover Letters Remain!
            </div>
            <p className="text-zinc-600 max-w-sm font-semibold unified-app-text">
              The letters <span className="text-rose-600 font-extrabold uppercase tracking-widest">{remainingLetters.join(', ').toUpperCase()}</span> are not accounted for, and cannot form any other dictionary words.
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
            isPanningRef.current = false;
            draggedNodeRef.current = null;
            setHoveredNode(null);
          }}
          onWheel={handleWheel}
          className="w-full h-full cursor-grab active:cursor-grabbing touch-none bg-white"
        />
      )}
    </div>
  );
};
