import React from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import type { FinisherPair } from '../engine/types';
import { getBlobBorderRadius } from '../utils/blobStyle';

export interface WordSolutionsExplorerProps {
  exactClosers?: string[];
  finisherPairs?: FinisherPair[];
  onAddWordToTarget: (word: string) => void;
  onSetWordAsTarget: (word: string) => void;
  onShowToast: (text: string, type?: 'success' | 'info' | 'error') => void;
  sourceText?: string;
}

export const WordSolutionsExplorer: React.FC<WordSolutionsExplorerProps> = ({
  exactClosers = [],
  finisherPairs = [],
  onSetWordAsTarget,
  onShowToast,
}) => {
  const handlePlayOneWord = (word: string) => {
    onSetWordAsTarget(word);
    onShowToast(`Solved with 1-word solution "${word}"!`, 'success');
  };

  const handlePlayPair = (pair: FinisherPair) => {
    onSetWordAsTarget(`${pair.word1} ${pair.word2}`);
    onShowToast(`Solved with pair: "${pair.word1} ${pair.word2}"!`, 'success');
  };

  const totalSolutions = exactClosers.length + finisherPairs.length;

  return (
    <div className="w-full h-full relative bg-white select-none flex flex-col p-3 overflow-hidden">
      {/* Main Solutions Surface */}
      <div className="flex-1 w-full min-h-0 overflow-y-auto space-y-4 pr-1">
        {totalSolutions === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400 p-8 text-center">
            <span className="font-mono text-xs font-bold text-zinc-700 uppercase tracking-wide">
              No complete solutions found yet
            </span>
            <span className="font-mono text-[10.5px] text-zinc-400 mt-1">
              Select or place words to narrow down candidate letters
            </span>
          </div>
        ) : (
          <>
            {/* 1-Word Solutions (Direct Wins) */}
            {exactClosers.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-black uppercase tracking-wider text-black">
                    1-Word Direct Wins ({exactClosers.length})
                  </span>
                  <div className="flex-1 h-px bg-zinc-200" />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {exactClosers.map((word) => (
                    <button
                      key={word}
                      type="button"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', word);
                        e.dataTransfer.setData('application/x-anagram-word', word);
                        e.dataTransfer.effectAllowed = 'copy';
                      }}
                      onClick={() => handlePlayOneWord(word)}
                      style={{ borderRadius: getBlobBorderRadius(word, 'tile') }}
                      className="p-2.5 border-2 border-black bg-amber-300 hover:bg-amber-400 text-black flex flex-col items-center justify-center text-center cursor-grab active:cursor-grabbing transition-all duration-75 shadow-[2px_2px_0px_#000000] hover:shadow-[3px_3px_0px_#000000] hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none group"
                      title={`Click to play "${word.toUpperCase()}" or drag into sentence`}
                    >
                      <div className="flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-900 fill-amber-500" />
                        <span className="font-mono font-black text-sm tracking-wider uppercase">
                          {word}
                        </span>
                      </div>
                      <span className="text-[9px] font-mono font-bold text-amber-950/80 mt-0.5 uppercase tracking-widest">
                        100% Match · {word.length}L
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 2-Word Combinations */}
            {finisherPairs.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-black uppercase tracking-wider text-black">
                    2-Word Pairs ({finisherPairs.length})
                  </span>
                  <div className="flex-1 h-px bg-zinc-200" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {finisherPairs.map((pair) => (
                    <button
                      key={`${pair.word1}-${pair.word2}`}
                      type="button"
                      draggable
                      onDragStart={(e) => {
                        const pairText = `${pair.word1} ${pair.word2}`;
                        e.dataTransfer.setData('text/plain', pairText);
                        e.dataTransfer.setData('application/x-anagram-word', pairText);
                        e.dataTransfer.effectAllowed = 'copy';
                      }}
                      onClick={() => handlePlayPair(pair)}
                      style={{
                        borderRadius: getBlobBorderRadius(`${pair.word1}-${pair.word2}`, 'compact'),
                      }}
                      className="p-2 border-2 border-black bg-white hover:bg-zinc-950 hover:text-white text-black flex items-center justify-between px-3 cursor-grab active:cursor-grabbing transition-all duration-75 shadow-[2px_2px_0px_#000000] hover:shadow-[3px_3px_0px_#000000] hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none group"
                      title={`Click to play pair "${pair.word1.toUpperCase()} + ${pair.word2.toUpperCase()}" or drag into sentence`}
                    >
                      <div className="flex items-center gap-1.5 font-mono font-black text-xs tracking-wide uppercase">
                        <span>{pair.word1}</span>
                        <span className="text-zinc-400 group-hover:text-zinc-500 text-[10px] font-normal">+</span>
                        <span>{pair.word2}</span>
                      </div>
                      <span className="text-[9px] font-mono font-bold text-zinc-400 group-hover:text-zinc-300">
                        {pair.word1.length + pair.word2.length}L
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
