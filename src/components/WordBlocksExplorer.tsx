import React, { useMemo, useState, useRef, useEffect } from 'react';
import type { CandidateWordItem } from '../engine/types';
import { getBlobBorderRadius } from '../utils/blobStyle';
import { computeSquarifiedTreemapGeneric, type GenericTreemapItem } from '../render/treemap';

export interface WordBlocksExplorerProps {
  candidateWords: CandidateWordItem[];
  onAddWordToTarget: (word: string) => void;
  onSetWordAsTarget: (word: string) => void;
  onShowToast: (text: string, type?: 'success' | 'info' | 'error') => void;
  exactClosers?: string[];
  activeTargetPhrase?: string;
  sourceText?: string;
  selectedWord?: CandidateWordItem | null;
  onSelectWord?: (word: CandidateWordItem) => void;
}

export const WordBlocksExplorer: React.FC<WordBlocksExplorerProps> = ({
  candidateWords,
  onAddWordToTarget,
  onSetWordAsTarget,
  onShowToast,
  exactClosers = [],
  selectedWord,
  onSelectWord,
}) => {
  const innerRef = useRef<HTMLDivElement>(null);
  const [innerSize, setInnerSize] = useState<{ width: number; height: number }>({
    width: 600,
    height: 400,
  });
  const [hoveredWord, setHoveredWord] = useState<string | null>(null);

  // Measure the inner treemap surface directly so calculations never overflow
  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setInnerSize({ width: rect.width, height: rect.height });
      }
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const closersSet = useMemo(
    () => new Set(exactClosers.map((w) => w.toUpperCase())),
    [exactClosers]
  );

  // Inset padding so outer blocks NEVER touch or clip against card borders/rounded corners
  const INSET_X = 12;
  const INSET_Y = 10;
  const GAP = 4;

  const availW = Math.max(10, innerSize.width - INSET_X * 2);
  const availH = Math.max(10, innerSize.height - INSET_Y * 2);

  // Compute maximum words so blocks stay legible and avoid the micro-dot crushed spiral
  const maxWords = useMemo(() => {
    const area = availW * availH;
    // Allocate at least ~3200 sq pixels per block on average so each has generous room
    return Math.min(48, Math.max(14, Math.floor(area / 3200)));
  }, [availW, availH]);

  const displayedWords = useMemo(() => {
    if (candidateWords.length <= maxWords) return candidateWords;
    // Prioritize exact closers, then highest frequency/prominence
    const sorted = [...candidateWords].sort((a, b) => {
      const aClose = closersSet.has(a.word.toUpperCase()) ? 1 : 0;
      const bClose = closersSet.has(b.word.toUpperCase()) ? 1 : 0;
      if (aClose !== bClose) return bClose - aClose;
      return (b.freq || 0) - (a.freq || 0);
    });
    return sorted.slice(0, maxWords);
  }, [candidateWords, maxWords, closersSet]);

  // Compute Squarified Treemap Partition for displayed words
  const treemapTiles = useMemo(() => {
    if (displayedWords.length === 0 || availW <= 10 || availH <= 10) return [];

    const items: GenericTreemapItem<CandidateWordItem>[] = displayedWords.map((w) => {
      const isCloser = closersSet.has(w.word.toUpperCase());
      const baseWeight = Math.max(4, Math.round((w.freq || 0.25) * 50));
      const lengthBonus = Math.max(2, w.length * 3);
      const closerBonus = isCloser ? 25 : 0;
      return {
        id: w.word,
        count: baseWeight + lengthBonus + closerBonus,
        data: w,
      };
    });

    return computeSquarifiedTreemapGeneric(items, availW, availH);
  }, [displayedWords, availW, availH, closersSet]);

  const handleWordClick = (word: string) => {
    onAddWordToTarget(word);
    if (onSelectWord) {
      const item = candidateWords.find((c) => c.word.toLowerCase() === word.toLowerCase()) || {
        word,
        length: word.length,
        freq: 0.5,
      };
      onSelectWord(item);
    }
    onShowToast(`Added "${word}" to sentence`, 'success');
  };

  const handleWordDoubleClick = (e: React.MouseEvent, word: string) => {
    e.preventDefault();
    e.stopPropagation();
    onAddWordToTarget(word);
    onShowToast(`Added "${word}" to sentence`, 'success');
  };

  return (
    <div ref={innerRef} className="w-full h-full relative bg-white overflow-hidden select-none">
      {candidateWords.length === 0 ? (
        <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400 p-4 text-center">
          <span className="font-mono text-xs font-bold text-zinc-600 uppercase">
            No words available
          </span>
        </div>
      ) : (
          treemapTiles.map((tile) => {
            const isHovered = hoveredWord === tile.id;
            const isCloser = closersSet.has(tile.id.toUpperCase());

            // Position with INSET margins so border and rounded corners never get clipped
            const tileX = INSET_X + tile.x + GAP / 2;
            const tileY = INSET_Y + tile.y + GAP / 2;
            const tileW = Math.max(4, tile.w - GAP);
            const tileH = Math.max(4, tile.h - GAP);

            const isExtraLarge = tileW >= 95 && tileH >= 65;
            const isLarge = tileW >= 65 && tileH >= 45;
            const isMedium = tileW >= 44 && tileH >= 30;

            const isSelected = selectedWord?.word.toLowerCase() === tile.id.toLowerCase();

            let tileColor = 'bg-white hover:bg-zinc-50 text-black border-black shadow-[1.5px_1.5px_0px_#000000]';
            if (isCloser) {
              tileColor = 'bg-amber-300 hover:bg-amber-400 text-black border-black font-black shadow-[2px_2px_0px_#000000] ring-1 ring-amber-600';
            }
            if (isSelected) {
              tileColor = 'bg-black text-white border-black ring-2 ring-black z-30 scale-[1.02] shadow-[3px_3px_0px_#000000] font-black';
            } else if (isHovered) {
              tileColor = isCloser
                ? 'bg-amber-400 text-black border-black ring-2 ring-amber-600 z-20 shadow-[2.5px_2.5px_0px_#000000]'
                : 'bg-zinc-950 text-white border-black ring-2 ring-zinc-800 z-20 shadow-[2.5px_2.5px_0px_#000000]';
            }

            return (
              <button
                key={tile.id}
                type="button"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', tile.id);
                  e.dataTransfer.setData('application/x-anagram-word', tile.id);
                  e.dataTransfer.effectAllowed = 'copy';
                }}
                onClick={() => handleWordClick(tile.id)}
                onDoubleClick={(e) => handleWordDoubleClick(e, tile.id)}
                onPointerEnter={() => setHoveredWord(tile.id)}
                onPointerLeave={() => setHoveredWord(null)}
                style={{
                  left: `${tileX}px`,
                  top: `${tileY}px`,
                  width: `${tileW}px`,
                  height: `${tileH}px`,
                  borderRadius: getBlobBorderRadius(
                    tile.id,
                    tileW < 50 || tileH < 35 ? 'compact' : 'tile'
                  ),
                }}
                className={`absolute border-2 border-black flex flex-col items-center justify-center cursor-grab active:cursor-grabbing select-none transition-all duration-75 overflow-hidden p-1 ${tileColor}`}
                title={`Word: ${tile.id.toUpperCase()} (${tile.id.length} letters)${
                  isCloser ? ' · Exact Closer!' : ''
                }\nClick to add to sentence · Drag & drop into target input`}
              >
                {/* Big Bold Centered Word */}
                <span
                  className={`font-mono font-extrabold uppercase tracking-tight leading-none text-center truncate max-w-full px-1 ${
                    isExtraLarge
                      ? 'text-lg sm:text-2xl font-black'
                      : isLarge
                      ? 'text-sm sm:text-base font-black'
                      : isMedium
                      ? 'text-xs font-bold'
                      : 'text-[9.5px] font-bold'
                  }`}
                >
                  {tile.id}
                </span>

                {/* Subtitle count/length if space permits (matching user right card) */}
                {isLarge && (
                  <div className="flex items-center gap-1 mt-1 leading-none">
                    <span
                      className={`font-mono text-[9px] font-bold uppercase opacity-60 ${
                        isHovered ? 'text-zinc-300' : 'text-zinc-600'
                      }`}
                    >
                      {tile.id.length}L
                    </span>
                    <span
                      className={`font-mono text-[8.5px] opacity-50 ${
                        isHovered ? 'text-zinc-400' : 'text-zinc-500'
                      }`}
                    >
                      {Math.round(tile.percentage)}%
                    </span>
                  </div>
                )}
              </button>
            );
          })
        )}
    </div>
  );
};
