import React, { useState, useEffect } from 'react';
import {
  Play,
  Copy,
  Check,
  Shuffle,
  ArrowLeftRight,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  GripVertical,
} from 'lucide-react';
import { AnagramResult } from '../types';
import { polishPhrase } from '../utils/anagramSolver';
import { soundFX } from '../utils/audioEffects';

interface AnagramResultCardProps {
  item: AnagramResult;
  idx: number;
  sourceText: string;
  onAnimatePhrase: (target: string) => void;
  onVerifyPhrase: (target: string) => void;
  onOpenTiles: (target: string) => void;
  onOpenStoryGenerator?: (source: string, target: string) => void;
  onCopy: (phrase: string, idx: number) => void;
  isCopied: boolean;
}

export const AnagramResultCard: React.FC<AnagramResultCardProps> = ({
  item,
  idx,
  sourceText,
  onAnimatePhrase,
  onVerifyPhrase,
  onOpenTiles,
  onOpenStoryGenerator,
  onCopy,
  isCopied,
}) => {
  const [currentWords, setCurrentWords] = useState<string[]>(item.words);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Sync when item words change
  useEffect(() => {
    setCurrentWords(item.words);
  }, [item.phrase]);

  const isModified = currentWords.join(' ') !== item.words.join(' ');
  const activePhrase = polishPhrase(currentWords);

  const handleMove = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= currentWords.length || toIndex >= currentWords.length) {
      return;
    }
    const updated = [...currentWords];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    setCurrentWords(updated);
    soundFX.playPop();
  };

  const handleShuffle = () => {
    if (currentWords.length <= 1) return;
    const shuffled = [...currentWords].sort(() => Math.random() - 0.5);
    setCurrentWords(shuffled);
    soundFX.playPop();
  };

  const handleReverse = () => {
    if (currentWords.length <= 1) return;
    setCurrentWords([...currentWords].reverse());
    soundFX.playPop();
  };

  const handleReset = () => {
    setCurrentWords(item.words);
    soundFX.playPop();
  };

  return (
    <div className="bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 rounded-xl p-4 shadow-xs transition-colors flex flex-col justify-between space-y-3">
      <div className="space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <span className="text-base font-semibold text-zinc-100 tracking-tight select-text block">
              {activePhrase}
            </span>
            {isModified && (
              <span className="text-[10px] text-amber-400 font-mono">
                Custom word order
              </span>
            )}
          </div>
          <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-400 shrink-0">
            Exact
          </span>
        </div>

        {/* Interactive Reorderable Word Badges */}
        <div className="space-y-1.5 pt-0.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500">
              Drag or use arrows to change word order:
            </span>
            <div className="flex items-center gap-1">
              {isModified && (
                <button
                  onClick={handleReset}
                  className="text-[10px] text-zinc-500 hover:text-zinc-300 p-0.5 flex items-center gap-0.5 transition-colors"
                  title="Reset to original word order"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Reset</span>
                </button>
              )}
              {currentWords.length > 1 && (
                <>
                  <button
                    onClick={handleReverse}
                    className="text-[10px] text-zinc-500 hover:text-zinc-300 p-0.5 px-1 rounded bg-zinc-950 border border-zinc-850 flex items-center gap-0.5 transition-colors"
                    title="Reverse word order"
                  >
                    <ArrowLeftRight className="w-2.5 h-2.5" />
                    <span>Reverse</span>
                  </button>
                  <button
                    onClick={handleShuffle}
                    className="text-[10px] text-zinc-500 hover:text-zinc-300 p-0.5 px-1 rounded bg-zinc-950 border border-zinc-850 flex items-center gap-0.5 transition-colors"
                    title="Shuffle word order"
                  >
                    <Shuffle className="w-2.5 h-2.5" />
                    <span>Shuffle</span>
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {currentWords.map((w, wIdx) => {
              const isFirst = wIdx === 0;
              const isLast = wIdx === currentWords.length - 1;
              const isDragging = draggedIndex === wIdx;

              return (
                <div
                  key={`${w}_${wIdx}`}
                  draggable
                  onDragStart={e => {
                    e.dataTransfer.setData('text/plain', wIdx.toString());
                    setDraggedIndex(wIdx);
                  }}
                  onDragOver={e => {
                    e.preventDefault();
                  }}
                  onDrop={e => {
                    e.preventDefault();
                    const fromStr = e.dataTransfer.getData('text/plain');
                    const fromIdx = parseInt(fromStr, 10);
                    if (!isNaN(fromIdx)) {
                      handleMove(fromIdx, wIdx);
                    }
                    setDraggedIndex(null);
                  }}
                  onDragEnd={() => setDraggedIndex(null)}
                  className={`group inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono transition-all select-none cursor-grab active:cursor-grabbing ${
                    isDragging
                      ? 'opacity-40 bg-zinc-800 border border-dashed border-zinc-500'
                      : 'bg-zinc-950 border border-zinc-850 hover:border-zinc-700 text-zinc-300'
                  }`}
                  title="Drag to reposition, or use left/right buttons"
                >
                  <GripVertical className="w-2.5 h-2.5 text-zinc-600 group-hover:text-zinc-400 shrink-0" />

                  {/* Move Left Button */}
                  {!isFirst && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleMove(wIdx, wIdx - 1);
                      }}
                      className="text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded p-0.5 transition-colors"
                      title={`Move "${w}" left`}
                      aria-label={`Move "${w}" left`}
                    >
                      <ChevronLeft className="w-3 h-3" />
                    </button>
                  )}

                  <span className="font-medium px-0.5">{w}</span>

                  {/* Move Right Button */}
                  {!isLast && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleMove(wIdx, wIdx + 1);
                      }}
                      className="text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded p-0.5 transition-colors"
                      title={`Move "${w}" right`}
                      aria-label={`Move "${w}" right`}
                    >
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2.5 border-t border-zinc-850 mt-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => onAnimatePhrase(activePhrase)}
            aria-label={`Animate "${activePhrase}" in Animator`}
            className="px-2.5 py-1 bg-zinc-100 hover:bg-white text-zinc-950 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Animate</span>
          </button>

          <button
            onClick={() => onVerifyPhrase(activePhrase)}
            aria-label={`Verify "${activePhrase}" letter counts in Matcher`}
            className="px-2.5 py-1 bg-zinc-950 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-md text-xs font-medium transition-colors"
            title="Verify letter counts in Matcher"
          >
            <span>Verify</span>
          </button>

          <button
            onClick={() => onOpenTiles(activePhrase)}
            aria-label={`Open in Tile Board`}
            className="px-2.5 py-1 bg-zinc-950 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-md text-xs font-medium transition-colors"
            title="Open in Tile Board"
          >
            <span>Tiles</span>
          </button>

          {onOpenStoryGenerator && (
            <button
              onClick={() => onOpenStoryGenerator(sourceText, activePhrase)}
              aria-label={`Generate lore for "${activePhrase}"`}
              className="px-2 py-1 text-zinc-400 hover:text-zinc-200 text-xs transition-colors"
              title="Generate lore snippet"
            >
              <span>Lore</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onCopy(activePhrase, idx)}
            aria-label={`Copy "${activePhrase}" to clipboard`}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors"
            title="Copy phrase"
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
};
