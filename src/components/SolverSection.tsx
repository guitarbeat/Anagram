import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  RotateCcw,
  Search,
  CheckCircle2,
  SlidersHorizontal,
  BookOpen,
  ArrowUpDown,
  Wand2,
} from 'lucide-react';
import { AnagramResult } from '../types';
import {
  normalize,
  solveAnagrams,
  SolveMetrics,
} from '../utils/anagramSolver';
import { AnagramResultCard } from './AnagramResultCard';
import { UnifiedRackVerifier } from './UnifiedRackVerifier';
import { SubWordsExplorer } from './SubWordsExplorer';
import { showToast } from '../utils/toast';

const PRESET_EXAMPLES = [
  'Aaron Lorenzo Woods',
  'Astronomer',
  'Conversation',
  'The eyes',
  'Dormitory',
  'Mother-in-law',
  'Clint Eastwood',
  'Slot machines',
  'A gentleman',
  'Schoolmaster',
  'Eleven plus two',
  'Silence',
];

interface SolverSectionProps {
  sourceText: string;
  setSourceText: (val: string) => void;
  candidateText: string;
  setCandidateText: (val: string) => void;
  onAnimatePhrase: (target: string) => void;
  activeTab?: 'anagrams' | 'rack' | 'dictionary';
}

export const SolverSection: React.FC<SolverSectionProps> = ({
  sourceText,
  setSourceText,
  candidateText,
  setCandidateText,
  onAnimatePhrase,
  activeTab: externalTab,
}) => {
  const [activeTab, setActiveTab] = useState<'anagrams' | 'rack' | 'dictionary'>('anagrams');
  const [results, setResults] = useState<AnagramResult[]>([]);
  const [metrics, setMetrics] = useState<SolveMetrics | null>(null);
  const [isSolving, setIsSolving] = useState<boolean>(false);
  const [resultSearchQuery, setResultSearchQuery] = useState<string>('');
  const [resultSort, setResultSort] = useState<'score' | 'fewest' | 'most' | 'alpha'>('score');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Sync external tab if provided
  useEffect(() => {
    if (externalTab) {
      setActiveTab(externalTab);
    }
  }, [externalTab]);

  // Solve anagrams on sourceText change
  useEffect(() => {
    if (!sourceText.trim()) {
      setResults([]);
      setMetrics(null);
      return;
    }

    setIsSolving(true);
    let isCancelled = false;
    const timer = setTimeout(async () => {
      try {
        const solved = await solveAnagrams({
          source: sourceText,
          depth: 50000,
          resultLimit: 120,
        });
        if (!isCancelled) {
          setResults(solved.results);
          setMetrics(solved.metrics);
        }
      } catch (err) {
        console.error('Solve error:', err);
      } finally {
        if (!isCancelled) {
          setIsSolving(false);
        }
      }
    }, 150);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [sourceText]);

  // Filtered & sorted results
  const displayedResults = useMemo(() => {
    let list = results;
    if (resultSearchQuery.trim()) {
      const q = resultSearchQuery.trim().toLowerCase();
      list = list.filter(r => r.phrase.toLowerCase().includes(q));
    }

    if (resultSort === 'score') {
      return [...list].sort((a, b) => b.score - a.score);
    } else if (resultSort === 'fewest') {
      return [...list].sort((a, b) => a.words.length - b.words.length || b.score - a.score);
    } else if (resultSort === 'most') {
      return [...list].sort((a, b) => b.words.length - a.words.length || b.score - a.score);
    } else if (resultSort === 'alpha') {
      return [...list].sort((a, b) => a.phrase.localeCompare(b.phrase));
    }
    return list;
  }, [results, resultSearchQuery, resultSort]);

  const handleCopyPhrase = (phrase: string, idx: number) => {
    navigator.clipboard.writeText(phrase);
    setCopiedIndex(idx);
    showToast(`Copied "${phrase}"`, 'info');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleLoadIntoRack = (phrase: string) => {
    setCandidateText(phrase);
    setActiveTab('rack');
    showToast('Loaded phrase into Interactive Rack', 'info');
  };

  const handleAddWordToRack = (word: string) => {
    const current = candidateText.trim();
    const updated = current ? `${current} ${word}` : word;
    setCandidateText(updated);
    setActiveTab('rack');
  };

  const normalizedLen = normalize(sourceText).length;

  return (
    <div className="space-y-6">
      {/* Source Phrase Input Card */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <label htmlFor="source-phrase-input" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Source Phrase or Name
            </label>
            <p className="text-xs text-zinc-400 mt-0.5">
              Enter any word, name, or sentence to generate exact multi-word anagrams.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs font-mono px-2.5 py-1 rounded bg-zinc-950 border border-zinc-800 text-zinc-400">
              {normalizedLen} letters
            </span>
            {sourceText && (
              <button
                onClick={() => setSourceText('')}
                className="text-xs text-zinc-400 hover:text-zinc-200 px-2 py-1 rounded hover:bg-zinc-800 transition-colors"
                title="Clear input"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="relative">
          <input
            id="source-phrase-input"
            type="text"
            value={sourceText}
            onChange={e => setSourceText(e.target.value)}
            placeholder="Type word or name (e.g., Aaron Lorenzo Woods)..."
            className="w-full bg-zinc-950 border border-zinc-700/80 focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400 rounded-lg px-4 py-3 text-base text-zinc-100 font-medium placeholder-zinc-500 focus:outline-none transition-all"
          />
        </div>

        {/* Preset Quick Chips */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          <span className="text-[11px] font-mono text-zinc-500 mr-1">Presets:</span>
          {PRESET_EXAMPLES.slice(0, 6).map(preset => (
            <button
              key={preset}
              onClick={() => {
                setSourceText(preset);
                showToast(`Loaded preset "${preset}"`, 'info');
              }}
              className={`px-2.5 py-1 rounded-md text-xs font-mono transition-colors border ${
                sourceText.toLowerCase() === preset.toLowerCase()
                  ? 'bg-zinc-100 text-zinc-950 border-zinc-100 font-semibold'
                  : 'bg-zinc-950 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 border-zinc-800'
              }`}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {/* Unified Tab Switcher */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3 gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 bg-zinc-950 p-1 rounded-lg border border-zinc-800/80">
          <button
            onClick={() => setActiveTab('anagrams')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'anagrams'
                ? 'bg-zinc-800 text-zinc-100 shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Exact Anagrams</span>
            {results.length > 0 && (
              <span className="ml-1 text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-900 text-zinc-300">
                {results.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('rack')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'rack'
                ? 'bg-zinc-800 text-zinc-100 shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Rack &amp; Verifier</span>
          </button>

          <button
            onClick={() => setActiveTab('dictionary')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'dictionary'
                ? 'bg-zinc-800 text-zinc-100 shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Sub-Words</span>
          </button>
        </div>

        {activeTab === 'anagrams' && results.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="text"
                value={resultSearchQuery}
                onChange={e => setResultSearchQuery(e.target.value)}
                placeholder="Filter results..."
                className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-zinc-100 placeholder-zinc-500 font-mono focus:outline-none w-36 sm:w-44"
              />
            </div>

            <select
              value={resultSort}
              onChange={e => setResultSort(e.target.value as any)}
              className="bg-zinc-950 border border-zinc-800 text-zinc-300 rounded-lg px-2.5 py-1 text-xs font-mono focus:outline-none"
            >
              <option value="score">Best Score</option>
              <option value="fewest">Fewest Words</option>
              <option value="most">Most Words</option>
              <option value="alpha">A to Z</option>
            </select>
          </div>
        )}
      </div>

      {/* Tab 1: Exact Anagrams List */}
      {activeTab === 'anagrams' && (
        <div className="space-y-4">
          {isSolving ? (
            <div className="text-center py-16 space-y-2 bg-zinc-900/40 border border-zinc-800/60 rounded-xl">
              <div className="w-6 h-6 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-zinc-400 font-mono">Computing exact anagram combinations...</p>
            </div>
          ) : displayedResults.length === 0 ? (
            <div className="text-center py-16 space-y-2 bg-zinc-900/40 border border-zinc-800/60 rounded-xl">
              <p className="text-sm font-medium text-zinc-300">
                {sourceText ? 'No exact anagrams match your search query.' : 'Type a phrase above to find anagrams.'}
              </p>
              <p className="text-xs text-zinc-500">
                Or explore the <button onClick={() => setActiveTab('dictionary')} className="underline hover:text-zinc-300">Sub-Words dictionary</button> or <button onClick={() => setActiveTab('rack')} className="underline hover:text-zinc-300">Interactive Rack</button>.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {displayedResults.map((item, idx) => (
                <AnagramResultCard
                  key={`${item.phrase}_${idx}`}
                  item={item}
                  idx={idx}
                  onAnimatePhrase={onAnimatePhrase}
                  onLoadIntoRack={handleLoadIntoRack}
                  onCopy={handleCopyPhrase}
                  isCopied={copiedIndex === idx}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Unified Interactive Rack & Verifier */}
      {activeTab === 'rack' && (
        <UnifiedRackVerifier
          sourceText={sourceText}
          candidatePhrase={candidateText}
          onChangeCandidate={setCandidateText}
          onAnimatePhrase={onAnimatePhrase}
        />
      )}

      {/* Tab 3: Dictionary Sub-Words */}
      {activeTab === 'dictionary' && (
        <SubWordsExplorer
          sourceText={sourceText}
          onAddWordToRack={handleAddWordToRack}
        />
      )}
    </div>
  );
};
