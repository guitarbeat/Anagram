import React, { useState, useMemo, useCallback } from 'react';
import {
  Sparkles,
  Search,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  X,
  Layers,
  BarChart2,
  Pin,
  ArrowRight,
} from 'lucide-react';
import type { AnagramResult, CandidateWordItem, LetterBudgetSummary } from '../engine/types';
import { AnagramResultCard } from './AnagramResultCard';

export interface ContextRailProps {
  sourceText: string;
  targetPhrase: string;
  results: AnagramResult[];
  isSolving: boolean;
  candidateWords: CandidateWordItem[];
  exactClosers: string[];
  remainingLetters: string[];
  surplusLetters: string[];
  budget?: LetterBudgetSummary;
  onAnimatePhrase: (phrase: string) => void;
  onUpdatePhrase: (oldPhrase: string, newPhrase: string) => void;
  onTogglePinWord: (word: string) => void;
  onAddWordToTarget: (word: string) => void;
  onSetWordAsTarget: (word: string) => void;
  pinnedWordsSet?: Set<string>;
  onShowToast: (text: string, type?: 'success' | 'info' | 'error') => void;
  onCloseMobile?: () => void;
}

export const ContextRail: React.FC<ContextRailProps> = ({
  sourceText,
  targetPhrase,
  results = [],
  isSolving = false,
  candidateWords = [],
  exactClosers = [],
  remainingLetters = [],
  surplusLetters = [],
  budget,
  onAnimatePhrase,
  onUpdatePhrase,
  onTogglePinWord,
  onAddWordToTarget,
  onSetWordAsTarget,
  pinnedWordsSet = new Set(),
  onShowToast,
  onCloseMobile,
}) => {
  const [activeTab, setActiveTab] = useState<'suggestions' | 'candidates' | 'telemetry'>('suggestions');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [copiedPhrase, setCopiedPhrase] = useState<string | null>(null);

  // Filtered candidate words for search
  const filteredCandidates = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return candidateWords.slice(0, 100);
    return candidateWords
      .filter(w => w.word.toLowerCase().includes(term))
      .slice(0, 100);
  }, [candidateWords, searchTerm]);

  const handleCopyPhrase = useCallback((phrase: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigator.clipboard?.writeText(phrase);
    setCopiedPhrase(phrase);
    onShowToast(`Copied "${phrase}" to clipboard`, 'success');
    setTimeout(() => setCopiedPhrase(null), 1800);
  }, [onShowToast]);

  return (
    <aside className="w-full h-full flex flex-col bg-[#0f0f12] text-zinc-200 border-l border-zinc-800 select-none overflow-hidden">
      {/* Top Header & Tab Navigation */}
      <div className="flex flex-col border-b border-zinc-800 bg-[#121216] shrink-0">
        <div className="flex items-center justify-between px-3 pt-2.5 pb-2">
          {/* Segmented Control for Tabs */}
          <div className="flex items-center gap-1 bg-[#09090b] p-0.5 rounded-lg border border-zinc-800/80">
            <button
              type="button"
              onClick={() => setActiveTab('suggestions')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-bold tracking-wider uppercase transition-colors flex items-center gap-1.5 ${
                activeTab === 'suggestions'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span>SOLUTIONS</span>
              {results.length > 0 && (
                <span className="text-[9px] bg-zinc-700/80 text-zinc-300 px-1 rounded tabular-nums">
                  {results.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('candidates')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-bold tracking-wider uppercase transition-colors flex items-center gap-1.5 ${
                activeTab === 'candidates'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span>WORDS</span>
              {candidateWords.length > 0 && (
                <span className="text-[9px] bg-zinc-700/80 text-zinc-300 px-1 rounded tabular-nums">
                  {candidateWords.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('telemetry')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-bold tracking-wider uppercase transition-colors flex items-center gap-1.5 ${
                activeTab === 'telemetry'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span>LETTERS</span>
              {remainingLetters.length > 0 && (
                <span className="text-[9px] bg-zinc-700/80 text-zinc-300 px-1 rounded tabular-nums">
                  {remainingLetters.length}
                </span>
              )}
            </button>
          </div>

          {/* Close mobile button if rendered in mobile sheet */}
          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 md:hidden"
              title="Close Panel"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* 1-Click Exact Closers Banner (Only shown when 1 or more words close the remaining anagram) */}
        {exactClosers.length > 0 && (
          <div className="bg-emerald-950/40 border-t border-b border-emerald-800/40 px-3 py-2 flex flex-col gap-1.5 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                1-Click Exact Closers ({exactClosers.length})
              </span>
              <span className="text-[9px] font-mono text-zinc-400">Click to complete</span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto no-scrollbar">
              {exactClosers.slice(0, 8).map(closer => (
                <button
                  key={closer}
                  type="button"
                  onClick={() => {
                    onAddWordToTarget(closer);
                    onShowToast(`Completed anagram with "${closer.toUpperCase()}"!`, 'success');
                  }}
                  className="px-2 py-0.5 rounded text-[11px] font-mono font-bold uppercase bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 border border-emerald-600/60 hover:border-emerald-400 transition-colors shadow-sm flex items-center gap-1"
                >
                  <span>{closer}</span>
                  <ArrowRight className="w-2.5 h-2.5 opacity-70" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2.5">
        {/* TAB 1: SUGGESTIONS / SOLVER RESULTS */}
        {activeTab === 'suggestions' && (
          <div className="space-y-2">
            {isSolving && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 font-mono">
                <div className="w-3 h-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                <span>Computing exact anagram permutations...</span>
              </div>
            )}

            {results.length === 0 && !isSolving ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-zinc-500 space-y-2">
                <Sparkles className="w-6 h-6 text-zinc-600" />
                <div className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400">
                  No Phrases Generated Yet
                </div>
                <p className="text-xs text-zinc-500 max-w-xs">
                  {sourceText.trim()
                    ? 'Try typing or clearing words in the target input, or unlock pinned words.'
                    : 'Enter a source name in the header above to generate exact anagrams.'}
                </p>
              </div>
            ) : (
              results.map((item, idx) => (
                <AnagramResultCard
                  key={`${item.phrase}-${idx}`}
                  item={item}
                  isActive={targetPhrase.trim().toLowerCase() === item.phrase.toLowerCase()}
                  pinnedWordsSet={pinnedWordsSet}
                  onAnimatePhrase={onAnimatePhrase}
                  onUpdatePhrase={onUpdatePhrase}
                  onTogglePinWord={onTogglePinWord}
                  onCopy={handleCopyPhrase}
                  isCopied={copiedPhrase === item.phrase}
                />
              ))
            )}
          </div>
        )}

        {/* TAB 2: CANDIDATE WORDS EXPLORER */}
        {activeTab === 'candidates' && (
          <div className="space-y-2.5">
            {/* Search Input */}
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search candidate words..."
                className="w-full bg-[#18181c] border border-zinc-800 focus:border-emerald-500 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 font-mono outline-none transition-colors"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {filteredCandidates.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-500 font-mono">
                No matching candidate words found.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {filteredCandidates.map(w => {
                  const isCloser = exactClosers.includes(w.word.toLowerCase());
                  const isTarget = targetPhrase.toLowerCase().includes(w.word.toLowerCase());

                  return (
                    <div
                      key={w.word}
                      className={`flex items-center justify-between p-2 rounded-lg border text-xs font-mono transition-all ${
                        isCloser
                          ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-200'
                          : isTarget
                            ? 'bg-zinc-800/80 border-zinc-700 text-zinc-300'
                            : 'bg-[#18181c] border-zinc-800/80 hover:border-zinc-700 text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-bold uppercase truncate">{w.word}</span>
                        <span className="text-[10px] text-zinc-500 tabular-nums">
                          {w.length}L
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            onAddWordToTarget(w.word);
                            onShowToast(`Added "${w.word.toUpperCase()}"`, 'success');
                          }}
                          className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-zinc-800 hover:bg-emerald-600 text-zinc-200 hover:text-white transition-colors"
                          title="Append to target"
                        >
                          + Add
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: TELEMETRY & LETTER BUDGET */}
        {activeTab === 'telemetry' && (
          <div className="space-y-4">
            {/* Letters Overview */}
            <div className="p-3 rounded-lg bg-[#18181c] border border-zinc-800 space-y-2">
              <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                Remaining Letters ({remainingLetters.length})
              </div>
              {remainingLetters.length === 0 ? (
                <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Exact Anagram Match! Zero remaining letters.
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {remainingLetters.map((char, i) => (
                    <span
                      key={`${char}-${i}`}
                      className="w-6 h-6 rounded flex items-center justify-center font-mono font-bold text-xs uppercase bg-zinc-800 border border-zinc-700 text-emerald-400"
                    >
                      {char}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Surplus Letters if user typed invalid letters */}
            {surplusLetters.length > 0 && (
              <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 space-y-2">
                <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Surplus Letters ({surplusLetters.length})
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {surplusLetters.map((char, i) => (
                    <span
                      key={`${char}-${i}`}
                      className="w-6 h-6 rounded flex items-center justify-center font-mono font-bold text-xs uppercase bg-rose-900/60 border border-rose-700 text-rose-200"
                    >
                      {char}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Multiset Letter Tiles Matrix */}
            {budget && budget.tiles.length > 0 && (
              <div className="p-3 rounded-lg bg-[#18181c] border border-zinc-800 space-y-2">
                <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                  Multiset Letter Balance
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                  {budget.tiles.map(tile => (
                    <div
                      key={tile.letter}
                      className="p-1.5 rounded bg-zinc-900 border border-zinc-800 flex flex-col items-center justify-center"
                    >
                      <span className="text-xs font-mono font-bold uppercase text-zinc-200">
                        {tile.letter}
                      </span>
                      <div className="flex items-center gap-1 text-[9px] font-mono mt-0.5">
                        <span className="text-emerald-400 tabular-nums">{tile.consumed}</span>
                        <span className="text-zinc-600">/</span>
                        <span className="text-zinc-400 tabular-nums">{tile.total}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
