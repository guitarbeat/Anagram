import React, { useMemo, useCallback } from 'react';
import type { POS } from '../engine/types';
import { POS_FILTERS, type PosFilterItem } from './PosFilterConstants';
import { BarChart2, RotateCcw } from 'lucide-react';

export interface PosHistogramProps {
  posCounts: Record<string, number>;
  otherSubtypeCounts: {
    pron: number;
    prep: number;
    art: number;
    conj: number;
    other: number;
  };
  activePosFilter: POS | 'all' | null;
  onPosFilterChange: (pos: POS | null) => void;
  className?: string;
  hoveredWordInfo?: { word: string; length: number; pos: POS } | null;
  compatiblePosCounts?: Record<string, number> | null;
  onHoverPosChange?: (pos: POS | null) => void;
}

export const PosHistogram: React.FC<PosHistogramProps> = ({
  posCounts,
  otherSubtypeCounts,
  activePosFilter,
  onPosFilterChange,
  className = '',
  hoveredWordInfo,
  compatiblePosCounts,
  onHoverPosChange,
}) => {
  const totalCount = posCounts.all || 1;

  const primaryItems = useMemo(() => {
    return [
      { id: 'noun' as POS, label: 'Nouns', count: posCounts.noun || 0 },
      { id: 'verb' as POS, label: 'Verbs', count: posCounts.verb || 0 },
      { id: 'adj' as POS, label: 'Adjectives', count: posCounts.adj || 0 },
      { id: 'adv' as POS, label: 'Adverbs', count: posCounts.adv || 0 },
      { id: 'other' as POS, label: 'Other', count: posCounts.other || 0 },
    ].filter(item => item.count > 0);
  }, [posCounts]);

  const maxCount = useMemo(() => {
    return Math.max(1, ...primaryItems.map(i => i.count));
  }, [primaryItems]);

  const handleItemClick = useCallback((id: POS) => {
    if (activePosFilter === id) {
      onPosFilterChange(null);
    } else {
      onPosFilterChange(id);
    }
  }, [activePosFilter, onPosFilterChange]);

  return (
    <div className={`w-full h-full flex flex-col justify-between p-2 select-none overflow-hidden bg-white text-zinc-900 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-1.5 pb-1 shrink-0 border-b border-zinc-100">
        <div className="flex items-center gap-1.5 min-w-0">
          <BarChart2 className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
          <span className="text-[11px] font-mono font-bold text-zinc-800 uppercase tracking-tight truncate">
            {activePosFilter && activePosFilter !== 'all'
              ? `Filter: ${activePosFilter.toUpperCase()}S (${posCounts[activePosFilter] || 0})`
              : `All Parts of Speech (${posCounts.all || 0})`}
          </span>
        </div>
        {activePosFilter && activePosFilter !== 'all' && (
          <button
            type="button"
            onClick={() => onPosFilterChange(null)}
            className="p-1 rounded text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
            title="Reset POS filter"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Horizontal Bar Chart Distribution */}
      <div className="flex-1 w-full min-h-0 py-1 flex flex-col justify-around gap-1">
        {primaryItems.map((item) => {
          const isHoveredMatch = hoveredWordInfo && hoveredWordInfo.pos === item.id;
          const isSelected = activePosFilter === item.id;
          const isFilteredOut = activePosFilter && activePosFilter !== 'all' && !isSelected;
          const pct = Math.round((item.count / totalCount) * 100);
          const widthPct = Math.max(8, Math.round((item.count / maxCount) * 100));
          const compatCount = compatiblePosCounts ? (compatiblePosCounts[item.id] ?? 0) : null;

          let barBg = 'bg-zinc-200 group-hover:bg-zinc-300';
          if (isHoveredMatch) {
            barBg = 'bg-zinc-950 shadow-xs ring-1 ring-zinc-800';
          } else if (isSelected) {
            barBg = 'bg-zinc-900';
          } else if (isFilteredOut) {
            barBg = 'bg-zinc-100 opacity-60';
          }

          return (
            <div
              key={item.id}
              onClick={() => handleItemClick(item.id)}
              onMouseEnter={() => onHoverPosChange?.(item.id)}
              onMouseLeave={() => onHoverPosChange?.(null)}
              className="w-full flex items-center gap-2 cursor-pointer group py-0.5"
              title={`${item.label}: ${item.count} words (${pct}%)${compatCount !== null ? ` · ${compatCount} fit concurrently` : ''}`}
            >
              {/* Category Label */}
              <div className="w-16 sm:w-20 shrink-0 text-left">
                <span className={`font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-tight truncate block ${isHoveredMatch ? 'text-zinc-950 font-black' : isSelected ? 'text-zinc-900 font-extrabold' : 'text-zinc-700'}`}>
                  {item.label}
                </span>
              </div>

              {/* Bar Track & Fill */}
              <div className="flex-1 h-5 sm:h-6 bg-zinc-100 rounded-md overflow-hidden relative border border-zinc-200/70 p-0.5 flex items-center">
                <div
                  style={{ width: `${widthPct}%` }}
                  className={`h-full rounded transition-all duration-75 ${barBg}`}
                />

                {/* Overlaid Count and Percentage */}
                <div className="absolute inset-0 px-2 flex items-center justify-between pointer-events-none">
                  <span className={`font-mono text-[10px] font-bold tabular-nums ${isSelected || isHoveredMatch ? 'text-white' : 'text-zinc-800'}`}>
                    {item.count}
                  </span>
                  <div className="flex items-center gap-1 font-mono text-[9px] tabular-nums">
                    {hoveredWordInfo && compatCount !== null && (
                      <span className={`font-semibold ${isHoveredMatch ? 'text-zinc-100 font-bold' : compatCount > 0 ? 'text-zinc-700 font-medium' : 'text-zinc-400'}`}>
                        ({compatCount} fit)
                      </span>
                    )}
                    <span className={isSelected || isHoveredMatch ? 'text-zinc-200' : 'text-zinc-500'}>
                      {pct}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Other subtypes badge strip if other has words */}
      {otherSubtypeCounts.other + otherSubtypeCounts.pron + otherSubtypeCounts.prep + otherSubtypeCounts.conj + otherSubtypeCounts.art > 0 && (
        <div className="shrink-0 pt-1 border-t border-zinc-100 flex items-center gap-1 overflow-x-auto text-[9px] font-mono text-zinc-500">
          <span className="shrink-0 font-semibold text-zinc-400">Other types:</span>
          {otherSubtypeCounts.pron > 0 && (
            <span className="px-1 py-0.2 bg-zinc-100 rounded border border-zinc-200">
              Pronouns {otherSubtypeCounts.pron}
            </span>
          )}
          {otherSubtypeCounts.prep > 0 && (
            <span className="px-1 py-0.2 bg-zinc-100 rounded border border-zinc-200">
              Prepositions {otherSubtypeCounts.prep}
            </span>
          )}
          {otherSubtypeCounts.art > 0 && (
            <span className="px-1 py-0.2 bg-zinc-100 rounded border border-zinc-200">
              Articles {otherSubtypeCounts.art}
            </span>
          )}
          {otherSubtypeCounts.conj > 0 && (
            <span className="px-1 py-0.2 bg-zinc-100 rounded border border-zinc-200">
              Conjunctions {otherSubtypeCounts.conj}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
