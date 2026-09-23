import React, { useState, useMemo, useRef, useEffect } from 'react';
import { X, Flame } from 'lucide-react';
import type { AnagramResult, SolveMetrics } from '../engine/solver';
import { AnagramResultCard } from './AnagramResultCard';
import type { ProgressBus } from '../hooks/useProgressBus';

export interface SolverSectionProps {
  sourceText: string;
  results: AnagramResult[];
  isSolving: boolean;
  metrics: SolveMetrics | null;
  activeTargetPhrase?: string;
  progressBus: ProgressBus;
  allowSpicy: boolean;
  onToggleSpicy: (val: boolean) => void;
  onAnimatePhrase: (target: string) => void;
  onShowToast: (text: string) => void;
}

export const SolverSection: React.FC<SolverSectionProps> = ({
  sourceText,
  results,
  isSolving,
  metrics,
  activeTargetPhrase,
  progressBus,
  allowSpicy,
  onToggleSpicy,
  onAnimatePhrase,
  onShowToast,
}) => {
  const [copiedPhrase, setCopiedPhrase] = useState<string | null>(null);
  const copyTimeoutRef = useRef<number | null>(null);
  const [showPaths, setShowPaths] = useState<boolean>(false);
  const [wordFilter, setWordFilter] = useState<'all' | '2' | '3' | '4+'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'score' | 'words_asc' | 'words_desc' | 'alpha'>('score');

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current !== null) {
        window.clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const copyToClipboard = (text: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      });
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  };

  const handleCopyPhrase = (phrase: string) => {
    copyToClipboard(phrase);
    setCopiedPhrase(phrase);
    onShowToast(`Copied "${phrase}"`);

    if (copyTimeoutRef.current !== null) {
      window.clearTimeout(copyTimeoutRef.current);
    }
    copyTimeoutRef.current = window.setTimeout(() => {
      setCopiedPhrase(null);
      copyTimeoutRef.current = null;
    }, 2000);
  };

  // Filter & sort results
  const filteredResults = useMemo(() => {
    let list = [...results];

    // Word count filter
    if (wordFilter === '2') {
      list = list.filter(r => r.words.length === 2);
    } else if (wordFilter === '3') {
      list = list.filter(r => r.words.length === 3);
    } else if (wordFilter === '4+') {
      list = list.filter(r => r.words.length >= 4);
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(r => r.phrase.toLowerCase().includes(q));
    }

    // Sort
    if (sortBy === 'words_asc') {
      list.sort((a, b) => a.words.length - b.words.length || b.score - a.score);
    } else if (sortBy === 'words_desc') {
      list.sort((a, b) => b.words.length - a.words.length || b.score - a.score);
    } else if (sortBy === 'alpha') {
      list.sort((a, b) => a.phrase.localeCompare(b.phrase));
    }

    return list;
  }, [results, wordFilter, searchQuery, sortBy]);

  return (
    <div className="space-y-3.5">
      {/* Filters and Controls Toolbar */}
      <div className="flex items-center justify-between gap-3 text-xs flex-wrap px-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[#f4f4f5] font-semibold text-sm">
            Discovered Anagrams
          </span>
          <span className="font-mono text-xs text-[#71717a] bg-[#18181b] px-2 py-0.5 rounded border border-[#27272a]">
            {filteredResults.length}{' '}
            {filteredResults.length !== results.length ? `of ${results.length}` : ''}
          </span>
          {metrics && (
            <span className="font-mono text-[11px] text-[#52525b] tabular-nums hidden sm:inline-block">
              · {metrics.elapsedMs.toFixed(0)}ms
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Search within results */}
          {results.length > 0 && (
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Filter word..."
                className="w-28 sm:w-36 bg-[#121214] border border-[#27272a] focus:border-[#52525b] rounded px-2 py-1 text-[11px] font-mono text-[#f4f4f5] placeholder-[#52525b] focus:outline-none transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear word search filter"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[#71717a] hover:text-[#f4f4f5] p-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* Word length filter tabs */}
          {results.length > 0 && (
            <div className="flex items-center bg-[#121214] p-0.5 rounded border border-[#27272a]">
              {(['all', '2', '3', '4+'] as const).map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setWordFilter(tab)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase transition-colors cursor-pointer ${
                    wordFilter === tab
                      ? 'bg-[#27272a] text-[#f4f4f5] font-medium'
                      : 'text-[#71717a] hover:text-[#f4f4f5]'
                  }`}
                >
                  {tab === 'all' ? 'All' : `${tab}w`}
                </button>
              ))}
            </div>
          )}

          {/* Sort selector */}
          {results.length > 0 && (
            <select
              value={sortBy}
              onChange={e =>
                setSortBy(e.target.value as 'score' | 'words_asc' | 'words_desc' | 'alpha')
              }
              className="bg-[#121214] border border-[#27272a] text-[#a1a1aa] rounded px-2 py-1 text-[11px] font-mono focus:outline-none cursor-pointer"
            >
              <option value="score">Best Flow</option>
              <option value="words_asc">Fewest Words</option>
              <option value="words_desc">Most Words</option>
              <option value="alpha">A &rarr; Z</option>
            </select>
          )}

          {/* Spicy words toggle */}
          <button
            type="button"
            onClick={() => onToggleSpicy(!allowSpicy)}
            className={`flex items-center gap-1 font-mono text-xs px-2 py-1 rounded border transition-colors cursor-pointer ${
              allowSpicy
                ? 'bg-rose-950/40 border-rose-600/50 text-rose-400 font-medium'
                : 'bg-[#121214] border-[#27272a] text-[#71717a] hover:text-[#f4f4f5]'
            }`}
            title={
              allowSpicy
                ? 'Spicy words enabled (may include profanity)'
                : 'Spicy words disabled (family-friendly)'
            }
          >
            <Flame className="w-3 h-3" />
            <span>Spicy</span>
          </button>

          {/* Paths toggle */}
          {results.length > 0 && (
            <button
              type="button"
              onClick={() => setShowPaths(!showPaths)}
              className={`font-mono text-xs px-2 py-1 rounded border transition-colors cursor-pointer ${
                showPaths
                  ? 'bg-emerald-950/40 border-emerald-600/50 text-emerald-400'
                  : 'bg-[#121214] border-[#27272a] text-[#71717a] hover:text-[#f4f4f5]'
              }`}
              title="Show mini path animated canvases on each card"
            >
              {showPaths ? 'Paths On' : 'Paths Off'}
            </button>
          )}
        </div>
      </div>

      {/* Results Grid View */}
      {isSolving ? (
        <div className="border border-[#27272a] rounded-xl p-12 text-center space-y-3 bg-[#121214]">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent" />
          <p className="font-mono text-sm text-[#a1a1aa]">
            Searching exact letter rearrangements...
          </p>
        </div>
      ) : filteredResults.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredResults.map(item => (
            <AnagramResultCard
              key={item.phrase}
              item={item}
              isActive={activeTargetPhrase === item.phrase}
              sourceText={sourceText}
              showMiniPath={showPaths}
              progressBus={progressBus}
              onAnimatePhrase={onAnimatePhrase}
              onCopy={handleCopyPhrase}
              isCopied={copiedPhrase === item.phrase}
            />
          ))}
        </div>
      ) : sourceText.trim() ? (
        <div className="border border-[#27272a] rounded-xl p-8 text-center space-y-2 bg-[#121214]">
          <p className="font-mono text-sm text-[#a1a1aa]">No anagrams found.</p>
          <p className="font-mono text-xs text-[#52525b]">
            Try removing punctuation, adjusting word length filters, or enabling Spicy words.
          </p>
        </div>
      ) : (
        <div className="border border-[#27272a] border-dashed rounded-xl p-10 text-center space-y-2">
          <p className="font-mono text-sm text-[#71717a]">
            Enter any name, word, or phrase above to solve exact anagrams.
          </p>
        </div>
      )}
    </div>
  );
};
