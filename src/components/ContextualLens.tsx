import React, { useMemo } from 'react';
import { Sparkles, Link2 } from 'lucide-react';
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
  onHoverWordChange?: (word: string | null) => void;
}

export const ContextualLens: React.FC<ContextualLensProps> = ({
  selectedWord,
  onClearSelectedWord,
  onSelectWord,
  sourceText,
  candidateWords,
  exactClosers = [],
  finisherPairs = [],
  completeSolutions = [],
  remainingLetters = [],
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
  onHoverWordChange,
}) => {
  // Resolve hovered word into a CandidateWordItem so hovering any word in Graph or Words
  // immediately previews its breakdown, partner finishes, and remaining stats in Split View!
  const hoveredCandidateWord = useMemo<CandidateWordItem | null>(() => {
    if (!hoveredWordInfo?.word) return null;
    const upper = hoveredWordInfo.word.toUpperCase();
    const match = candidateWords.find((c) => c.word.toUpperCase() === upper);
    if (match) return match;
    return {
      word: hoveredWordInfo.word.toLowerCase(),
      length: hoveredWordInfo.length,
      freq: hoveredWordInfo.freq || 100,
      isSolvable: true,
    };
  }, [hoveredWordInfo, candidateWords]);

  const activeWord = hoveredCandidateWord || selectedWord;
  const isHoverPreview = Boolean(hoveredCandidateWord && (!selectedWord || selectedWord.word.toLowerCase() !== hoveredCandidateWord.word.toLowerCase()));

  if (activeWord) {
    return (
      <WordDetailLens
        selectedWord={activeWord}
        isHoverPreview={isHoverPreview}
        sourceText={sourceText}
        activeRemainingLetters={remainingLetters}
        allCandidates={candidateWords}
        exactClosers={exactClosers}
        finisherPairs={finisherPairs}
        compatibleData={compatibleData}
        onAddWordToTarget={onAddWordToTarget}
        onSetWordAsTarget={onSetWordAsTarget}
        onClose={onClearSelectedWord}
        onShowToast={onShowToast}
        onSelectCompanionWord={onSelectWord}
      />
    );
  }

  const hasSolvePreview =
    exactClosers.length > 0 || finisherPairs.length > 0 || completeSolutions.length > 0;

  // Idle Companion Overview: Combines Live Finishes (Solve) + Interactive Length & POS Distributions (Stats)
  return (
    <div className="w-full h-full flex flex-col bg-white overflow-y-auto divide-y divide-zinc-200 select-none">
      {/* Prompt banner encouraging hover/click */}
      <div className="px-3 py-2 bg-zinc-50 flex items-center justify-between gap-2 shrink-0">
        <span className="text-[11px] font-mono font-bold text-zinc-700">
          Hover or click any word to inspect partners & remaining letters
        </span>
        <span className="text-[10px] font-mono text-zinc-400 tabular-nums shrink-0">
          {remainingLetters.length} letters in pool
        </span>
      </div>

      {/* Compact Live Solve Preview (1-Word Wins, 2-Word Pairs, Top Completions) */}
      {hasSolvePreview && (
        <div className="p-3 space-y-2.5 bg-white shrink-0">
          {exactClosers.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10.5px] font-mono font-black uppercase tracking-wider text-black flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-black fill-black" />
                  1-Word Wins ({exactClosers.length})
                </span>
                <span className="text-[10px] font-mono text-zinc-400">Uses all remaining letters</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {exactClosers.slice(0, 12).map((closer) => (
                  <button
                    key={closer}
                    type="button"
                    onPointerEnter={() => onHoverWordChange?.(closer)}
                    onPointerLeave={() => onHoverWordChange?.(null)}
                    onClick={() => onAddWordToTarget(closer)}
                    className="px-2.5 py-1 rounded-lg bg-black hover:bg-zinc-800 text-white font-mono text-xs font-black uppercase tracking-wide cursor-pointer transition-all active:scale-95"
                  >
                    +{closer}
                  </button>
                ))}
              </div>
            </div>
          )}

          {finisherPairs.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-zinc-700 flex items-center gap-1">
                  <Link2 className="w-3 h-3 text-zinc-700" />
                  2-Word Finisher Pairs ({finisherPairs.length})
                </span>
                <span className="text-[10px] font-mono text-zinc-400">Hover word to preview</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {finisherPairs.slice(0, 10).map((pair, idx) => (
                  <div
                    key={`${pair.word1}-${pair.word2}-${idx}`}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-zinc-50 border border-black text-xs font-mono font-bold text-zinc-900"
                  >
                    <button
                      type="button"
                      onPointerEnter={() => onHoverWordChange?.(pair.word1)}
                      onPointerLeave={() => onHoverWordChange?.(null)}
                      onClick={() => onAddWordToTarget(pair.word1)}
                      className="hover:underline cursor-pointer"
                      title={`Add "${pair.word1}"`}
                    >
                      {pair.word1}
                    </button>
                    <span className="text-zinc-400">+</span>
                    <button
                      type="button"
                      onPointerEnter={() => onHoverWordChange?.(pair.word2)}
                      onPointerLeave={() => onHoverWordChange?.(null)}
                      onClick={() => onAddWordToTarget(pair.word2)}
                      className="hover:underline cursor-pointer"
                      title={`Add "${pair.word2}"`}
                    >
                      {pair.word2}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {completeSolutions.length > 0 && exactClosers.length === 0 && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500">
                  Full Anagram Ideas ({completeSolutions.length})
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {completeSolutions.slice(0, 6).map((sol, idx) => (
                  <span
                    key={`${sol.phrase}-${idx}`}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-100 text-[11px] font-mono text-zinc-700"
                  >
                    {sol.words.map((w, wIdx) => (
                      <React.Fragment key={`${w}-${wIdx}`}>
                        {wIdx > 0 && <span className="text-zinc-400">·</span>}
                        <button
                          type="button"
                          onPointerEnter={() => onHoverWordChange?.(w)}
                          onPointerLeave={() => onHoverWordChange?.(null)}
                          onClick={() => onAddWordToTarget(w)}
                          className="hover:text-black hover:underline font-semibold cursor-pointer"
                          title={`Click to add "${w}"`}
                        >
                          {w.toLowerCase()}
                        </button>
                      </React.Fragment>
                    ))}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Interactive Statistical Overview: Length & Part-of-Speech Distributions */}
      <div className="flex-1 min-h-[240px] flex flex-col xl:flex-row divide-y xl:divide-y-0 xl:divide-x divide-zinc-200">
        {/* Length Histogram */}
        <div className="flex-1 min-w-0 min-h-[160px] overflow-hidden relative p-2">
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
        <div className="flex-1 min-w-0 min-h-[160px] overflow-hidden relative p-2">
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
    </div>
  );
};

