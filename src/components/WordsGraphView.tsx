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

interface TagEdge {
  source: string;
  target: string;
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

    // Compute compatibility edges
    const sourceLetters = sourceText.toLowerCase().replace(/[^a-z]/g, '');
    const sourceCounts = new Array(26).fill(0);
    for (let i = 0; i < sourceLetters.length; i++) {
      sourceCounts[sourceLetters.charCodeAt(i) - 97]++;
    }

    const edges: TagEdge[] = [];
    for (let i = 0; i < Math.min(nodes.length, 35); i++) {
      const n1 = nodes[i];
      let edgeCount = 0;

      for (let j = i + 1; j < Math.min(nodes.length, 50); j++) {
        if (edgeCount >= 2) break;
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
            edges.push({ source: n1.id, target: n2.id });
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
      for (const edge of edges) {
        const s = nodeMap.get(edge.source);
        const t = nodeMap.get(edge.target);
        if (!s || !t) continue;

        const isConnectedToHover = hoveredNode && (hoveredNode.id === s.id || hoveredNode.id === t.id);

        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);

        if (isConnectedToHover) {
          ctx.strokeStyle = 'rgba(5, 150, 105, 0.8)';
          ctx.lineWidth = 1.5;
        } else {
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.07)';
          ctx.lineWidth = 0.75;
        }
        ctx.stroke();
      }

      // Draw Word Tags
      for (const node of nodes) {
        const isHovered = hoveredNode?.id === node.id;
        const isTarget = activeTargetPhrase.toLowerCase().includes(node.word.toLowerCase());

        const rx = node.x - node.width / 2;
        const ry = node.y - node.height / 2;

        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(rx, ry, node.width, node.height, 5);
        } else {
          ctx.rect(rx, ry, node.width, node.height);
        }

        if (isHovered) {
          ctx.fillStyle = '#059669';
          ctx.fill();
          ctx.strokeStyle = '#047857';
          ctx.lineWidth = 1.6;
          ctx.stroke();
        } else if (isTarget) {
          ctx.fillStyle = '#ecfdf5';
          ctx.fill();
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 1.4;
          ctx.stroke();
        } else {
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          ctx.strokeStyle = node.borderColor;
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        ctx.font = '500 11px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = isHovered ? '#ffffff' : isTarget ? '#047857' : '#0f172a';
        ctx.fillText(node.word, node.x, node.y + 0.5);
      }

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [pan, zoom, hoveredNode, activeTargetPhrase]);

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

      {/* Concise Floating Zoom/Reset Controls */}
      {candidateWords.length > 0 && (
        <div className="absolute bottom-1.5 right-1.5 z-20 flex items-center bg-white border border-zinc-300 rounded shadow-sm text-zinc-900">
          <button
            type="button"
            onClick={() => setZoom(z => Math.min(2.5, z * 1.2))}
            title="Zoom in"
            className="px-1.5 py-0.5 text-zinc-800 hover:text-black hover:bg-zinc-100 text-[10px] font-mono font-bold cursor-pointer transition-colors"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => setZoom(z => Math.max(0.3, z * 0.8))}
            title="Zoom out"
            className="px-1.5 py-0.5 text-zinc-800 hover:text-black hover:bg-zinc-100 text-[10px] font-mono font-bold cursor-pointer border-x border-zinc-200 transition-colors"
          >
            −
          </button>
          <button
            type="button"
            onClick={resetView}
            title="Reset graph view"
            className="px-1.5 py-0.5 text-zinc-800 hover:text-black hover:bg-zinc-100 text-[9px] font-mono font-semibold cursor-pointer transition-colors"
          >
            fit
          </button>
        </div>
      )}

      {/* Concise Hover Info Tooltip */}
      {hoveredNode && (
        <div className="absolute top-1.5 left-1.5 z-20 pointer-events-none text-[10px] font-mono text-zinc-900 bg-white px-2 py-0.5 rounded border border-zinc-300 shadow-md flex items-center gap-1.5">
          <span className="text-emerald-900 font-bold">{hoveredNode.word}</span>
          <span className="text-zinc-400">·</span>
          <span className="text-zinc-700 font-semibold">{hoveredNode.length}L</span>
        </div>
      )}
    </div>
  );
};
