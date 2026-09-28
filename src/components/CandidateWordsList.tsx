import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { WordsGraphView } from './WordsGraphView';
import {
  Sparkles,
  Copy,
  Check,
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Maximize2,
  Minimize2,
  RotateCcw,
} from 'lucide-react';
import type { AnagramResult, CandidateWordItem, HistogramBin, LetterBudgetSummary } from '../engine/types';

export type { CandidateWordItem };

export interface CandidateWordsListProps {
  sourceText: string;
  candidateWords: CandidateWordItem[];
  selectedLengthFilter: number[] | number | null;
  onSelectLengthFilter: (lengths: number[] | null) => void;
  onClearLengthFilter: () => void;
  histogramData: HistogramBin[];
  onAddWordToTarget: (word: string) => void;
  onSetWordAsTarget: (word: string) => void;
  activeTargetPhrase?: string;
  onShowToast: (text: string, type?: 'success' | 'info' | 'error') => void;
  results?: AnagramResult[];
  isSolving?: boolean;
  exactClosers?: string[];
  remainingLetters?: string[];
  surplusLetters?: string[];
  budget?: LetterBudgetSummary;
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
  exactClosers = [],
  remainingLetters = [],
  surplusLetters = [],
  budget: _budget,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasUserCustomizedSplit, setHasUserCustomizedSplit] = useState<boolean>(false);
  const [topTab, _setTopTab] = useState<'anagrams' | 'words'>('anagrams');
  const [copiedPhrase, setCopiedPhrase] = useState<string | null>(null);

  const getAdaptiveSplit = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      return 0.72; // Mobile
    }
    return 0.65; // Desktop
  };

  const [splitRatio, setSplitRatio] = useState<number>(getAdaptiveSplit);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [soloSubPanel, setSoloSubPanel] = useState<'graph' | 'cards' | null>(null);

  // Vertical split state for Right Column (Top Suggestions vs Bottom Histogram)
  const rightColumnRef = useRef<HTMLDivElement>(null);
  const [cardSplitRatio, setCardSplitRatio] = useState<number>(0.52);
  const [isCardDragging, setIsCardDragging] = useState<boolean>(false);
  const [isSuggestionsMinimized, setIsSuggestionsMinimized] = useState<boolean>(false);
  const [isHistogramMinimized, setIsHistogramMinimized] = useState<boolean>(false);

  const startCardDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsCardDragging(true);
  }, []);

  const handleCardPointerMove = useCallback((e: PointerEvent) => {
    if (!isCardDragging || !rightColumnRef.current) return;
    const rect = rightColumnRef.current.getBoundingClientRect();
    const relativeY = (e.clientY - rect.top) / rect.height;
    const clampedY = Math.max(0.15, Math.min(0.85, relativeY));
    setCardSplitRatio(clampedY);
  }, [isCardDragging]);

  const handleCardPointerUp = useCallback(() => {
    setIsCardDragging(false);
  }, []);

  useEffect(() => {
    if (!isCardDragging) return;
    window.addEventListener('pointermove', handleCardPointerMove);
    window.addEventListener('pointerup', handleCardPointerUp);
    window.addEventListener('pointercancel', handleCardPointerUp);
    return () => {
      window.removeEventListener('pointermove', handleCardPointerMove);
      window.removeEventListener('pointerup', handleCardPointerUp);
      window.removeEventListener('pointercancel', handleCardPointerUp);
    };
  }, [isCardDragging, handleCardPointerMove, handleCardPointerUp]);

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

  const showLeftGraph = totalWords > 0 && soloSubPanel !== 'cards';
  const showRightCards = totalWords > 0 && soloSubPanel !== 'graph';

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative flex flex-row items-stretch min-h-0 text-zinc-900 select-none overflow-hidden bg-transparent gap-0.5 animate-fade-in-up"
    >
      {/* MINIMIZED VERTICAL PILL FOR GRAPH ON LEFT */}
      {totalWords > 0 && soloSubPanel === 'cards' && (
        <div
          onClick={() => setSoloSubPanel(null)}
          className="h-full w-7 bg-zinc-900 hover:bg-zinc-800 border-2 border-black rounded-[14px] flex flex-col items-center justify-between py-3 cursor-pointer transition-colors shrink-0 text-white select-none shadow-md"
          title="Expand Graph View"
        >
          <div className="flex flex-col items-center gap-1.5 [writing-mode:vertical-lr] rotate-180">
            <ChevronLeft className="w-3.5 h-3.5 text-emerald-400 rotate-90" />
            <span className="text-[9.5px] font-mono text-zinc-400 font-bold uppercase tracking-widest">
              Graph View
            </span>
          </div>
          <span className="text-[9px] font-mono text-emerald-400 font-bold uppercase [writing-mode:vertical-lr] rotate-180">
            Expand
          </span>
        </div>
      )}

      {/* LEFT: Constellation Graph View (Separate Panel) */}
      {showLeftGraph && (
        <div
          className={`h-full relative min-w-[120px] bg-white border-2 border-black rounded-[18px] sm:rounded-[22px] overflow-hidden transition-all flex flex-col ${
            isDragging ? 'duration-0' : 'duration-300 ease-out'
          }`}
          style={{
            width: !showRightCards
              ? '100%'
              : `calc(${splitRatio * 100}% - 12px)`,
          }}
        >
          <div className="flex-1 w-full h-full min-h-0">
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
        </div>
      )}

      {/* DRAGGABLE VERTICAL RESIZER DIVIDER & MINIMIZE CONTROLS */}
      {showLeftGraph && showRightCards && (
        <div
          role="separator"
          onPointerDown={startDrag}
          onDoubleClick={resetAdaptiveSplit}
          className="w-6 shrink-0 z-30 cursor-col-resize relative flex flex-col items-center justify-center transition-all group"
          style={{ touchAction: 'none' }}
          title="Drag to resize left/right panels (Double-click to reset)"
        >
          {/* Razor-thin continuous vertical line with active emerald laser highlight */}
          <div
            className={`absolute inset-y-0 w-[1px] transition-colors duration-300 ${
              isDragging ? 'bg-emerald-500/80 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-zinc-800 group-hover:bg-zinc-700'
            }`}
          />

          {/* High-fidelity vertical glass capsule controller handle that fits snugly inside divider */}
          <div
            className={`relative z-10 flex flex-col items-center gap-1 p-0.5 w-[20px] rounded-full bg-[#09090b]/95 backdrop-blur-md transition-all duration-300 pointer-events-auto ${
              isDragging
                ? 'border border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.25)] scale-105'
                : 'border border-zinc-800/80 group-hover:border-emerald-500/50 hover:shadow-[0_0_15px_rgba(16,185,129,0.22)] shadow-lg group-hover:scale-105'
            }`}
          >
            {/* Top Collapse Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSoloSubPanel('cards');
              }}
              className="w-4 h-4 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-emerald-400 transition-colors cursor-pointer flex items-center justify-center"
              title="Minimize Graph (Show Cards)"
            >
              <ChevronLeft className="w-2.5 h-2.5" />
            </button>

            {/* Tiny grip indicator */}
            <div className="flex flex-col gap-0.5 justify-center items-center py-0.5 opacity-40 group-hover:opacity-100 transition-opacity">
              <div className="w-1 h-1 rounded-full bg-zinc-500" />
              <div className="w-1 h-1 rounded-full bg-zinc-500" />
            </div>

            {/* Bottom Collapse Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSoloSubPanel('graph');
              }}
              className="w-4 h-4 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-emerald-400 transition-colors cursor-pointer flex items-center justify-center"
              title="Minimize Cards (Show Graph)"
            >
              <ChevronRight className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>
      )}

      {/* RIGHT: Dual Card Column (Top Card & Bottom Card) */}
      {showRightCards && (
        <div
          ref={rightColumnRef}
          className={`h-full relative flex flex-col gap-1.5 min-w-[140px] sm:min-w-[170px] transition-all ${
            !showLeftGraph ? 'flex-1' : 'shrink-0'
          } ${isDragging || isCardDragging ? 'duration-0' : 'duration-300 ease-out'}`}
          style={{
            width: !showLeftGraph
              ? '100%'
              : `calc(${(1 - splitRatio) * 100}% - 12px)`,
          }}
        >
          {/* MINIMIZED HORIZONTAL PILL FOR SUGGESTIONS ON TOP */}
          {isSuggestionsMinimized && (
            <div
              onClick={() => setIsSuggestionsMinimized(false)}
              className="w-full h-9 sm:h-10 bg-[#111114] hover:bg-[#18181c] border border-zinc-800 hover:border-emerald-500/50 rounded-[14px] flex items-center justify-between px-3 cursor-pointer transition-all shrink-0 text-white select-none shadow-sm group"
              title="Expand Suggestions"
            >
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <span className="p-1 rounded-md bg-zinc-800/80 text-emerald-400 group-hover:bg-emerald-500/10 group-hover:text-emerald-300 transition-colors shrink-0">
                  <ChevronDown className="w-3.5 h-3.5 group-hover:translate-y-0.5 transition-transform" />
                </span>
                <span className="text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-200 group-hover:text-white transition-colors truncate">
                  Suggestions
                </span>
                <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-zinc-800/90 text-zinc-400 border border-zinc-700/60 shrink-0">
                  MINIMIZED
                </span>
              </div>
              <div className="flex items-center gap-1 text-emerald-400 group-hover:text-emerald-300 transition-colors shrink-0">
                <span className="text-[9.5px] font-mono font-bold uppercase tracking-wider">
                  Expand
                </span>
              </div>
            </div>
          )}

          {/* TOP CARD (Red Box 1): Solved Anagrams, Exact Closers & Suggestions */}
          {!isSuggestionsMinimized && (
            <div
              className="w-full bg-white border-2 border-black rounded-[18px] sm:rounded-[22px] overflow-hidden flex flex-col p-2 sm:p-2.5 shadow-sm transition-all min-h-0"
              style={{
                height: isHistogramMinimized
                  ? '100%'
                  : `calc(${cardSplitRatio * 100}% - 12px)`,
                minHeight: '80px',
              }}
            >
              {/* Body */}
              <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-1">
                {/* Case 1: Surplus Illegal Letter */}
                {surplusLetters.length > 0 ? (
                  <div className="h-full flex flex-col items-center justify-center p-3 text-center select-none">
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center mb-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-950 uppercase tracking-wide">
                      Surplus: {surplusLetters.join(' ').toUpperCase()}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500 mt-1">
                      Remove extra letters to form valid anagram
                    </span>
                  </div>
                ) : exactClosers.length > 0 && activeTargetPhrase.trim().length > 0 ? (
                  /* Case 2: Exact Closers (100% finishing words for leftover letters) */
                  exactClosers.slice(0, 50).map((closer, idx) => (
                    <div
                      key={idx}
                      onClick={() => onAddWordToTarget(closer)}
                      className="group flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-emerald-50/80 hover:bg-emerald-100 border border-emerald-200/90 transition-all cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-1.5 min-w-0 pr-1">
                        <span className="text-xs font-mono font-bold text-emerald-700 shrink-0">+</span>
                        <span className="text-xs sm:text-[13px] font-mono font-bold text-emerald-950 uppercase tracking-wide truncate">
                          {closer}
                        </span>
                      </div>
                      <span className="text-[9px] font-mono bg-emerald-600 text-white font-bold px-1.5 py-0.5 rounded shrink-0 shadow-xs">
                        100%
                      </span>
                    </div>
                  ))
                ) : isSolving ? (
                  /* Case 3: Solving */
                  <div className="h-full flex flex-col items-center justify-center p-3 text-center">
                    <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mb-1.5" />
                    <span className="text-xs font-mono font-bold text-zinc-600">Solving Anagrams...</span>
                    <span className="text-[10px] font-mono text-zinc-400 mt-0.5">Searching dictionary combinations</span>
                  </div>
                ) : results && results.length > 0 ? (
                  /* Case 4: Full Solved Anagram Phrases */
                  results.slice(0, 60).map((r, idx) => {
                    const isActive = activeTargetPhrase.trim().toUpperCase() === r.phrase.trim().toUpperCase();
                    return (
                      <div
                        key={idx}
                        onClick={() => onSetWordAsTarget(r.phrase)}
                        className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer select-none ${
                          isActive
                            ? 'bg-emerald-100/90 border-emerald-400 text-emerald-950 shadow-xs'
                            : 'bg-zinc-50/60 hover:bg-emerald-50/80 border-zinc-200/60 hover:border-emerald-300 text-zinc-900'
                        }`}
                      >
                        <span className="text-xs sm:text-[12.5px] font-mono font-bold uppercase tracking-wider truncate pr-1">
                          {r.phrase}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => handleCopyPhrase(r.phrase, e)}
                            className="p-1 rounded text-zinc-400 hover:text-zinc-800 hover:bg-white/80 transition-colors"
                            aria-label="Copy phrase"
                          >
                            {copiedPhrase === r.phrase ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-zinc-200/80 group-hover:bg-emerald-600 group-hover:text-white text-zinc-600 transition-colors text-[9px] font-mono font-bold">
                            <span>Stage</span>
                            <ArrowUpRight className="w-2.5 h-2.5" />
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : candidateWords.length > 0 ? (
                  /* Case 5: Candidate words */
                  candidateWords.slice(0, 60).map((w, idx) => (
                    <div
                      key={idx}
                      onClick={() => onAddWordToTarget(w.word)}
                      className="group flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-zinc-50/60 hover:bg-emerald-50/80 border border-zinc-200/60 hover:border-emerald-300 transition-colors cursor-pointer select-none"
                    >
                      <span className="text-xs font-mono font-bold text-zinc-800 group-hover:text-emerald-950 uppercase tracking-wide">
                        {w.word}
                      </span>
                      <span className="text-[9px] font-mono font-bold text-zinc-500 bg-zinc-200/80 group-hover:bg-emerald-200/80 group-hover:text-emerald-900 px-1.5 py-0.5 rounded">
                        {w.length}L
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex items-center justify-center text-center p-3">
                    <span className="text-xs font-mono text-zinc-400">No suggestions</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* HORIZONTAL DRAGGABLE DIVIDER BETWEEN TOP & BOTTOM CARD */}
          {!isSuggestionsMinimized && !isHistogramMinimized && (
            <div
              role="separator"
              onPointerDown={startCardDrag}
              onDoubleClick={() => setCardSplitRatio(0.52)}
              className="w-full h-6 flex items-center justify-center cursor-row-resize select-none touch-none shrink-0 relative group"
              style={{ touchAction: 'none' }}
              title="Drag to resize (Double-click to reset 50/50)"
            >
              {/* Razor-thin continuous horizontal line with active emerald laser highlight */}
              <div
                className={`absolute inset-x-0 h-[1px] transition-colors duration-300 ${
                  isCardDragging ? 'bg-emerald-500/80 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-zinc-800 group-hover:bg-zinc-700'
                }`}
              />

              {/* High-fidelity horizontal glass capsule controller handle that fits snugly inside divider */}
              <div
                className={`relative z-10 flex items-center gap-1.5 px-1.5 py-0.5 h-5 rounded-full bg-[#09090b]/95 backdrop-blur-md transition-all duration-300 pointer-events-auto ${
                  isCardDragging
                    ? 'border border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.25)] scale-105'
                    : 'border border-zinc-800/80 group-hover:border-emerald-500/50 hover:shadow-[0_0_15px_rgba(16,185,129,0.22)] shadow-lg group-hover:scale-105'
                }`}
              >
                {/* Button to minimize top card (Suggestions) */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsSuggestionsMinimized(true);
                  }}
                  className="w-4 h-4 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-emerald-400 transition-colors cursor-pointer flex items-center justify-center"
                  title="Minimize Suggestions"
                >
                  <ChevronUp className="w-2.5 h-2.5" />
                </button>

                {/* Tiny grip indicator */}
                <div className="flex gap-0.5 justify-center items-center px-0.5 opacity-40 group-hover:opacity-100 transition-opacity">
                  <div className="w-0.5 h-0.5 rounded-full bg-zinc-500" />
                  <div className="w-0.5 h-0.5 rounded-full bg-zinc-500" />
                  <div className="w-0.5 h-0.5 rounded-full bg-zinc-500" />
                </div>

                {/* Button to minimize bottom card (Histogram) */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsHistogramMinimized(true);
                  }}
                  className="w-4 h-4 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-emerald-400 transition-colors cursor-pointer flex items-center justify-center"
                  title="Minimize Histogram"
                >
                  <ChevronDown className="w-2.5 h-2.5" />
                </button>
              </div>
            </div>
          )}

          {/* BOTTOM CARD (Red Box 2): Word Length Histogram */}
          {!isHistogramMinimized && (
            <div
              className="w-full bg-white border-2 border-black rounded-[18px] sm:rounded-[22px] overflow-hidden flex flex-col p-2 sm:p-2.5 shadow-sm transition-all min-h-0 flex-1 relative"
              style={{
                height: isSuggestionsMinimized
                  ? '100%'
                  : `calc(${(1 - cardSplitRatio) * 100}% - 12px)`,
                minHeight: '70px',
              }}
            >
              {selectedLengthFilter !== null && (
                <button
                  type="button"
                  onClick={onClearLengthFilter}
                  className="absolute top-1.5 right-1.5 z-10 text-[9px] font-mono font-bold text-emerald-700 hover:text-emerald-950 px-1.5 py-0.5 rounded bg-emerald-100 hover:bg-emerald-200 transition-colors shadow-xs"
                >
                  Clear Filter
                </button>
              )}

              {/* Vertical Histogram Bars */}
              <div
                className="flex-1 min-h-0 flex items-end justify-between gap-1 pt-2 pb-1 select-none touch-none"
                onDoubleClick={onClearLengthFilter}
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
                          ? 'bg-emerald-100/90 ring-1 ring-emerald-500 shadow-xs'
                          : 'hover:bg-zinc-100'
                      }`}
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
                            ? 'bg-emerald-600 shadow-[0_0_8px_rgba(5,150,105,0.4)]'
                            : item.count > 0
                            ? 'bg-zinc-400 group-hover:bg-zinc-700'
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
          )}

          {/* MINIMIZED HORIZONTAL PILL FOR HISTOGRAM AT BOTTOM */}
          {isHistogramMinimized && (
            <div
              onClick={() => setIsHistogramMinimized(false)}
              className="w-full h-9 sm:h-10 bg-[#111114] hover:bg-[#18181c] border border-zinc-800 hover:border-emerald-500/50 rounded-[14px] flex items-center justify-between px-3 cursor-pointer transition-all shrink-0 text-white select-none shadow-sm group"
              title="Expand Histogram"
            >
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <span className="p-1 rounded-md bg-zinc-800/80 text-emerald-400 group-hover:-translate-y-0.5 transition-transform shrink-0">
                  <ChevronUp className="w-3.5 h-3.5" />
                </span>
                <span className="text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-200 group-hover:text-white transition-colors truncate">
                  Histogram
                </span>
                <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-zinc-800/90 text-zinc-400 border border-zinc-700/60 shrink-0">
                  MINIMIZED
                </span>
              </div>
              <div className="flex items-center gap-1 text-emerald-400 group-hover:text-emerald-300 transition-colors shrink-0">
                <span className="text-[9.5px] font-mono font-bold uppercase tracking-wider">
                  Expand
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MINIMIZED VERTICAL PILL FOR CARDS ON RIGHT */}
      {totalWords > 0 && soloSubPanel === 'graph' && (
        <div
          onClick={() => setSoloSubPanel(null)}
          className="h-full w-7 bg-zinc-900 hover:bg-zinc-800 border-2 border-black rounded-[14px] flex flex-col items-center justify-between py-3 cursor-pointer transition-colors shrink-0 text-white select-none shadow-md"
          title="Expand Suggestions & Histogram"
        >
          <div className="flex flex-col items-center gap-1.5 [writing-mode:vertical-lr]">
            <ChevronRight className="w-3.5 h-3.5 text-emerald-400 -rotate-90" />
            <span className="text-[9.5px] font-mono text-zinc-400 font-bold uppercase tracking-widest">
              Suggestions & Histogram
            </span>
          </div>
          <span className="text-[9px] font-mono text-emerald-400 font-bold uppercase [writing-mode:vertical-lr]">
            Expand
          </span>
        </div>
      )}
    </div>
  );
};
