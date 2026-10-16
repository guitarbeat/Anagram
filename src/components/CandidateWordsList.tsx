import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { Layers, Network, LayoutGrid, ChevronDown, BarChart3 } from 'lucide-react';
import { WordsGraphView } from './WordsGraphView';
import { WordBlocksExplorer } from './WordBlocksExplorer';
import { WordPebblesExplorer, type WordSortOption } from './WordPebblesExplorer';
import { WordSolutionsExplorer } from './WordSolutionsExplorer';
import { ContextualLens } from './ContextualLens';
import type { CandidateWordItem, HistogramBin, POS, FinisherPair, AnagramResult } from '../engine/types';
import { pos, isMatchingPos, type FrequencyTier, getFrequencyTier } from '../engine/lexicon';
import { PosTreemap } from './PosTreemap';
import { WordLengthTreemap } from './WordLengthTreemap';
import { WordLengthHistogramSlider } from './WordLengthHistogramSlider';
import { PosHistogram } from './PosHistogram';
import { WordLengthLabels } from './WordLengthLabels';
import { PosLabels } from './PosLabels';
import type { WordFilterMode } from '../types/split';
import { BottomExplorerToolbar } from './BottomExplorerToolbar';

export type LexicalViewMode = 'treemap' | 'histogram' | 'labels';

export type { CandidateWordItem };

export interface CandidateWordsListProps {
  sourceText: string;
  candidateWords: CandidateWordItem[];
  selectedLengthFilter: number[] | number | null;
  onSelectLengthFilter: (lengths: number[] | null) => void;
  onClearLengthFilter: () => void;
  selectedPosFilter?: POS | 'all' | null;
  onSelectPosFilter?: (pos: POS | 'all' | null) => void;
  selectedFreqFilter?: FrequencyTier | 'all' | null;
  onSelectFreqFilter?: (tier: FrequencyTier | null) => void;
  onClearFreqFilter?: () => void;
  histogramData: HistogramBin[];
  onAddWordToTarget: (word: string) => void;
  onSetWordAsTarget: (word: string) => void;
  activeTargetPhrase?: string;
  onShowToast: (text: string, type?: 'success' | 'info' | 'error') => void;
  exactClosers?: string[];
  finisherPairs?: FinisherPair[];
  completeSolutions?: AnagramResult[];
  isSolvingSolutions?: boolean;
  remainingLetters?: string[];
  solvableWordsCount?: number;
  deadEndWordsCount?: number;

  // Hoisted Complication State & Callbacks
  inspectorCategory?: 'length' | 'pos';
  onInspectorCategoryChange?: (cat: 'length' | 'pos') => void;
  lexicalViewMode?: LexicalViewMode;
  onLexicalViewModeChange?: (mode: LexicalViewMode) => void;
  avoidDeadEnds?: boolean;
  onAvoidDeadEndsChange?: (val: boolean) => void;
  showGraphPanel?: boolean;
  showInspectorPanel?: boolean;
  explorerViewMode?:
    | 'both'
    | 'graph'
    | 'inspector'
    | 'blocks'
    | 'pebbles'
    | 'solutions'
    | 'cards';
  splitLeftView?: 'graph' | 'pebbles' | 'blocks' | 'solutions';
  onSplitLeftViewChange?: (view: 'graph' | 'pebbles' | 'blocks' | 'solutions') => void;
  splitRightView?: 'inspector' | 'blocks' | 'pebbles' | 'solutions';
  onSplitRightViewChange?: (view: 'inspector' | 'blocks' | 'pebbles' | 'solutions') => void;
  wordFilterMode?: WordFilterMode;
  countsByMode?: Record<WordFilterMode, number>;
  onCycleWordFilter?: () => void;
  onSelectWordFilterMode?: (mode: WordFilterMode) => void;
  customWordsCount?: number;
  onOpenCustomWordManager?: () => void;
}

