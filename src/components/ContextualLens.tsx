import React, { useState } from 'react';
import type { AnagramResult, CandidateWordItem, FinisherPair, POS } from '../engine/types';
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
  completeSolutions = [],
  isSolvingSolutions = false,
  targetPhrase = '',
  remainingLetters = [],
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
  const [lensTab, setLensTab] = useState<'stats' | 'solutions' | 'split'>('stats');
  const [statsCategory, setStatsCategory] = useState<'length' | 'pos' | 'freq'>('length');
  const [statsChartType, setStatsChartType] = useState<'treemap' | 'histogram' | 'labels'>('histogram');

  const totalWins = (completeSolutions?.length || 0) + exactClosers.length + finisherPairs.length;

  // Render chart content
  const renderChart = () => {
    if (statsCategory === 'pos') {
      if (statsChartType === 'treemap') {
        return (
          <PosTreemap
            posCounts={posCounts}
            otherSubtypeCounts={otherSubtypeCounts}
            activePosFilter={selectedPosFilter || null}
            onPosFilterChange={onSelectPosFilter || (() => {})}
            hoveredWordInfo={hoveredWordInfo}
            compatiblePosCounts={compatibleData?.compatiblePosCounts}
            onHoverPosChange={onHoverTreemapPos}
          />
        );
      }
      if (statsChartType === 'histogram') {
        return (
          <PosHistogram
            posCounts={posCounts}
            otherSubtypeCounts={otherSubtypeCounts}
            activePosFilter={selectedPosFilter || null}
            onPosFilterChange={onSelectPosFilter || (() => {})}
            hoveredWordInfo={hoveredWordInfo}
            compatiblePosCounts={compatibleData?.compatiblePosCounts}
            onHoverPosChange={onHoverTreemapPos}
          />
        );
      }
      return (
        <PosLabels
          posCounts={posCounts}
          otherSubtypeCounts={otherSubtypeCounts}
          activePosFilter={selectedPosFilter || null}
          onPosFilterChange={onSelectPosFilter || (() => {})}
          hoveredWordInfo={hoveredWordInfo}
          compatiblePosCounts={compatibleData?.compatiblePosCounts}
          onHoverPosChange={onHoverTreemapPos}
        />
      );
    }

    if (statsCategory === 'freq') {
      return (
        <FrequencyTreemap
          candidateWords={candidateWords}
          activeFreqFilter={selectedFreqFilter || null}
          onFreqFilterChange={onSelectFreqFilter || (() => {})}
          hoveredWordInfo={hoveredWordInfo}
          onHoverFreqChange={onHoverTreemapFreq}
        />
      );
    }

    if (statsChartType === 'treemap') {
      return (
        <WordLengthTreemap
          histogramData={histogramData}
          selectedLengthFilter={selectedLengthFilter || null}
          onSelectLengthFilter={onSelectLengthFilter}
          onClearLengthFilter={onClearLengthFilter}
          hoveredWordInfo={hoveredWordInfo}
          compatibleLengthCounts={compatibleData?.compatibleLengthCounts}
          onHoverLengthChange={onHoverTreemapLength}
        />
      );
    }

    if (statsChartType === 'histogram') {
      return (
        <WordLengthHistogramSlider
          histogramData={histogramData}
          selectedLengthFilter={selectedLengthFilter || null}
          onSelectLengthFilter={onSelectLengthFilter}
          onClearLengthFilter={onClearLengthFilter}
          hoveredWordInfo={hoveredWordInfo}
          compatibleLengthCounts={compatibleData?.compatibleLengthCounts}
          onHoverLengthChange={onHoverTreemapLength}
        />
      );
    }

    return (
      <WordLengthLabels
        histogramData={histogramData}
        selectedLengthFilter={selectedLengthFilter || null}
        onSelectLengthFilter={onSelectLengthFilter}
        onClearLengthFilter={onClearLengthFilter}
        hoveredWordInfo={hoveredWordInfo}
        compatibleLengthCounts={compatibleData?.compatibleLengthCounts}
        onHoverLengthChange={onHoverTreemapLength}
      />
    );
  };

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

  return (
    <div className="w-full h-full flex flex-row bg-white overflow-hidden text-zinc-900 select-none">
      {/* Main Content Area */}
      <div className="flex-1 h-full min-w-0 min-h-0 overflow-hidden relative">
        {lensTab === 'solutions' ? (
          <WordSolutionsExplorer
            exactClosers={exactClosers}
            finisherPairs={finisherPairs}
            completeSolutions={completeSolutions}
            isSolvingSolutions={isSolvingSolutions}
            targetPhrase={targetPhrase}
            remainingLetters={remainingLetters}
            onAddWordToTarget={onAddWordToTarget}
            onSetWordAsTarget={onSetWordAsTarget}
            onShowToast={onShowToast}
            sourceText={sourceText}
          />
        ) : lensTab === 'split' ? (
          <div className="w-full h-full flex flex-col md:flex-row overflow-hidden divide-y md:divide-y-0 md:divide-x divide-zinc-300">
            <div className="flex-1 h-1/2 md:h-full min-w-0 overflow-hidden relative bg-zinc-50/50">
              {renderChart()}
            </div>
            <div className="flex-1 h-1/2 md:h-full min-w-0 overflow-hidden relative bg-white">
              <WordSolutionsExplorer
                exactClosers={exactClosers}
                finisherPairs={finisherPairs}
                completeSolutions={completeSolutions}
                isSolvingSolutions={isSolvingSolutions}
                targetPhrase={targetPhrase}
                remainingLetters={remainingLetters}
                onAddWordToTarget={onAddWordToTarget}
                onSetWordAsTarget={onSetWordAsTarget}
                onShowToast={onShowToast}
                sourceText={sourceText}
              />
            </div>
          </div>
        ) : (
          renderChart()
        )}
      </div>

      {/* Clean Integrated Sidebar Rail (Right Side) */}
      <div className="w-16 shrink-0 bg-zinc-50 border-l-2 border-black flex flex-col items-center justify-between py-2 px-1 select-none z-10">
        {/* Mode Tabs */}
        <div className="w-full flex flex-col items-center gap-1.5">
          <span className="text-[8px] font-mono font-black uppercase text-zinc-400 tracking-wider">
            LENS
          </span>
          <nav className="w-full flex flex-col gap-1.5 text-center" aria-label="Lens sub views">
            {[
              { id: 'stats', label: 'STATS' },
              { id: 'split', label: 'SPLIT' },
              { id: 'solutions', label: 'SOLVE' },
            ].map(({ id, label }) => {
              const isActive = lensTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setLensTab(id as any)}
                  className={`w-full py-1 text-[8.5px] font-mono uppercase transition-all cursor-pointer text-center ${
                    isActive
                      ? 'font-black text-black border-l-2 border-black bg-white shadow-2xs'
                      : 'font-bold text-zinc-500 hover:text-black border-l-2 border-transparent'
                  }`}
                  title={`${label} View`}
                >
                  {label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sub-filter indicators or toggles */}
        <div className="w-full flex flex-col items-center gap-2">
          {lensTab === 'stats' && (
            <div className="w-full flex flex-col items-center gap-1.5">
              <span className="text-[7.5px] font-mono font-black uppercase text-zinc-400 tracking-wider">
                VIEW
              </span>
              <nav className="w-full flex flex-col gap-1 text-center">
                {[
                  { id: 'length', label: 'LENGTH' },
                  { id: 'pos', label: 'SPEECH' },
                  { id: 'freq', label: 'FREQ' },
                ].map(({ id, label }) => {
                  const isActive = statsCategory === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setStatsCategory(id as any)}
                      className={`w-full py-0.5 text-[8px] font-mono uppercase transition-all cursor-pointer text-center ${
                        isActive
                          ? 'font-black text-black border-l-2 border-black'
                          : 'font-bold text-zinc-400 hover:text-black border-l-2 border-transparent'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </nav>

              {/* Chart Format Switcher */}
              <span className="text-[7.5px] font-mono font-black uppercase text-zinc-400 tracking-wider mt-1">
                STYLE
              </span>
              <nav className="w-full flex flex-col gap-1 text-center">
                {[
                  { id: 'histogram', label: 'HISTO' },
                  { id: 'treemap', label: 'TREEMAP' },
                ].map(({ id, label }) => {
                  const isActive = statsChartType === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setStatsChartType(id as any)}
                      className={`w-full py-0.5 text-[7.5px] font-mono uppercase transition-all cursor-pointer text-center ${
                        isActive
                          ? 'font-black text-black border-l-2 border-black'
                          : 'font-bold text-zinc-400 hover:text-black border-l-2 border-transparent'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </nav>
            </div>
          )}

          {selectedLengthFilter && (
            <button
              type="button"
              onClick={onClearLengthFilter}
              className="w-full flex flex-col items-center justify-center py-1 px-0.5 bg-zinc-100 border border-black text-black rounded-md text-[8px] font-mono font-bold hover:bg-zinc-200 cursor-pointer shadow-2xs transition-all active:scale-90"
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
              className="w-full flex flex-col items-center justify-center py-1 px-0.5 bg-zinc-100 border border-black text-black rounded-md text-[8px] font-mono font-bold hover:bg-zinc-200 cursor-pointer shadow-2xs transition-all active:scale-90"
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
