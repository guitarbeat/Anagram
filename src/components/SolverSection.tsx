import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Play,
  Copy,
  Check,
  RotateCcw,
  Sliders,
  ChevronDown,
  ChevronUp,
  Hash,
  Layers,
  ArrowRight,
  Boxes,
  ShieldCheck,
  BookOpen,
  Download,
  Search,
  GitBranch,
  Trash2,
  ChevronRight,
  CheckCircle2,
  ChevronLeft,
  ArrowLeftRight,
  Shuffle,
  GripVertical,
  AlertCircle,
  ClipboardPaste,
  ArrowDownAZ,
  Filter,
  Dices,
} from 'lucide-react';
import { AnagramResult, VocabularyDepth } from '../types';
import {
  countsArray,
  filterAnagramsByPattern,
  findAnchorSuggestions,
  normalize,
  solveAnagrams,
  SolveMetrics,
  getValidNextWords,
  subtract,
  arrSize,
  getAllSubWords,
  getLetterDiff,
} from '../utils/anagramSolver';
import { soundFX, fireConfetti } from '../utils/audioEffects';
import { SubWordsExplorer } from './SubWordsExplorer';
import { LieDetectorSection } from './LieDetectorSection';
import { LetterSandbox } from './LetterSandbox';
import { AnagramResultCard } from './AnagramResultCard';

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
  candidateText?: string;
  setCandidateText?: (val: string) => void;
  onAnimatePhrase: (target: string) => void;
  onTestLieDetector?: (target: string) => void;
  onOpenSandbox?: (target: string) => void;
  onOpenWordChain?: () => void;
  onOpenSubWords?: () => void;
  onOpenStoryGenerator?: (source: string, target: string) => void;
}

