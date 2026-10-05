import React, { useRef, useState, useEffect, useMemo } from 'react';
import type { CandidateWordItem } from '../engine/types';
import {
  FREQUENCY_TIERS,
  type FrequencyTier,
  getFrequencyTier,
} from '../engine/lexicon';
import { computeSquarifiedTreemapGeneric, type GenericTreemapTile } from '../render/treemap';
import { getBlobBorderRadius } from '../utils/blobStyle';

export interface FrequencyTreemapProps {
  candidateWords: CandidateWordItem[];
  activeFreqFilter: FrequencyTier | 'all' | null;
  onFreqFilterChange: (tier: FrequencyTier | null) => void;
  className?: string;
  hoveredWordInfo?: { word: string; length: number; freq?: number } | null;
  onHoverFreqChange?: (tier: FrequencyTier | null) => void;
}

export const FrequencyTreemap: React.FC<FrequencyTreemapProps> = ({
  candidateWords,
  activeFreqFilter,
  onFreqFilterChange,
  className = '',
  hoveredWordInfo,
  onHoverFreqChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [boxSize, setBoxSize] = useState<{ width: number; height: number }>({
    width: 260,
    height: 140,
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setBoxSize({ width: rect.width, height: rect.height });
      }
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Compute counts for each frequency tier
  const tierData = useMemo(() => {
    const counts: Record<FrequencyTier, number> = {
      all: candidateWords.length,
      top: 0,
      common: 0,
      uncommon: 0,
      rare: 0,
      obscure: 0,
    };

    for (let i = 0; i < candidateWords.length; i++) {
      const tier = getFrequencyTier(candidateWords[i].freq);
      counts[tier]++;
    }

    const items = FREQUENCY_TIERS.map((info) => ({
      id: info.id,
      count: counts[info.id] || 0,
      data: info,
    }));

    return { counts, items };
  }, [candidateWords]);

  // Compute squarified layout
  const treemapTiles = useMemo<GenericTreemapTile[]>(() => {
    const validItems = tierData.items.filter((i) => i.count > 0);
    return computeSquarifiedTreemapGeneric(
      validItems,
      Math.max(10, boxSize.width - 8),
      Math.max(10, boxSize.height - 8)
    );
  }, [tierData.items, boxSize.width, boxSize.height]);

  const hoveredWordTier = useMemo(() => {
    if (!hoveredWordInfo || hoveredWordInfo.freq === undefined) return null;
    return getFrequencyTier(hoveredWordInfo.freq);
  }, [hoveredWordInfo]);

  return (
    <div
      ref={containerRef}
      onDoubleClick={() => onFreqFilterChange(null)}
      onPointerLeave={() => onHoverFreqChange?.(null)}
      className={`FrequencyTreemap flex-1 min-h-0 relative w-full h-full p-1 select-none overflow-hidden ${className}`}
    >
      <div className="relative w-full h-full">
        {treemapTiles.map((tile) => {
          const tierInfo = FREQUENCY_TIERS.find((t) => t.id === tile.id);
          const isSelected = activeFreqFilter === tile.id;
          const isDimmed = activeFreqFilter && !isSelected;
          const isHoveredMatch = hoveredWordTier === tile.id;

          const tileW = Math.round(tile.w);
          const tileH = Math.round(tile.h);
          const tileX = Math.round(tile.x);
          const tileY = Math.round(tile.y);

          const isExtraLarge = tileW >= 90 && tileH >= 65;
          const isLarge = (tileW >= 65 && tileH >= 45) || (tileW >= 90 && tileH >= 38);
          const isMedium = tileW >= 45 && tileH >= 30;

          let tileColorClass =
            'bg-white hover:bg-zinc-50 text-zinc-900 border-black shadow-[1.5px_1.5px_0px_#000000] hover:shadow-[2.5px_2.5px_0px_#000000]';
          if (isHoveredMatch) {
            tileColorClass = 'bg-zinc-950 text-white border-black shadow-[3px_3px_0px_#000000] ring-2 ring-zinc-800 z-20';
          } else if (isSelected) {
            tileColorClass = 'bg-black text-white border-black shadow-[2px_2px_0px_#000000] z-10';
          } else if (isDimmed) {
            tileColorClass = 'bg-zinc-100/60 hover:bg-zinc-200/80 text-zinc-400 border-black/60 opacity-60 hover:opacity-100 shadow-none';
          }

          const tooltip = `${tierInfo?.label || tile.id.toUpperCase()}: ${tile.count} words (${tile.percentage.toFixed(1)}% of pool)\n${tierInfo?.description}\n${isSelected ? '(Click to clear)' : '(Click to filter)'}`;

          return (
            <button
              key={tile.id}
              type="button"
              onPointerEnter={() => onHoverFreqChange?.(tile.id as FrequencyTier)}
              onPointerLeave={() => onHoverFreqChange?.(null)}
              onClick={() => {
                if (activeFreqFilter === tile.id) {
                  onFreqFilterChange(null);
                } else {
                  onFreqFilterChange(tile.id as FrequencyTier);
                }
              }}
              style={{
                left: `${tileX}px`,
                top: `${tileY}px`,
                width: `${tileW}px`,
                height: `${tileH}px`,
                borderRadius: getBlobBorderRadius(tile.id, tileW < 45 || tileH < 30 ? 'compact' : 'tile'),
              }}
              className={`absolute border-2 border-black flex flex-col items-center justify-center cursor-pointer select-none transition-all duration-75 ease-out overflow-hidden p-1 ${tileColorClass}`}
              title={tooltip}
            >
              {isExtraLarge ? (
                <div className="flex flex-col items-center justify-center text-center gap-0.5">
                  <span
                    className={`font-mono text-[10px] sm:text-[11px] font-black uppercase tracking-wider ${
                      isHoveredMatch ? 'text-white' : isSelected ? 'text-zinc-200' : 'text-zinc-800'
                    }`}
                  >
                    {tierInfo?.shortLabel || tile.id.toUpperCase()}
                  </span>
                  <div className="flex items-baseline gap-1 my-0.5">
                    <span className="font-mono text-lg font-black tabular-nums leading-none">
                      {tile.count}
                    </span>
                    <span
                      className={`font-mono text-[8.5px] tabular-nums font-semibold ${
                        isSelected || isHoveredMatch ? 'text-zinc-300' : 'text-zinc-500'
                      }`}
                    >
                      {tile.percentage.toFixed(0)}%
                    </span>
                  </div>
                  <span
                    className={`text-[7.5px] font-mono uppercase tracking-tight ${
                      isSelected || isHoveredMatch ? 'text-zinc-400' : 'text-zinc-500'
                    }`}
                  >
                    {tierInfo?.minFreq === 0
                      ? '0 FREQ'
                      : `${tierInfo?.minFreq}+ FREQ`}
                  </span>
                </div>
              ) : isLarge ? (
                <div className="flex flex-col items-center justify-center text-center gap-0.5">
                  <span
                    className={`font-mono text-[9.5px] font-black uppercase tracking-tight ${
                      isHoveredMatch ? 'text-white' : isSelected ? 'text-zinc-200' : 'text-zinc-800'
                    }`}
                  >
                    {tierInfo?.shortLabel || tile.id.toUpperCase()}
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="font-mono text-sm font-black tabular-nums leading-none">
                      {tile.count}
                    </span>
                    <span
                      className={`font-mono text-[8px] tabular-nums ${
                        isSelected || isHoveredMatch ? 'text-zinc-300' : 'text-zinc-500'
                      }`}
                    >
                      {tile.percentage.toFixed(0)}%
                    </span>
                  </div>
                </div>
              ) : isMedium ? (
                <div className="flex flex-col items-center justify-center text-center leading-none">
                  <span
                    className={`font-mono text-[8.5px] font-black uppercase ${
                      isHoveredMatch ? 'text-white' : isSelected ? 'text-zinc-200' : 'text-zinc-800'
                    }`}
                  >
                    {tierInfo?.shortLabel?.slice(0, 3) || tile.id.slice(0, 3).toUpperCase()}
                  </span>
                  <span className="font-mono text-[9px] font-bold mt-0.5 tabular-nums">
                    {tile.count}
                  </span>
                </div>
              ) : (
                <span className="font-mono text-[8px] font-bold tabular-nums">
                  {tile.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
