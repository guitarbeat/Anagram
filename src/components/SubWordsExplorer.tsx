import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Search,
  Copy,
  Check,
  ArrowUpDown,
} from 'lucide-react';
import { VocabularyDepth } from '../types';
import { getAllSubWords, getLetterStatistics } from '../utils/anagramSolver';

interface SubWordsExplorerProps {
  sourceText: string;
  onSetAnchorWord?: (word: string) => void;
  showHeader?: boolean;
}

export const SubWordsExplorer: React.FC<SubWordsExplorerProps> = ({
  sourceText,
  onSetAnchorWord,
  showHeader = true,
}) => {
  const depth: VocabularyDepth = 50000;
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLength, setSelectedLength] = useState<number | 'all'>('all');
  const [copiedWord, setCopiedWord] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'length-desc' | 'length-asc' | 'alpha'>('length-desc');

  const stats = useMemo(() => {
    return getLetterStatistics(sourceText);
  }, [sourceText]);

  const allSubWords = useMemo(() => {
    return getAllSubWords(sourceText, depth);
  }, [sourceText, depth]);

  // Unique lengths available
  const availableLengths = useMemo(() => {
    const lens = Array.from(new Set(allSubWords.map(w => w.length))).sort((a: number, b: number) => b - a);
    return lens;
  }, [allSubWords]);

  const filteredWords = useMemo(() => {
    let list = allSubWords;
    if (selectedLength !== 'all') {
      list = list.filter(w => w.length === selectedLength);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(w => w.word.toLowerCase().includes(q));
    }

    if (sortBy === 'length-desc') {
      return [...list].sort((a, b) => b.length - a.length || a.word.localeCompare(b.word));
    } else if (sortBy === 'length-asc') {
      return [...list].sort((a, b) => a.length - b.length || a.word.localeCompare(b.word));
    } else if (sortBy === 'alpha') {
      return [...list].sort((a, b) => a.word.localeCompare(b.word));
    }
    return list;
  }, [allSubWords, selectedLength, searchQuery, sortBy]);

  const handleCopy = (word: string) => {
    navigator.clipboard.writeText(word);
    setCopiedWord(word);
    setTimeout(() => setCopiedWord(null), 1400);
  };

  return (
    <div className="space-y-5">
      {/* Letter Statistics Header Panel (only when standalone) */}
      {showHeader && (
        <section className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-850 pb-4">
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-zinc-100 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-400" />
                <span>Dictionary Word Finder</span>
              </h2>
              <p className="text-xs text-zinc-400">
                Discover every valid English word you can spell using letters from &quot;{sourceText || 'your text'}&quot;.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-950 border border-zinc-800 text-xs text-zinc-300">
                <span>English Dictionary (50K Words)</span>
              </span>
            </div>
          </div>
        </section>
      )}

      {/* Filter and Explorer Controls */}
      <section className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search words..."
                className="w-full pl-8 pr-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-md text-xs font-mono text-zinc-200 focus:outline-none focus:border-zinc-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <ArrowUpDown className="w-3.5 h-3.5 text-zinc-500" />
              <span>Sort by:</span>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="bg-zinc-950 border border-zinc-800 text-zinc-200 rounded px-2.5 py-1 text-xs focus:outline-none focus:border-zinc-500"
              >
                <option value="length-desc">Length (Longest First)</option>
                <option value="length-asc">Length (Shortest First)</option>
                <option value="alpha">Alphabetical (A-Z)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Word Length Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          <button
            onClick={() => setSelectedLength('all')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors shrink-0 ${
              selectedLength === 'all'
                ? 'bg-zinc-100 text-zinc-950 font-bold'
                : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
            }`}
          >
            All Lengths ({allSubWords.length})
          </button>
          {availableLengths.map(len => {
            const count = allSubWords.filter(w => w.length === len).length;
            return (
              <button
                key={len}
                onClick={() => setSelectedLength(len)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors shrink-0 ${
                  selectedLength === len
                    ? 'bg-zinc-100 text-zinc-950 font-bold'
                    : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                }`}
              >
                {len} Letters ({count})
              </button>
            );
          })}
        </div>

        {/* Words Grid Display */}
        <div className="pt-2">
          {filteredWords.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-xs font-mono bg-zinc-950 rounded-xl border border-zinc-800">
              No words match the current search filter.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {filteredWords.map((sub, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 transition-colors flex flex-col justify-between group"
                >
                  <div className="flex items-start justify-between gap-1">
                    <span className="font-mono font-bold text-sm text-zinc-200 group-hover:text-white truncate">
                      {sub.word}
                    </span>
                    <button
                      onClick={() => handleCopy(sub.word)}
                      className="text-zinc-600 hover:text-zinc-300 p-0.5 rounded transition-colors shrink-0"
                      title="Copy word"
                    >
                      {copiedWord === sub.word ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 tabular-nums pt-2 border-t border-zinc-850/60 mt-2">
                    <span className="text-zinc-400 font-medium">{sub.length} letters</span>
                    {onSetAnchorWord && (
                      <button
                        onClick={() => onSetAnchorWord(sub.word)}
                        aria-label={`Use "${sub.word}" as required word in anagram solver`}
                        className="text-[10px] text-emerald-400 hover:text-emerald-300 font-medium hover:underline focus:outline-none ml-1"
                        title="Use as required word in anagram phrase"
                      >
                        + Use
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