export const SolverSection: React.FC<SolverSectionProps> = ({
  sourceText,
  setSourceText,
  candidateText: externalCandidateText,
  setCandidateText: externalSetCandidateText,
  onAnimatePhrase,
  onTestLieDetector,
  onOpenSandbox: externalOnOpenSandbox,
  onOpenWordChain,
  onOpenSubWords,
  onOpenStoryGenerator,
}) => {
  const vocabDepth = 50000;
  const [viewMode, setViewMode] = useState<'phrases' | 'words' | 'tiles' | 'matcher'>('phrases');
  const [internalCandidate, setInternalCandidate] = useState<string>('');
  const candidateText = externalCandidateText !== undefined ? externalCandidateText : internalCandidate;
  const setCandidateText = externalSetCandidateText || setInternalCandidate;

  const [anchorInput, setAnchorInput] = useState<string>('');
  const [customWords, setCustomWords] = useState<string>('');
  const [patternFilter, setPatternFilter] = useState<string>('');

  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchProgress, setSearchProgress] = useState<number>(0);
  const [searchStatus, setSearchStatus] = useState<string>('Ready to solve.');
  const [rawResults, setRawResults] = useState<AnagramResult[]>([]);
  const [metrics, setMetrics] = useState<SolveMetrics | null>(null);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  const [anchorSuggestions, setAnchorSuggestions] = useState<{ word: string; category: string; funny: boolean }[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [placedWords, setPlacedWords] = useState<string[]>([]);
  const [draggedPlacedIndex, setDraggedPlacedIndex] = useState<number | null>(null);
  const [anchorPlacement, setAnchorPlacement] = useState<'start' | 'end'>('start');
  const [insertDirection, setInsertDirection] = useState<'end' | 'start'>('end');

  const [nextWordFilter, setNextWordFilter] = useState<string>('');
  const [nextWordLengthFilter, setNextWordLengthFilter] = useState<'all' | 'short' | 'medium' | 'long'>('all');
  const [resultSearchQuery, setResultSearchQuery] = useState<string>('');
  const [resultSort, setResultSort] = useState<'score' | 'fewest-words' | 'most-words' | 'alpha'>('score');
  const [visibleCount, setVisibleCount] = useState<number>(40);
  const [copiedInputNotice, setCopiedInputNotice] = useState<boolean>(false);
  const [copiedAllNotice, setCopiedAllNotice] = useState<boolean>(false);

  // Word chain reordering helpers
  const handleMovePlacedWord = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= placedWords.length || toIndex >= placedWords.length) {
      return;
    }
    const updated = [...placedWords];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    setPlacedWords(updated);
    soundFX.playPop();
  };

  const handleMovePlacedWordLeft = (index: number) => {
    if (index <= 0) return;
    handleMovePlacedWord(index, index - 1);
  };

  const handleMovePlacedWordRight = (index: number) => {
    if (index >= placedWords.length - 1) return;
    handleMovePlacedWord(index, index + 1);
  };

  const handleReversePlacedWords = () => {
    if (placedWords.length <= 1) return;
    setPlacedWords(prev => [...prev].reverse());
    soundFX.playPop();
  };

  const handleShufflePlacedWords = () => {
    if (placedWords.length <= 1) return;
    setPlacedWords(prev => [...prev].sort(() => Math.random() - 0.5));
    soundFX.playPop();
  };

  const handleLockWord = (word: string) => {
    if (insertDirection === 'start') {
      setPlacedWords(prev => [word, ...prev]);
    } else {
      setPlacedWords(prev => [...prev, word]);
    }
    soundFX.playPop();
  };

  // Calculate all single dictionary sub-words from current source text
  const allSubWords = useMemo(() => {
    return getAllSubWords(sourceText, vocabDepth);
  }, [sourceText, vocabDepth]);

  // Letter breakdown calculations
  const normalizedSource = normalize(sourceText);
  const sourceLetterCounts = countsArray(sourceText);
  let currentRem = new Uint8Array(sourceLetterCounts);
  for (const w of placedWords) {
    currentRem = subtract(currentRem, countsArray(w));
  }
  const remainingLetterCount = arrSize(currentRem);

  const letterChips: [string, number][] = [];
  for (let i = 0; i < 26; i++) {
    if (currentRem[i] > 0) {
      letterChips.push([String.fromCharCode(97 + i), currentRem[i]]);
    }
  }
  letterChips.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  const validNextWords = useMemo(() => {
    if (remainingLetterCount === 0) return [];
    return getValidNextWords(currentRem, vocabDepth);
  }, [remainingLetterCount, currentRem, vocabDepth]);

  // Vowels and consonants breakdown
  const { vowelCount, consonantCount } = useMemo(() => {
    let vowels = 0;
    let consonants = 0;
    const vSet = new Set(['a', 'e', 'i', 'o', 'u', 'y']);
    for (const ch of normalizedSource) {
      if (vSet.has(ch)) vowels++;
      else consonants++;
    }
    return { vowelCount: vowels, consonantCount: consonants };
  }, [normalizedSource]);

  const filteredNextWords = useMemo(() => {
    let list = validNextWords;
    if (nextWordLengthFilter === 'short') {
      list = list.filter(w => w.length <= 3);
    } else if (nextWordLengthFilter === 'medium') {
      list = list.filter(w => w.length >= 4 && w.length <= 6);
    } else if (nextWordLengthFilter === 'long') {
      list = list.filter(w => w.length >= 7);
    }
    if (nextWordFilter.trim()) {
      const q = nextWordFilter.trim().toLowerCase();
      list = list.filter(w => w.word.toLowerCase().includes(q));
    }
    return list;
  }, [validNextWords, nextWordFilter, nextWordLengthFilter]);

  // Active phrase being tested for letter match (from candidate input or current placed words)
  const activeTestPhrase = (candidateText || '').trim() || (placedWords.length > 0 ? placedWords.join(' ') : '');
  const liveMatchDiff = useMemo(() => {
    if (!activeTestPhrase) return null;
    return getLetterDiff(sourceText, activeTestPhrase);
  }, [sourceText, activeTestPhrase]);

  useEffect(() => {
    setPlacedWords([]);
  }, [sourceText]);

  useEffect(() => {
    if (!normalizedSource) {
      setRawResults([]);
      setMetrics(null);
      setSearchStatus('Please enter text with at least one letter.');
      return;
    }
    const timer = setTimeout(() => {
      handleSolve();
    }, 400);
    return () => clearTimeout(timer);
  }, [normalizedSource, anchorInput, customWords, vocabDepth, placedWords, anchorPlacement]);

  const handleSolve = async () => {
    if (!normalizedSource) {
      setSearchStatus('Please enter text with at least one letter.');
      return;
    }

    soundFX.playPop();
    setIsSearching(true);
    setSearchProgress(15);
    setSearchStatus('Searching multi-word partitions across full unabridged lexicon...');

    try {
      const { results: solvedResults, metrics: solvedMetrics } = await solveAnagrams({
        source: sourceText,
        depth: vocabDepth,
        anchorText: [anchorInput, ...placedWords].filter(Boolean).join(' '),
        customWordsText: customWords,
        anchorPlacement: anchorPlacement,
        onProgress: (p, msg) => {
          setSearchProgress(p);
          setSearchStatus(msg);
        },
      });

      setRawResults(solvedResults);
      setMetrics(solvedMetrics);

      if (solvedResults.length > 0) {
        soundFX.playSuccess();
        if (solvedResults.length >= 10) {
          fireConfetti();
        }
        setSearchStatus(`Found ${solvedResults.length} exact multi-word anagrams in ${solvedMetrics.elapsedMs}ms.`);
      } else {
        setSearchStatus(
          `No exact anagrams matched constraints in ${solvedMetrics.elapsedMs}ms. Try adjusting filters or required words.`
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Search error';
      setSearchStatus(`Notice: ${msg}`);
    } finally {
      setIsSearching(false);
      setSearchProgress(100);
    }
  };

  // Processed and filtered results
  const results = useMemo(() => {
    let list = rawResults;
    if (patternFilter.trim()) {
      list = filterAnagramsByPattern(list, patternFilter);
    }
    if (resultSearchQuery.trim()) {
      const q = resultSearchQuery.trim().toLowerCase();
      list = list.filter(r => r.phrase.toLowerCase().includes(q));
    }

    // Sort order
    if (resultSort === 'fewest-words') {
      return [...list].sort((a, b) => a.words.length - b.words.length || b.score - a.score);
    } else if (resultSort === 'most-words') {
      return [...list].sort((a, b) => b.words.length - a.words.length || b.score - a.score);
    } else if (resultSort === 'alpha') {
      return [...list].sort((a, b) => a.phrase.localeCompare(b.phrase));
    }
    // Default score
    return list;
  }, [rawResults, patternFilter, resultSearchQuery, resultSort]);

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    soundFX.playPop();
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handlePasteInput = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setSourceText(text);
        soundFX.playPop();
      }
    } catch {
      // Fallback
    }
  };

  const handleCopyInput = () => {
    if (!sourceText) return;
    navigator.clipboard.writeText(sourceText);
    setCopiedInputNotice(true);
    soundFX.playPop();
    setTimeout(() => setCopiedInputNotice(false), 1800);
  };

  const handleRandomPreset = () => {
    const available = PRESET_EXAMPLES.filter(p => p !== sourceText);
    const chosen = available[Math.floor(Math.random() * available.length)] || PRESET_EXAMPLES[0];
    setSourceText(chosen);
    soundFX.playPop();
  };

  const handleCopyAllResults = () => {
    if (results.length === 0) return;
    const text = results.map(r => r.phrase).join('\n');
    navigator.clipboard.writeText(text);
    setCopiedAllNotice(true);
    soundFX.playPop();
    setTimeout(() => setCopiedAllNotice(false), 2000);
  };


  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const handleExportJSON = () => {
    if (results.length === 0) return;
    const blob = new Blob([JSON.stringify({ source: sourceText, count: results.length, results }, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `anagrams-${normalize(sourceText)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    soundFX.playPop();
    setExportNotice('Downloaded JSON');
    setTimeout(() => setExportNotice(null), 2500);
  };

  const handleExportText = () => {
    if (results.length === 0) return;
    const lines = [
      `EXACT ANAGRAMS FOR "${sourceText}":`,
      `Generated: ${new Date().toISOString()}`,
      `Total: ${results.length}`,
      '----------------------------------------',
      ...results.map((r, i) => `${i + 1}. ${r.phrase} (score: ${r.score})`),
    ].join('\n');

    const blob = new Blob([lines], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `anagrams-${normalize(sourceText)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    soundFX.playPop();
    setExportNotice('Downloaded TXT');
    setTimeout(() => setExportNotice(null), 2500);
  };

  useEffect(() => {
    if (sourceText === 'Aaron Lorenzo Woods') {
      handleSolve();
    }
  }, []);

  return (
    <div className="space-y-5">
      {/* Primary Input Card */}
      <section className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-5 sm:p-6 shadow-xs">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <h1 className="text-base sm:text-lg font-semibold text-zinc-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Anagram & Word Finder</span>
              </h1>
              <p className="text-xs text-zinc-400">
                Generate complete multi-word anagrams and discover all valid dictionary words from any letters.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1 flex items-center">
              <input
                type="text"
                value={sourceText}
                onChange={e => setSourceText(e.target.value)}
                aria-label="Input phrase or sentence to anagram"
                placeholder="Enter phrase, name, or sentence..."
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 rounded-lg pl-3.5 pr-28 py-2.5 text-sm sm:text-base font-medium text-zinc-100 placeholder-zinc-500 focus:outline-none transition-all font-mono"
              />
              <div className="absolute right-2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePasteInput}
                  className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 rounded transition-colors"
                  title="Paste from clipboard"
                  aria-label="Paste from clipboard"
                >
                  <ClipboardPaste className="w-4 h-4" />
                </button>
                {sourceText && (
                  <button
                    type="button"
                    onClick={handleCopyInput}
                    className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 rounded transition-colors relative"
                    title="Copy input text"
                    aria-label="Copy input text"
                  >
                    {copiedInputNotice ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                )}
                {sourceText && (
                  <button
                    type="button"
                    onClick={() => setSourceText('')}
                    aria-label="Clear input text"
                    className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/80 rounded transition-colors"
                    title="Clear input"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleRandomPreset}
              className="px-3.5 py-2.5 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-zinc-100 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shrink-0 shadow-xs"
              title="Pick a classic random anagram example"
            >
              <Dices className="w-4 h-4 text-indigo-400" />
              <span>Random Example</span>
            </button>
          </div>

          {/* Quick example presets */}
          <div className="flex items-center gap-1.5 flex-wrap text-xs text-zinc-400 pt-0.5">
            <span className="text-zinc-500 text-[11px] mr-1">Classic presets:</span>
            {PRESET_EXAMPLES.slice(0, 7).map(ex => (
              <button
                key={ex}
                type="button"
                onClick={() => {
                  setSourceText(ex);
                  soundFX.playPop();
                }}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                  sourceText === ex
                    ? 'bg-zinc-800 text-zinc-100 border border-zinc-700 font-semibold'
                    : 'bg-zinc-950 hover:bg-zinc-800 border border-zinc-850 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {ex}
              </button>
            ))}
          </div>

          {/* Letter Breakdown Chips & Stats */}
          <div className="pt-2 border-t border-zinc-850/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-zinc-500 mr-1">
                Letters ({normalizedSource.length}):
              </span>
              {letterChips.map(([char, count]) => (
                <span
                  key={char}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-300"
                >
                  <span className="font-bold">{char.toUpperCase()}</span>
                  <span className="text-zinc-500 font-normal">×{count}</span>
                </span>
              ))}
            </div>

            {normalizedSource.length > 0 && (
              <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400 shrink-0">
                <span className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800/80">
                  <strong className="text-zinc-200 font-medium">{vowelCount}</strong> Vowels
                </span>
                <span className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800/80">
                  <strong className="text-zinc-200 font-medium">{consonantCount}</strong> Consonants
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Metrics Bar with Clean Non-Redundant Linguistic Stats */}
      <section className="grid grid-cols-2 sm:grid-cols-4 border border-zinc-800 rounded-xl bg-zinc-900/40 divide-y sm:divide-y-0 sm:divide-x divide-zinc-800 overflow-hidden">
        <div className="p-3 sm:p-3.5">
          <span className="text-xs font-medium text-zinc-500 block">Exact Multi-Word Anagrams</span>
          <span className="text-lg font-mono font-bold text-zinc-100 mt-0.5 block">
            {metrics ? metrics.solutionsCount.toLocaleString() : '-'}
          </span>
        </div>
        <div className="p-3 sm:p-3.5">
          <span className="text-xs font-medium text-zinc-500 block">Valid Single Words</span>
          <span className="text-lg font-mono font-bold text-emerald-400 mt-0.5 block">
            {allSubWords.length.toLocaleString()}
          </span>
        </div>
        <div className="p-3 sm:p-3.5">
          <span className="text-xs font-medium text-zinc-500 block">Distinct Letters</span>
          <span className="text-lg font-mono font-bold text-zinc-300 mt-0.5 block">
            {letterChips.length} <span className="text-xs font-normal text-zinc-500">unique</span>
          </span>
        </div>
        <div className="p-3 sm:p-3.5">
          <span className="text-xs font-medium text-zinc-500 block">Solve Compute Time</span>
          <span className="text-lg font-mono font-bold text-zinc-400 mt-0.5 block">
            {metrics ? `${metrics.elapsedMs}ms` : '-'}
          </span>
        </div>
      </section>

      {/* Prominent Letter Matcher Status Banner (when testing/verifying an anagram) */}
      {activeTestPhrase && liveMatchDiff && (
        <div
          className={`p-3.5 sm:p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            liveMatchDiff.isExact
              ? 'bg-emerald-950/40 border-emerald-800/90 text-zinc-100 shadow-sm shadow-emerald-950/50'
              : liveMatchDiff.missing.length > 0 && liveMatchDiff.extra.length === 0
                ? 'bg-amber-950/25 border-amber-850/80 text-zinc-200'
                : 'bg-zinc-900/80 border-zinc-800 text-zinc-200'
          }`}
        >
          <div className="flex items-start sm:items-center gap-3">
            {liveMatchDiff.isExact ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
            )}
            <div>
              <div className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                <span>
                  {liveMatchDiff.isExact
                    ? 'Exact Anagram Match — All letters match 100%!'
                    : `Letter Matcher: ${
                        liveMatchDiff.missing.length > 0
                          ? `Missing ${liveMatchDiff.missing.reduce((acc, [, n]) => acc + n, 0)} letter${
                              liveMatchDiff.missing.reduce((acc, [, n]) => acc + n, 0) > 1 ? 's' : ''
                            } (${liveMatchDiff.missing.map(([c, n]) => (n > 1 ? `${c}×${n}` : c)).join(', ')})`
                          : ''
                      }${
                        liveMatchDiff.extra.length > 0
                          ? ` (+${liveMatchDiff.extra.reduce((acc, [, n]) => acc + n, 0)} extra)`
                          : ''
                      }`}
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-mono mt-0.5">
                Testing: <span className="text-zinc-200 font-medium">"{activeTestPhrase}"</span> against source <span className="text-zinc-200 font-medium">"{sourceText}"</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            {liveMatchDiff.isExact && (
              <button
                onClick={() => {
                  onAnimatePhrase(activeTestPhrase);
                  fireConfetti();
                }}
                className="px-3 py-1.5 bg-emerald-400 hover:bg-emerald-300 text-zinc-950 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Animate</span>
              </button>
            )}
            <button
              onClick={() => {
                setViewMode('matcher');
                soundFX.playPop();
              }}
              className="px-2.5 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-md text-xs font-medium transition-colors"
            >
              <span>Full Matcher</span>
            </button>
            {candidateText && (
              <button
                onClick={() => {
                  setCandidateText('');
                  soundFX.playPop();
                }}
                className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-md transition-colors"
                title="Clear test candidate"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Mode View Switcher */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 bg-zinc-950 p-1.5 rounded-xl border border-zinc-800">
        <button
          onClick={() => {
            setViewMode('phrases');
          }}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
            viewMode === 'phrases'
              ? 'bg-zinc-800 text-zinc-100 shadow-xs border border-zinc-700'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Full Phrases</span>
          {results.length > 0 && (
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
              viewMode === 'phrases' ? 'bg-zinc-700 text-zinc-200' : 'bg-zinc-850 text-zinc-400'
            }`}>
              {results.length}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setViewMode('words');
          }}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
            viewMode === 'words'
              ? 'bg-zinc-800 text-zinc-100 shadow-xs border border-zinc-700'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
          }`}
        >
          <BookOpen className={`w-3.5 h-3.5 ${viewMode === 'words' ? 'text-emerald-400' : 'text-emerald-500'}`} />
          <span>Dictionary Words</span>
          {allSubWords.length > 0 && (
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
              viewMode === 'words' ? 'bg-zinc-700 text-zinc-200' : 'bg-zinc-850 text-zinc-400'
            }`}>
              {allSubWords.length}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setViewMode('tiles');
          }}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
            viewMode === 'tiles'
              ? 'bg-zinc-800 text-zinc-100 shadow-xs border border-zinc-700'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
          }`}
        >
          <Boxes className={`w-3.5 h-3.5 ${viewMode === 'tiles' ? 'text-purple-400' : 'text-purple-500'}`} />
          <span>Tile Board</span>
        </button>

        <button
          onClick={() => {
            setViewMode('matcher');
          }}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
            viewMode === 'matcher'
              ? 'bg-zinc-800 text-zinc-100 shadow-xs border border-zinc-700'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
          }`}
        >
          <CheckCircle2 className={`w-3.5 h-3.5 ${viewMode === 'matcher' ? 'text-amber-400' : 'text-amber-500'}`} />
          <span>Letter Matcher</span>
        </button>
      </div>

      {/* View: Valid Single Dictionary Words */}
      {viewMode === 'words' && (
        <SubWordsExplorer
          sourceText={sourceText}
          showHeader={false}
          onSetAnchorWord={word => {
            handleLockWord(word);
            setViewMode('phrases');
          }}
        />
      )}

      {/* View: Interactive Tile Board */}
      {viewMode === 'tiles' && (
        <LetterSandbox
          sourceText={sourceText}
          onAnimatePhrase={onAnimatePhrase}
        />
      )}

      {/* View: Letter Matcher & Verifier */}
      {viewMode === 'matcher' && (
        <LieDetectorSection
          sourceText={sourceText}
          candidateText={candidateText}
          setCandidateText={setCandidateText}
          onAnimatePhrase={onAnimatePhrase}
          onOpenSandbox={() => setViewMode('tiles')}
        />
      )}

      {/* View: Full Phrase Anagram Solver */}
      {viewMode === 'phrases' && (
        <>

      {/* Search Parameters & Filter Bar */}
      <section className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-zinc-400" />
            <h3 className="font-medium text-zinc-200 text-xs sm:text-sm">Filter & Target Controls</h3>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-medium text-zinc-400 block mb-1">
              Must Include Word (Anchor)
            </label>
            <input
              type="text"
              value={anchorInput}
              onChange={e => setAnchorInput(e.target.value)}
              placeholder="e.g. Moon, Tree"
              className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-zinc-600 font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-400 block mb-1">
              Word Pattern (* wildcard)
            </label>
            <input
              type="text"
              value={patternFilter}
              onChange={e => setPatternFilter(e.target.value)}
              placeholder="e.g. *ing, *cat*"
              className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-zinc-600 font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-400 block mb-1">
              Custom Allowed Words
            </label>
            <input
              type="text"
              value={customWords}
              onChange={e => setCustomWords(e.target.value)}
              placeholder="e.g. Hogwarts, Cyberpunk"
              className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-zinc-600 font-mono"
            />
          </div>
        </div>

        {/* Word Chain Interactive Builder */}
        <div className="pt-3 border-t border-zinc-850 space-y-3 mt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5 text-indigo-400" />
                <span>Step-by-Step Word Chain Builder</span>
              </div>
              <p className="text-[11px] text-zinc-500">
                Lock words and arrange them in any order to craft custom anagram sentences.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Insert Target Selector */}
              <div className="flex items-center gap-1 bg-zinc-950 px-2 py-1 rounded-md border border-zinc-800 text-[11px] font-mono text-zinc-400">
                <span className="text-zinc-500 text-[10px]">Add to:</span>
                <button
                  onClick={() => setInsertDirection('start')}
                  className={`px-1.5 py-0.5 rounded transition-colors ${
                    insertDirection === 'start' ? 'bg-zinc-800 text-zinc-100 font-semibold' : 'hover:text-zinc-300'
                  }`}
                  title="New clicked words are added to the start of the chain"
                >
                  Start
                </button>
                <span className="text-zinc-700">|</span>
                <button
                  onClick={() => setInsertDirection('end')}
                  className={`px-1.5 py-0.5 rounded transition-colors ${
                    insertDirection === 'end' ? 'bg-zinc-800 text-zinc-100 font-semibold' : 'hover:text-zinc-300'
                  }`}
                  title="New clicked words are added to the end of the chain"
                >
                  End
                </button>
              </div>

              {/* Placement in Results */}
              <div className="flex items-center gap-1 bg-zinc-950 px-2 py-1 rounded-md border border-zinc-800 text-[11px] font-mono text-zinc-400">
                <span className="text-zinc-500 text-[10px]">Phrases:</span>
                <button
                  onClick={() => setAnchorPlacement('start')}
                  className={`px-1.5 py-0.5 rounded transition-colors ${
                    anchorPlacement === 'start' ? 'bg-zinc-800 text-zinc-100 font-semibold' : 'hover:text-zinc-300'
                  }`}
                  title="Place locked words at the start of generated phrases"
                >
                  Lead
                </button>
                <span className="text-zinc-700">|</span>
                <button
                  onClick={() => setAnchorPlacement('end')}
                  className={`px-1.5 py-0.5 rounded transition-colors ${
                    anchorPlacement === 'end' ? 'bg-zinc-800 text-zinc-100 font-semibold' : 'hover:text-zinc-300'
                  }`}
                  title="Place locked words at the end of generated phrases"
                >
                  Trail
                </button>
              </div>
            </div>
          </div>

          {placedWords.length > 0 && (
            <div className="space-y-2 bg-zinc-950/60 p-3 rounded-lg border border-zinc-800/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-zinc-300">
                    Locked Word Order ({placedWords.length})
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono hidden sm:inline">
                    (Drag or use arrows to change sequence)
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {placedWords.length > 1 && (
                    <>
                      <button
                        onClick={handleReversePlacedWords}
                        className="text-[11px] font-mono text-zinc-400 hover:text-zinc-200 px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 flex items-center gap-1 transition-colors"
                        title="Reverse entire word chain order"
                      >
                        <ArrowLeftRight className="w-3 h-3" /> Reverse
                      </button>
                      <button
                        onClick={handleShufflePlacedWords}
                        className="text-[11px] font-mono text-zinc-400 hover:text-zinc-200 px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 flex items-center gap-1 transition-colors"
                        title="Shuffle word chain order"
                      >
                        <Shuffle className="w-3 h-3" /> Shuffle
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => {
                      setPlacedWords([]);
                      soundFX.playPop();
                    }}
                    className="text-[11px] font-mono text-zinc-500 hover:text-rose-400 px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 flex items-center gap-1 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" /> Clear
                  </button>
                </div>
              </div>

              {/* Draggable & Arrow-Controlled Word Chain */}
              <div className="flex flex-wrap gap-2 items-center pt-1">
                {placedWords.map((word, idx) => {
                  const isFirst = idx === 0;
                  const isLast = idx === placedWords.length - 1;
                  const isDragging = draggedPlacedIndex === idx;

                  return (
                    <div key={`${word}_${idx}`} className="flex items-center gap-1.5">
                      <div
                        draggable
                        onDragStart={e => {
                          e.dataTransfer.setData('text/plain', idx.toString());
                          setDraggedPlacedIndex(idx);
                        }}
                        onDragOver={e => {
                          e.preventDefault();
                        }}
                        onDrop={e => {
                          e.preventDefault();
                          const fromStr = e.dataTransfer.getData('text/plain');
                          const fromIdx = parseInt(fromStr, 10);
                          if (!isNaN(fromIdx)) {
                            handleMovePlacedWord(fromIdx, idx);
                          }
                          setDraggedPlacedIndex(null);
                        }}
                        onDragEnd={() => setDraggedPlacedIndex(null)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded bg-zinc-850 border border-zinc-700 text-zinc-100 font-mono text-xs shadow-xs select-none transition-all cursor-grab active:cursor-grabbing group ${
                          isDragging ? 'opacity-40 border-dashed border-zinc-400 bg-zinc-800' : 'hover:border-zinc-500'
                        }`}
                        title="Drag to reposition, or use left/right arrows"
                      >
                        <GripVertical className="w-3 h-3 text-zinc-500 group-hover:text-zinc-300 shrink-0" />
                        <span className="text-[10px] text-zinc-500 font-bold mr-0.5">{idx + 1}.</span>

                        {/* Move Left Button */}
                        {!isFirst && (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              handleMovePlacedWordLeft(idx);
                            }}
                            className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-750 p-0.5 rounded transition-colors"
                            title={`Move "${word}" earlier in sentence`}
                            aria-label={`Move "${word}" left`}
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <span className="font-semibold text-zinc-100 px-0.5">{word}</span>

                        {/* Move Right Button */}
                        {!isLast && (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              handleMovePlacedWordRight(idx);
                            }}
                            className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-750 p-0.5 rounded transition-colors"
                            title={`Move "${word}" later in sentence`}
                            aria-label={`Move "${word}" right`}
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Trash Button */}
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setPlacedWords(prev => prev.filter((_, i) => i !== idx));
                            soundFX.playPop();
                          }}
                          className="text-zinc-400 hover:text-rose-400 p-0.5 rounded transition-colors ml-0.5"
                          title={`Remove "${word}" from chain`}
                          aria-label={`Remove "${word}"`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>

                      {idx < placedWords.length - 1 && (
                        <ChevronRight className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {remainingLetterCount > 0 && validNextWords.length > 0 && (
            <div className="space-y-2.5 pt-2 border-t border-zinc-850">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs font-medium text-zinc-400">
                  Suggested Next Words (Click to add {insertDirection === 'start' ? 'to start' : 'to end'})
                </span>

                {/* Filter and length toggle */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative">
                    <input
                      type="text"
                      value={nextWordFilter}
                      onChange={e => setNextWordFilter(e.target.value)}
                      placeholder="Search words..."
                      className="bg-zinc-950 border border-zinc-800 rounded px-2 py-0.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 font-mono w-28 sm:w-32"
                    />
                    {nextWordFilter && (
                      <button
                        onClick={() => setNextWordFilter('')}
                        className="absolute right-1 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-[10px] px-1"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-[11px] font-mono">
                    {(['all', 'short', 'medium', 'long'] as const).map(l => (
                      <button
                        key={l}
                        onClick={() => setNextWordLengthFilter(l)}
                        className={`px-1.5 py-0.5 rounded capitalize transition-colors ${
                          nextWordLengthFilter === l
                            ? 'bg-zinc-800 text-zinc-100 border border-zinc-700 font-semibold'
                            : 'bg-zinc-950 text-zinc-500 hover:text-zinc-300 border border-zinc-850'
                        }`}
                      >
                        {l === 'all' ? 'All' : l === 'short' ? '≤3' : l === 'medium' ? '4-6' : '7+'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {filteredNextWords.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                  {filteredNextWords.slice(0, 45).map(item => (
                    <button
                      key={item.word}
                      onClick={() => handleLockWord(item.word)}
                      className="px-2.5 py-1 rounded text-[11px] font-mono transition-colors flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 hover:border-zinc-600 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-900"
                      title={`${item.length} letters, ${Math.round(item.score)} pts. Click to add to word chain.`}
                    >
                      <span>{item.word}</span>
                      {item.isExactFinal && (
                        <span className="text-[9px] px-1 bg-emerald-950 text-emerald-400 rounded border border-emerald-800 font-sans font-medium">
                          Exact
                        </span>
                      )}
                    </button>
                  ))}
                  {filteredNextWords.length > 45 && (
                    <span className="text-[11px] font-mono text-zinc-500 self-center px-1">
                      +{filteredNextWords.length - 45} more
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-xs font-mono text-zinc-500 py-1">
                  No matching words for filter &quot;{nextWordFilter}&quot;
                </p>
              )}
            </div>
          )}
        </div>
      </section>
      {/* Results Header */}
      <section className="space-y-3 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm font-semibold text-zinc-200">Exact Anagram Results</h2>
            {results.length > 0 && (
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                {results.length.toLocaleString()}
              </span>
            )}
            {patternFilter && (
              <span className="text-xs font-mono text-zinc-400">
                (filtered by &quot;{patternFilter}&quot;)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {exportNotice && (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 animate-in fade-in duration-200">
                {exportNotice}
              </span>
            )}
            {results.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={handleCopyAllResults}
                  className="px-2 py-1 bg-zinc-950 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 border border-zinc-800 rounded text-xs font-mono flex items-center gap-1 transition-colors"
                  title="Copy all filtered results to clipboard"
                >
                  {copiedAllNotice ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-zinc-400" /> Copy All
                    </>
                  )}
                </button>
                <button
                  onClick={handleExportJSON}
                  aria-label="Export results to JSON file"
                  className="px-2 py-1 bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 rounded text-xs font-mono flex items-center gap-1 transition-colors"
                  title="Export results to JSON"
                >
                  <Download className="w-3 h-3" /> JSON
                </button>
                <button
                  onClick={handleExportText}
                  aria-label="Export results to TXT file"
                  className="px-2 py-1 bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 rounded text-xs font-mono flex items-center gap-1 transition-colors"
                  title="Export results to Text"
                >
                  <Download className="w-3 h-3" /> TXT
                </button>
              </div>
            )}
            <span className="text-xs font-mono text-zinc-500">{searchStatus}</span>
          </div>
        </div>

        {/* In-Results Search & Sorting Toolbar */}
        {results.length > 0 && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-2 rounded-lg bg-zinc-950 border border-zinc-850">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={resultSearchQuery}
                onChange={e => {
                  setResultSearchQuery(e.target.value);
                  setVisibleCount(40);
                }}
                placeholder="Filter results by any word or phrase..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded pl-8 pr-7 py-1 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 font-mono"
              />
              {resultSearchQuery && (
                <button
                  onClick={() => setResultSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-xs"
                >
                  ×
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-zinc-500 flex items-center gap-1">
                <ArrowDownAZ className="w-3.5 h-3.5 text-zinc-400" />
                Sort:
              </span>
              <select
                value={resultSort}
                onChange={e => setResultSort(e.target.value as any)}
                className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-zinc-600 font-mono"
              >
                <option value="score">Natural Score (Best First)</option>
                <option value="fewest-words">Fewest Words First</option>
                <option value="most-words">Most Words First</option>
                <option value="alpha">Alphabetical (A → Z)</option>
              </select>
            </div>
          </div>
        )}

        {isSearching && (
          <div className="w-full bg-zinc-900 rounded-full h-1 overflow-hidden">
            <div
              className="bg-zinc-300 h-1 transition-all duration-200"
              style={{ width: `${searchProgress}%` }}
            />
          </div>
        )}

        {/* Results Grid with Pagination / Show More */}
        {results.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {results.slice(0, visibleCount).map((item, idx) => (
                <AnagramResultCard
                  key={`${item.phrase}_${idx}`}
                  item={item}
                  idx={idx}
                  sourceText={sourceText}
                  onAnimatePhrase={onAnimatePhrase}
                  onVerifyPhrase={target => {
                    setCandidateText(target);
                    setViewMode('matcher');
                    if (onTestLieDetector) onTestLieDetector(target);
                  }}
                  onOpenTiles={target => {
                    setViewMode('tiles');
                    if (externalOnOpenSandbox) externalOnOpenSandbox(target);
                  }}
                  onOpenStoryGenerator={onOpenStoryGenerator}
                  onCopy={handleCopy}
                  isCopied={copiedIndex === idx}
                />
              ))}
            </div>

            {results.length > visibleCount && (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3 pb-1">
                <button
                  type="button"
                  onClick={() => setVisibleCount(prev => prev + 40)}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-200 rounded-lg text-xs font-semibold font-mono transition-colors shadow-xs"
                >
                  Load More (+40) — Showing {visibleCount} of {results.length.toLocaleString()}
                </button>
                <button
                  type="button"
                  onClick={() => setVisibleCount(results.length)}
                  className="text-xs text-zinc-400 hover:text-zinc-200 underline font-mono"
                >
                  Show All ({results.length.toLocaleString()})
                </button>
              </div>
            )}
          </>
        ) : (
          !isSearching && (
            <div className="p-8 rounded-xl bg-zinc-900/30 border border-zinc-850 text-center space-y-2">
              <p className="text-sm font-medium text-zinc-300">
                {resultSearchQuery ? `No anagrams matched "${resultSearchQuery}"` : 'No exact anagrams found'}
              </p>
              <p className="text-xs text-zinc-500 max-w-md mx-auto">
                {resultSearchQuery
                  ? 'Try clearing the search query or adjusting your vocabulary depth in Advanced Settings.'
                  : 'Try exploring individual single dictionary sub-words, or use the interactive sandbox to build custom letter combinations.'}
              </p>
            </div>
          )
        )}
      </section>
      </>
    )}
    </div>
  );
};
