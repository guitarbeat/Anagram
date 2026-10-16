import React, { useState, useMemo } from 'react';
import { Sparkles, Play, Search, Zap, Check, ArrowRight, Layers, Flame, Trophy } from 'lucide-react';
import type { AnagramResult, FinisherPair } from '../engine/types';
import { findProgressiveCompletions, type ProgressiveCompletion } from '../engine/progressiveSolver';
import { getBlobBorderRadius } from '../utils/blobStyle';
import { triggerHaptic } from '../hooks/useHaptics';

export interface WordSolutionsExplorerProps {
  exactClosers?: string[];
  finisherPairs?: FinisherPair[];
  completeSolutions?: AnagramResult[];
  isSolvingSolutions?: boolean;
  onAddWordToTarget: (word: string) => void;
  onSetWordAsTarget: (word: string) => void;
  onShowToast: (text: string, type?: 'success' | 'info' | 'error') => void;
  sourceText?: string;
  targetPhrase?: string;
  remainingLetters?: string[];
}

export const WordSolutionsExplorer: React.FC<WordSolutionsExplorerProps> = ({
  exactClosers = [],
  finisherPairs = [],
  completeSolutions = [],
  isSolvingSolutions = false,
  onAddWordToTarget,
  onSetWordAsTarget,
  onShowToast,
  sourceText = '',
  targetPhrase = '',
  remainingLetters = [],
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [wordCountFilter, setWordCountFilter] = useState<'all' | '1' | '2' | '3' | '4+'>('all');
  const [sortBy, setSortBy] = useState<'score' | 'shortest' | 'longest'>('score');

  // Progressive completions for remaining unplaced letters (when user has typed partial phrase)
  const progressiveCompletions: ProgressiveCompletion[] = useMemo(() => {
    if (!remainingLetters || remainingLetters.length === 0 || !targetPhrase.trim()) {
      return [];
    }
    // Only run if remaining letters fit within reasonable search budget
    if (remainingLetters.length > 15) {
      return [];
    }
    try {
      return findProgressiveCompletions(sourceText, targetPhrase, remainingLetters, 16);
    } catch {
      return [];
    }
  }, [sourceText, targetPhrase, remainingLetters]);

  const handlePlaySolution = (phrase: string) => {
    triggerHaptic('success');
    onSetWordAsTarget(phrase);
    onShowToast(`Solved with "${phrase}"!`, 'success');
  };

  const handleAppendSolution = (phrase: string) => {
    triggerHaptic('light');
    onAddWordToTarget(phrase);
    onShowToast(`Added "${phrase}"`, 'info');
  };

  const handlePlayOneWord = (word: string) => {
    triggerHaptic('success');
    onSetWordAsTarget(word);
    onShowToast(`Solved with 1-word win "${word}"!`, 'success');
  };

  const handlePlayPair = (pair: FinisherPair) => {
    triggerHaptic('success');
    const pairText = `${pair.word1} ${pair.word2}`;
    onSetWordAsTarget(pairText);
    onShowToast(`Solved with pair: "${pairText}"!`, 'success');
  };

  // Filter & sort complete multi-word solutions
  const filteredCompleteSolutions = useMemo(() => {
    let list = [...completeSolutions];

    // Filter by query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((item) => item.phrase.toLowerCase().includes(q));
    }

    // Filter by word count
    if (wordCountFilter === '2') {
      list = list.filter((item) => item.words.length === 2);
    } else if (wordCountFilter === '3') {
      list = list.filter((item) => item.words.length === 3);
    } else if (wordCountFilter === '4+') {
      list = list.filter((item) => item.words.length >= 4);
    }

    // Sort
    if (sortBy === 'score') {
      list.sort((a, b) => b.score - a.score);
    } else if (sortBy === 'shortest') {
      list.sort((a, b) => a.words.length - b.words.length || b.score - a.score);
    } else if (sortBy === 'longest') {
      list.sort((a, b) => b.words.length - a.words.length || b.score - a.score);
    }

    return list;
  }, [completeSolutions, searchQuery, wordCountFilter, sortBy]);

  const totalExactSolutions =
    completeSolutions.length +
    exactClosers.length +
    finisherPairs.length +
    progressiveCompletions.length;

  return (
    <div className="w-full h-full relative bg-white select-none flex flex-col p-3 overflow-hidden text-zinc-900">
      {/* Top Header & Search Controls */}
      <div className="shrink-0 mb-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <div className="p-1 rounded-md bg-black text-white border border-black shadow-[1.5px_1.5px_0px_#000]">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <h2 className="text-xs font-mono font-black uppercase tracking-wider text-black flex items-center gap-1.5">
                Complete Anagram Solutions
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-100 border border-black text-black font-extrabold">
                  {totalExactSolutions}
                </span>
              </h2>
            </div>
          </div>

          {/* Quick Solver Indicator */}
          {isSolvingSolutions && (
            <div className="flex items-center gap-1.5 text-[10.5px] font-mono font-bold text-zinc-800 bg-zinc-100 px-2 py-0.5 rounded-full border border-zinc-400 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-black animate-ping" />
              <span>Solving...</span>
            </div>
          )}
        </div>

        {/* Search Input & Quick Filter Controls */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <div className="relative flex-1 min-w-[140px]">
            <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search solutions..."
              className="w-full pl-7 pr-2 py-1 text-xs font-mono bg-zinc-50 border border-zinc-300 rounded-md focus:outline-none focus:border-black focus:ring-1 focus:ring-black text-zinc-900 placeholder:text-zinc-400"
            />
          </div>

          {/* Word Count Text Tabs */}
          <nav className="flex items-center gap-1.5" aria-label="Word count filters">
            {(['all', '2', '3', '4+'] as const).map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => setWordCountFilter(count)}
                className={`py-0.5 px-1 text-[10px] font-mono transition-all cursor-pointer ${
                  wordCountFilter === count
                    ? 'font-black text-black border-b-2 border-black'
                    : 'font-bold text-zinc-400 hover:text-black border-b-2 border-transparent'
                }`}
              >
                {count === 'all' ? 'ALL' : `${count} W`}
              </button>
            ))}
          </nav>

          {/* Sort Selector */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-[10px] font-mono font-bold px-2 py-1 bg-white border border-zinc-300 rounded-md text-zinc-700 focus:outline-none focus:border-black cursor-pointer"
          >
            <option value="score">Best Score</option>
            <option value="shortest">Fewest Words</option>
            <option value="longest">Most Words</option>
          </select>
        </div>
      </div>

      {/* Main Solutions Surface */}
      <div className="flex-1 w-full min-h-0 overflow-y-auto space-y-4 pr-1">
        {/* Loading Banner when Engine is Searching */}
        {isSolvingSolutions && completeSolutions.length === 0 && (
          <div className="w-full p-6 flex flex-col items-center justify-center text-center bg-zinc-50 border-2 border-black rounded-xl space-y-2">
            <Sparkles className="w-5 h-5 text-black animate-spin" />
            <span className="font-mono text-xs font-bold text-black">
              Exploring 270,000+ words for exact anagram solutions...
            </span>
            <span className="font-mono text-[10px] text-zinc-600">
              Matching every character with 0 leftovers
            </span>
          </div>
        )}

        {/* 1. Direct 1-Word Wins (Immediate 1-Click Closers) */}
        {exactClosers.length > 0 && wordCountFilter !== '2' && wordCountFilter !== '3' && wordCountFilter !== '4+' && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-black uppercase tracking-wider text-black flex items-center gap-1">
                <Trophy className="w-3 h-3 text-black" />
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
                  className="p-2.5 border-2 border-black bg-black text-white hover:bg-zinc-800 flex flex-col items-center justify-center text-center cursor-grab active:cursor-grabbing transition-all duration-75 shadow-[2px_2px_0px_#000000] hover:shadow-[3px_3px_0px_#000000] hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none group"
                  title={`Click to play "${word.toUpperCase()}" or drag into sentence`}
                >
                  <div className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-white fill-white" />
                    <span className="font-mono font-black text-sm tracking-wider uppercase">
                      {word}
                    </span>
                  </div>
                  <span className="text-[9px] font-mono font-bold text-zinc-300 mt-0.5 uppercase tracking-widest">
                    100% Match · {word.length}L
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 2. 2-Word Finisher Pairs */}
        {finisherPairs.length > 0 && (wordCountFilter === 'all' || wordCountFilter === '2') && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-black uppercase tracking-wider text-black flex items-center gap-1">
                <Layers className="w-3 h-3 text-black" />
                2-Word Finishing Pairs ({finisherPairs.length})
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

        {/* 3. Progressive Sentence Completions (Matching unplaced remainder) */}
        {progressiveCompletions.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-black uppercase tracking-wider text-black flex items-center gap-1">
                <Zap className="w-3 h-3 text-black" />
                Finish Current Sentence ({progressiveCompletions.length})
              </span>
              <div className="flex-1 h-px bg-zinc-200" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {progressiveCompletions.map((comp) => (
                <div
                  key={comp.id}
                  className="p-2.5 border-2 border-black bg-zinc-50 rounded-lg flex items-center justify-between gap-2 shadow-[2px_2px_0px_#000]"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-mono text-zinc-400 line-through">
                        {targetPhrase}
                      </span>
                      <ArrowRight className="w-2.5 h-2.5 text-zinc-400" />
                      <span className="font-mono font-black text-xs text-black uppercase tracking-wide">
                        +{comp.phrase}
                      </span>
                    </div>
                    <span className="text-[9px] font-mono text-zinc-500 block truncate">
                      Complete: {comp.fullPhrase}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handlePlaySolution(comp.fullPhrase)}
                    className="px-2.5 py-1 bg-black hover:bg-zinc-800 text-white rounded text-[10px] font-mono font-bold uppercase cursor-pointer shrink-0 transition-transform active:scale-95"
                    title="Solve complete phrase"
                  >
                    Solve
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. Complete Exact Anagram Solutions (Full Multi-Word Solutions) */}
        {filteredCompleteSolutions.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-black uppercase tracking-wider text-black flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-black" />
                Complete Exact Anagrams ({filteredCompleteSolutions.length})
              </span>
              <div className="flex-1 h-px bg-zinc-200" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {filteredCompleteSolutions.map((sol) => (
                <div
                  key={sol.phrase}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', sol.phrase);
                    e.dataTransfer.setData('application/x-anagram-word', sol.phrase);
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  className="p-3 border-2 border-black bg-white hover:bg-zinc-50 rounded-xl flex flex-col justify-between gap-2.5 transition-all duration-75 shadow-[2px_2px_0px_#000000] hover:shadow-[3px_3px_0px_#000000] hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none group cursor-grab active:cursor-grabbing"
                >
                  <div>
                    {/* Header tags: word count & score */}
                    <div className="flex items-center justify-between gap-1 text-[9px] font-mono font-bold text-zinc-500 mb-1">
                      <span className="px-1.5 py-0.2 rounded bg-zinc-100 border border-zinc-300 text-zinc-700">
                        {sol.words.length} words
                      </span>
                      {sol.funninessScore >= 3.5 && (
                        <span className="flex items-center gap-0.5 text-black font-extrabold">
                          <Flame className="w-2.5 h-2.5 fill-black" /> Fun
                        </span>
                      )}
                      <span className="text-zinc-600 font-black">
                        Score {Math.round(sol.score)}
                      </span>
                    </div>

                    {/* The Full Anagram Phrase */}
                    <div className="font-mono font-black text-sm text-black tracking-wide leading-snug uppercase">
                      {sol.phrase}
                    </div>

                    {/* Words breakdown chips */}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {sol.words.map((w, wIdx) => (
                        <span
                          key={`${w}-${wIdx}`}
                          className="px-1.5 py-0.5 bg-zinc-100 rounded text-[9.5px] font-mono font-semibold text-zinc-700"
                        >
                          {w}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions: Solve / Play now */}
                  <div className="flex items-center gap-1.5 pt-1 border-t border-zinc-100">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlaySolution(sol.phrase);
                      }}
                      className="flex-1 py-1.5 px-2 bg-black hover:bg-zinc-800 text-white rounded-md text-[10px] font-mono font-black uppercase flex items-center justify-center gap-1 transition-transform active:scale-95 cursor-pointer shadow-2xs"
                      title="Set as target phrase and animate"
                    >
                      <Play className="w-2.5 h-2.5 fill-white" />
                      Solve
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAppendSolution(sol.phrase);
                      }}
                      className="py-1.5 px-2.5 bg-zinc-100 hover:bg-zinc-200 text-black border border-zinc-300 rounded-md text-[10px] font-mono font-bold uppercase transition-transform active:scale-95 cursor-pointer"
                      title="Append to sentence"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state: ONLY if zero solutions of any kind exist and not solving */}
        {!isSolvingSolutions && totalExactSolutions === 0 && (
          <div className="w-full h-full min-h-[200px] flex flex-col items-center justify-center text-zinc-400 p-8 text-center space-y-1">
            <span className="font-mono text-xs font-bold text-zinc-700 uppercase tracking-wide">
              No complete solutions found yet
            </span>
            <span className="font-mono text-[10.5px] text-zinc-400 max-w-sm">
              Try typing or changing the source name, or place words to narrow down candidate letters.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
