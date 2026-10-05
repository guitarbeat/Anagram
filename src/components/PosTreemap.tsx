import React, { useRef, useState, useEffect, useMemo } from 'react';
import type { POS } from '../engine/types';
import { POS_FILTERS, type PosFilterItem } from './PosFilterConstants';
import { computeSquarifiedTreemapGeneric, type GenericTreemapItem, type GenericTreemapTile } from '../render/treemap';
import { getBlobBorderRadius } from '../utils/blobStyle';

export interface PosTreemapProps {
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

export const PosTreemap: React.FC<PosTreemapProps> = ({
  posCounts,
  otherSubtypeCounts,
  activePosFilter,
  onPosFilterChange,
  className = '',
  hoveredWordInfo,
  compatiblePosCounts,
  onHoverPosChange,
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

  const filterMap = useMemo(() => {
    const map = new Map<string, PosFilterItem>();
    for (const f of POS_FILTERS) {
      map.set(f.id, f);
    }
    return map;
  }, []);

  const treemapItems: GenericTreemapItem<PosFilterItem>[] = useMemo(() => {
    const posKeys: POS[] = ['noun', 'verb', 'adj', 'adv', 'other'];
    const items: GenericTreemapItem<PosFilterItem>[] = [];

    for (const key of posKeys) {
      const count = posCounts[key] || 0;
      if (count > 0) {
        const meta = filterMap.get(key);
        items.push({
          id: key,
          count,
          data: meta,
        });
      }
    }
    return items;
  }, [posCounts, filterMap]);

  const availW = Math.max(10, boxSize.width - 12);
  const availH = Math.max(10, boxSize.height - 12);

  const treemapTiles: GenericTreemapTile<PosFilterItem>[] = useMemo(() => {
    return computeSquarifiedTreemapGeneric(treemapItems, availW, availH);
  }, [treemapItems, availW, availH]);

  if (treemapTiles.length === 0) {
    return (
      <div
        ref={containerRef}
        className={`PosTreemap flex-1 min-h-0 relative w-full h-full p-[6px] select-none overflow-hidden flex flex-col items-center justify-center text-center text-zinc-400 ${className}`}
      >
        <span className="text-[10px] font-mono">No words available</span>
      </div>
    );
  }

  const hasSpecificSelection = Boolean(activePosFilter && activePosFilter !== 'all');

  return (
    <div
      ref={containerRef}
      onDoubleClick={() => onPosFilterChange(null)}
      onPointerLeave={() => onHoverPosChange?.(null)}
      className={`PosTreemap flex-1 min-h-0 relative w-full h-full p-[6px] select-none overflow-hidden ${className}`}
    >
      <div className="relative w-full h-full">
        {treemapTiles.map((tile) => {
          const isSelected = activePosFilter === tile.id;
          const isDimmed = hasSpecificSelection && !isSelected;
          const meta = tile.data;
          const label = meta ? meta.label : tile.id;

          const isLeft = tile.x < 1;
          const isRight = Math.abs(tile.x + tile.w - availW) < 1.5;
          const isTop = tile.y < 1;
          const isBottom = Math.abs(tile.y + tile.h - availH) < 1.5;

          const gap = 3;
          const tileX = tile.x + (isLeft ? 0 : gap / 2);
          const tileY = tile.y + (isTop ? 0 : gap / 2);
          const tileW = Math.max(4, tile.w - (isLeft ? 0 : gap / 2) - (isRight ? 0 : gap / 2));
          const tileH = Math.max(4, tile.h - (isTop ? 0 : gap / 2) - (isBottom ? 0 : gap / 2));

          const isExtraLarge = tileW >= 85 && tileH >= 65;
          const isLarge = tileW >= 60 && tileH >= 42;
          const isMedium = tileW >= 38 && tileH >= 28;

          const isHoveredMatch = hoveredWordInfo?.pos === tile.id;
          const compatCount = compatiblePosCounts ? (compatiblePosCounts[tile.id] ?? 0) : null;
          const isCompatZero = Boolean(hoveredWordInfo && compatCount === 0 && !isHoveredMatch);

          // Build helpful informative tooltip
          let tooltip = `${label}: ${tile.count} words (${tile.percentage.toFixed(1)}% of vocabulary)`;
          if (hoveredWordInfo) {
            if (isHoveredMatch) {
              tooltip += `\n✦ Matches hovered word "${hoveredWordInfo.word.toUpperCase()}"!`;
            }
            if (compatCount !== null) {
              tooltip += `\n• ${compatCount} ${label.toLowerCase()} can be formed alongside "${hoveredWordInfo.word.toUpperCase()}"`;
            }
          } else if (tile.id === 'other') {
            tooltip += `\n• Pronouns: ${otherSubtypeCounts.pron}\n• Prepositions: ${otherSubtypeCounts.prep}\n• Articles: ${otherSubtypeCounts.art}\n• Conjunctions: ${otherSubtypeCounts.conj}\n• Misc: ${otherSubtypeCounts.other}`;
          } else if (meta?.desc) {
            tooltip += `\n${meta.desc}`;
          }
          tooltip += isSelected ? '\n(Click to deselect)' : '\n(Click to filter)';

          // Short label for tiny tiles
          const displayLabel = tileW < 52 ? (
            tile.id === 'noun' ? 'NOUN' :
            tile.id === 'verb' ? 'VERB' :
            tile.id === 'adj' ? 'ADJ' :
            tile.id === 'adv' ? 'ADV' :
            'OTH'
          ) : label.toUpperCase();

          let tileColorClass = 'bg-white hover:bg-zinc-50 text-zinc-900 border-black shadow-[1.5px_1.5px_0px_#000000] hover:shadow-[2.5px_2.5px_0px_#000000]';
          if (isHoveredMatch) {
            tileColorClass = 'bg-zinc-950 text-white border-black shadow-[3px_3px_0px_#000000] ring-2 ring-zinc-800 z-20';
          } else if (isSelected) {
            tileColorClass = 'bg-black text-white border-black shadow-[2px_2px_0px_#000000] z-10';
          } else if (isCompatZero) {
            tileColorClass = 'bg-zinc-50/70 text-zinc-400 border-black/40 opacity-30 shadow-none';
          } else if (isDimmed) {
            tileColorClass = 'bg-zinc-100/60 hover:bg-zinc-200/80 text-zinc-400 border-black/60 opacity-60 hover:opacity-100 shadow-none';
          }

          return (
            <button
              key={tile.id}
              type="button"
              onPointerEnter={() => onHoverPosChange?.(tile.id as POS)}
              onPointerLeave={() => onHoverPosChange?.(null)}
              onClick={() => {
                if (activePosFilter === tile.id) {
                  onPosFilterChange(null);
                } else {
                  onPosFilterChange(tile.id as POS);
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
                    className={`font-mono text-[11px] font-black uppercase tracking-wider ${
                      isHoveredMatch ? 'text-white' : isSelected ? 'text-zinc-200' : 'text-zinc-800'
                    }`}
                  >
                    {displayLabel}
                  </span>
                  {isHoveredMatch && hoveredWordInfo ? (
                    <span className="font-mono text-[9.5px] font-black uppercase tracking-wider text-amber-400 my-0.5">
                      ✦ {hoveredWordInfo.word}
                    </span>
                  ) : null}
                  <div className="flex items-baseline gap-1 my-0.5">
                    <span className="font-mono text-lg font-black tabular-nums leading-none">
                      {tile.count}
                    </span>
                    {hoveredWordInfo && compatCount !== null ? (
                      <span className={`font-mono text-[9.5px] tabular-nums font-semibold ${isHoveredMatch ? 'text-zinc-200' : compatCount > 0 ? 'text-zinc-900 font-bold' : 'text-zinc-400'}`}>
                        ({compatCount} fit)
                      </span>
                    ) : (
                      <span
                        className={`font-mono text-[9px] tabular-nums ${
                          isSelected ? 'text-zinc-400' : 'text-zinc-500'
                        }`}
                      >
                        {tile.percentage.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
              ) : isLarge ? (
                <div className="flex flex-col items-center justify-center text-center leading-tight">
                  <span
                    className={`font-mono text-[10px] font-bold uppercase tracking-wide truncate max-w-full px-0.5 ${
                      isHoveredMatch ? 'text-white' : isSelected ? 'text-zinc-200' : 'text-zinc-700'
                    }`}
                  >
                    {displayLabel}
                  </span>
                  {isHoveredMatch && hoveredWordInfo ? (
                    <span className="font-mono text-[8.5px] font-bold uppercase tracking-wider bg-black/20 text-white px-1 py-0.5 rounded-full truncate max-w-full my-0.5">
                      ✦ {hoveredWordInfo.word}
                    </span>
                  ) : null}
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="font-mono text-xs font-bold tabular-nums">
                      {tile.count}
                    </span>
                    {hoveredWordInfo && compatCount !== null ? (
                      <span className={`font-mono text-[8.5px] tabular-nums font-semibold ${isHoveredMatch ? 'text-zinc-200' : compatCount > 0 ? 'text-zinc-900 font-bold' : 'text-zinc-400'}`}>
                        ({compatCount} fit)
                      </span>
                    ) : (
                      <span
                        className={`font-mono text-[9px] tabular-nums ${
                          isSelected ? 'text-zinc-400' : 'text-zinc-500'
                        }`}
                      >
                        {tile.percentage >= 10 ? `${Math.round(tile.percentage)}%` : `${tile.percentage.toFixed(0)}%`}
                      </span>
                    )}
                  </div>
                </div>
              ) : isMedium ? (
                <div className="flex flex-col items-center justify-center text-center leading-none gap-0.5">
                  <span
                    className={`font-mono text-[9px] font-bold uppercase tracking-tight truncate max-w-full ${
                      isHoveredMatch ? 'text-white' : isSelected ? 'text-zinc-200' : 'text-zinc-700'
                    }`}
                  >
                    {displayLabel}
                  </span>
                  <span className="font-mono text-[10px] font-bold tabular-nums">
                    {hoveredWordInfo && compatCount !== null ? `${compatCount}/${tile.count}` : tile.count}
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-center text-center overflow-hidden px-0.5">
                  <span className="font-mono text-[8px] font-bold tabular-nums leading-none">
                    {tile.count}
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
