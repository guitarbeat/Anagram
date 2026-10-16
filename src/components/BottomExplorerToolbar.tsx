import React from 'react';
import {
  Layers,
  Network,
  LayoutGrid,
  BarChart3,
  ChevronUp,
  ChevronDown,
  SlidersHorizontal,
  RotateCcw,
  ShieldCheck,
  Globe,
  ArrowDownUp,
  ArrowDownAZ,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  TrendingUp,
  Sparkles,
  Search,
  X,
} from 'lucide-react';
import type { WordFilterMode } from '../types/split';
import type { FrequencyTier } from '../engine/lexicon';
import type { POS } from '../engine/types';
import type { WordSortOption } from './WordPebblesExplorer';

export interface BottomExplorerToolbarProps {
  currentView: 'pebbles' | 'graph' | 'blocks' | 'stats';
  onViewChange: (view: 'pebbles' | 'graph' | 'blocks' | 'stats') => void;
  showStatsTab?: boolean;
  activeFilterMode?: WordFilterMode;
  onSelectFilterMode?: (mode: WordFilterMode) => void;
  onCycleFilterMode?: () => void;
  countsByMode?: Record<WordFilterMode, number>;
  totalFilteredWords: number;
  totalDictionaryWords: number;
  isDrawerOpen: boolean;
  onToggleDrawer: () => void;
  onCloseDrawer?: () => void;
  customWordsCount?: number;
  onOpenCustomWordManager?: () => void;
  // Specific filter controls
  selectedLengthFilter?: number[] | number | null;
  onSelectLengthFilter?: (lengths: number[] | null) => void;
  onClearLengthFilter?: () => void;
  selectedFreqFilter?: FrequencyTier | 'all' | null;
  onSelectFreqFilter?: (tier: FrequencyTier | null) => void;
  onClearFreqFilter?: () => void;
  selectedPosFilter?: POS | 'all' | null;
  onSelectPosFilter?: (pos: POS | 'all' | null) => void;
  avoidDeadEnds?: boolean;
  onToggleAvoidDeadEnds?: () => void;
  sortBy?: WordSortOption;
  onSortByChange?: (sort: WordSortOption) => void;
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
}

const FILTER_PRESETS: {
  id: WordFilterMode;
  label: string;
  shortLabel: string;
  description: string;
}[] = [
  { id: 'safe', label: 'Solvable Words', shortLabel: 'SOLVABLE', description: 'Prevents dead ends' },
  { id: 'domains', label: 'Domains & TLDs', shortLabel: 'DOMAINS', description: 'Web TLDs and domain names' },
  { id: 'all', label: 'All Dictionary', shortLabel: 'ALL WORDS', description: 'Complete lexicon' },
  { id: 'closers', label: '1-Word Wins', shortLabel: '1-WORD WINS', description: 'Direct solutions' },
  { id: 'pairs', label: '2-Word Pairs', shortLabel: '2-WORD PAIRS', description: 'Finishing pairs' },
  { id: 'long', label: '5+ Letters', shortLabel: '5+ LETTERS', description: 'Longer anagrams' },
  { id: 'top', label: 'Top Everyday', shortLabel: 'TOP WORDS', description: 'Most common English' },
  { id: 'common', label: 'Common Tier', shortLabel: 'COMMON', description: 'Standard vocabulary' },
  { id: 'rare', label: 'Rare / Scrabble', shortLabel: 'RARE', description: 'Obscure & high value' },
];

