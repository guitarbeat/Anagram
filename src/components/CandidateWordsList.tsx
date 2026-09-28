import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { WordsGraphView } from './WordsGraphView';
import { SplitDivider } from './SplitDivider';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import type { AnagramResult, CandidateWordItem, HistogramBin, LetterBudgetSummary, POS } from '../engine/types';
import { pos, isMatchingPos } from '../engine/lexicon';

export type { CandidateWordItem };

export interface CandidateWordsListProps {
  sourceText: string;
  candidateWords: CandidateWordItem[];
  selectedLengthFilter: number[] | number | null;
  onSelectLengthFilter: (lengths: number[] | null) => void;
  onClearLengthFilter: () => void;
  selectedPosFilter?: POS | 'all' | null;
  onSelectPosFilter?: (pos: POS | 'all' | null) => void;
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

const POS_FILTERS = [
  {
    id: 'all' as const,
    label: 'All',
    desc: 'All dictionary word types',
    details: 'Complete set of words formed by available letters',
    textColor: 'text-zinc-800',
    borderColor: 'border-zinc-300',
    activeBg: 'bg-zinc-900 border-zinc-900 text-white ring-zinc-900',
  },
  {
    id: 'noun' as const,
    label: 'Nouns',
    desc: 'Objects, entities, people & places',
    details: 'Substantive naming words and entities',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    activeBg: 'bg-blue-600 border-blue-600 text-white ring-blue-600',
  },
  {
    id: 'verb' as const,
    label: 'Verbs',
    desc: 'Action words, states & auxiliary verbs',
    details: 'Actions, states of being, and modal verbs',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-200',
    activeBg: 'bg-emerald-600 border-emerald-600 text-white ring-emerald-600',
  },
  {
    id: 'adj' as const,
    label: 'Adjectives',
    desc: 'Descriptors, qualities & attributes',
    details: 'Sensory properties, modifiers, and descriptors',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200',
    activeBg: 'bg-amber-600 border-amber-600 text-white ring-amber-600',
  },
  {
    id: 'adv' as const,
    label: 'Adverbs',
    desc: 'Modifiers of verbs & adjectives',
    details: 'Expressions of manner, degree, time, and frequency',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-200',
    activeBg: 'bg-purple-600 border-purple-600 text-white ring-purple-600',
  },
  {
    id: 'other' as const,
    label: 'Other',
    desc: 'Pronouns, prepositions, articles, conjunctions, & misc',
    details: 'pron (pronouns), prep (prepositions), art (articles/determiners), conj (conjunctions), other (misc)',
    textColor: 'text-slate-600',
    borderColor: 'border-slate-200',
    activeBg: 'bg-slate-700 border-slate-700 text-white ring-slate-700',
  },
] as const;

export const CandidateWordsList: React.FC<CandidateWordsListProps> = ({
  sourceText,
  candidateWords,
  selectedLengthFilter,
  onSelectLengthFilter,
  onClearLengthFilter,
  selectedPosFilter,
  onSelectPosFilter,
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
  const [internalPosFilter, setInternalPosFilter] = useState<POS | 'all' | null>(null);

  const activePosFilter = selectedPosFilter !== undefined ? selectedPosFilter : internalPosFilter;
  const handlePosFilterChange = (val: POS | 'all' | null) => {
    if (onSelectPosFilter) {
      onSelectPosFilter(val);
    } else {
      setInternalPosFilter(val);
    }
  };

  const posCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: candidateWords.length,
      noun: 0,
      verb: 0,
      adj: 0,
      adv: 0,
      other: 0,
    };
    for (let i = 0; i < candidateWords.length; i++) {
      const p = pos(candidateWords[i].word);
      if (counts[p] !== undefined) {
        counts[p]++;
      } else {
        counts.other++;
      }
    }
    return counts;
  }, [candidateWords]);

  // Breakdown of non-content word subtypes inside "Other"
  const otherSubtypeCounts = useMemo(() => {
    const subtypes = {
      pron: 0,
      prep: 0,
      art: 0,
      conj: 0,
      other: 0,
    };
    for (let i = 0; i < candidateWords.length; i++) {
      const p = pos(candidateWords[i].word);
      if (p === 'pron' || p === 'prep' || p === 'art' || p === 'conj' || p === 'other') {
        subtypes[p]++;
      }
    }
    return subtypes;
  }, [candidateWords]);

  // Auto-reset filter if active filter has 0 matching words
  useEffect(() => {
    if (activePosFilter && activePosFilter !== 'all') {
      if ((posCounts[activePosFilter] || 0) === 0) {
        handlePosFilterChange(null);
      }
    }
  }, [activePosFilter, posCounts]);

  const getAdaptiveSplit = () => {
    return 0.78; // Default wide graph on left (~78%), filter cards column on right (~22%)
  };

  const [splitRatio, setSplitRatio] = useState<number>(0.78);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [soloSubPanel, setSoloSubPanel] = useState<'graph' | 'cards' | null>(null);

  // Vertical split state for Right Column (Top Suggestions vs Bottom Histogram)
  const rightColumnRef = useRef<HTMLDivElement>(null);
  const [cardSplitRatio, setCardSplitRatio] = useState<number>(0.50);
  const [isCardDragging, setIsCardDragging] = useState<boolean>(false);
  const [isSuggestionsMinimized, setIsSuggestionsMinimized] = useState<boolean>(false);
  const [isHistogramMinimized, setIsHistogramMinimized] = useState<boolean>(false);

  // ResizeObserver for the bubble container to guarantee all bubbles fit without clipping
  const bubbleContainerRef = useRef<HTMLDivElement>(null);
  const [bubbleBoxSize, setBubbleBoxSize] = useState<{ width: number; height: number }>({
    width: 260,
    height: 200,
  });

  useEffect(() => {
    const el = bubbleContainerRef.current;
    if (!el) return;
    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setBubbleBoxSize({ width: rect.width, height: rect.height });
      }
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, [isSuggestionsMinimized, isHistogramMinimized, cardSplitRatio]);

  const startCardDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsCardDragging(true);
  }, []);

  const handleCardPointerMove = useCallback((e: PointerEvent) => {
    if (!isCardDragging || !rightColumnRef.current) return;
    const rect = rightColumnRef.current.getBoundingClientRect();
    const relativeY = (e.clientY - rect.top) / rect.height;
    const clampedY = Math.max(0.24, Math.min(0.80, relativeY));
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
    let clampedX = Math.max(0.20, Math.min(0.80, relativeX));
    // Magnetic snap to equal 50/50 split within 2.5%
    if (Math.abs(clampedX - 0.5) < 0.025) {
      clampedX = 0.5;
    }
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

  // Compute histogram data filtered by the active POS filter
  const effectiveHistogramData = useMemo(() => {
    if (!activePosFilter || activePosFilter === 'all') {
      return histogramData;
    }

    const filteredWords = candidateWords.filter(w => isMatchingPos(pos(w.word), activePosFilter));

    const minL = histogramData.length > 0 ? histogramData[0].length : 2;
    const maxL = histogramData.length > 0 ? histogramData[histogramData.length - 1].length : 12;

    const countMap = new Map<number, number>();
    for (let l = minL; l <= maxL; l++) {
      countMap.set(l, 0);
    }
    for (let i = 0; i < filteredWords.length; i++) {
      const len = filteredWords[i].length;
      countMap.set(len, (countMap.get(len) || 0) + 1);
    }

    const res: { length: number; count: number }[] = [];
    for (let l = minL; l <= maxL; l++) {
      res.push({
        length: l,
        count: countMap.get(l) || 0,
      });
    }
    return res;
  }, [candidateWords, activePosFilter, histogramData]);

  const maxHistogramCount = useMemo(() => {
    return Math.max(1, ...effectiveHistogramData.map(d => d.count));
  }, [effectiveHistogramData]);

  const totalFilteredWords = useMemo(() => {
    return effectiveHistogramData.reduce((acc, curr) => acc + curr.count, 0);
  }, [effectiveHistogramData]);

  const totalWords = useMemo(() => {
    return histogramData.reduce((acc, curr) => acc + curr.count, 0);
  }, [histogramData]);

  const showLeftGraph = totalWords > 0 && soloSubPanel !== 'cards';
  const showRightCards = totalWords > 0 && soloSubPanel !== 'graph';

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative flex flex-row items-stretch min-h-0 text-zinc-900 select-none overflow-hidden bg-transparent gap-0 animate-fade-in-up"
    >
      {/* MINIMIZED VERTICAL PILL FOR GRAPH ON LEFT */}
      {totalWords > 0 && soloSubPanel === 'cards' && (
        <div
          onClick={() => setSoloSubPanel(null)}
          className="h-full w-7 bg-zinc-900 hover:bg-zinc-800 border-2 border-black rounded-[14px] flex flex-col items-center justify-between py-3 cursor-pointer transition-colors shrink-0 text-white select-none shadow-md group"
          title="Expand Graph View"
        >
          <div className="flex flex-col items-center gap-1.5 [writing-mode:vertical-lr] rotate-180">
            <ChevronLeft className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-200 rotate-90 transition-colors" />
            <span className="text-[9.5px] font-mono text-zinc-400 group-hover:text-zinc-200 font-bold uppercase tracking-widest transition-colors">
              Graph View
            </span>
          </div>
          <span className="text-[9px] font-mono text-zinc-400 group-hover:text-zinc-200 font-bold uppercase [writing-mode:vertical-lr] rotate-180 transition-colors">
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
              : `calc(${splitRatio * 100}% - 7px)`,
          }}
        >
          <div className="flex-1 w-full h-full min-h-0">
            <WordsGraphView
              sourceText={sourceText}
              candidateWords={candidateWords}
              selectedLengthFilter={selectedLengthFilter}
              selectedPosFilter={activePosFilter}
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
        <SplitDivider
          orientation="vertical"
          isDragging={isDragging}
          onPointerDown={startDrag}
          onDoubleClick={resetAdaptiveSplit}
          title="Drag to resize left/right panels (Double-click to reset)"
          onCollapsePrev={(e) => {
            e.stopPropagation();
            setSoloSubPanel('cards');
          }}
          collapsePrevTitle="Minimize Graph (Show Cards)"
          collapsePrevIcon="left"
          onCollapseNext={(e) => {
            e.stopPropagation();
            setSoloSubPanel('graph');
          }}
          collapseNextTitle="Minimize Cards (Show Graph)"
          collapseNextIcon="right"
        />
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
              : `calc(${(1 - splitRatio) * 100}% - 7px)`,
          }}
        >
          {/* MINIMIZED HORIZONTAL PILL FOR SUGGESTIONS ON TOP */}
          {isSuggestionsMinimized && (
            <div
              onClick={() => setIsSuggestionsMinimized(false)}
              className="w-full h-9 sm:h-10 bg-[#111114] hover:bg-[#18181c] border border-zinc-800 hover:border-zinc-700 rounded-[14px] flex items-center justify-between px-3 cursor-pointer transition-all shrink-0 text-white select-none shadow-sm group"
              title="Expand Suggestions"
            >
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <span className="p-1 rounded-md bg-zinc-800/80 text-zinc-400 group-hover:text-zinc-200 transition-colors shrink-0">
                  <ChevronDown className="w-3.5 h-3.5 group-hover:translate-y-0.5 transition-transform" />
                </span>
                <span className="text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-200 group-hover:text-white transition-colors truncate">
                  Suggestions
                </span>
                <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-zinc-800/90 text-zinc-400 border border-zinc-700/60 shrink-0">
                  MINIMIZED
                </span>
              </div>
              <div className="flex items-center gap-1 text-zinc-400 group-hover:text-zinc-200 transition-colors shrink-0">
                <span className="text-[9.5px] font-mono font-bold uppercase tracking-wider">
                  Expand
                </span>
              </div>
            </div>
          )}

          {/* TOP CARD (Red Box 1): Solved Anagrams, Exact Closers & Suggestions */}
          {!isSuggestionsMinimized && (
            <div
              className="w-full bg-white border-2 border-black rounded-[18px] sm:rounded-[22px] overflow-hidden flex flex-col p-0 shadow-sm transition-all min-h-0"
              style={{
                height: isHistogramMinimized
                  ? '100%'
                  : `calc(${cardSplitRatio * 100}% - 8px)`,
                minHeight: '120px',
              }}
            >
              {/* Body: Floating Part of Speech Filter Bubbles */}
              <div className="flex-1 min-h-0 flex flex-col p-1.5 sm:p-2 select-none overflow-hidden relative">
                {/* Floating Filter Bubbles Container */}
                {candidateWords.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-2 text-center select-none">
                    <span className="text-[10px] font-mono text-zinc-400">No words available</span>
                  </div>
                ) : (
                  <div
                    ref={bubbleContainerRef}
                    className="flex-1 min-h-0 relative w-full h-full flex flex-col overflow-y-auto overflow-x-hidden p-1.5 sm:p-2 select-none scrollbar-none"
                  >
                    <style>{`
                      @keyframes bubbleFloat1 {
                        0%, 100% { transform: translateY(0px) translateX(0px); }
                        50% { transform: translateY(-4px) translateX(2px); }
                      }
                      @keyframes bubbleFloat2 {
                        0%, 100% { transform: translateY(0px) translateX(0px); }
                        50% { transform: translateY(3px) translateX(-2px); }
                      }
                      @keyframes bubbleFloat3 {
                        0%, 100% { transform: translateY(0px) translateX(0px); }
                        50% { transform: translateY(-3px) translateX(-2px); }
                      }
                      @keyframes bubbleFloat4 {
                        0%, 100% { transform: translateY(0px) translateX(0px); }
                        50% { transform: translateY(4px) translateX(2px); }
                      }
                      @keyframes bubbleFloat5 {
                        0%, 100% { transform: translateY(0px) translateX(0px); }
                        50% { transform: translateY(-3px) translateX(2px); }
                      }
                      @keyframes bubbleFloat6 {
                        0%, 100% { transform: translateY(0px) translateX(0px); }
                        50% { transform: translateY(3px) translateX(-2px); }
                      }
                    `}</style>
                    {(() => {
                      const visibleFilters = POS_FILTERS.filter(
                        filter => (posCounts[filter.id] || 0) > 0
                      );
                      const counts = visibleFilters.map(f => posCounts[f.id] || 0);
                      const maxCount = Math.max(...counts, 1);
                      const minCount = Math.min(...counts, 1);
                      const hasVariation = maxCount > minCount;

                      const availW = Math.max(130, bubbleBoxSize.width);
                      const availH = Math.max(90, bubbleBoxSize.height);

                      // Determine rows and columns based on aspect ratio of the card
                      const rowEstimate = availW >= 280 ? 2 : availH < 170 ? 2 : 3;
                      const colEstimate = Math.max(2, Math.ceil(visibleFilters.length / rowEstimate));

                      const maxPossibleH = Math.floor((availH - 20) / rowEstimate);
                      const maxPossibleW = Math.floor((availW - 20) / colEstimate);
                      const safeMaxDiam = Math.max(34, Math.min(maxPossibleH, maxPossibleW, 76));

                      const minDiameter = Math.max(32, Math.min(50, Math.round(safeMaxDiam * 0.74)));
                      const maxDiameter = Math.max(minDiameter + 6, safeMaxDiam);

                      return (
                        <div className="m-auto flex flex-wrap items-center justify-center content-center gap-2 sm:gap-2.5 w-full py-1">
                          {visibleFilters.map((filter, idx) => {
                            const count = posCounts[filter.id] || 0;
                            const isSelected =
                              activePosFilter === filter.id ||
                              (filter.id === 'all' && (!activePosFilter || activePosFilter === 'all'));
                            const animName = `bubbleFloat${(idx % 6) + 1}`;
                            const animDuration = `${3.2 + (idx % 3) * 0.8}s`;
                            const animDelay = `${(idx * 0.4).toFixed(2)}s`;

                            const ratio = hasVariation
                              ? Math.sqrt((count - minCount) / (maxCount - minCount))
                              : 0.5;
                            const diameter = Math.round(minDiameter + ratio * (maxDiameter - minDiameter));

                            const displayLabel =
                              diameter < 52
                                ? filter.id === 'adj'
                                  ? 'ADJ'
                                  : filter.id === 'adv'
                                  ? 'ADV'
                                  : filter.id === 'noun'
                                  ? 'NOUN'
                                  : filter.label
                                : filter.label;

                            return (
                              <button
                                key={filter.id}
                                type="button"
                                onClick={() => {
                                  if (filter.id === 'all' || activePosFilter === filter.id) {
                                    handlePosFilterChange(null);
                                  } else {
                                    handlePosFilterChange(filter.id as POS);
                                  }
                                }}
                                style={{
                                  width: `${diameter}px`,
                                  height: `${diameter}px`,
                                  animation: `${animName} ${animDuration} ease-in-out infinite alternate`,
                                  animationDelay: animDelay,
                                }}
                                className={`group rounded-full border-2 transition-transform duration-200 cursor-pointer select-none flex flex-col items-center justify-center p-1 relative shadow-xs hover:scale-110 active:scale-95 shrink-0 ${
                                  isSelected
                                    ? `${filter.activeBg} font-bold shadow-md ring-2 ring-offset-1`
                                    : `bg-white hover:bg-zinc-50 ${filter.borderColor} ${filter.textColor}`
                                }`}
                                title={
                                  filter.id === 'other'
                                    ? `OTHER (${count} words)\nNon-content grammatical words:\n• Pronouns (pron): ${otherSubtypeCounts.pron}\n• Prepositions (prep): ${otherSubtypeCounts.prep}\n• Articles/Determiners (art): ${otherSubtypeCounts.art}\n• Conjunctions (conj): ${otherSubtypeCounts.conj}\n• Miscellaneous (other): ${otherSubtypeCounts.other}`
                                    : `${filter.label} (${count} words) — ${filter.desc}`
                                }
                              >
                                <span
                                  className={`font-mono font-bold uppercase leading-none mb-0.5 text-center px-0.5 max-w-full ${
                                    displayLabel.length >= 8
                                      ? diameter >= 66
                                        ? 'text-[8.5px] sm:text-[9px] tracking-tighter'
                                        : 'text-[7px] tracking-tighter'
                                      : displayLabel.length >= 6
                                      ? diameter >= 66
                                        ? 'text-[9.5px] sm:text-[10px] tracking-tight'
                                        : 'text-[7.5px] tracking-tight'
                                      : diameter >= 64
                                      ? 'text-[11px] sm:text-xs tracking-wider'
                                      : diameter >= 48
                                      ? 'text-[9px] sm:text-[9.5px] tracking-wide'
                                      : 'text-[7.5px] tracking-normal'
                                  }`}
                                >
                                  {displayLabel}
                                </span>
                                <span
                                  className={`font-mono font-bold rounded-full leading-tight shrink-0 ${
                                    diameter >= 64
                                      ? 'text-xs sm:text-[13px] px-2 py-0.5'
                                      : diameter >= 48
                                      ? 'text-[9.5px] sm:text-[10.5px] px-1.5 py-0.2'
                                      : 'text-[8.5px] px-1 py-0.1'
                                  } ${
                                    isSelected
                                      ? 'bg-white/25 text-white'
                                      : 'bg-zinc-100 text-zinc-700 group-hover:bg-zinc-200 group-hover:text-zinc-900'
                                  }`}
                                >
                                  {count}
                                </span>
                                {filter.id === 'other' && diameter >= 66 && (
                                  <span
                                    className={`text-[7px] font-mono leading-none mt-0.5 text-center truncate max-w-full ${
                                      isSelected ? 'text-slate-200/90' : 'text-slate-500'
                                    }`}
                                  >
                                    pron·prep·conj
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* HORIZONTAL DRAGGABLE DIVIDER BETWEEN TOP & BOTTOM CARD */}
          {!isSuggestionsMinimized && !isHistogramMinimized && (
            <SplitDivider
              orientation="horizontal"
              isDragging={isCardDragging}
              onPointerDown={startCardDrag}
              onDoubleClick={() => setCardSplitRatio(0.5)}
              title="Drag to resize (Double-click to reset 50/50)"
              onCollapsePrev={(e) => {
                e.stopPropagation();
                setIsSuggestionsMinimized(true);
              }}
              collapsePrevTitle="Minimize Suggestions"
              collapsePrevIcon="up"
              onCollapseNext={(e) => {
                e.stopPropagation();
                setIsHistogramMinimized(true);
              }}
              collapseNextTitle="Minimize Histogram"
              collapseNextIcon="down"
              className="-my-1.5 !py-0 !my-0 !h-1"
            />
          )}

          {/* BOTTOM CARD (Red Box 2): Word Length Histogram */}
          {!isHistogramMinimized && (
            <div
              className="w-full bg-white border-2 border-black rounded-[18px] sm:rounded-[22px] overflow-hidden flex flex-col p-0 shadow-sm transition-all min-h-0 flex-1 relative"
              style={{
                height: isSuggestionsMinimized
                  ? '100%'
                  : `calc(${(1 - cardSplitRatio) * 100}% - 8px)`,
                minHeight: '70px',
              }}
            >
              {/* Active Filter Label (Top-Left) */}
              {activePosFilter && activePosFilter !== 'all' && (
                <div className="absolute top-1.5 left-2.5 z-10 text-[9.5px] font-mono font-bold text-zinc-600 uppercase tracking-wider flex items-center gap-1.5 pointer-events-none select-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>{POS_FILTERS.find(f => f.id === activePosFilter)?.label || activePosFilter}</span>
                  <span className="text-zinc-400">({totalFilteredWords})</span>
                </div>
              )}

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
                {effectiveHistogramData.map(item => {
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
                          : item.count > 0
                          ? 'hover:bg-zinc-100'
                          : 'opacity-40 hover:bg-transparent'
                      }`}
                    >
                      {/* Count Label */}
                      <span
                        className={`text-[9px] font-mono mb-1 transition-colors ${
                          isSelected
                            ? 'text-emerald-950 font-bold'
                            : item.count > 0
                            ? 'text-zinc-700 group-hover:text-zinc-950 font-semibold'
                            : 'text-zinc-300'
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
                            : item.count > 0
                            ? 'text-zinc-600 group-hover:text-zinc-900 font-medium'
                            : 'text-zinc-400'
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
              className="w-full h-9 sm:h-10 bg-[#111114] hover:bg-[#18181c] border border-zinc-800 hover:border-zinc-700 rounded-[14px] flex items-center justify-between px-3 cursor-pointer transition-all shrink-0 text-white select-none shadow-sm group"
              title="Expand Histogram"
            >
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <span className="p-1 rounded-md bg-zinc-800/80 text-zinc-400 group-hover:text-zinc-200 group-hover:-translate-y-0.5 transition-transform shrink-0">
                  <ChevronUp className="w-3.5 h-3.5" />
                </span>
                <span className="text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-200 group-hover:text-white transition-colors truncate">
                  Histogram
                </span>
                <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-zinc-800/90 text-zinc-400 border border-zinc-700/60 shrink-0">
                  MINIMIZED
                </span>
              </div>
              <div className="flex items-center gap-1 text-zinc-400 group-hover:text-zinc-200 transition-colors shrink-0">
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
          className="h-full w-7 bg-zinc-900 hover:bg-zinc-800 border-2 border-black rounded-[14px] flex flex-col items-center justify-between py-3 cursor-pointer transition-colors shrink-0 text-white select-none shadow-md group"
          title="Expand Suggestions & Histogram"
        >
          <div className="flex flex-col items-center gap-1.5 [writing-mode:vertical-lr]">
            <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-200 -rotate-90 transition-colors" />
            <span className="text-[9.5px] font-mono text-zinc-400 group-hover:text-zinc-200 font-bold uppercase tracking-widest transition-colors">
              Suggestions & Histogram
            </span>
          </div>
          <span className="text-[9px] font-mono text-zinc-400 group-hover:text-zinc-200 font-bold uppercase [writing-mode:vertical-lr] transition-colors">
            Expand
          </span>
        </div>
      )}
    </div>
  );
};
