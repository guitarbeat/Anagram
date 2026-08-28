import React, { useState, useMemo } from 'react';
import {
  Search,
  Copy,
  Check,
  Plus,
  SlidersHorizontal,
} from 'lucide-react';
import { getAllSubWords, normalize } from '../utils/anagramSolver';
import { showToast } from '../utils/toast';

interface SubWordsExplorerProps {
  sourceText: string;
  onAddWordToRack?: (word: string) => void;
}

export const SubWordsExplorer: React.FC<SubWordsExplorerProps> = ({
  sourceText,
  onAddWordToRack,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLength, setSelectedLength] = useState<number | 'all'>('all');
  const [copiedWord, setCopiedWord] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'length-desc' | 'length-asc' | 'alpha'>('length-desc');

  const allSubWords = useMemo(() => {
    return getAllSubWords(sourceText);
  }, [sourceText]);

  const availableLengths = useMemo(() => {
    return Array.from(new Set(allSubWords.map(w => w.length))).sort((a: number, b: number) => b - a);
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
    showToast(`Copied "${word}"`, 'info');
    setTimeout(() => setCopiedWord(null), 2000);
  };

  const handleAdd = (word: string) => {
    if (onAddWordToRack) {
      onAddWordToRack(word);
      showToast(`Added "${word}" to rack`, 'success');
    }
  };

  return (
    <div className="space-y-4 bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 sm:p-6 transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
        <div>
          <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-400" />
            <span>Dictionary Sub-Words Browser</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Every valid dictionary word constructible using letters from <span className="font-mono text-zinc-200 font-medium">&quot;{sourceText}&quot;</span>.
          </p>
        </div>

        <span className="px-2.5 py-1 rounded bg-zinc-950 border border-zinc-800 text-zinc-400 text-xs font-mono self-start sm:self-auto">
          {filteredWords.length} / {allSubWords.length} words
        </span>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search sub-words..."
            className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-500 rounded-lg pl-9 pr-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 font-mono focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <select
            value={selectedLength}
            onChange={e => setSelectedLength(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="bg-zinc-950 border border-zinc-800 text-zinc-300 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none"
          >
            <option value="all">All Lengths</option>
            {availableLengths.map(l => (
              <option key={l} value={l}>
                {l} Letters
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="bg-zinc-950 border border-zinc-800 text-zinc-300 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none"
          >
            <option value="length-desc">Longest First</option>
            <option value="length-asc">Shortest First</option>
            <option value="alpha">A to Z</option>
          </select>
        </div>
      </div>

      {/* Words Grid */}
      <div className="max-h-[380px] overflow-y-auto p-1 pr-2 space-y-2">
        {filteredWords.length === 0 ? (
          <div className="text-center py-10 text-xs text-zinc-500 font-mono">
            No dictionary sub-words matching &quot;{searchQuery}&quot;.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {filteredWords.slice(0, 150).map(sub => (
              <div
                key={sub.word}
                className="bg-zinc-950 border border-zinc-800/90 hover:border-zinc-700 rounded-lg p-2 flex items-center justify-between gap-1.5 transition-colors group"
              >
                <div className="min-w-0">
                  <span className="font-mono text-xs font-medium text-zinc-200 block truncate">
                    {sub.word}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {sub.length} letters
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {onAddWordToRack && (
                    <button
                      onClick={() => handleAdd(sub.word)}
                      className="p-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded border border-zinc-800 transition-colors"
                      title="Add to Rack"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  )}
                  <button
                    onClick={() => handleCopy(sub.word)}
                    className="p-1 text-zinc-500 hover:text-zinc-200 rounded transition-colors"
                    title="Copy"
                  >
                    {copiedWord === sub.word ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
