import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { Layers, Network, LayoutGrid, ChevronDown, BarChart3, Sparkles, Columns2, X, ArrowLeftRight } from 'lucide-react';
import { WordsGraphView } from './WordsGraphView';
import { WordBlocksExplorer } from './WordBlocksExplorer';
import { WordPebblesExplorer, type WordSortOption } from './WordPebblesExplorer';
import { WordSolutionsExplorer } from './WordSolutionsExplorer';
import { ContextualLens } from './ContextualLens';
import type { CandidateWordItem, HistogramBin, POS, FinisherPair, AnagramResult, WebsiteSolution } from '../engine/types';
import { pos, isMatchingPos, type FrequencyTier, getFrequencyTier } from '../engine/lexicon';
import { PosTreemap } from './PosTreemap';
import { WordLengthTreemap } from './WordLengthTreemap';
import { WordLengthHistogramSlider } from './WordLengthHistogramSlider';
import { PosHistogram } from './PosHistogram';
import { WordLengthLabels } from './WordLengthLabels';
import { PosLabels } from './PosLabels';
import type { WordFilterMode } from '../types/split';

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
  websiteSolutions?: WebsiteSolution[];
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
  onSelectExplorerView?: (mode: 'both' | 'graph' | 'inspector' | 'blocks' | 'pebbles' | 'solutions') => void;
  splitLeftView?: 'graph' | 'pebbles' | 'blocks' | 'solutions' | 'inspector';
  onSplitLeftViewChange?: (view: 'graph' | 'pebbles' | 'blocks' | 'solutions' | 'inspector') => void;
  splitRightView?: 'inspector' | 'blocks' | 'pebbles' | 'solutions' | 'graph';
  onSplitRightViewChange?: (view: 'inspector' | 'blocks' | 'pebbles' | 'solutions' | 'graph') => void;
  wordFilterMode?: WordFilterMode;
  countsByMode?: Record<WordFilterMode, number>;
  onCycleWordFilter?: () => void;
  onSelectWordFilterMode?: (mode: WordFilterMode) => void;
  customWordsCount?: number;
  onOpenCustomWordManager?: () => void;
  sortBy?: WordSortOption;
  onSortByChange?: (sort: WordSortOption) => void;
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
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
  websiteSolutions = [],
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
  explorerViewMode = 'pebbles',
  onSelectExplorerView,
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
  sortBy: externalSortBy,
  onSortByChange,
  searchQuery: externalSearchQuery,
  onSearchQueryChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [internalSearchQuery, setInternalSearchQuery] = useState<string>('');
  const [internalSortBy, setInternalSortBy] = useState<WordSortOption>('length-desc');
  const searchQuery = externalSearchQuery !== undefined ? externalSearchQuery : internalSearchQuery;
  const setSearchQuery = onSearchQueryChange || setInternalSearchQuery;
  const sortBy = externalSortBy !== undefined ? externalSortBy : internalSortBy;
  const setSortBy = onSortByChange || setInternalSortBy;
  const [internalSplitLeft, setInternalSplitLeft] = useState<'graph' | 'pebbles' | 'blocks' | 'solutions' | 'inspector'>('pebbles');
  const [internalSplitRight, setInternalSplitRight] = useState<'inspector' | 'blocks' | 'pebbles' | 'solutions' | 'graph'>('solutions');
  const [selectedWord, setSelectedWord] = useState<CandidateWordItem | null>(null);

  const currentLeftView = externalSplitLeftView || internalSplitLeft;
  const currentRightView = externalSplitRightView || internalSplitRight;

  const handleSplitLeftChange = useCallback(
    (view: 'graph' | 'pebbles' | 'blocks' | 'solutions' | 'inspector') => {
      if (onSplitLeftViewChange) onSplitLeftViewChange(view);
      else setInternalSplitLeft(view);
    },
    [onSplitLeftViewChange]
  );

  const handleSplitRightChange = useCallback(
    (view: 'graph' | 'pebbles' | 'blocks' | 'solutions' | 'inspector') => {
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

  // Chrome Split Screen Draggable Ratio State
  const [splitRatio, setSplitRatio] = useState<number>(0.5);
  const [isDraggingSplitter, setIsDraggingSplitter] = useState<boolean>(false);
  const splitContainerRef = useRef<HTMLDivElement>(null);

  const handleSplitterPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setIsDraggingSplitter(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handleSplitterPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingSplitter || !splitContainerRef.current) return;
    const rect = splitContainerRef.current.getBoundingClientRect();
    if (rect.width <= 0) return;
    const newRatio = (e.clientX - rect.left) / rect.width;
    setSplitRatio(Math.max(0.2, Math.min(0.8, newRatio)));
  }, [isDraggingSplitter]);

  const handleSplitterPointerUp = useCallback((e: React.PointerEvent) => {
    if (isDraggingSplitter) {
      setIsDraggingSplitter(false);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
  }, [isDraggingSplitter]);

  const totalSolveCount =
    completeSolutions.length +
    exactClosers.length +
    finisherPairs.length +
    websiteSolutions.length;

  const CHROME_SPLIT_TABS: {
    id: 'pebbles' | 'graph' | 'blocks' | 'inspector' | 'solutions';
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }[] = useMemo(
    () => [
      { id: 'pebbles', label: 'WORDS', icon: <Layers className="w-3 h-3" /> },
      { id: 'graph', label: 'GRAPH', icon: <Network className="w-3 h-3" /> },
      { id: 'blocks', label: 'BLOCKS', icon: <LayoutGrid className="w-3 h-3" /> },
      { id: 'inspector', label: 'STATS', icon: <BarChart3 className="w-3 h-3" /> },
      {
        id: 'solutions',
        label: 'SOLVE',
        icon: <Sparkles className="w-3 h-3 text-amber-500 fill-amber-500" />,
        badge: totalSolveCount > 0 ? totalSolveCount : undefined,
      },
    ],
    [totalSolveCount]
  );

  const leftConfig =
    CHROME_SPLIT_TABS.find((t) => t.id === currentLeftView) || CHROME_SPLIT_TABS[0];
  const rightConfig =
    CHROME_SPLIT_TABS.find((t) => t.id === currentRightView) || CHROME_SPLIT_TABS[4];

  const [isLeftDropdownOpen, setIsLeftDropdownOpen] = useState<boolean>(false);
  const [isRightDropdownOpen, setIsRightDropdownOpen] = useState<boolean>(false);
  const leftDropdownRef = useRef<HTMLDivElement>(null);
  const rightDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        leftDropdownRef.current &&
        !leftDropdownRef.current.contains(e.target as Node)
      ) {
        setIsLeftDropdownOpen(false);
      }
      if (
        rightDropdownRef.current &&
        !rightDropdownRef.current.contains(e.target as Node)
      ) {
        setIsRightDropdownOpen(false);
      }
    };
    window.addEventListener('pointerdown', handleOutsideClick);
    return () => window.removeEventListener('pointerdown', handleOutsideClick);
  }, []);

  const renderViewContent = useCallback(
    (viewType: string) => {
      if (viewType === 'graph') {
        return (
          <WordsGraphView
            sourceText={sourceText}
            candidateWords={searchFilteredWords}
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
            wordFilterCount={
              countsByMode ? countsByMode[wordFilterMode || 'safe'] : searchFilteredWords.length
            }
            onCycleWordFilter={onCycleWordFilter}
            selectedWord={selectedWord}
            onSelectWord={setSelectedWord}
          />
        );
      }
      if (viewType === 'blocks' || viewType === 'cards') {
        return (
          <WordBlocksExplorer
            candidateWords={searchFilteredWords}
            onAddWordToTarget={onAddWordToTarget}
            onSetWordAsTarget={onSetWordAsTarget}
            onShowToast={onShowToast}
            exactClosers={exactClosers}
            activeTargetPhrase={activeTargetPhrase}
            sourceText={sourceText}
            selectedWord={selectedWord}
            onSelectWord={setSelectedWord}
          />
        );
      }
      if (viewType === 'solutions') {
        return (
          <WordSolutionsExplorer
            exactClosers={exactClosers}
            finisherPairs={finisherPairs}
            websiteSolutions={websiteSolutions}
            completeSolutions={completeSolutions}
            isSolvingSolutions={isSolvingSolutions}
            targetPhrase={activeTargetPhrase}
            remainingLetters={remainingLetters}
            onAddWordToTarget={onAddWordToTarget}
            onSetWordAsTarget={onSetWordAsTarget}
            onShowToast={onShowToast}
            sourceText={sourceText}
          />
        );
      }
      if (viewType === 'inspector' || viewType === 'stats') {
        return (
          <ContextualLens
            selectedWord={selectedWord}
            onClearSelectedWord={() => setSelectedWord(null)}
            onSelectWord={setSelectedWord}
            sourceText={sourceText}
            candidateWords={searchFilteredWords}
            exactClosers={exactClosers}
            finisherPairs={finisherPairs}
            websiteSolutions={websiteSolutions}
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
            histogramData={histogramData}
            hoveredWordInfo={null}
            compatibleData={compatibleData}
            posCounts={posCounts}
            otherSubtypeCounts={otherSubtypeCounts}
            onHoverTreemapLength={setHoveredTreemapLength}
            onHoverTreemapPos={setHoveredTreemapPos}
          />
        );
      }
      // Default: 'pebbles' (WORDS)
      return (
        <WordPebblesExplorer
          candidateWords={searchFilteredWords}
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
      );
    },
    [
      sourceText,
      searchFilteredWords,
      selectedLengthFilter,
      activePosFilter,
      onAddWordToTarget,
      onSetWordAsTarget,
      activeTargetPhrase,
      onShowToast,
      hoveredTreemapPos,
      hoveredTreemapLength,
      wordFilterMode,
      countsByMode,
      onCycleWordFilter,
      selectedWord,
      exactClosers,
      finisherPairs,
      websiteSolutions,
      completeSolutions,
      isSolvingSolutions,
      remainingLetters,
      onSelectLengthFilter,
      onClearLengthFilter,
      handlePosFilterChange,
      selectedFreqFilter,
      onSelectFreqFilter,
      onClearFreqFilter,
      histogramData,
      compatibleData,
      posCounts,
      otherSubtypeCounts,
      sortBy,
      setSortBy,
      searchQuery,
      setSearchQuery,
    ]
  );

  return (
    <div
      ref={containerRef}
      className={`w-full h-full relative flex flex-col min-h-0 text-zinc-900 select-none overflow-hidden border-x-2 border-b-2 border-black rounded-b-xl sm:rounded-b-2xl shadow-xs ${
        explorerViewMode === 'both' ? 'bg-[#09090b]' : 'bg-white'
      }`}
    >
      {/* Workspace View Surface */}
      <div className="flex-1 w-full min-h-0 relative overflow-hidden">
        {explorerViewMode === 'both' ? (
          <div
            ref={splitContainerRef}
            onPointerMove={handleSplitterPointerMove}
            onPointerUp={handleSplitterPointerUp}
            className="w-full h-full flex flex-row min-h-0 overflow-hidden select-none bg-[#09090b] p-1.5 sm:p-2 gap-1 sm:gap-1.5"
          >
            {/* Left Split Pane */}
            <div
              style={{ flex: `${splitRatio} 1 0%` }}
              className="h-full min-w-[200px] flex flex-col min-h-0 overflow-hidden bg-white rounded-xl sm:rounded-2xl border-2 border-black shadow-xs"
            >
              {/* Sleek Left Pane Header */}
              <div className="h-7.5 bg-zinc-50 border-b border-black/15 flex items-center justify-between px-2.5 shrink-0 select-none rounded-t-[10px] sm:rounded-t-[14px]">
                <div ref={leftDropdownRef} className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setIsLeftDropdownOpen((prev) => !prev);
                      setIsRightDropdownOpen(false);
                    }}
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] sm:text-[10.5px] font-mono font-bold bg-white text-black border border-black/30 hover:border-black shadow-xs cursor-pointer transition-all active:scale-95"
                    title="Switch left pane view"
                  >
                    {leftConfig.icon}
                    <span>{leftConfig.label}</span>
                    {leftConfig.badge !== undefined && (
                      <span className="text-[8px] font-black px-1 rounded-full bg-black text-white">
                        {leftConfig.badge}
                      </span>
                    )}
                    <ChevronDown className="w-3 h-3 text-zinc-500" />
                  </button>

                  {/* Dropdown Menu */}
                  {isLeftDropdownOpen && (
                    <div className="absolute top-full mt-1 left-0 w-48 bg-[#141417]/98 backdrop-blur-md text-white border border-white/20 rounded-lg shadow-2xl p-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                      <div className="text-[9px] font-mono uppercase tracking-wider text-zinc-400 px-2 py-1">
                        Left Pane View
                      </div>
                      {CHROME_SPLIT_TABS.map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => {
                            handleSplitLeftChange(tab.id);
                            setIsLeftDropdownOpen(false);
                          }}
                          className={`flex items-center justify-between w-full px-2 py-1.5 rounded text-left text-xs font-mono transition-colors cursor-pointer ${
                            currentLeftView === tab.id
                              ? 'bg-white text-black font-black'
                              : 'text-zinc-300 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          <span className="flex items-center gap-1.5">
                            {tab.icon}
                            <span>{tab.label}</span>
                          </span>
                          {tab.badge !== undefined && (
                            <span
                              className={`text-[8px] font-black px-1 rounded-full ${
                                currentLeftView === tab.id
                                  ? 'bg-black text-white'
                                  : 'bg-white/20 text-zinc-200'
                              }`}
                            >
                              {tab.badge}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Swap Left ⇄ Right Button */}
                <button
                  type="button"
                  onClick={() => {
                    const temp = currentLeftView;
                    handleSplitLeftChange(currentRightView);
                    handleSplitRightChange(temp);
                  }}
                  title="Swap left and right views"
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono text-zinc-500 hover:text-black hover:bg-black/5 transition-colors cursor-pointer"
                >
                  <ArrowLeftRight className="w-3 h-3" />
                  <span className="hidden sm:inline">SWAP</span>
                </button>
              </div>

              {/* Left Pane Content */}
              <div className="flex-1 w-full min-h-0 relative overflow-hidden rounded-b-[10px] sm:rounded-b-[14px]">
                {renderViewContent(currentLeftView)}
              </div>
            </div>

            {/* Draggable Split Divider between Left & Right */}
            <div
              onPointerDown={handleSplitterPointerDown}
              onPointerUp={handleSplitterPointerUp}
              onDoubleClick={() => setSplitRatio(0.5)}
              title="Drag to resize split screen · Double click for 50/50"
              className={`relative w-1.5 sm:w-2 h-[calc(100%-8px)] my-auto bg-black hover:bg-zinc-800 cursor-col-resize shrink-0 transition-all flex items-center justify-center group z-20 rounded-full border border-white/20 shadow-xs before:absolute before:inset-y-0 before:-inset-x-2.5 before:content-[''] ${
                isDraggingSplitter ? 'bg-zinc-800 ring-2 ring-white/30' : ''
              }`}
            >
              <div className="w-0.5 h-8 sm:h-10 bg-zinc-400 group-hover:bg-white rounded-full transition-all group-hover:scale-y-110 shadow-xs" />
            </div>

            {/* Right Split Pane */}
            <div
              style={{ flex: `${1 - splitRatio} 1 0%` }}
              className="h-full min-w-[200px] flex flex-col min-h-0 overflow-hidden bg-white rounded-xl sm:rounded-2xl border-2 border-black shadow-xs"
            >
              {/* Sleek Right Pane Header */}
              <div className="h-7.5 bg-zinc-50 border-b border-black/15 flex items-center justify-between px-2.5 shrink-0 select-none rounded-t-[10px] sm:rounded-t-[14px]">
                <div ref={rightDropdownRef} className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRightDropdownOpen((prev) => !prev);
                      setIsLeftDropdownOpen(false);
                    }}
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] sm:text-[10.5px] font-mono font-bold bg-white text-black border border-black/30 hover:border-black shadow-xs cursor-pointer transition-all active:scale-95"
                    title="Switch right pane view"
                  >
                    {rightConfig.icon}
                    <span>{rightConfig.label}</span>
                    {rightConfig.badge !== undefined && (
                      <span className="text-[8px] font-black px-1 rounded-full bg-black text-white">
                        {rightConfig.badge}
                      </span>
                    )}
                    <ChevronDown className="w-3 h-3 text-zinc-500" />
                  </button>

                  {/* Dropdown Menu */}
                  {isRightDropdownOpen && (
                    <div className="absolute top-full mt-1 left-0 w-48 bg-[#141417]/98 backdrop-blur-md text-white border border-white/20 rounded-lg shadow-2xl p-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                      <div className="text-[9px] font-mono uppercase tracking-wider text-zinc-400 px-2 py-1">
                        Right Pane View
                      </div>
                      {CHROME_SPLIT_TABS.map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => {
                            handleSplitRightChange(tab.id);
                            setIsRightDropdownOpen(false);
                          }}
                          className={`flex items-center justify-between w-full px-2 py-1.5 rounded text-left text-xs font-mono transition-colors cursor-pointer ${
                            currentRightView === tab.id
                              ? 'bg-white text-black font-black'
                              : 'text-zinc-300 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          <span className="flex items-center gap-1.5">
                            {tab.icon}
                            <span>{tab.label}</span>
                          </span>
                          {tab.badge !== undefined && (
                            <span
                              className={`text-[8px] font-black px-1 rounded-full ${
                                currentRightView === tab.id
                                  ? 'bg-black text-white'
                                  : 'bg-white/20 text-zinc-200'
                              }`}
                            >
                              {tab.badge}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Close Split Screen Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (onSelectExplorerView) {
                      onSelectExplorerView(currentLeftView);
                    }
                  }}
                  title="Close split screen (Return to single tab)"
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold text-zinc-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">CLOSE</span>
                </button>
              </div>

              {/* Right Pane Content */}
              <div className="flex-1 w-full min-h-0 relative overflow-hidden rounded-b-[10px] sm:rounded-b-[14px]">
                {renderViewContent(currentRightView)}
              </div>
            </div>
          </div>
        ) : (
          renderViewContent(explorerViewMode)
        )}
      </div>
    </div>
  );
};