export const BottomExplorerToolbar: React.FC<BottomExplorerToolbarProps> = ({
  currentView,
  onViewChange,
  showStatsTab = true,
  activeFilterMode = 'safe',
  onSelectFilterMode,
  onCycleFilterMode,
  countsByMode,
  totalFilteredWords,
  totalDictionaryWords,
  isDrawerOpen,
  onToggleDrawer,
  selectedLengthFilter,
  onSelectLengthFilter,
  onClearLengthFilter,
  selectedFreqFilter,
  onSelectFreqFilter,
  onClearFreqFilter,
  avoidDeadEnds = true,
  onToggleAvoidDeadEnds,
  customWordsCount,
  onOpenCustomWordManager,
  sortBy,
  onSortByChange,
  searchQuery,
  onSearchQueryChange,
}) => {
  const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(6);
      } catch {
        // ignore
      }
    }
  };

  const handleViewClick = (view: 'pebbles' | 'graph' | 'blocks' | 'stats') => {
    triggerHaptic();
    onViewChange(view);
  };

  const handleFilterClick = (mode: WordFilterMode) => {
    triggerHaptic();
    if (onSelectFilterMode) {
      onSelectFilterMode(mode);
    }
  };

  const activePreset = FILTER_PRESETS.find((p) => p.id === activeFilterMode) || FILTER_PRESETS[0];

  const hasActiveModifiers = Boolean(
    (selectedLengthFilter !== null && selectedLengthFilter !== undefined) ||
      (selectedFreqFilter && selectedFreqFilter !== 'all')
  );

  const handleResetModifiers = () => {
    triggerHaptic();
    if (onClearLengthFilter) onClearLengthFilter();
    if (onClearFreqFilter) onClearFreqFilter();
    if (onSelectFilterMode) onSelectFilterMode('safe');
  };

  return (
    <div className="w-full shrink-0 flex flex-col relative z-20 select-none">
      {/* EXPANDABLE FILTER DRAWER (Mobile Bottom-Sheet Style) */}
      {isDrawerOpen && (
        <div className="w-full bg-zinc-50 border-t-2 border-black p-2 sm:p-3 flex flex-col gap-2 shadow-2xl max-h-[280px] sm:max-h-[320px] overflow-y-auto overscroll-contain select-none">
          {/* Mobile Grab Handle + Actions Row */}
          <div className="flex items-center justify-between gap-2 border-b border-zinc-200/80 pb-1.5">
            <div className="w-10 h-1 bg-zinc-300 hover:bg-zinc-400 rounded-full shrink-0 transition-colors" />

            <div className="flex items-center gap-1.5 shrink-0">
              {onOpenCustomWordManager && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    onOpenCustomWordManager();
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:py-1 text-[8.5px] sm:text-[9.5px] font-mono font-black bg-black text-white hover:bg-zinc-800 rounded border border-black shadow-2xs transition-all cursor-pointer active:scale-95 shrink-0"
                  title="Manage custom dictionary words and view 1,200+ global TLDs"
                >
                  <Globe className="w-3 h-3 text-white shrink-0" />
                  <span>Custom Words</span>
                  {customWordsCount !== undefined && customWordsCount > 0 && (
                    <span className="bg-white text-black px-1.5 py-0.2 rounded text-[8px] font-mono font-black leading-none">
                      {customWordsCount}
                    </span>
                  )}
                </button>
              )}
              {hasActiveModifiers && (
                <button
                  type="button"
                  onClick={handleResetModifiers}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[8.5px] font-mono font-bold text-zinc-600 hover:text-black hover:bg-zinc-200 rounded border border-zinc-300 transition-colors cursor-pointer shrink-0"
                  title="Reset length and frequency modifiers"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  Reset
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  onToggleDrawer();
                }}
                className="p-1 rounded text-zinc-600 hover:text-black hover:bg-zinc-200 cursor-pointer transition-colors shrink-0"
                title="Collapse drawer"
                aria-label="Collapse drawer"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Minimalist Segmented Preset Grid (3x3 Matrix) */}
          <div className="grid grid-cols-3 gap-1 sm:gap-1.5 pt-0.5">
            {FILTER_PRESETS.map((preset) => {
              const count = countsByMode ? countsByMode[preset.id] : undefined;
              const isSelected = activeFilterMode === preset.id;
              const isDomain = preset.id === 'domains';
              const isZero = count === 0;

              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleFilterClick(preset.id)}
                  className={`flex items-center justify-between px-2 sm:px-2.5 py-1.5 rounded border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-black text-white border-black shadow-xs font-black'
                      : isZero
                      ? 'bg-zinc-100/60 text-zinc-400 border-zinc-200 hover:border-zinc-400 font-normal'
                      : 'bg-white text-zinc-900 border-zinc-300 hover:border-black hover:bg-zinc-100 font-bold'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    {isDomain ? (
                      <Globe className={`w-3 h-3 shrink-0 ${isSelected ? 'text-white' : 'text-black'}`} />
                    ) : (
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          isSelected
                            ? 'bg-white'
                            : isZero
                            ? 'bg-zinc-300'
                            : 'bg-black'
                        }`}
                      />
                    )}
                    <span className="text-[9px] sm:text-[10px] font-mono uppercase tracking-tight truncate">
                      {preset.shortLabel}
                    </span>
                  </div>
                  {count !== undefined && (
                    <span
                      className={`text-[8.5px] sm:text-[9px] font-mono tabular-nums ml-1 shrink-0 px-1.5 py-0.2 rounded ${
                        isSelected
                          ? 'bg-white/25 text-white font-black'
                          : isZero
                          ? 'text-zinc-300 font-normal'
                          : 'bg-zinc-100 text-zinc-800 font-black border border-zinc-200'
                      }`}
                    >
                      {count.toLocaleString()}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* COMPACT BOTTOM DOCK (Always visible at the bottom of the card, h-10 sm:h-11 for touch ergonomics) */}
      {/* MAIN BOTTOM DOCK ROW (Always fits 100% viewport, no sideways scroll) */}
      <div className="h-10 sm:h-11 bg-white border-t-2 border-black flex items-center justify-between px-1 sm:px-2.5 gap-1 overflow-hidden select-none">
        {/* Left: View Tabs in Compact Segmented Track */}
        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
          <div className="flex items-center p-0.5 bg-zinc-100 rounded-md border border-zinc-300 gap-0.5">
            {(
              [
                { id: 'pebbles', label: 'PEBBLE', icon: Layers },
                { id: 'graph', label: 'GRAPH', icon: Network },
                { id: 'blocks', label: 'BLOCK', icon: LayoutGrid },
              ] as const
            ).map(({ id, label, icon: Icon }) => {
              const isActive = currentView === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleViewClick(id)}
                  className={`min-h-[28px] sm:min-h-[32px] px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-[4px] transition-all cursor-pointer flex items-center gap-1 touch-manipulation active:scale-95 ${
                    isActive
                      ? 'bg-black text-white shadow-2xs font-extrabold'
                      : 'text-zinc-600 hover:text-black hover:bg-zinc-200/60 font-semibold'
                  }`}
                  title={`${label} View`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[8.5px] sm:text-[9px] font-mono uppercase tracking-tight leading-none hidden sm:inline">
                    {label}
                  </span>
                </button>
              );
            })}

            {/* Mobile / Lens STATS Tab */}
            {showStatsTab && (
              <button
                type="button"
                onClick={() => handleViewClick('stats')}
                className={`min-h-[28px] sm:min-h-[32px] px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-[4px] transition-all cursor-pointer flex items-center gap-1 touch-manipulation active:scale-95 ${
                  currentView === 'stats'
                    ? 'bg-black text-white shadow-2xs font-extrabold'
                    : 'text-zinc-600 hover:text-black hover:bg-zinc-200/60 font-semibold'
                }`}
                title="Word Statistics & Lexical Lens"
              >
                <BarChart3 className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[8.5px] sm:text-[9px] font-mono uppercase tracking-tight leading-none hidden sm:inline">
                  STATS
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Center: Total Options Badge */}
        <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-100 border border-zinc-200 shrink-0">
          <span className="text-[9px] font-mono font-black text-black tracking-tight uppercase">
            {totalFilteredWords.toLocaleString()} <span className="text-zinc-500 font-bold">OPTIONS</span>
          </span>
        </div>

        {/* Center/Right Section: FILTER Button + Dedicated SORT Button */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 min-w-0">
          {/* Streamlined Filter Button Toggle */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic();
              onToggleDrawer();
            }}
            className={`h-7.5 sm:h-8.5 px-2 sm:px-3 flex items-center gap-1 sm:gap-1.5 rounded border-2 transition-all cursor-pointer group active:scale-95 shrink-0 touch-manipulation shadow-2xs ${
              isDrawerOpen
                ? 'bg-black text-white border-black font-extrabold'
                : 'bg-zinc-100 hover:bg-zinc-200 text-black border-zinc-300 hover:border-black font-bold'
            }`}
            title={isDrawerOpen ? 'Close filter drawer' : `Filter Preset: ${activePreset.label}. Click to open filters drawer`}
            aria-expanded={isDrawerOpen}
          >
            {isDrawerOpen ? (
              <ChevronDown className="w-3.5 h-3.5 text-white transition-colors shrink-0" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5 text-zinc-600 group-hover:text-black transition-colors shrink-0" />
            )}
            <span className="text-[8.5px] sm:text-[9.5px] font-mono font-black uppercase tracking-wider leading-none">
              FILTERS
            </span>
          </button>

          {/* Dedicated Sort Order Selector */}
          {sortBy && onSortByChange && (
            <div
              className="h-7.5 sm:h-8.5 flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2.5 rounded border-2 border-black bg-white hover:bg-zinc-100 transition-all cursor-pointer shadow-2xs shrink-0 touch-manipulation group/sort active:scale-95"
              title="Click to toggle or select sorting order"
            >
              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  if (sortBy === 'freq') onSortByChange('length-desc');
                  else if (sortBy === 'length-desc') onSortByChange('length-asc');
                  else if (sortBy === 'length-asc') onSortByChange('alpha');
                  else onSortByChange('freq');
                }}
                className="flex items-center gap-0.5 sm:gap-1 font-mono text-[8.5px] sm:text-[9.5px] font-black uppercase text-black cursor-pointer shrink-0"
              >
                {sortBy === 'freq' ? (
                  <TrendingUp className="w-3.5 h-3.5 text-black shrink-0 group-hover/sort:scale-110 transition-transform" />
                ) : sortBy === 'length-desc' ? (
                  <ArrowDownWideNarrow className="w-3.5 h-3.5 text-black shrink-0 group-hover/sort:scale-110 transition-transform" />
                ) : sortBy === 'length-asc' ? (
                  <ArrowUpNarrowWide className="w-3.5 h-3.5 text-black shrink-0 group-hover/sort:scale-110 transition-transform" />
                ) : sortBy === 'alpha' ? (
                  <ArrowDownAZ className="w-3.5 h-3.5 text-black shrink-0 group-hover/sort:scale-110 transition-transform" />
                ) : sortBy === 'closers' ? (
                  <Sparkles className="w-3.5 h-3.5 text-black shrink-0 group-hover/sort:scale-110 transition-transform" />
                ) : (
                  <ArrowDownUp className="w-3.5 h-3.5 text-black shrink-0 group-hover/sort:scale-110 transition-transform" />
                )}
                <span className="text-zinc-500 font-bold hidden md:inline">SORT:</span>
              </button>
              <select
                value={sortBy}
                onChange={(e) => {
                  triggerHaptic();
                  onSortByChange(e.target.value as WordSortOption);
                }}
                className="text-[8.5px] sm:text-[9.5px] font-mono font-black bg-transparent text-black focus:outline-none cursor-pointer uppercase pr-0.5"
              >
                <option value="freq">Freq</option>
                <option value="length-desc">Length ↓</option>
                <option value="length-asc">Length ↑</option>
                <option value="alpha">Alpha</option>
                <option value="closers">Closers</option>
              </select>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
