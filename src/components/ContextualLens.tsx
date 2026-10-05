import React, { useState } from 'react';
import type { CandidateWordItem, FinisherPair, POS } from '../engine/types';
import type { FrequencyTier } from '../engine/lexicon';
import { WordDetailLens } from './WordDetailLens';
import { WordLengthTreemap } from './WordLengthTreemap';
import { WordLengthHistogramSlider } from './WordLengthHistogramSlider';
import { WordLengthLabels } from './WordLengthLabels';
import { PosTreemap } from './PosTreemap';
import { PosHistogram } from './PosHistogram';
import { PosLabels } from './PosLabels';
import { FrequencyTreemap } from './FrequencyTreemap';
import { WordSolutionsExplorer } from './WordSolutionsExplorer';
import { WordBlocksExplorer } from './WordBlocksExplorer';
import { BarChart3, Sparkles, LayoutGrid, X } from 'lucide-react';

export interface ContextualLensProps {
  selectedWord: CandidateWordItem | null;
  onClearSelectedWord: () => void;
  onSelectWord: (word: CandidateWordItem) => void;
  sourceText: string;
  candidateWords: CandidateWordItem[];
  exactClosers?: string[];
  finisherPairs?: FinisherPair[];
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
  selectedFreqFilter,
  onSelectFreqFilter,
  onClearFreqFilter,
  histogramData = [],
  hoveredWordInfo,
  compatibleData,
  posCounts = {},
  otherSubtypeCounts = { pron: 0, prep: 0, art: 0, conj: 0, other: 0 },
  onHoverTreemapLength,
  onHoverTreemapPos,
  onHoverTreemapFreq,
}) => {
  const [lensTab, setLensTab] = useState<'stats' | 'solutions' | 'blocks'>('stats');
  const [statsCategory, setStatsCategory] = useState<'length' | 'pos' | 'freq'>('length');
  const [statsChartType] = useState<'treemap' | 'histogram' | 'labels'>('treemap');

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

  // Otherwise, show the default Overview / Explorer states with clean integrated header
  return (
    <div className="w-full h-full flex flex-row bg-white overflow-hidden text-zinc-900 select-none">
      {/* Main Content Area */}
      <div className="flex-1 h-full min-w-0 min-h-0 overflow-hidden relative">
        {lensTab === 'solutions' ? (
          <WordSolutionsExplorer
            exactClosers={exactClosers}
            finisherPairs={finisherPairs}
            onAddWordToTarget={onAddWordToTarget}
            onSetWordAsTarget={onSetWordAsTarget}
            onShowToast={onShowToast}
            sourceText={sourceText}
          />
        ) : statsCategory === 'pos' ? (
          statsChartType === 'treemap' ? (
            <PosTreemap
              posCounts={posCounts}
              otherSubtypeCounts={otherSubtypeCounts}
              activePosFilter={selectedPosFilter || null}
              onPosFilterChange={onSelectPosFilter || (() => {})}
              hoveredWordInfo={hoveredWordInfo}
              compatiblePosCounts={compatibleData?.compatiblePosCounts}
              onHoverPosChange={onHoverTreemapPos}
            />
          ) : statsChartType === 'histogram' ? (
            <PosHistogram
              posCounts={posCounts}
              otherSubtypeCounts={otherSubtypeCounts}
              activePosFilter={selectedPosFilter || null}
              onPosFilterChange={onSelectPosFilter || (() => {})}
              hoveredWordInfo={hoveredWordInfo}
              compatiblePosCounts={compatibleData?.compatiblePosCounts}
              onHoverPosChange={onHoverTreemapPos}
            />
          ) : (
            <PosLabels
              posCounts={posCounts}
              otherSubtypeCounts={otherSubtypeCounts}
              activePosFilter={selectedPosFilter || null}
              onPosFilterChange={onSelectPosFilter || (() => {})}
              hoveredWordInfo={hoveredWordInfo}
              compatiblePosCounts={compatibleData?.compatiblePosCounts}
              onHoverPosChange={onHoverTreemapPos}
            />
          )
        ) : statsCategory === 'freq' ? (
          <FrequencyTreemap
            candidateWords={candidateWords}
            activeFreqFilter={selectedFreqFilter || null}
            onFreqFilterChange={onSelectFreqFilter || (() => {})}
            hoveredWordInfo={hoveredWordInfo}
            onHoverFreqChange={onHoverTreemapFreq}
          />
        ) : statsChartType === 'treemap' ? (
          <WordLengthTreemap
            histogramData={histogramData}
            selectedLengthFilter={selectedLengthFilter || null}
            onSelectLengthFilter={onSelectLengthFilter}
            onClearLengthFilter={onClearLengthFilter}
            hoveredWordInfo={hoveredWordInfo}
            compatibleLengthCounts={compatibleData?.compatibleLengthCounts}
            onHoverLengthChange={onHoverTreemapLength}
          />
        ) : statsChartType === 'histogram' ? (
          <WordLengthHistogramSlider
            histogramData={histogramData}
            selectedLengthFilter={selectedLengthFilter || null}
            onSelectLengthFilter={onSelectLengthFilter}
            onClearLengthFilter={onClearLengthFilter}
            hoveredWordInfo={hoveredWordInfo}
            compatibleLengthCounts={compatibleData?.compatibleLengthCounts}
            onHoverLengthChange={onHoverTreemapLength}
          />
        ) : (
          <WordLengthLabels
            histogramData={histogramData}
            selectedLengthFilter={selectedLengthFilter || null}
            onSelectLengthFilter={onSelectLengthFilter}
            onClearLengthFilter={onClearLengthFilter}
            hoveredWordInfo={hoveredWordInfo}
            compatibleLengthCounts={compatibleData?.compatibleLengthCounts}
            onHoverLengthChange={onHoverTreemapLength}
          />
        )}
      </div>

      {/* Clean Integrated Vertical Sidebar Rail (Right Side) */}
      <div className="w-14 shrink-0 bg-zinc-50 border-l-2 border-black flex flex-col items-center justify-between py-2.5 px-1 select-none z-10">
        {/* Mode Tabs in Vertical Segmented Track */}
        <div className="w-full flex flex-col items-center gap-1">
          <span className="text-[7.5px] font-mono font-extrabold uppercase text-zinc-400 tracking-wider">
            LENS
          </span>
          <div className="w-full flex flex-col items-center p-0.5 bg-zinc-200/80 rounded-md border border-zinc-200 gap-1">
            <button
              type="button"
              onClick={() => setLensTab('stats')}
              className={`w-full py-1.5 px-0.5 rounded-[4px] transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                lensTab === 'stats'
                  ? 'bg-black text-white shadow-2xs font-extrabold ring-1 ring-black'
                  : 'bg-white hover:bg-zinc-100 text-zinc-700 hover:text-black border border-zinc-200 font-bold shadow-2xs'
              }`}
              title="Lexical Statistics (Letter length & Part of speech distributions)"
            >
              <BarChart3 className={`w-4 h-4 shrink-0 ${lensTab === 'stats' ? 'text-white' : 'text-zinc-600'}`} />
              <span className="text-[8px] font-mono uppercase tracking-tight leading-none font-bold">
                STATS
              </span>
            </button>

            <button
              type="button"
              onClick={() => setLensTab('solutions')}
              className={`w-full py-1.5 px-0.5 rounded-[4px] transition-all cursor-pointer flex flex-col items-center justify-center gap-1 relative ${
                lensTab === 'solutions'
                  ? 'bg-black text-white shadow-2xs font-extrabold ring-1 ring-black'
                  : exactClosers.length + finisherPairs.length > 0
                  ? 'bg-white hover:bg-amber-50 text-black border border-amber-300 font-bold shadow-2xs'
                  : 'bg-white hover:bg-zinc-100 text-zinc-600 hover:text-black border border-zinc-200 font-bold shadow-2xs'
              }`}
              title={`Winning Anagram Solutions (${exactClosers.length + finisherPairs.length} available)\nClick to view complete 1-word wins and 2-word pairs`}
            >
              <div className="relative flex items-center justify-center">
                <Sparkles
                  className={`w-4 h-4 shrink-0 transition-transform ${
                    lensTab === 'solutions'
                      ? 'text-amber-400 fill-amber-400'
                      : exactClosers.length + finisherPairs.length > 0
                      ? 'text-amber-500 fill-amber-400'
                      : 'text-zinc-400'
                  }`}
                />
                {exactClosers.length + finisherPairs.length > 0 && lensTab !== 'solutions' && (
                  <span className="absolute -top-0.5 -right-1 w-1.5 h-1.5 rounded-full bg-amber-500" />
                )}
              </div>
              <span className="text-[8px] font-mono uppercase tracking-tight leading-none font-bold">
                SOLVE
              </span>
              {exactClosers.length + finisherPairs.length > 0 && (
                <span
                  className={`text-[8px] font-mono font-black px-1 rounded-[2px] leading-none ${
                    lensTab === 'solutions'
                      ? 'bg-amber-400/25 text-amber-300'
                      : 'bg-amber-100 text-amber-900 border border-amber-200'
                  }`}
                >
                  {exactClosers.length + finisherPairs.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Sub-filter indicators or toggles in Bottom of Right Rail */}
        <div className="w-full flex flex-col items-center gap-1.5">
          {lensTab === 'stats' && (
            <div className="w-full flex flex-col items-center gap-1">
              <span className="text-[7.5px] font-mono font-extrabold uppercase text-zinc-400 tracking-wider">
                VIEW
              </span>
              <div className="w-full flex flex-col items-center p-0.5 bg-zinc-200/80 rounded-md border border-zinc-200 gap-0.5">
                <button
                  type="button"
                  onClick={() => setStatsCategory('length')}
                  className={`w-full py-1 px-0.5 text-[8.5px] font-mono uppercase rounded-[3px] transition-all cursor-pointer text-center leading-none ${
                    statsCategory === 'length'
                      ? 'bg-black text-white shadow-2xs font-black'
                      : 'text-zinc-600 hover:text-black font-bold'
                  }`}
                  title="Group words by letter length (e.g. 3-letter, 4-letter words)"
                >
                  LENGTH
                </button>
                <button
                  type="button"
                  onClick={() => setStatsCategory('pos')}
                  className={`w-full py-1 px-0.5 text-[8.5px] font-mono uppercase rounded-[3px] transition-all cursor-pointer text-center leading-none ${
                    statsCategory === 'pos'
                      ? 'bg-black text-white shadow-2xs font-black'
                      : 'text-zinc-600 hover:text-black font-bold'
                  }`}
                  title="Group words by Part of Speech (Noun, Verb, Adjective, etc.)"
                >
                  SPEECH
                </button>
                <button
                  type="button"
                  onClick={() => setStatsCategory('freq')}
                  className={`w-full py-1 px-0.5 text-[8.5px] font-mono uppercase rounded-[3px] transition-all cursor-pointer text-center leading-none ${
                    statsCategory === 'freq'
                      ? 'bg-black text-white shadow-2xs font-black'
                      : 'text-zinc-600 hover:text-black font-bold'
                  }`}
                  title="Group words by Frequency (Top, Common, Rare, Obscure)"
                >
                  FREQ
                </button>
              </div>
            </div>
          )}

          {lensTab === 'solutions' && (
            <div
              className="w-full flex flex-col items-center justify-center gap-0.5 py-1.5 px-0.5 bg-white border border-zinc-300 rounded-md shadow-2xs"
              title={`${exactClosers.length + finisherPairs.length} Winning Combinations`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span className="font-mono text-[10px] font-black text-black tabular-nums leading-none">
                {exactClosers.length + finisherPairs.length}
              </span>
              <span className="text-[7.5px] font-mono font-bold uppercase text-zinc-400 tracking-tighter leading-none">
                WINS
              </span>
            </div>
          )}

          {selectedLengthFilter && (
            <button
              type="button"
              onClick={onClearLengthFilter}
              className="w-full flex flex-col items-center justify-center py-1 px-0.5 bg-amber-100 border border-amber-300 text-amber-900 rounded-md text-[8px] font-mono font-bold hover:bg-amber-200 cursor-pointer shadow-2xs transition-all active:scale-90"
              title="Clear active length filter"
            >
              <div className="flex items-center gap-0.5 leading-none">
                <span>
                  {Array.isArray(selectedLengthFilter)
                    ? selectedLengthFilter.join(',')
                    : selectedLengthFilter}
                  L
                </span>
                <X className="w-2.5 h-2.5" />
              </div>
            </button>
          )}

          {selectedFreqFilter && selectedFreqFilter !== 'all' && (
            <button
              type="button"
              onClick={onClearFreqFilter}
              className="w-full flex flex-col items-center justify-center py-1 px-0.5 bg-cyan-100 border border-cyan-300 text-cyan-950 rounded-md text-[8px] font-mono font-bold hover:bg-cyan-200 cursor-pointer shadow-2xs transition-all active:scale-90"
              title="Clear active frequency tier filter"
            >
              <div className="flex items-center gap-0.5 leading-none">
                <span>{selectedFreqFilter.slice(0, 4).toUpperCase()}</span>
                <X className="w-2.5 h-2.5" />
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
