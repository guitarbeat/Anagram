import React from 'react';
import type { AnagramResult, CandidateWordItem, FinisherPair, POS, WebsiteSolution } from '../engine/types';
import type { FrequencyTier } from '../engine/lexicon';
import { WordDetailLens } from './WordDetailLens';
import { WordLengthHistogramSlider } from './WordLengthHistogramSlider';
import { PosHistogram } from './PosHistogram';

export interface ContextualLensProps {
  selectedWord: CandidateWordItem | null;
  onClearSelectedWord: () => void;
  onSelectWord: (word: CandidateWordItem) => void;
  sourceText: string;
  candidateWords: CandidateWordItem[];
  exactClosers?: string[];
  finisherPairs?: FinisherPair[];
  websiteSolutions?: WebsiteSolution[];
  completeSolutions?: AnagramResult[];
  isSolvingSolutions?: boolean;
  targetPhrase?: string;
  remainingLetters?: string[];
  onAddWordToTarget: (word: string) => void;
  onSetWordAsTarget: (word: string) => void;
  onShowToast: (text: string, type?: 'success' | 'info' | 'error') => void;

  // Treemap / Stats props
  selectedLengthFilter?: number[] | number | null;
  onSelectLengthFilter: (lengths: number[] | null) => void;
  onClearLengthFilter: () => void;
  selectedPosFilter?: POS | 'all' | null;
  onSelectPosFilter?: (pos: POS | null) => void;
  selectedFreqFilter?: FrequencyTier | 'all' | null;
  onSelectFreqFilter?: (tier: FrequencyTier | null) => void;
  onClearFreqFilter?: () => void;
  histogramData?: { length: number; count: number }[];
  hoveredWordInfo?: { word: string; length: number; pos: POS; freq?: number } | null;
  compatibleData?: {
    compatibleLengthCounts?: Record<number, number>;
    compatiblePosCounts?: Record<string, number>;
  } | null;
  posCounts?: Record<string, number>;
  otherSubtypeCounts?: {
    pron: number;
    prep: number;
    art: number;
    conj: number;
    other: number;
  };
  onHoverTreemapLength?: (length: number | null) => void;
  onHoverTreemapPos?: (pos: POS | null) => void;
  onHoverTreemapFreq?: (tier: FrequencyTier | null) => void;
}

export const ContextualLens: React.FC<ContextualLensProps> = ({
  selectedWord,
  onClearSelectedWord,
  onSelectWord,
  sourceText,
  candidateWords,
  exactClosers = [],
  finisherPairs = [],
  onAddWordToTarget,
  onSetWordAsTarget,
  onShowToast,
  selectedLengthFilter,
  onSelectLengthFilter,
  onClearLengthFilter,
  selectedPosFilter,
  onSelectPosFilter,
  histogramData = [],
  hoveredWordInfo,
  compatibleData,
  posCounts = {},
  otherSubtypeCounts = { pron: 0, prep: 0, art: 0, conj: 0, other: 0 },
  onHoverTreemapLength,
  onHoverTreemapPos,
}) => {
  // If a word is selected for inspection, show the deep-dive lens
  if (selectedWord) {
    return (
      <WordDetailLens
        selectedWord={selectedWord}
        sourceText={sourceText}
        allCandidates={candidateWords}
        exactClosers={exactClosers}
        finisherPairs={finisherPairs}
        onAddWordToTarget={onAddWordToTarget}
        onSetWordAsTarget={onSetWordAsTarget}
        onClose={onClearSelectedWord}
        onShowToast={onShowToast}
        onSelectCompanionWord={onSelectWord}
      />
    );
  }

  // Pure statistical overview: Length Histogram & Part-of-Speech Distribution
  // High clarity, zero internal toolbars or sidebars
  return (
    <div className="w-full h-full flex flex-col md:flex-row bg-white overflow-hidden divide-y md:divide-y-0 md:divide-x divide-zinc-200 select-none">
      {/* Length Histogram */}
      <div className="flex-1 h-1/2 md:h-full min-w-0 min-h-0 overflow-hidden relative p-2">
        <WordLengthHistogramSlider
          histogramData={histogramData}
          selectedLengthFilter={selectedLengthFilter || null}
          onSelectLengthFilter={onSelectLengthFilter}
          onClearLengthFilter={onClearLengthFilter}
          hoveredWordInfo={hoveredWordInfo}
          compatibleLengthCounts={compatibleData?.compatibleLengthCounts}
          onHoverLengthChange={onHoverTreemapLength}
        />
      </div>

      {/* Part of Speech Histogram */}
      <div className="flex-1 h-1/2 md:h-full min-w-0 min-h-0 overflow-hidden relative p-2">
        <PosHistogram
          posCounts={posCounts}
          otherSubtypeCounts={otherSubtypeCounts}
          activePosFilter={selectedPosFilter || null}
          onPosFilterChange={onSelectPosFilter || (() => {})}
          hoveredWordInfo={hoveredWordInfo}
          compatiblePosCounts={compatibleData?.compatiblePosCounts}
          onHoverPosChange={onHoverTreemapPos}
        />
      </div>
    </div>
  );
};
