import React, { useMemo } from 'react';
import { Filter, X, Check } from 'lucide-react';
import type { HistogramBin } from '../engine/types';

export interface IntegratedLengthFilterProps {
  histogramData: HistogramBin[];
  selectedLengthFilter: number[] | number | null;
  onSelectLengthFilter: (lengths: number[] | null) => void;
  onClearLengthFilter: () => void;
  exactClosers?: string[];
  totalCandidateCount?: number;
}

export const IntegratedLengthFilter: React.FC<IntegratedLengthFilterProps> = ({
  histogramData,
  selectedLengthFilter,
  onSelectLengthFilter,
  onClearLengthFilter,
  exactClosers = [],
  totalCandidateCount = 0,
}) => {
  // Set of lengths that contain 1-click exact closers
  const exactCloserLengths = useMemo(() => {
    const set = new Set<number>();
    for (const word of exactClosers) {
      set.add(word.length);
    }
    return set;
  }, [exactClosers]);

  // Selected lengths set
  const activeLengthsSet = useMemo(() => {
    if (selectedLengthFilter === null || selectedLengthFilter === undefined) return new Set<number>();
    if (Array.isArray(selectedLengthFilter)) return new Set(selectedLengthFilter);
    return new Set([selectedLengthFilter]);
  }, [selectedLengthFilter]);

  const maxBinCount = useMemo(() => {
    return Math.max(1, ...histogramData.map(b => b.count));
  }, [histogramData]);

  const handleToggleLength = (len: number, e: React.MouseEvent) => {
    if (e.shiftKey || e.metaKey || e.ctrlKey) {
      // Multi-select toggle
      const newSet = new Set(activeLengthsSet);
      if (newSet.has(len)) {
        newSet.delete(len);
      } else {
        newSet.add(len);
      }
      onSelectLengthFilter(newSet.size === 0 ? null : Array.from(newSet).sort((a, b) => a - b));
    } else {
      // Single toggle: if already selected alone, clear; otherwise select this length
      if (activeLengthsSet.size === 1 && activeLengthsSet.has(len)) {
        onClearLengthFilter();
      } else {
        onSelectLengthFilter([len]);
      }
    }
  };

  const isFiltered = activeLengthsSet.size > 0;

  return (
    <div className="w-full h-11 sm:h-12 bg-[#0c0c0e] border-t border-zinc-800 flex items-center justify-between px-3 gap-2 overflow-x-auto no-scrollbar shrink-0 select-none">
      {/* Leading Section: Filter Mode & All Button */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={onClearLengthFilter}
          className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-bold tracking-wider uppercase transition-colors flex items-center gap-1.5 border ${
            !isFiltered
              ? 'bg-zinc-800 text-zinc-100 border-zinc-700 shadow-sm'
              : 'bg-transparent text-zinc-400 hover:text-zinc-200 border-transparent hover:bg-zinc-800/50'
          }`}
        >
          <span>ALL</span>
          <span className="text-[9px] text-zinc-400 tabular-nums">({totalCandidateCount})</span>
        </button>
      </div>

      {/* Middle Section: Integrated Length Bins */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 py-1">
        {histogramData.map(bin => {
          const isSelected = activeLengthsSet.has(bin.length);
          const hasCloser = exactCloserLengths.has(bin.length);
          const barHeightPercent = Math.max(15, Math.round((bin.count / maxBinCount) * 100));

          return (
            <button
              key={bin.length}
              type="button"
              onClick={e => handleToggleLength(bin.length, e)}
              title={`${bin.count} words of length ${bin.length}${hasCloser ? ' (Contains Exact Closer!)' : ''}`}
              className={`group relative flex flex-col items-center justify-between h-9 min-w-[38px] sm:min-w-[44px] px-1.5 py-1 rounded-md border transition-all ${
                isSelected
                  ? 'bg-emerald-950/70 border-emerald-500/80 text-emerald-200 shadow-sm'
                  : hasCloser
                    ? 'bg-zinc-900/90 border-emerald-800/60 text-emerald-400 hover:border-emerald-600'
                    : 'bg-zinc-900/60 hover:bg-zinc-800/80 border-zinc-800/80 hover:border-zinc-700 text-zinc-300'
              }`}
            >
              {/* Density Bar Indicator */}
              <div className="w-full h-1 bg-zinc-800/60 rounded-full overflow-hidden flex items-end">
                <div
                  style={{ width: `${barHeightPercent}%` }}
                  className={`h-full rounded-full transition-all ${
                    isSelected
                      ? 'bg-emerald-400'
                      : hasCloser
                        ? 'bg-emerald-500/80'
                        : 'bg-zinc-500 group-hover:bg-zinc-300'
                  }`}
                />
              </div>

              {/* Length label and count */}
              <div className="flex items-center gap-1 w-full justify-between mt-0.5">
                <span className="text-[10px] font-mono font-bold tracking-tight">
                  {bin.length}L
                </span>
                <span
                  className={`text-[9px] font-mono tabular-nums ${
                    isSelected ? 'text-emerald-300' : 'text-zinc-500 group-hover:text-zinc-400'
                  }`}
                >
                  {bin.count}
                </span>
              </div>

              {/* Exact Closer Pip */}
              {hasCloser && (
                <span
                  className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#0c0c0e]"
                  title="Exact closer word available in this length"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Trailing: Clear Filter / Summary */}
      <div className="flex items-center gap-2 shrink-0">
        {isFiltered && (
          <button
            type="button"
            onClick={onClearLengthFilter}
            className="flex items-center gap-1 text-[10px] font-mono text-zinc-400 hover:text-white px-1.5 py-0.5 rounded hover:bg-zinc-800 transition-colors"
            title="Clear length filter"
          >
            <X className="w-3 h-3" />
            <span>RESET</span>
          </button>
        )}
      </div>
    </div>
  );
};
