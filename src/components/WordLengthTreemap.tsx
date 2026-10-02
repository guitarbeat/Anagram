import React, { useRef, useState, useEffect, useMemo } from 'react';
import { computeSquarifiedTreemap, type TreemapItem } from '../render/treemap';
import { normalizeLengthFilterToSet, toggleLengthFilter } from '../utils/filterHelpers';
import { getBlobBorderRadius } from '../utils/blobStyle';

export interface WordLengthTreemapProps {
  histogramData: { length: number; count: number }[];
  selectedLengthFilter: number[] | number | null;
  onSelectLengthFilter: (lengths: number[] | null) => void;
  onClearLengthFilter: () => void;
  className?: string;
  hoveredWordInfo?: { word: string; length: number; pos: string } | null;
  compatibleLengthCounts?: Record<number, number> | null;
  onHoverLengthChange?: (length: number | null) => void;
}

export const WordLengthTreemap: React.FC<WordLengthTreemapProps> = ({
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
  const [boxSize, setBoxSize] = useState<{ width: number; height: number }>({
    width: 260,
    height: 150,
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

  const activeLengthsSet = useMemo(() => {
    return normalizeLengthFilterToSet(selectedLengthFilter);
  }, [selectedLengthFilter]);

  const treemapItems: TreemapItem[] = useMemo(() => {
    return histogramData
      .filter((b) => b.count > 0)
      .map((b) => ({
        length: b.length,
        count: b.count,
      }));
  }, [histogramData]);

  const treemapTiles = useMemo(() => {
    const pad = 12;
    const availW = Math.max(10, boxSize.width - pad);
    const availH = Math.max(10, boxSize.height - pad);
    return computeSquarifiedTreemap(treemapItems, availW, availH);
  }, [treemapItems, boxSize]);

  if (treemapTiles.length === 0) {
    return (
      <div
        ref={containerRef}
        onDoubleClick={onClearLengthFilter}
        className={`WordLengthTreemap flex-1 min-h-0 relative w-full h-full p-[6px] select-none overflow-hidden flex flex-col items-center justify-center text-center text-zinc-400 ${className}`}
      >
        <span className="text-[10px] font-mono">No words match current filter</span>
        {selectedLengthFilter !== null && (
          <button
            type="button"
            onClick={onClearLengthFilter}
            className="mt-1 text-[9px] font-mono text-zinc-900 underline hover:text-zinc-600 cursor-pointer"
          >
            Reset length filter
          </button>
        )}
      </div>
    );
  }

  const availW = Math.max(10, boxSize.width - 12);
  const availH = Math.max(10, boxSize.height - 12);

  return (
    <div
      ref={containerRef}
      onDoubleClick={onClearLengthFilter}
      onPointerLeave={() => onHoverLengthChange?.(null)}
      className={`WordLengthTreemap flex-1 min-h-0 relative w-full h-full p-[6px] select-none overflow-hidden ${className}`}
    >
      <div className="relative w-full h-full">
        {treemapTiles.map((tile) => {
          const isSelected = activeLengthsSet.has(tile.length);
          const hasAnySelection = activeLengthsSet.size > 0;
          const isDimmed = hasAnySelection && !isSelected;

          const isLeft = tile.x < 1;
          const isRight = Math.abs(tile.x + tile.w - availW) < 1.5;
          const isTop = tile.y < 1;
          const isBottom = Math.abs(tile.y + tile.h - availH) < 1.5;

          const isTL = isTop && isLeft;
          const isTR = isTop && isRight;
          const isBL = isBottom && isLeft;
          const isBR = isBottom && isRight;

          const gap = 3;
          const tileX = tile.x + (isLeft ? 0 : gap / 2);
          const tileY = tile.y + (isTop ? 0 : gap / 2);
          const tileW = Math.max(4, tile.w - (isLeft ? 0 : gap / 2) - (isRight ? 0 : gap / 2));
          const tileH = Math.max(4, tile.h - (isTop ? 0 : gap / 2) - (isBottom ? 0 : gap / 2));

          const canFitFullLetters = tileW >= 56 && tileH >= 38;
          const isExtraLarge = tileW >= 80 && tileH >= 60;
          const isLarge = tileW >= 54 && tileH >= 40;
          const isMedium = tileW >= 32 && tileH >= 24;
          const isSmall = tileW >= 18 && tileH >= 14;

          const letterLabel = tile.length === 1 ? 'letter' : 'letters';

          const isHoveredMatch = hoveredWordInfo?.length === tile.length;
          const compatCount = compatibleLengthCounts ? (compatibleLengthCounts[tile.length] ?? 0) : null;
          const isCompatZero = Boolean(hoveredWordInfo && compatCount === 0 && !isHoveredMatch);

          let tileColorClass = 'bg-white hover:bg-zinc-100 text-zinc-900 border-black hover:border-black shadow-xs';
          if (isHoveredMatch) {
            tileColorClass = 'bg-zinc-950 text-white border-black shadow-md ring-2 ring-zinc-800 z-20';
          } else if (isSelected) {
            tileColorClass = 'bg-zinc-900 text-white border-black z-10';
          } else if (isCompatZero) {
            tileColorClass = 'bg-zinc-50/70 text-zinc-400 border-black/40 opacity-30';
          } else if (isDimmed) {
            tileColorClass = 'bg-zinc-100/60 hover:bg-zinc-200/80 text-zinc-400 border-black/60 opacity-60 hover:opacity-100';
          }

          let tooltip = `${tile.length}-letter words: ${tile.count} (${tile.percentage.toFixed(1)}% of available words)`;
          if (hoveredWordInfo) {
            if (isHoveredMatch) {
              tooltip += `\n✦ Matches hovered word "${hoveredWordInfo.word.toUpperCase()}" (${tile.length} letters)!`;
            }
            if (compatCount !== null) {
              tooltip += `\n• ${compatCount} ${tile.length}-letter words can fit alongside "${hoveredWordInfo.word.toUpperCase()}"`;
            }
          }
          tooltip += '\nClick to toggle in filter';

          return (
            <button
              key={tile.length}
              type="button"
              onPointerEnter={() => onHoverLengthChange?.(tile.length)}
              onPointerLeave={() => onHoverLengthChange?.(null)}
              onClick={() => {
                const next = toggleLengthFilter(selectedLengthFilter, tile.length, true);
                if (!next) {
                  onClearLengthFilter();
                } else {
                  onSelectLengthFilter(next);
                }
              }}
              style={{
                left: `${tileX}px`,
                top: `${tileY}px`,
                width: `${tileW}px`,
                height: `${tileH}px`,
                borderRadius: getBlobBorderRadius(tile.length, tileW < 45 || tileH < 30 ? 'compact' : 'tile'),
              }}
              className={`absolute border-[1.5px] border-black flex flex-col items-center justify-center cursor-pointer select-none transition-all duration-75 ease-out overflow-hidden ${tileColorClass}`}
              title={tooltip}
            >
              {isExtraLarge ? (
                <div className="flex flex-col items-center justify-center p-1.5 leading-tight text-center">
                  <span className={`font-mono font-bold text-xs sm:text-[13px] tracking-tight uppercase ${isHoveredMatch ? 'text-zinc-200' : ''}`}>
                    {tile.length} {letterLabel}
                  </span>
                  {isHoveredMatch && hoveredWordInfo ? (
                    <span className="font-mono text-[9px] font-bold uppercase tracking-wider bg-black/25 text-white px-1.5 py-0.5 rounded-full my-0.5">
                      ✦ {hoveredWordInfo.word}
                    </span>
                  ) : null}
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="font-mono font-bold text-base sm:text-xl opacity-95">
                      {tile.count}
                    </span>
                    {hoveredWordInfo && compatCount !== null ? (
                      <span className={`font-mono text-[9.5px] tabular-nums font-semibold ${isHoveredMatch ? 'text-zinc-200' : compatCount > 0 ? 'text-zinc-900 font-bold' : 'text-zinc-400'}`}>
                        ({compatCount} fit)
                      </span>
                    ) : (
                      <span className="text-[8.5px] sm:text-[9.5px] font-mono opacity-70 font-medium">
                        {tile.percentage.toFixed(0)}%
                      </span>
                    )}
                  </div>
                </div>
              ) : isLarge ? (
                <div className="flex flex-col items-center justify-center p-1 leading-tight text-center">
                  <span className={`font-mono font-bold text-[10px] sm:text-[11px] tracking-tight uppercase truncate max-w-full px-0.5 ${isHoveredMatch ? 'text-white' : ''}`}>
                    {canFitFullLetters ? `${tile.length} ${letterLabel}` : `${tile.length} ltrs`}
                  </span>
                  {isHoveredMatch && hoveredWordInfo ? (
                    <span className="font-mono text-[8.5px] font-bold uppercase tracking-wider bg-black/20 text-white px-1 py-0.5 rounded-full truncate max-w-full my-0.5">
                      ✦ {hoveredWordInfo.word}
                    </span>
                  ) : null}
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="font-mono font-semibold text-xs sm:text-sm opacity-90">
                      {tile.count}
                    </span>
                    {hoveredWordInfo && compatCount !== null ? (
                      <span className={`font-mono text-[8.5px] tabular-nums font-semibold ${isHoveredMatch ? 'text-zinc-200' : compatCount > 0 ? 'text-zinc-900 font-bold' : 'text-zinc-400'}`}>
                        ({compatCount} fit)
                      </span>
                    ) : (
                      tileH >= 48 && (
                        <span className="text-[8px] font-mono opacity-65">
                          {tile.percentage.toFixed(0)}%
                        </span>
                      )
                    )}
                  </div>
                </div>
              ) : isMedium ? (
                <div className="flex flex-col items-center justify-center p-0.5 leading-none text-center">
                  <span className={`font-mono font-bold text-[9.5px] tracking-tight ${isHoveredMatch ? 'text-white' : ''}`}>{tile.length}L</span>
                  <span className="font-mono text-[9px] opacity-80 mt-0.5">
                    {hoveredWordInfo && compatCount !== null ? `${compatCount}/${tile.count}` : tile.count}
                  </span>
                </div>
              ) : isSmall ? (
                <div className="flex items-center justify-center p-0.5 leading-none text-center">
                  <span className={`font-mono font-bold text-[8px] ${isHoveredMatch ? 'text-white' : ''}`}>{tile.length}</span>
                </div>
              ) : (
                <div className="w-1 h-1 rounded-full bg-current opacity-40" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
