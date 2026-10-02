import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { normalizeLengthFilterToSet } from '../utils/filterHelpers';
import { SlidersHorizontal, RotateCcw } from 'lucide-react';

export interface WordLengthHistogramSliderProps {
  histogramData: { length: number; count: number }[];
  selectedLengthFilter: number[] | number | null;
  onSelectLengthFilter: (lengths: number[] | null) => void;
  onClearLengthFilter: () => void;
  className?: string;
  hoveredWordInfo?: { word: string; length: number; pos: string } | null;
  compatibleLengthCounts?: Record<number, number> | null;
  onHoverLengthChange?: (length: number | null) => void;
}

export const WordLengthHistogramSlider: React.FC<WordLengthHistogramSliderProps> = ({
  histogramData,
  selectedLengthFilter,
  onSelectLengthFilter,
  onClearLengthFilter,
  className = '',
  hoveredWordInfo,
  compatibleLengthCounts,
  onHoverLengthChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Active lengths normalized to Set
  const activeLengthsSet = useMemo(() => {
    return normalizeLengthFilterToSet(selectedLengthFilter);
  }, [selectedLengthFilter]);

  // Filter to valid bins with positive counts
  const validBins = useMemo(() => {
    return histogramData.filter(b => b.count > 0);
  }, [histogramData]);

  const minAvailableLength = useMemo(() => {
    if (validBins.length === 0) return 2;
    return Math.min(...validBins.map(b => b.length));
  }, [validBins]);

  const maxAvailableLength = useMemo(() => {
    if (validBins.length === 0) return 10;
    return Math.max(...validBins.map(b => b.length));
  }, [validBins]);

  const maxCount = useMemo(() => {
    if (validBins.length === 0) return 1;
    return Math.max(...validBins.map(b => b.count));
  }, [validBins]);

  const totalWords = useMemo(() => {
    return validBins.reduce((sum, b) => sum + b.count, 0);
  }, [validBins]);

  // Determine current active range bounds for the slider
  const { currentRangeMin, currentRangeMax } = useMemo(() => {
    if (activeLengthsSet.size === 0) {
      return { currentRangeMin: minAvailableLength, currentRangeMax: maxAvailableLength };
    }
    const arr = Array.from(activeLengthsSet).sort((a, b) => a - b);
    return {
      currentRangeMin: arr[0],
      currentRangeMax: arr[arr.length - 1],
    };
  }, [activeLengthsSet, minAvailableLength, maxAvailableLength]);

  // Handle slider range change
  const handleRangeChange = useCallback((newMin: number, newMax: number) => {
    const minVal = Math.min(newMin, newMax);
    const maxVal = Math.max(newMin, newMax);

    if (minVal <= minAvailableLength && maxVal >= maxAvailableLength) {
      onSelectLengthFilter(null);
      return;
    }

    const rangeLengths: number[] = [];
    for (let l = minVal; l <= maxVal; l++) {
      rangeLengths.push(l);
    }
    onSelectLengthFilter(rangeLengths);
  }, [minAvailableLength, maxAvailableLength, onSelectLengthFilter]);

  // Single bar click toggles or isolates length
  const handleBarClick = useCallback((len: number) => {
    if (activeLengthsSet.has(len) && activeLengthsSet.size === 1) {
      onSelectLengthFilter(null);
    } else {
      onSelectLengthFilter([len]);
    }
  }, [activeLengthsSet, onSelectLengthFilter]);

  // Presets
  const applyPreset = useCallback((preset: 'all' | 'short' | 'mid' | 'long' | 'even' | 'odd') => {
    if (preset === 'all') {
      onSelectLengthFilter(null);
      return;
    }
    if (preset === 'short') {
      const arr = validBins.map(b => b.length).filter(l => l <= 4);
      onSelectLengthFilter(arr.length ? arr : null);
      return;
    }
    if (preset === 'mid') {
      const arr = validBins.map(b => b.length).filter(l => l >= 5 && l <= 7);
      onSelectLengthFilter(arr.length ? arr : null);
      return;
    }
    if (preset === 'long') {
      const arr = validBins.map(b => b.length).filter(l => l >= 8);
      onSelectLengthFilter(arr.length ? arr : null);
      return;
    }
    if (preset === 'even') {
      const arr = validBins.map(b => b.length).filter(l => l % 2 === 0);
      onSelectLengthFilter(arr.length ? arr : null);
      return;
    }
    if (preset === 'odd') {
      const arr = validBins.map(b => b.length).filter(l => l % 2 !== 0);
      onSelectLengthFilter(arr.length ? arr : null);
      return;
    }
  }, [validBins, onSelectLengthFilter]);

  if (validBins.length === 0) {
    return (
      <div className={`w-full h-full flex flex-col items-center justify-center text-zinc-400 p-3 text-center ${className}`}>
        <span className="text-[11px] font-mono">No words match current filter</span>
      </div>
    );
  }

  const rangeSpan = Math.max(1, maxAvailableLength - minAvailableLength);
  const leftPercent = ((currentRangeMin - minAvailableLength) / rangeSpan) * 100;
  const rightPercent = ((currentRangeMax - minAvailableLength) / rangeSpan) * 100;

  return (
    <div
      ref={containerRef}
      className={`w-full h-full flex flex-col justify-between p-2 select-none overflow-hidden bg-white text-zinc-900 ${className}`}
    >
      {/* Top summary & quick presets */}
      <div className="flex items-center justify-between gap-1.5 pb-1 shrink-0 border-b border-zinc-100">
        <div className="flex items-center gap-1.5 min-w-0">
          <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
          <span className="text-[11px] font-mono font-bold text-zinc-800 uppercase tracking-tight truncate">
            {activeLengthsSet.size === 0
              ? `All Lengths (${totalWords} words)`
              : activeLengthsSet.size === 1
              ? `${Array.from(activeLengthsSet)[0]} Letters (${validBins.find(b => b.length === Array.from(activeLengthsSet)[0])?.count || 0} words)`
              : `Range: ${currentRangeMin}–${currentRangeMax} Letters`}
          </span>
        </div>

        {/* Action presets */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => applyPreset('short')}
            className="px-1.5 py-0.5 text-[9.5px] font-mono font-medium rounded border border-zinc-200 hover:border-zinc-400 bg-zinc-50 hover:bg-zinc-100 text-zinc-600 transition-colors cursor-pointer"
            title="Filter 2 to 4 letters"
          >
            ≤4L
          </button>
          <button
            type="button"
            onClick={() => applyPreset('mid')}
            className="px-1.5 py-0.5 text-[9.5px] font-mono font-medium rounded border border-zinc-200 hover:border-zinc-400 bg-zinc-50 hover:bg-zinc-100 text-zinc-600 transition-colors cursor-pointer"
            title="Filter 5 to 7 letters"
          >
            5-7L
          </button>
          <button
            type="button"
            onClick={() => applyPreset('long')}
            className="px-1.5 py-0.5 text-[9.5px] font-mono font-medium rounded border border-zinc-200 hover:border-zinc-400 bg-zinc-50 hover:bg-zinc-100 text-zinc-600 transition-colors cursor-pointer"
            title="Filter 8+ letters"
          >
            ≥8L
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

      {/* Interactive Bar Chart Histogram */}
      <div className="flex-1 w-full min-h-0 py-1.5 px-0.5 flex items-end justify-between gap-1 sm:gap-2">
        {validBins.map((bin) => {
          const isHoveredMatch = hoveredWordInfo && hoveredWordInfo.length === bin.length;
          const isSelected = activeLengthsSet.has(bin.length);
          const isFilteredOut = activeLengthsSet.size > 0 && !isSelected;
          const compatCount = compatibleLengthCounts ? (compatibleLengthCounts[bin.length] ?? 0) : null;
          const pct = Math.round((bin.count / totalWords) * 100);
          const barHeightPct = Math.max(14, Math.round((bin.count / maxCount) * 100));

          let barColor = 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-200';
          if (isHoveredMatch) {
            barColor = 'bg-zinc-950 text-white shadow-md ring-2 ring-zinc-800 border-zinc-950 z-10';
          } else if (isSelected) {
            barColor = 'bg-zinc-900 text-white border-zinc-900 shadow-xs';
          } else if (isFilteredOut) {
            barColor = 'bg-zinc-50 text-zinc-300 border-zinc-100 opacity-50';
          }

          return (
            <div
              key={bin.length}
              onClick={() => handleBarClick(bin.length)}
              onMouseEnter={() => onHoverLengthChange?.(bin.length)}
              onMouseLeave={() => onHoverLengthChange?.(null)}
              className="flex-1 h-full flex flex-col justify-end items-center cursor-pointer group select-none min-w-[20px]"
              title={`${bin.length} letters: ${bin.count} words (${pct}%)${compatCount !== null ? ` · ${compatCount} fit concurrently` : ''}`}
            >
              {/* Count & compat indicator badge above bar */}
              <div className="flex flex-col items-center justify-end text-center mb-1 leading-none">
                <span className={`font-mono text-[10px] tabular-nums font-bold ${isHoveredMatch ? 'text-zinc-950 font-black' : isSelected ? 'text-zinc-900' : 'text-zinc-600'}`}>
                  {bin.count}
                </span>
                {hoveredWordInfo && compatCount !== null && (
                  <span className={`font-mono text-[8px] tabular-nums font-medium ${isHoveredMatch ? 'text-zinc-900 font-bold' : compatCount > 0 ? 'text-zinc-700' : 'text-zinc-400'}`}>
                    ({compatCount})
                  </span>
                )}
              </div>

              {/* Bar pillar */}
              <div
                style={{ height: `${barHeightPct}%` }}
                className={`w-full rounded-t-md border border-b-0 transition-all duration-75 flex flex-col items-center justify-start pt-1 overflow-hidden ${barColor}`}
              >
                {barHeightPct >= 35 && (
                  <span className={`text-[8.5px] font-mono tabular-nums leading-none ${isHoveredMatch || isSelected ? 'text-zinc-200' : 'text-zinc-500'}`}>
                    {pct}%
                  </span>
                )}
              </div>

              {/* Length label below bar */}
              <div className="mt-1 flex items-center justify-center text-center">
                <span className={`font-mono text-[10px] font-bold uppercase tracking-tight ${isHoveredMatch ? 'text-zinc-950 font-black' : isSelected ? 'text-zinc-900' : 'text-zinc-500'}`}>
                  {bin.length}L
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Draggable Dual-Handle Ranged Slider */}
      <div className="w-full shrink-0 pt-1.5 pb-0.5 px-1 border-t border-zinc-100 flex flex-col gap-1">
        <div className="relative w-full h-5 flex items-center">
          {/* Base track */}
          <div className="absolute inset-x-0 h-1.5 bg-zinc-200 rounded-full" />

          {/* Active highlighted range segment */}
          <div
            style={{
              left: `${leftPercent}%`,
              width: `${Math.max(2, rightPercent - leftPercent)}%`,
            }}
            className="absolute h-1.5 bg-zinc-950 rounded-full shadow-xs transition-all duration-75"
          />

          {/* Left Thumb Input */}
          <input
            type="range"
            min={minAvailableLength}
            max={maxAvailableLength}
            step={1}
            value={currentRangeMin}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              handleRangeChange(val, Math.max(val, currentRangeMax));
            }}
            className="absolute inset-x-0 w-full h-5 appearance-none bg-transparent pointer-events-auto cursor-pointer accent-zinc-950 focus:outline-hidden"
            aria-label="Minimum word length filter"
          />

          {/* Right Thumb Input */}
          <input
            type="range"
            min={minAvailableLength}
            max={maxAvailableLength}
            step={1}
            value={currentRangeMax}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              handleRangeChange(Math.min(val, currentRangeMin), val);
            }}
            className="absolute inset-x-0 w-full h-5 appearance-none bg-transparent pointer-events-auto cursor-pointer accent-zinc-950 focus:outline-hidden"
            aria-label="Maximum word length filter"
          />
        </div>

        {/* Range boundary indicators */}
        <div className="flex items-center justify-between text-[9px] font-mono text-zinc-400 px-0.5 leading-none">
          <span>{minAvailableLength} letters</span>
          <span className="font-semibold text-zinc-700">
            {activeLengthsSet.size === 0
              ? 'Showing all lengths'
              : `Active: ${currentRangeMin} to ${currentRangeMax} letters`}
          </span>
          <span>{maxAvailableLength} letters</span>
        </div>
      </div>
    </div>
  );
};