export const CandidateWordsList: React.FC<CandidateWordsListProps> = ({
  sourceText,
  candidateWords,
  selectedLengthFilter,
  onSelectLengthFilter,
  onClearLengthFilter,
  selectedPosFilter,
  onSelectPosFilter,
  selectedFreqFilter,
  onSelectFreqFilter,
  onClearFreqFilter,
  histogramData,
  onAddWordToTarget,
  onSetWordAsTarget,
  activeTargetPhrase = '',
  onShowToast,
  exactClosers = [],
  finisherPairs = [],
  completeSolutions = [],
  isSolvingSolutions = false,
  remainingLetters = [],
  solvableWordsCount = 0,
  deadEndWordsCount = 0,
  inspectorCategory: externalInspectorCategory,
  onInspectorCategoryChange,
  lexicalViewMode: externalLexicalViewMode,
  onLexicalViewModeChange,
  avoidDeadEnds: externalAvoidDeadEnds,
  onAvoidDeadEndsChange,
  showGraphPanel = true,
  showInspectorPanel = true,
  explorerViewMode = 'both',
  splitLeftView: externalSplitLeftView,
  onSplitLeftViewChange,
  splitRightView: externalSplitRightView,
  onSplitRightViewChange,
  wordFilterMode,
  countsByMode,
  onCycleWordFilter,
  onSelectWordFilterMode,
  customWordsCount,
  onOpenCustomWordManager,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<WordSortOption>('length-desc');
  const [internalSplitLeft, setInternalSplitLeft] = useState<'graph' | 'pebbles' | 'blocks' | 'solutions'>('pebbles');
  const [internalSplitRight, setInternalSplitRight] = useState<'inspector' | 'blocks' | 'pebbles' | 'solutions'>('inspector');
  const [selectedWord, setSelectedWord] = useState<CandidateWordItem | null>(null);
  const [mobileViewTab, setMobileViewTab] = useState<'words' | 'stats'>('words');
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState<boolean>(false);

  const currentLeftView = externalSplitLeftView || internalSplitLeft;
  const currentRightView = externalSplitRightView || internalSplitRight;

  const handleSplitLeftChange = useCallback(
    (view: 'graph' | 'pebbles' | 'blocks' | 'solutions') => {
      if (onSplitLeftViewChange) onSplitLeftViewChange(view);
      else setInternalSplitLeft(view);
    },
    [onSplitLeftViewChange]
  );

  const handleSplitRightChange = useCallback(
    (view: 'inspector' | 'blocks' | 'pebbles' | 'solutions') => {
      if (onSplitRightViewChange) onSplitRightViewChange(view);
      else setInternalSplitRight(view);
    },
    [onSplitRightViewChange]
  );
  const rightColumnRef = useRef<HTMLDivElement>(null);
  const [internalPosFilter, setInternalPosFilter] = useState<POS | 'all' | null>(null);
  const activePosFilter = selectedPosFilter !== undefined ? selectedPosFilter : internalPosFilter;
  const handlePosFilterChange = (val: POS | 'all' | null) => {
    if (onSelectPosFilter) {
      onSelectPosFilter(val);
    } else {
      setInternalPosFilter(val);
    }
  };

  // Avoid Dead-Ends Mode (Internal state fallback if not hoisted)
  const [internalAvoidDeadEnds, setInternalAvoidDeadEnds] = useState<boolean>(true);
  const avoidDeadEnds = externalAvoidDeadEnds !== undefined ? externalAvoidDeadEnds : internalAvoidDeadEnds;
  const setAvoidDeadEnds = onAvoidDeadEndsChange || setInternalAvoidDeadEnds;

  // Candidates filtered by solvability safety, frequency tier, length filter, and POS filter
  const safeCandidateWords = useMemo(() => {
    let list = candidateWords;
    if (avoidDeadEnds) {
      const filtered = list.filter(c => c.isSolvable !== false);
      if (filtered.length > 0) list = filtered;
    }
    if (selectedFreqFilter && selectedFreqFilter !== 'all') {
      const freqFiltered = list.filter(c => getFrequencyTier(c.freq) === selectedFreqFilter);
      list = freqFiltered;
    }
    if (selectedLengthFilter !== null && selectedLengthFilter !== undefined) {
      const targetLengths = Array.isArray(selectedLengthFilter)
        ? new Set(selectedLengthFilter)
        : new Set([selectedLengthFilter]);
      if (targetLengths.size > 0) {
        list = list.filter(c => targetLengths.has(c.length));
      }
    }
    if (activePosFilter && activePosFilter !== 'all') {
      list = list.filter(c => isMatchingPos(pos(c.word), activePosFilter));
    }
    return list;
  }, [candidateWords, avoidDeadEnds, selectedFreqFilter, selectedLengthFilter, activePosFilter]);

  const searchFilteredWords = useMemo(() => {
    if (!searchQuery.trim()) return safeCandidateWords;
    const q = searchQuery.toLowerCase().trim();
    return safeCandidateWords.filter((w) => w.word.toLowerCase().includes(q));
  }, [safeCandidateWords, searchQuery]);

  // Keyboard navigation: Escape to dismiss lens, Arrow keys to scrub through candidate words
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      if (e.key === 'Escape') {
        if (selectedWord) {
          e.preventDefault();
          setSelectedWord(null);
        }
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        if (safeCandidateWords.length > 0) {
          e.preventDefault();
          if (!selectedWord) {
            setSelectedWord(safeCandidateWords[0]);
          } else {
            const idx = safeCandidateWords.findIndex(
              (w) => w.word.toLowerCase() === selectedWord.word.toLowerCase()
            );
            const nextIdx = idx >= 0 ? (idx + 1) % safeCandidateWords.length : 0;
            setSelectedWord(safeCandidateWords[nextIdx]);
          }
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        if (safeCandidateWords.length > 0) {
          e.preventDefault();
          if (!selectedWord) {
            setSelectedWord(safeCandidateWords[safeCandidateWords.length - 1]);
          } else {
            const idx = safeCandidateWords.findIndex(
              (w) => w.word.toLowerCase() === selectedWord.word.toLowerCase()
            );
            const prevIdx =
              idx >= 0
                ? (idx - 1 + safeCandidateWords.length) % safeCandidateWords.length
                : safeCandidateWords.length - 1;
            setSelectedWord(safeCandidateWords[prevIdx]);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedWord, safeCandidateWords]);

  const posCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: safeCandidateWords.length,
      noun: 0,
      verb: 0,
      adj: 0,
      adv: 0,
      other: 0,
    };
    for (let i = 0; i < safeCandidateWords.length; i++) {
      const p = pos(safeCandidateWords[i].word);
      if (counts[p] !== undefined) {
        counts[p]++;
      } else {
        counts.other++;
      }
    }
    return counts;
  }, [safeCandidateWords]);

  const otherSubtypeCounts = useMemo(() => {
    const subtypes = {
      pron: 0,
      prep: 0,
      art: 0,
      conj: 0,
      other: 0,
    };
    for (let i = 0; i < safeCandidateWords.length; i++) {
      const p = pos(safeCandidateWords[i].word);
      if (p === 'other') {
        const w = safeCandidateWords[i].word.toLowerCase();
        if (['i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their', 'who', 'whom', 'whose'].includes(w)) {
          subtypes.pron++;
        } else if (['in', 'on', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out', 'over', 'under'].includes(w)) {
          subtypes.prep++;
        } else if (['the', 'a', 'an', 'this', 'that', 'these', 'those', 'my', 'your', 'his', 'her', 'its', 'our', 'their', 'all', 'both', 'half', 'some', 'any', 'no'].includes(w)) {
          subtypes.art++;
        } else if (['and', 'but', 'or', 'nor', 'for', 'yet', 'so', 'although', 'because', 'since', 'unless'].includes(w)) {
          subtypes.conj++;
        } else {
          subtypes.other++;
        }
      }
    }
    return subtypes;
  }, [safeCandidateWords]);

  // Inspector Category (Length vs Parts of Speech - fallback to internal if not hoisted)
  const [internalInspectorCategory, setInternalInspectorCategory] = useState<'length' | 'pos'>('length');
  const inspectorCategory = externalInspectorCategory !== undefined ? externalInspectorCategory : internalInspectorCategory;
  const setInspectorCategory = onInspectorCategoryChange || setInternalInspectorCategory;

  // Hovered word from Graph View for cross-visualization reactivity
  const [hoveredGraphWord, setHoveredGraphWord] = useState<string | null>(null);

  // Hovered POS or Length from Inspector views for graph bubble highlighting
  const [hoveredTreemapPos, setHoveredTreemapPos] = useState<POS | null>(null);
  const [hoveredTreemapLength, setHoveredTreemapLength] = useState<number | null>(null);

  // Inspector View Modes: Treemap, Histogram Slider, Labels
  const [internalPosViewMode, setInternalPosViewMode] = useState<LexicalViewMode>('treemap');
  const posViewMode = externalLexicalViewMode !== undefined ? externalLexicalViewMode : internalPosViewMode;
  const lengthViewMode = posViewMode;
  const setGlobalViewMode = onLexicalViewModeChange || setInternalPosViewMode;

  const hoveredWordInfo = useMemo(() => {
    if (!hoveredGraphWord) return null;
    const w = hoveredGraphWord.toLowerCase();
    const wordPos = pos(w);
    let mappedPos: POS = 'other';
    if (wordPos === 'noun' || wordPos === 'verb' || wordPos === 'adj' || wordPos === 'adv') {
      mappedPos = wordPos;
    }

    return {
      word: hoveredGraphWord,
      length: hoveredGraphWord.length,
      pos: mappedPos,
    };
  }, [hoveredGraphWord]);

  // Compute compatible words that can be formed concurrently with hoveredGraphWord
  const compatibleData = useMemo(() => {
    if (!hoveredGraphWord || !sourceText) return null;

    const cleanSource = sourceText.toLowerCase().replace(/[^a-z]/g, '');
    const cleanHovered = hoveredGraphWord.toLowerCase().replace(/[^a-z]/g, '');

    const sourceCounts = new Uint8Array(26);
    for (let i = 0; i < cleanSource.length; i++) {
      sourceCounts[cleanSource.charCodeAt(i) - 97]++;
    }

    // Subtract hovered word letters
    for (let i = 0; i < cleanHovered.length; i++) {
      const code = cleanHovered.charCodeAt(i) - 97;
      if (sourceCounts[code] === 0) return null;
      sourceCounts[code]--;
    }

    const posCountsMap: Record<string, number> = {
      noun: 0,
      verb: 0,
      adj: 0,
      adv: 0,
      other: 0,
    };
    const lengthCountsMap: Record<number, number> = {};
    let totalCompatible = 0;

    for (let idx = 0; idx < candidateWords.length; idx++) {
      const item = candidateWords[idx];
      const w = item.word.toLowerCase();
      if (w === cleanHovered) continue;

      const testCounts = new Uint8Array(26);
      let fits = true;
      for (let i = 0; i < w.length; i++) {
        const code = w.charCodeAt(i) - 97;
        testCounts[code]++;
        if (testCounts[code] > sourceCounts[code]) {
          fits = false;
          break;
        }
      }

      if (fits) {
        totalCompatible++;
        const p = pos(w);
        const mappedP: POS = (p === 'noun' || p === 'verb' || p === 'adj' || p === 'adv') ? p : 'other';
        posCountsMap[mappedP] = (posCountsMap[mappedP] || 0) + 1;
        lengthCountsMap[item.length] = (lengthCountsMap[item.length] || 0) + 1;
      }
    }

    return {
      compatiblePosCounts: posCountsMap,
      compatibleLengthCounts: lengthCountsMap,
      totalCompatible,
    };
  }, [hoveredGraphWord, sourceText, candidateWords]);

  // Compute histogram data filtered by the active POS filter and avoidDeadEnds
  const effectiveHistogramData = useMemo(() => {
    const wordsPool = safeCandidateWords;
    const filteredWords = (!activePosFilter || activePosFilter === 'all')
      ? wordsPool
      : wordsPool.filter(w => isMatchingPos(pos(w.word), activePosFilter));

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
  }, [safeCandidateWords, activePosFilter, histogramData]);

  const totalFilteredWords = useMemo(() => {
    return effectiveHistogramData.reduce((acc, curr) => acc + curr.count, 0);
  }, [effectiveHistogramData]);

  const totalWords = useMemo(() => {
    return histogramData.reduce((acc, curr) => acc + curr.count, 0);
  }, [histogramData]);

  if (explorerViewMode === 'blocks' || explorerViewMode === 'cards') {
    return (
      <div
        ref={containerRef}
        className="w-full h-full relative min-h-0 select-none overflow-hidden bg-transparent"
      >
        <WordBlocksExplorer
          candidateWords={safeCandidateWords}
          onAddWordToTarget={onAddWordToTarget}
          onSetWordAsTarget={onSetWordAsTarget}
          onShowToast={onShowToast}
          exactClosers={exactClosers}
          activeTargetPhrase={activeTargetPhrase}
          sourceText={sourceText}
        />
      </div>
    );
  }

  if (explorerViewMode === 'pebbles') {
    return (
      <div
        ref={containerRef}
        className="w-full h-full relative min-h-0 select-none overflow-hidden bg-transparent"
      >
        <WordPebblesExplorer
          candidateWords={safeCandidateWords}
          onAddWordToTarget={onAddWordToTarget}
          onSetWordAsTarget={onSetWordAsTarget}
          onShowToast={onShowToast}
          exactClosers={exactClosers}
          activeTargetPhrase={activeTargetPhrase}
          sourceText={sourceText}
          selectedWord={selectedWord}
          onSelectWord={setSelectedWord}
          selectedLengthFilter={selectedLengthFilter}
          onClearLengthFilter={onClearLengthFilter}
          selectedPosFilter={activePosFilter}
          onClearPosFilter={() => handlePosFilterChange(null)}
        />
      </div>
    );
  }

  if (explorerViewMode === 'solutions') {
    return (
      <div
        ref={containerRef}
        className="w-full h-full relative min-h-0 select-none overflow-hidden bg-transparent"
      >
        <WordSolutionsExplorer
          exactClosers={exactClosers}
          finisherPairs={finisherPairs}
          completeSolutions={completeSolutions}
          isSolvingSolutions={isSolvingSolutions}
          targetPhrase={activeTargetPhrase}
          remainingLetters={remainingLetters}
          onAddWordToTarget={onAddWordToTarget}
          onSetWordAsTarget={onSetWordAsTarget}
          onShowToast={onShowToast}
          sourceText={sourceText}
        />
      </div>
    );
  }

  const showLeftGraph =
    (explorerViewMode === 'both' || explorerViewMode === 'graph' || showGraphPanel) &&
    explorerViewMode !== 'inspector' &&
    totalWords > 0;
  const showRightCards =
    (explorerViewMode === 'both' || explorerViewMode === 'inspector' || showInspectorPanel) &&
    explorerViewMode !== 'graph' &&
    totalWords > 0;

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative flex flex-row items-stretch min-h-0 text-zinc-900 select-none overflow-hidden bg-transparent gap-1.5 sm:gap-2"
    >
      {/* LEFT: Focused Word Field (Pebbles / Graph / Blocks) */}
      {showLeftGraph && (
        <div
          className={`flex-1 min-w-0 h-full relative bg-white border-2 border-black rounded-xl sm:rounded-2xl overflow-hidden shadow-xs flex flex-col ${
            showRightCards && mobileViewTab === 'stats' ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Main Word Field Content (Full width & flex-1 height) */}
          <div className="flex-1 h-full min-w-0 min-h-0 relative overflow-hidden">
            {currentLeftView === 'graph' ? (
              <WordsGraphView
                sourceText={sourceText}
                candidateWords={safeCandidateWords}
                selectedLengthFilter={selectedLengthFilter}
                selectedPosFilter={activePosFilter}
                onAddWordToTarget={onAddWordToTarget}
                onSetWordAsTarget={onSetWordAsTarget}
                activeTargetPhrase={activeTargetPhrase}
                onShowToast={onShowToast}
                onHoverWordChange={setHoveredGraphWord}
                hoveredPosFilter={hoveredTreemapPos}
                hoveredLengthFilter={hoveredTreemapLength}
                wordFilterMode={wordFilterMode}
                wordFilterCount={countsByMode ? countsByMode[wordFilterMode || 'safe'] : safeCandidateWords.length}
                onCycleWordFilter={onCycleWordFilter}
                selectedWord={selectedWord}
                onSelectWord={setSelectedWord}
              />
            ) : currentLeftView === 'blocks' ? (
              <WordBlocksExplorer
                candidateWords={safeCandidateWords}
                onAddWordToTarget={onAddWordToTarget}
                onSetWordAsTarget={onSetWordAsTarget}
                onShowToast={onShowToast}
                exactClosers={exactClosers}
                activeTargetPhrase={activeTargetPhrase}
                sourceText={sourceText}
                selectedWord={selectedWord}
                onSelectWord={setSelectedWord}
              />
            ) : (
              <WordPebblesExplorer
                candidateWords={safeCandidateWords}
                selectedWord={selectedWord}
                onSelectWord={setSelectedWord}
                onAddWordToTarget={onAddWordToTarget}
                onSetWordAsTarget={onSetWordAsTarget}
                onShowToast={onShowToast}
                exactClosers={exactClosers}
                activeTargetPhrase={activeTargetPhrase}
                sourceText={sourceText}
                selectedLengthFilter={selectedLengthFilter}
                onClearLengthFilter={onClearLengthFilter}
                selectedPosFilter={activePosFilter}
                onClearPosFilter={() => handlePosFilterChange(null)}
                sortBy={sortBy}
                onSortByChange={setSortBy}
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                watermarkLabel={
                  wordFilterMode === 'domains'
                    ? 'DOMAINS & TLDS'
                    : wordFilterMode === 'safe'
                    ? 'SOLVABLE WORDS'
                    : wordFilterMode === 'closers'
                    ? '1-WORD WINS'
                    : wordFilterMode === 'pairs'
                    ? '2-WORD PAIRS'
                    : 'ALL WORDS'
                }
              />
            )}
          </div>

          {/* Expandable Bottom Drawer Toolbar (Full Width on All Devices) */}
          <BottomExplorerToolbar
            currentView={
              mobileViewTab === 'stats'
                ? 'stats'
                : (currentLeftView as 'pebbles' | 'graph' | 'blocks')
            }
            onViewChange={(view) => {
              if (view === 'stats') {
                setMobileViewTab('stats');
              } else {
                setMobileViewTab('words');
                handleSplitLeftChange(view);
              }
            }}
            showStatsTab={showRightCards}
            activeFilterMode={wordFilterMode || (avoidDeadEnds ? 'safe' : 'all')}
            onSelectFilterMode={(mode) => {
              if (onSelectWordFilterMode) {
                onSelectWordFilterMode(mode);
              }
            }}
            onCycleFilterMode={onCycleWordFilter}
            countsByMode={countsByMode}
            totalFilteredWords={searchFilteredWords.length}
            totalDictionaryWords={candidateWords.length}
            isDrawerOpen={isFilterDrawerOpen}
            onToggleDrawer={() => setIsFilterDrawerOpen((prev) => !prev)}
            onCloseDrawer={() => setIsFilterDrawerOpen(false)}
            customWordsCount={customWordsCount}
            onOpenCustomWordManager={onOpenCustomWordManager}
            selectedLengthFilter={selectedLengthFilter}
            onSelectLengthFilter={onSelectLengthFilter}
            onClearLengthFilter={onClearLengthFilter}
            selectedFreqFilter={selectedFreqFilter}
            onSelectFreqFilter={onSelectFreqFilter}
            onClearFreqFilter={onClearFreqFilter}
            avoidDeadEnds={avoidDeadEnds}
            onToggleAvoidDeadEnds={() => setAvoidDeadEnds(!avoidDeadEnds)}
            sortBy={sortBy}
            onSortByChange={setSortBy}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
          />
        </div>
      )}

      {/* RIGHT: Dynamic Contextual Lens Workspace */}
      {showRightCards && (
        <div
          ref={rightColumnRef}
          className={`flex-1 min-w-0 h-full relative flex flex-col bg-white border-2 border-black rounded-xl sm:rounded-2xl overflow-hidden shadow-xs ${
            showLeftGraph && mobileViewTab === 'words' ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Mobile Back to Words button */}
          {showLeftGraph && (
            <div className="md:hidden flex items-center justify-between px-2.5 py-1.5 bg-zinc-100 border-b-2 border-black shrink-0">
              <button
                type="button"
                onClick={() => setMobileViewTab('words')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] text-[11px] font-mono font-bold bg-black text-white rounded cursor-pointer shadow-xs active:scale-95 transition-all touch-manipulation"
              >
                ← Back to Words
              </button>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-black">
                  Stats & Lens
                </span>
                <span className="text-[9px] font-mono text-zinc-500 tabular-nums">
                  ({safeCandidateWords.length} words)
                </span>
              </div>
            </div>
          )}
          <div className="flex-1 min-h-0 relative overflow-hidden">
            <ContextualLens
              selectedWord={selectedWord}
              onClearSelectedWord={() => setSelectedWord(null)}
              onSelectWord={setSelectedWord}
              sourceText={sourceText}
              candidateWords={safeCandidateWords}
              exactClosers={exactClosers}
              finisherPairs={finisherPairs}
              completeSolutions={completeSolutions}
              isSolvingSolutions={isSolvingSolutions}
              targetPhrase={activeTargetPhrase}
              remainingLetters={remainingLetters}
              onAddWordToTarget={onAddWordToTarget}
              onSetWordAsTarget={onSetWordAsTarget}
              onShowToast={onShowToast}
              selectedLengthFilter={selectedLengthFilter}
              onSelectLengthFilter={onSelectLengthFilter}
              onClearLengthFilter={onClearLengthFilter}
              selectedPosFilter={activePosFilter}
              onSelectPosFilter={handlePosFilterChange}
              selectedFreqFilter={selectedFreqFilter}
              onSelectFreqFilter={onSelectFreqFilter}
              onClearFreqFilter={onClearFreqFilter}
              histogramData={effectiveHistogramData}
              hoveredWordInfo={hoveredWordInfo}
              compatibleData={compatibleData}
              posCounts={posCounts}
              otherSubtypeCounts={otherSubtypeCounts}
              onHoverTreemapLength={setHoveredTreemapLength}
              onHoverTreemapPos={setHoveredTreemapPos}
            />
          </div>
          {/* Mobile bottom dock when on Stats panel so user can tap PEBBLE / GRAPH / BLOCK to switch back immediately */}
          {showLeftGraph && (
            <div className="md:hidden">
              <BottomExplorerToolbar
                currentView="stats"
                onViewChange={(view) => {
                  if (view !== 'stats') {
                    setMobileViewTab('words');
                    handleSplitLeftChange(view);
                  }
                }}
                showStatsTab={true}
                activeFilterMode={wordFilterMode || (avoidDeadEnds ? 'safe' : 'all')}
                onSelectFilterMode={(mode) => {
                  if (onSelectWordFilterMode) {
                    onSelectWordFilterMode(mode);
                  }
                }}
                onCycleFilterMode={onCycleWordFilter}
                countsByMode={countsByMode}
                totalFilteredWords={safeCandidateWords.length}
                totalDictionaryWords={candidateWords.length}
                isDrawerOpen={isFilterDrawerOpen}
                onToggleDrawer={() => setIsFilterDrawerOpen((prev) => !prev)}
                onCloseDrawer={() => setIsFilterDrawerOpen(false)}
                customWordsCount={customWordsCount}
                onOpenCustomWordManager={onOpenCustomWordManager}
                selectedLengthFilter={selectedLengthFilter}
                onSelectLengthFilter={onSelectLengthFilter}
                onClearLengthFilter={onClearLengthFilter}
                selectedFreqFilter={selectedFreqFilter}
                onSelectFreqFilter={onSelectFreqFilter}
                onClearFreqFilter={onClearFreqFilter}
                avoidDeadEnds={avoidDeadEnds}
                onToggleAvoidDeadEnds={() => setAvoidDeadEnds(!avoidDeadEnds)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
