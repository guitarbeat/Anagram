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
  hoveredWord?: string | null;
  onHoverWordChange?: (word: string | null) => void;
  compatibleWordSet?: Set<string> | null;
}

export const WordBlocksExplorer: React.FC<WordBlocksExplorerProps> = ({
  candidateWords,
  onAddWordToTarget,
  onSetWordAsTarget,
  onShowToast,
  exactClosers = [],
  selectedWord,
  onSelectWord,
  hoveredWord: externalHoveredWord,
  onHoverWordChange,
  compatibleWordSet,
}) => {
  const innerRef = useRef<HTMLDivElement>(null);
  const [innerSize, setInnerSize] = useState<{ width: number; height: number }>({
    width: 600,
    height: 400,
  });
  const [internalHoveredWord, setInternalHoveredWord] = useState<string | null>(null);

  const activeHoveredWord =
    externalHoveredWord !== undefined ? externalHoveredWord : internalHoveredWord;

  const handleHoverWord = (word: string | null) => {
    if (onHoverWordChange) {
      onHoverWordChange(word);
    } else {
      setInternalHoveredWord(word);
    }
  };

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

  const [poppingWord, setPoppingWord] = useState<string | null>(null);

  const handleWordClick = (word: string) => {
    setPoppingWord(word.toUpperCase());
    setTimeout(() => {
      setPoppingWord((prev) => (prev === word.toUpperCase() ? null : prev));
    }, 350);
    onAddWordToTarget(word);
    if (onSelectWord) {
      const item = candidateWords.find((c) => c.word.toLowerCase() === word.toLowerCase()) || {
        word,
        length: word.length,
        freq: 0.5,
      };
      onSelectWord(item);
    }
  };

  const handleWordDoubleClick = (e: React.MouseEvent, word: string) => {
    e.preventDefault();
    e.stopPropagation();
    setPoppingWord(word.toUpperCase());
    setTimeout(() => {
      setPoppingWord((prev) => (prev === word.toUpperCase() ? null : prev));
    }, 350);
    onAddWordToTarget(word);
  };

  return (
    <div
      ref={innerRef}
      onPointerLeave={() => handleHoverWord(null)}
      className="w-full h-full relative bg-white overflow-hidden select-none"
    >
      {candidateWords.length === 0 ? (
        <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400 p-4 text-center">
          <span className="font-mono text-xs font-bold text-zinc-600 uppercase">
            No words available
          </span>
        </div>
      ) : (
        treemapTiles.map((tile) => {
          const isHovered = activeHoveredWord?.toLowerCase() === tile.id.toLowerCase();
          const isDimmedByHover = Boolean(
            activeHoveredWord &&
              !isHovered &&
              compatibleWordSet &&
              !compatibleWordSet.has(tile.id.toLowerCase())
          );
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
          const isPopping = poppingWord === tile.id.toUpperCase();

          let tileColor = 'bg-white hover:bg-zinc-50 text-black border-black shadow-[1.5px_1.5px_0px_#000000]';
          if (isCloser) {
            tileColor = 'bg-black text-white hover:bg-zinc-800 border-2 border-black font-black shadow-[2px_2px_0px_#000000]';
          }
          if (isPopping) {
            tileColor = 'bg-black text-white border-2 border-black ring-4 ring-black z-40 scale-[1.12] shadow-xl font-black';
          } else if (isSelected) {
            tileColor = 'bg-black text-white border-black ring-2 ring-black z-30 scale-[1.02] shadow-[3px_3px_0px_#000000] font-black';
          } else if (isHovered) {
            tileColor = isCloser
              ? 'bg-zinc-900 text-white border-2 border-black ring-2 ring-black z-20 shadow-[2.5px_2.5px_0px_#000000]'
              : 'bg-zinc-950 text-white border-black ring-2 ring-zinc-800 z-20 shadow-[2.5px_2.5px_0px_#000000]';
          } else if (isDimmedByHover) {
            tileColor = 'bg-white text-zinc-400 border-zinc-300 shadow-none';
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
              onPointerEnter={() => handleHoverWord(tile.id)}
              onPointerLeave={() => handleHoverWord(null)}
              style={{
                left: `${tileX}px`,
                top: `${tileY}px`,
                width: `${tileW}px`,
                height: `${tileH}px`,
                opacity: isDimmedByHover ? 0.15 : 1,
                borderRadius: getBlobBorderRadius(
                  tile.id,
                  tileW < 50 || tileH < 35 ? 'compact' : 'tile'
                ),
                transition:
                  'left 220ms cubic-bezier(0.2, 0.8, 0.2, 1), top 220ms cubic-bezier(0.2, 0.8, 0.2, 1), width 220ms cubic-bezier(0.2, 0.8, 0.2, 1), height 220ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 140ms ease, transform 100ms ease, box-shadow 100ms ease',
              }}
              className={`absolute border-2 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing select-none overflow-hidden p-1 touch-manipulation active:scale-[0.96] ${tileColor}`}
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
