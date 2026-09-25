import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { WordsGraphView } from './WordsGraphView';
import { BarChart3, X, Sparkles, Copy, Check, ArrowUpRight } from 'lucide-react';
import type { AnagramResult } from '../engine/types';

export interface CandidateWordItem {
  word: string;
  length: number;
  freq: number;
}

export interface CandidateWordsListProps {
  sourceText: string;
  candidateWords: CandidateWordItem[];
  selectedLengthFilter: number[] | number | null;
  onSelectLengthFilter: (lengths: number[] | null) => void;
  onClearLengthFilter: () => void;
  histogramData: { length: number; count: number }[];
  onAddWordToTarget: (word: string) => void;
  onSetWordAsTarget: (word: string) => void;
  activeTargetPhrase?: string;
  onShowToast: (text: string, type?: 'success' | 'info' | 'error') => void;
  results?: AnagramResult[];
  isSolving?: boolean;
}

export const CandidateWordsList: React.FC<CandidateWordsListProps> = ({
  sourceText,
  candidateWords,
  selectedLengthFilter,
  onSelectLengthFilter,
  onClearLengthFilter,
  histogramData,
  onAddWordToTarget,
  onSetWordAsTarget,
  activeTargetPhrase = '',
  onShowToast,
  results = [],
  isSolving = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasUserCustomizedSplit, setHasUserCustomizedSplit] = useState<boolean>(false);
  const [topTab, setTopTab] = useState<'anagrams' | 'words'>('anagrams');
  const [copiedPhrase, setCopiedPhrase] = useState<string | null>(null);

  const getAdaptiveSplit = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      return 0.72; // Mobile
    }
    return 0.65; // Desktop
  };

  const [splitRatio, setSplitRatio] = useState<number>(getAdaptiveSplit);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Range Drag and Multi-select state
  const rangeDragStartRef = useRef<number | null>(null);
  const rangeDragCurrentRef = useRef<number | null>(null);
  const isRangeDraggingRef = useRef<boolean>(false);
  const dragMovedRef = useRef<boolean>(false);
  const [dragPreview, setDragPreview] = useState<{ start: number; current: number } | null>(null);

  const handleCopyPhrase = (phrase: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(phrase);
    setCopiedPhrase(phrase);
    setTimeout(() => setCopiedPhrase(null), 1500);
    onShowToast(`Copied "${phrase}"`, 'success');
  };

  // Set of currently active/selected lengths
  const activeLengthsSet = useMemo(() => {
    if (dragPreview) {
      const minL = Math.min(dragPreview.start, dragPreview.current);
      const maxL = Math.max(dragPreview.start, dragPreview.current);
      const set = new Set<number>();
      for (let l = minL; l <= maxL; l++) set.add(l);
      return set;
    }
    if (selectedLengthFilter === null || selectedLengthFilter === undefined) {
      return new Set<number>();
    }
    if (Array.isArray(selectedLengthFilter)) {
      return new Set(selectedLengthFilter);
    }
    return new Set([selectedLengthFilter]);
  }, [dragPreview, selectedLengthFilter]);

  // Handle pointer down on a histogram bar to initiate range drag or click
  const handleBarPointerDown = useCallback((e: React.PointerEvent, len: number) => {
    if (e.button !== 0) return;
    if (isDragging) return;

    isRangeDraggingRef.current = true;
    dragMovedRef.current = false;
    rangeDragStartRef.current = len;
    rangeDragCurrentRef.current = len;
    setDragPreview({ start: len, current: len });
  }, [isDragging]);

  // Global pointer listeners for range drag across histogram bars
  useEffect(() => {
    const handleGlobalPointerMove = (e: PointerEvent) => {
      if (!isRangeDraggingRef.current) return;
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const barEl = el?.closest('[data-bar-length]');
      if (barEl) {
        const len = Number(barEl.getAttribute('data-bar-length'));
        if (!isNaN(len) && len !== rangeDragCurrentRef.current) {
          dragMovedRef.current = true;
          rangeDragCurrentRef.current = len;
          setDragPreview({ start: rangeDragStartRef.current!, current: len });
        }
      }
    };

    const handleGlobalPointerUp = (e: PointerEvent) => {
      if (!isRangeDraggingRef.current) return;
      isRangeDraggingRef.current = false;

      const start = rangeDragStartRef.current;
      const curr = rangeDragCurrentRef.current;
      const hasMoved = dragMovedRef.current;

      rangeDragStartRef.current = null;
      rangeDragCurrentRef.current = null;
      setDragPreview(null);

      if (start === null) return;
      const end = curr !== null ? curr : start;
      const minL = Math.min(start, end);
      const maxL = Math.max(start, end);

      if (!hasMoved || minL === maxL) {
        // Single bar click / toggle
        const currentArray = Array.isArray(selectedLengthFilter)
          ? selectedLengthFilter
          : selectedLengthFilter !== null
          ? [selectedLengthFilter]
          : [];

        if (e.shiftKey || e.metaKey || e.ctrlKey) {
          if (currentArray.includes(minL)) {
            const filtered = currentArray.filter(l => l !== minL);
            onSelectLengthFilter(filtered.length > 0 ? filtered : null);
          } else {
            onSelectLengthFilter([...currentArray, minL].sort((a, b) => a - b));
          }
        } else {
          // If only this single bar is currently selected, toggle it off!
          if (currentArray.length === 1 && currentArray[0] === minL) {
            onSelectLengthFilter(null);
          } else {
            onSelectLengthFilter([minL]);
          }
        }
      } else {
        // Range dragged across minL..maxL
        const range: number[] = [];
        for (let l = minL; l <= maxL; l++) {
          range.push(l);
        }

        if (e.shiftKey || e.metaKey || e.ctrlKey) {
          const currentSet = new Set(
            Array.isArray(selectedLengthFilter)
              ? selectedLengthFilter
              : selectedLengthFilter !== null
              ? [selectedLengthFilter]
              : []
          );
          range.forEach(l => currentSet.add(l));
          onSelectLengthFilter(Array.from(currentSet).sort((a, b) => a - b));
        } else {
          onSelectLengthFilter(range);
        }
      }
    };

    window.addEventListener('pointermove', handleGlobalPointerMove);
    window.addEventListener('pointerup', handleGlobalPointerUp);
    window.addEventListener('pointercancel', handleGlobalPointerUp);

    return () => {
      window.removeEventListener('pointermove', handleGlobalPointerMove);
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('pointercancel', handleGlobalPointerUp);
    };
  }, [selectedLengthFilter, onSelectLengthFilter]);

  // Adaptively adjust on window resize if user hasn't manually customized
  useEffect(() => {
    if (hasUserCustomizedSplit) return;
    const handleResize = () => {
      setSplitRatio(getAdaptiveSplit());
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [hasUserCustomizedSplit]);

  const startDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setHasUserCustomizedSplit(true);
    setIsDragging(true);
  }, []);

  const resetAdaptiveSplit = useCallback(() => {
    setHasUserCustomizedSplit(false);
    setSplitRatio(getAdaptiveSplit());
  }, []);

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relativeX = (e.clientX - rect.left) / rect.width;
    const clampedX = Math.max(0.25, Math.min(0.85, relativeX));
    setSplitRatio(clampedX);
  }, [isDragging]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (!isDragging) return;
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [isDragging, handlePointerMove, handlePointerUp]);

  const maxHistogramCount = useMemo(() => {
    return Math.max(1, ...histogramData.map(d => d.count));
  }, [histogramData]);

  const totalWords = useMemo(() => {
    return histogramData.reduce((acc, curr) => acc + curr.count, 0);
  }, [histogramData]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative flex flex-row items-stretch min-h-0 text-zinc-900 select-none overflow-hidden bg-transparent"
    >
      {/* LEFT: Constellation Graph View (Separate Panel) */}
      <div
        className={`h-full relative min-w-[120px] bg-white border-2 border-black rounded-[18px] sm:rounded-[22px] overflow-hidden transition-all ${
          isDragging ? 'duration-0' : 'duration-300 ease-out'
        }`}
        style={{
          width: totalWords > 0 ? `${splitRatio * 100}%` : '100%',
        }}
      >
        <WordsGraphView
          sourceText={sourceText}
          candidateWords={candidateWords}
          selectedLengthFilter={selectedLengthFilter}
          onAddWordToTarget={onAddWordToTarget}
          onSetWordAsTarget={onSetWordAsTarget}
          activeTargetPhrase={activeTargetPhrase}
          onShowToast={onShowToast}
        />
      </div>

      {/* DRAGGABLE VERTICAL RESIZER DIVIDER */}
      {totalWords > 0 && (
        <div
          role="separator"
          onPointerDown={startDrag}
          onDoubleClick={resetAdaptiveSplit}
          className={`w-2.5 shrink-0 z-30 cursor-col-resize hover:bg-black/10 active:bg-black/20 relative transition-colors ${
            isDragging ? 'bg-black/15' : 'bg-transparent'
          }`}
          style={{ touchAction: 'none' }}
          title="Drag to resize left/right panels (Double-click to reset adaptive sizing)"
        />
      )}

      {/* RIGHT: Dual Card Column (Top Card & Bottom Card matching red boxes) */}
      {totalWords > 0 && (
        <div
          className={`h-full shrink-0 flex flex-col gap-2 min-w-[140px] sm:min-w-[170px] transition-all ${
            isDragging ? 'duration-0' : 'duration-300 ease-out'
          }`}
          style={{
            width: `calc(${(1 - splitRatio) * 100}% - 10px)`,
          }}
        >
          {/* TOP CARD (Red Box 1): Solved Anagrams & Suggestions */}
          <div className="flex-1 min-h-0 bg-white border-2 border-black rounded-[18px] sm:rounded-[22px] overflow-hidden flex flex-col p-2.5 shadow-sm">
            {/* Body */}
            <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-1">
              {topTab === 'anagrams' ? (
                isSolving ? (
                  <div className="h-full flex flex-col items-center justify-center p-3 text-center">
                    <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mb-1" />
                    <span className="text-[10px] font-mono text-zinc-400">Solving...</span>
                  </div>
                ) : results && results.length > 0 ? (
                  results.slice(0, 50).map((r, idx) => (
                    <div
                      key={idx}
                      onClick={() => onSetWordAsTarget(r.phrase)}
                      className="group flex items-center justify-between p-1.5 rounded-lg hover:bg-emerald-50/80 border border-transparent hover:border-emerald-200 transition-all cursor-pointer select-none"
                      title="Click to remix this anagram"
                    >
                      <span className="text-[11px] font-mono font-bold text-zinc-800 group-hover:text-emerald-950 uppercase truncate pr-1">
                        {r.phrase}
                      </span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          type="button"
                          onClick={(e) => handleCopyPhrase(r.phrase, e)}
                          className="p-1 text-zinc-400 hover:text-zinc-700 transition-colors"
                          title="Copy"
                        >
                          {copiedPhrase === r.phrase ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                        <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex items-center justify-center text-center p-3">
                    <span className="text-[10px] font-mono text-zinc-400">No anagrams found</span>
                  </div>
                )
              ) : (
                /* Words tab */
                candidateWords.slice(0, 60).map((w, idx) => (
                  <div
                    key={idx}
                    onClick={() => onAddWordToTarget(w.word)}
                    className="group flex items-center justify-between p-1 rounded hover:bg-zinc-100 transition-colors cursor-pointer select-none"
                    title="Click to add word to remix"
                  >
                    <span className="text-[11px] font-mono font-semibold text-zinc-700 group-hover:text-zinc-950 uppercase">
                      {w.word}
                    </span>
                    <span className="text-[9px] font-mono text-zinc-400">
                      {w.length}L
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* BOTTOM CARD (Red Box 2): Word Length Histogram */}
          <div className="flex-1 min-h-0 bg-white border-2 border-black rounded-[18px] sm:rounded-[22px] overflow-hidden flex flex-col p-2.5 shadow-sm">
            {/* Vertical Histogram Bars */}
            <div
              className="flex-1 min-h-0 flex items-end justify-between gap-1 pt-2 pb-1 select-none touch-none"
              onDoubleClick={onClearLengthFilter}
              title="Click or drag across to select length range • Double-click empty area to clear"
            >
              {histogramData.map(item => {
                const isSelected = activeLengthsSet.has(item.length);
                const heightPercent = item.count > 0 ? Math.max(14, (item.count / maxHistogramCount) * 100) : 0;

                return (
                  <div
                    key={item.length}
                    data-bar-length={item.length}
                    onPointerDown={(e) => handleBarPointerDown(e, item.length)}
                    onPointerEnter={() => {
                      if (isRangeDraggingRef.current && rangeDragStartRef.current !== null) {
                        if (rangeDragCurrentRef.current !== item.length) {
                          dragMovedRef.current = true;
                          rangeDragCurrentRef.current = item.length;
                          setDragPreview({ start: rangeDragStartRef.current, current: item.length });
                        }
                      }
                    }}
                    className={`flex-1 flex flex-col items-center justify-end h-full group cursor-pointer transition-all rounded py-1 select-none ${
                      isSelected
                        ? 'bg-emerald-100/90 ring-1 ring-emerald-500 shadow-sm'
                        : 'hover:bg-zinc-200/60'
                    }`}
                    title={`${item.length}-letter words (${item.count} words) • Drag across to select range`}
                  >
                    {/* Count Label */}
                    <span
                      className={`text-[9px] font-mono mb-1 transition-colors ${
                        isSelected
                          ? 'text-emerald-950 font-bold'
                          : item.count > 0
                          ? 'text-zinc-700 group-hover:text-zinc-950 font-semibold'
                          : 'text-zinc-400'
                      }`}
                    >
                      {item.count}
                    </span>

                    {/* Vertical Bar */}
                    <div
                      className={`w-full max-w-[18px] rounded-t-sm transition-all duration-300 ease-out ${
                        isSelected
                          ? 'bg-emerald-600 shadow-[0_0_10px_rgba(5,150,105,0.45)]'
                          : item.count > 0
                          ? 'bg-zinc-400 group-hover:bg-zinc-600 group-hover:shadow-sm'
                          : 'bg-zinc-200'
                      }`}
                      style={{ height: `${heightPercent}%` }}
                    />

                    {/* Length Label */}
                    <span
                      className={`text-[9.5px] font-mono mt-1 ${
                        isSelected
                          ? 'text-emerald-950 font-bold'
                          : 'text-zinc-600 group-hover:text-zinc-900 font-medium'
                      }`}
                    >
                      {item.length}L
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
