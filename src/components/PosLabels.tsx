import React, { useMemo, useCallback } from 'react';
import type { POS } from '../engine/types';
import { Tag, RotateCcw } from 'lucide-react';
import { getBlobBorderRadius } from '../utils/blobStyle';

export interface PosLabelsProps {
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

export const PosLabels: React.FC<PosLabelsProps> = ({
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

  const items = useMemo(() => {
    return [
      { id: 'all' as const, label: 'All Words', count: posCounts.all || 0, desc: 'All dictionary word types' },
      { id: 'noun' as POS, label: 'Nouns', count: posCounts.noun || 0, desc: 'People, places, things, entities' },
      { id: 'verb' as POS, label: 'Verbs', count: posCounts.verb || 0, desc: 'Actions, states of being' },
      { id: 'adj' as POS, label: 'Adjectives', count: posCounts.adj || 0, desc: 'Descriptors, sensory attributes' },
      { id: 'adv' as POS, label: 'Adverbs', count: posCounts.adv || 0, desc: 'Manner, frequency, degrees' },
      { id: 'other' as POS, label: 'Other', count: posCounts.other || 0, desc: 'Grammar particles & connectors' },
    ].filter(i => i.count > 0);
  }, [posCounts]);

  const handleItemClick = useCallback((id: POS | 'all') => {
    if (id === 'all') {
      onPosFilterChange(null);
    } else if (activePosFilter === id) {
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
          <Tag className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
          <span className="text-[11px] font-mono font-bold text-zinc-800 uppercase tracking-tight truncate">
            Parts of Speech Labels
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

      {/* Main POS Badge Chips */}
      <div className="flex-1 w-full min-h-0 py-2 overflow-y-auto flex flex-wrap content-start gap-1.5">
        {items.map((item) => {
          const isAll = item.id === 'all';
          const isSelected = isAll ? !activePosFilter || activePosFilter === 'all' : activePosFilter === item.id;
          const isHoveredMatch = !isAll && hoveredWordInfo && hoveredWordInfo.pos === item.id;
          const compatCount = !isAll && compatiblePosCounts ? (compatiblePosCounts[item.id] ?? 0) : null;
          const pct = Math.round((item.count / totalCount) * 100);

          let chipClass = 'bg-white hover:bg-zinc-100 text-zinc-900 border-black shadow-xs';
          if (isHoveredMatch) {
            chipClass = 'bg-zinc-950 text-white border-black shadow-md ring-2 ring-zinc-800';
          } else if (isSelected) {
            chipClass = 'bg-zinc-900 text-white border-black shadow-xs';
          }

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleItemClick(item.id)}
              onMouseEnter={() => !isAll && onHoverPosChange?.(item.id as POS)}
              onMouseLeave={() => !isAll && onHoverPosChange?.(null)}
              style={{
                borderRadius: getBlobBorderRadius(item.id, 'chip'),
              }}
              className={`px-3 py-1.5 border font-mono flex flex-col items-start gap-0.5 cursor-pointer transition-all duration-75 select-none ${chipClass}`}
              title={`${item.label}: ${item.count} words (${pct}%) · ${item.desc}`}
            >
              <div className="flex items-center gap-2 w-full justify-between">
                <span className={`text-[11px] font-bold uppercase tracking-tight ${isHoveredMatch || isSelected ? 'text-zinc-100' : 'text-zinc-800'}`}>
                  {item.label}
                </span>
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                  isHoveredMatch ? 'bg-zinc-800 text-white' : isSelected ? 'bg-zinc-800 text-white' : 'bg-zinc-200 text-zinc-800'
                }`}>
                  {item.count}
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-[9px] tabular-nums">
                <span className={isHoveredMatch || isSelected ? 'text-zinc-400' : 'text-zinc-500'}>
                  {pct}% of available
                </span>
                {hoveredWordInfo && compatCount !== null && (
                  <span className={`font-semibold ${isHoveredMatch ? 'text-zinc-100 font-bold' : compatCount > 0 ? 'text-zinc-700 font-medium' : 'text-zinc-400'}`}>
                    ({compatCount} fit)
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Other Subtypes Quick Strip */}
      {otherSubtypeCounts.other + otherSubtypeCounts.pron + otherSubtypeCounts.prep + otherSubtypeCounts.conj + otherSubtypeCounts.art > 0 && (
        <div className="shrink-0 pt-1.5 border-t border-zinc-100 flex items-center gap-1 overflow-x-auto text-[9.5px] font-mono text-zinc-600">
          <span className="font-semibold text-zinc-400 shrink-0">Subtypes:</span>
          {otherSubtypeCounts.pron > 0 && (
            <span className="px-1.5 py-0.5 bg-zinc-100 rounded border border-zinc-200">
              Pronouns: {otherSubtypeCounts.pron}
            </span>
          )}
          {otherSubtypeCounts.prep > 0 && (
            <span className="px-1.5 py-0.5 bg-zinc-100 rounded border border-zinc-200">
              Prepositions: {otherSubtypeCounts.prep}
            </span>
          )}
          {otherSubtypeCounts.art > 0 && (
            <span className="px-1.5 py-0.5 bg-zinc-100 rounded border border-zinc-200">
              Articles: {otherSubtypeCounts.art}
            </span>
          )}
          {otherSubtypeCounts.conj > 0 && (
            <span className="px-1.5 py-0.5 bg-zinc-100 rounded border border-zinc-200">
              Conjunctions: {otherSubtypeCounts.conj}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
