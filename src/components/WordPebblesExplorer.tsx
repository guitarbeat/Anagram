import React, { useMemo } from 'react';
import type { CandidateWordItem } from '../engine/types';
import { getBlobBorderRadius } from '../utils/blobStyle';

export interface WordPebblesExplorerProps {
  candidateWords: CandidateWordItem[];
  onAddWordToTarget: (word: string) => void;
  onSetWordAsTarget: (word: string) => void;
  onShowToast: (text: string, type?: 'success' | 'info' | 'error') => void;
  exactClosers?: string[];
  activeTargetPhrase?: string;
  sourceText?: string;
  watermarkLabel?: string;
  selectedWord?: CandidateWordItem | null;
  onSelectWord?: (word: CandidateWordItem) => void;
}

export const WordPebblesExplorer: React.FC<WordPebblesExplorerProps> = ({
  candidateWords,
  onAddWordToTarget,
  onSetWordAsTarget,
  onShowToast,
  exactClosers = [],
  watermarkLabel = 'SOLVABLE WORDS',
  selectedWord,
  onSelectWord,
}) => {
  const closersSet = useMemo(
    () => new Set(exactClosers.map((w) => w.toUpperCase())),
    [exactClosers]
  );

  const handleWordClick = (item: CandidateWordItem) => {
    onAddWordToTarget(item.word);
    if (onSelectWord) {
      onSelectWord(item);
    }
    onShowToast(`Added "${item.word}" to sentence`, 'success');
  };

  const handleWordDoubleClick = (e: React.MouseEvent, word: string) => {
    e.preventDefault();
    e.stopPropagation();
    onAddWordToTarget(word);
    onShowToast(`Added "${word}" to sentence`, 'success');
  };

  return (
    <div className="w-full h-full relative bg-white overflow-hidden select-none flex flex-col">
      {/* Organic Pebble Word Field with comfortable padding so no edges clip */}
      <div className="flex-1 w-full min-h-0 overflow-y-auto p-3 sm:p-4 flex flex-wrap items-center justify-center content-start gap-2 sm:gap-2.5">
        {candidateWords.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400 p-8 text-center">
            <span className="font-mono text-xs font-bold text-zinc-700 uppercase tracking-wider">
              No words match active filter
            </span>
            <span className="font-mono text-[10.5px] text-zinc-400 mt-1">
              Click the filter pill above to view ALL WORDS
            </span>
          </div>
        ) : (
          candidateWords.map((item) => {
            const isCloser = closersSet.has(item.word.toUpperCase());
            const isSelected = selectedWord?.word.toUpperCase() === item.word.toUpperCase();
            const blobRadius = getBlobBorderRadius(item.word, 'tile');

            return (
              <button
                key={item.word}
                type="button"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', item.word);
                  e.dataTransfer.setData('application/x-anagram-word', item.word);
                  e.dataTransfer.effectAllowed = 'copy';
                }}
                onClick={() => handleWordClick(item)}
                onDoubleClick={(e) => handleWordDoubleClick(e, item.word)}
                style={{ borderRadius: blobRadius }}
                aria-label={`Word ${item.word}, ${item.length} letters${isCloser ? ', exact closer' : ''}`}
                className={`px-3 py-1.5 border-2 border-black font-mono font-bold text-xs sm:text-sm tracking-wide lowercase cursor-grab active:cursor-grabbing transition-all duration-75 select-none focus-visible:ring-2 focus-visible:ring-black focus-visible:outline-hidden touch-manipulation flex items-center gap-1 ${
                  isSelected
                    ? 'bg-black text-white ring-2 ring-black font-black shadow-[3px_3px_0px_#000000] scale-[1.03] z-10'
                    : isCloser
                    ? 'bg-amber-300 hover:bg-amber-400 text-black font-black shadow-[2px_2px_0px_#000000] hover:shadow-[3px_3px_0px_#000000] hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none'
                    : 'bg-white hover:bg-zinc-50 text-zinc-900 shadow-[1.5px_1.5px_0px_#000000] hover:shadow-[2.5px_2.5px_0px_#000000] hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none'
                }`}
                title={`Word: "${item.word.toUpperCase()}" (${item.length} letters)${
                  isCloser ? ' · Exact Closer!' : ''
                }\nClick to inspect in Lens · Drag & drop into sentence`}
              >
                {isCloser && <span className="w-1.5 h-1.5 rounded-full bg-black inline-block shrink-0" />}
                <span>{item.word.toLowerCase()}</span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
