import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { WordsGraphView } from './WordsGraphView';
import type { CandidateWordItem, HistogramBin, POS, FinisherPair } from '../engine/types';
import { pos, isMatchingPos } from '../engine/lexicon';
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
  histogramData: HistogramBin[];
  onAddWordToTarget: (word: string) => void;
  onSetWordAsTarget: (word: string) => void;
  activeTargetPhrase?: string;
  onShowToast: (text: string, type?: 'success' | 'info' | 'error') => void;
  exactClosers?: string[];
  finisherPairs?: FinisherPair[];
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
  wordFilterMode?: WordFilterMode;
  countsByMode?: Record<WordFilterMode, number>;
  onCycleWordFilter?: () => void;
}

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
  exactClosers = [],
  finisherPairs = [],
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
  wordFilterMode,
  countsByMode,
  onCycleWordFilter,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rightColumnRef = useRef<HTMLDivElement>(null);
  const [internalPosFilter, setInternalPosFilter] = useState<POS | 'all' | null>(null);

  // Avoid Dead-Ends Mode (Internal state fallback if not hoisted)
  const [internalAvoidDeadEnds, setInternalAvoidDeadEnds] = useState<boolean>(true);
  const avoidDeadEnds = externalAvoidDeadEnds !== undefined ? externalAvoidDeadEnds : internalAvoidDeadEnds;
  const setAvoidDeadEnds = onAvoidDeadEndsChange || setInternalAvoidDeadEnds;

  // Candidates filtered by solvability safety
  const safeCandidateWords = useMemo(() => {
    if (!avoidDeadEnds) return candidateWords;
    const filtered = candidateWords.filter(c => c.isSolvable !== false);
    return filtered.length > 0 ? filtered : candidateWords;
  }, [candidateWords, avoidDeadEnds]);

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

  const showLeftGraph = showGraphPanel && totalWords > 0;
  const showRightCards = showInspectorPanel && totalWords > 0;

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative flex flex-row items-stretch min-h-0 text-zinc-900 select-none overflow-hidden bg-transparent gap-1.5 sm:gap-2"
    >
      {/* LEFT: Constellation Graph Panel */}
      {showLeftGraph && (
        <div className="flex-1 min-w-0 h-full relative bg-white border-2 border-black rounded-xl sm:rounded-2xl overflow-hidden shadow-xs flex flex-col">
          <div className="flex-1 w-full h-full min-h-0">
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
            />
          </div>
        </div>
      )}

      {/* RIGHT: Unified Lexical Inspector Workspace */}
      {showRightCards && (
        <div
          ref={rightColumnRef}
          className="flex-1 min-w-0 h-full relative flex flex-col bg-white border-2 border-black rounded-xl sm:rounded-2xl overflow-hidden shadow-xs"
        >
          {/* UNIFIED FULL-HEIGHT LEXICAL INSPECTOR SURFACE */}
          <div className="flex-1 w-full min-h-0 p-1 overflow-hidden relative">
            {inspectorCategory === 'pos' ? (
              posViewMode === 'treemap' ? (
                <PosTreemap
                  posCounts={posCounts}
                  otherSubtypeCounts={otherSubtypeCounts}
                  activePosFilter={activePosFilter}
                  onPosFilterChange={handlePosFilterChange}
                  hoveredWordInfo={hoveredWordInfo}
                  compatiblePosCounts={compatibleData?.compatiblePosCounts}
                  onHoverPosChange={setHoveredTreemapPos}
                />
              ) : posViewMode === 'histogram' ? (
                <PosHistogram
                  posCounts={posCounts}
                  otherSubtypeCounts={otherSubtypeCounts}
                  activePosFilter={activePosFilter}
                  onPosFilterChange={handlePosFilterChange}
                  hoveredWordInfo={hoveredWordInfo}
                  compatiblePosCounts={compatibleData?.compatiblePosCounts}
                  onHoverPosChange={setHoveredTreemapPos}
                />
              ) : (
                <PosLabels
                  posCounts={posCounts}
                  otherSubtypeCounts={otherSubtypeCounts}
                  activePosFilter={activePosFilter}
                  onPosFilterChange={handlePosFilterChange}
                  hoveredWordInfo={hoveredWordInfo}
                  compatiblePosCounts={compatibleData?.compatiblePosCounts}
                  onHoverPosChange={setHoveredTreemapPos}
                />
              )
            ) : (
              lengthViewMode === 'treemap' ? (
                <WordLengthTreemap
                  histogramData={effectiveHistogramData}
                  selectedLengthFilter={selectedLengthFilter}
                  onSelectLengthFilter={onSelectLengthFilter}
                  onClearLengthFilter={onClearLengthFilter}
                  hoveredWordInfo={hoveredWordInfo}
                  compatibleLengthCounts={compatibleData?.compatibleLengthCounts}
                  onHoverLengthChange={setHoveredTreemapLength}
                />
              ) : lengthViewMode === 'histogram' ? (
                <WordLengthHistogramSlider
                  histogramData={effectiveHistogramData}
                  selectedLengthFilter={selectedLengthFilter}
                  onSelectLengthFilter={onSelectLengthFilter}
                  onClearLengthFilter={onClearLengthFilter}
                  hoveredWordInfo={hoveredWordInfo}
                  compatibleLengthCounts={compatibleData?.compatibleLengthCounts}
                  onHoverLengthChange={setHoveredTreemapLength}
                />
              ) : (
                <WordLengthLabels
                  histogramData={effectiveHistogramData}
                  selectedLengthFilter={selectedLengthFilter}
                  onSelectLengthFilter={onSelectLengthFilter}
                  onClearLengthFilter={onClearLengthFilter}
                  hoveredWordInfo={hoveredWordInfo}
                  compatibleLengthCounts={compatibleData?.compatibleLengthCounts}
                  onHoverLengthChange={setHoveredTreemapLength}
                />
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
};
