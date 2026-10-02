import React, { useMemo, useCallback } from 'react';
import { normalizeLengthFilterToSet, toggleLengthFilter } from '../utils/filterHelpers';
import { Tag, RotateCcw } from 'lucide-react';
import { getBlobBorderRadius } from '../utils/blobStyle';

export interface WordLengthLabelsProps {
  histogramData: { length: number; count: number }[];
  selectedLengthFilter: number[] | number | null;
  onSelectLengthFilter: (lengths: number[] | null) => void;
  onClearLengthFilter: () => void;
  className?: string;
  hoveredWordInfo?: { word: string; length: number; pos: string } | null;
  compatibleLengthCounts?: Record<number, number> | null;
  onHoverLengthChange?: (length: number | null) => void;
}

export const WordLengthLabels: React.FC<WordLengthLabelsProps> = ({
  histogramData,
  selectedLengthFilter,
  onSelectLengthFilter,
  onClearLengthFilter,
  className = '',
  hoveredWordInfo,
  compatibleLengthCounts,
  onHoverLengthChange,
}) => {
  const activeLengthsSet = useMemo(() => {
    return normalizeLengthFilterToSet(selectedLengthFilter);
  }, [selectedLengthFilter]);

  const validBins = useMemo(() => {
    return histogramData.filter(b => b.count > 0);
  }, [histogramData]);

  const totalWords = useMemo(() => {
    return validBins.reduce((sum, b) => sum + b.count, 0);
  }, [validBins]);

  const handleChipClick = useCallback((len: number, e: React.MouseEvent) => {
    const isShift = e.shiftKey || e.metaKey || e.ctrlKey;
    const next = toggleLengthFilter(selectedLengthFilter, len, isShift);
    onSelectLengthFilter(next);
  }, [selectedLengthFilter, onSelectLengthFilter]);

  // Presets
  const applyPreset = useCallback((preset: 'even' | 'odd' | 'short' | 'long') => {
    if (preset === 'even') {
      const arr = validBins.map(b => b.length).filter(l => l % 2 === 0);
      onSelectLengthFilter(arr.length ? arr : null);
    } else if (preset === 'odd') {
      const arr = validBins.map(b => b.length).filter(l => l % 2 !== 0);
      onSelectLengthFilter(arr.length ? arr : null);
    } else if (preset === 'short') {
      const arr = validBins.map(b => b.length).filter(l => l <= 4);
      onSelectLengthFilter(arr.length ? arr : null);
    } else if (preset === 'long') {
      const arr = validBins.map(b => b.length).filter(l => l >= 6);
      onSelectLengthFilter(arr.length ? arr : null);
    }
  }, [validBins, onSelectLengthFilter]);

  if (validBins.length === 0) {
    return (
      <div className={`w-full h-full flex flex-col items-center justify-center text-zinc-400 p-3 text-center ${className}`}>
        <span className="text-[11px] font-mono">No words match current filter</span>
      </div>
    );
  }

  return (
    <div className={`w-full h-full flex flex-col justify-between p-2 select-none overflow-hidden bg-white text-zinc-900 ${className}`}>
      {/* Header bar */}
      <div className="flex items-center justify-between gap-1.5 pb-1 shrink-0 border-b border-zinc-100">
        <div className="flex items-center gap-1.5 min-w-0">
          <Tag className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
          <span className="text-[11px] font-mono font-bold text-zinc-800 uppercase tracking-tight truncate">
            {activeLengthsSet.size === 0
              ? `Length Labels (${totalWords} words)`
              : `${activeLengthsSet.size} Length${activeLengthsSet.size > 1 ? 's' : ''} Selected`}
          </span>
        </div>

        {/* Shortcuts */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => applyPreset('short')}
            className="px-1.5 py-0.5 text-[9.5px] font-mono font-medium rounded border border-zinc-200 hover:border-zinc-400 bg-zinc-50 hover:bg-zinc-100 text-zinc-600 transition-colors cursor-pointer"
          >
            ≤4L
          </button>
          <button
            type="button"
            onClick={() => applyPreset('long')}
            className="px-1.5 py-0.5 text-[9.5px] font-mono font-medium rounded border border-zinc-200 hover:border-zinc-400 bg-zinc-50 hover:bg-zinc-100 text-zinc-600 transition-colors cursor-pointer"
          >
            ≥6L
          </button>
          <button
            type="button"
            onClick={() => applyPreset('even')}
            className="px-1.5 py-0.5 text-[9.5px] font-mono font-medium rounded border border-zinc-200 hover:border-zinc-400 bg-zinc-50 hover:bg-zinc-100 text-zinc-600 transition-colors cursor-pointer"
          >
            Even
          </button>
          <button
            type="button"
            onClick={() => applyPreset('odd')}
            className="px-1.5 py-0.5 text-[9.5px] font-mono font-medium rounded border border-zinc-200 hover:border-zinc-400 bg-zinc-50 hover:bg-zinc-100 text-zinc-600 transition-colors cursor-pointer"
          >
            Odd
          </button>
          {activeLengthsSet.size > 0 && (
            <button
              type="button"
              onClick={onClearLengthFilter}
              className="p-1 rounded text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
              title="Reset length filter"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Label Badges Grid */}
      <div className="flex-1 w-full min-h-0 py-2 overflow-y-auto flex flex-wrap content-start gap-1.5">
        {validBins.map((bin) => {
          const isHoveredMatch = hoveredWordInfo && hoveredWordInfo.length === bin.length;
          const isSelected = activeLengthsSet.has(bin.length);
          const compatCount = compatibleLengthCounts ? (compatibleLengthCounts[bin.length] ?? 0) : null;
          const pct = Math.round((bin.count / totalWords) * 100);

          let chipClass = 'bg-white hover:bg-zinc-100 text-zinc-900 border-black shadow-xs';
          if (isHoveredMatch) {
            chipClass = 'bg-zinc-950 text-white border-black shadow-md ring-2 ring-zinc-800';
          } else if (isSelected) {
            chipClass = 'bg-zinc-900 text-white border-black shadow-xs';
          }

          return (
            <button
              key={bin.length}
              type="button"
              onClick={(e) => handleChipClick(bin.length, e)}
              onMouseEnter={() => onHoverLengthChange?.(bin.length)}
              onMouseLeave={() => onHoverLengthChange?.(null)}
              style={{
                borderRadius: getBlobBorderRadius(bin.length, 'chip'),
              }}
              className={`px-2.5 py-1.5 border font-mono flex items-center gap-2 cursor-pointer transition-all duration-75 select-none ${chipClass}`}
              title={`${bin.length} letters: ${bin.count} words (${pct}%)${compatCount !== null ? ` · ${compatCount} fit` : ''} · Shift-click to multi-select`}
            >
              <span className={`text-[11px] font-bold uppercase tracking-tight ${isHoveredMatch || isSelected ? 'text-zinc-100' : 'text-zinc-800'}`}>
                {bin.length} Letters
              </span>

              <div className="flex items-center gap-1">
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                  isHoveredMatch ? 'bg-zinc-800 text-white' : isSelected ? 'bg-zinc-800 text-white' : 'bg-zinc-200 text-zinc-800'
                }`}>
                  {bin.count}
                </span>
                <span className={`text-[9px] tabular-nums ${isHoveredMatch || isSelected ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  {pct}%
                </span>
                {hoveredWordInfo && compatCount !== null && (
                  <span className={`text-[9px] font-semibold tabular-nums ${isHoveredMatch ? 'text-zinc-100 font-bold' : compatCount > 0 ? 'text-zinc-700' : 'text-zinc-400'}`}>
                    ({compatCount})
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer hint */}
      <div className="shrink-0 pt-1 border-t border-zinc-100 flex items-center justify-between text-[9px] font-mono text-zinc-400">
        <span>Click to isolate · Shift-click to toggle</span>
        <span>{validBins.length} length bins</span>
      </div>
    </div>
  );
};
