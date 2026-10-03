import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Sparkles,
  Layers,
  Zap,
  ArrowRight,
  ShieldCheck,
  Play,
  Pause,
  RotateCcw,
} from 'lucide-react';
import type { AnagramResult, SolveMetrics, POS } from './engine/types';
import type { SplitDetent, WordFilterMode } from './types/split';
import { SplitDetents } from './types/split';
import { NameAnagramStage } from './components/NameAnagramStage';
import { TargetHistogramWindow } from './components/TargetHistogramWindow';
import { CandidateWordsList, type LexicalViewMode } from './components/CandidateWordsList';
import { ThreePaneSplit } from './components/ThreePaneSplit';
import { useProgressBus } from './hooks/useProgressBus';
import { useAnagramDelta } from './hooks/useAnagramDelta';
import { useVisualViewport } from './hooks/useVisualViewport';
import { useAnagramSolver } from './hooks/useAnagramSolver';
import { useAnchorPinning } from './hooks/useAnchorPinning';
import { useHaptics } from './hooks/useHaptics';

export function App() {
  const [sourceName, setSourceName] = useState<string>('AARON LOREZNO WOODS');
  const [allowSpicy] = useState<boolean>(true);

  // Toast notifier (disabled per clean UI guidelines)
  const showToast = useCallback((_text: string, _type: 'success' | 'info' | 'error' = 'info') => {
    // Telemetry / toasts disabled
  }, []);

  // Anchor and word-pinning controller hook
  const {
    filterText,
    setFilterText,
    isAnchorPinned,
    setIsAnchorPinned,
    togglePinWord: handleTogglePinWord,
  } = useAnchorPinning({
    onNotification: (msg, type) => showToast(msg, type),
  });

  // Stage animation state (strictly user-controlled via divider slider, no auto-moving)
  const progressBus = useProgressBus(0);

  // Dedicated solver hook extracting Web Worker lifecycle & debounced execution
  const {
    results,
    setResults,
    metrics,
    isSolving,
    targetPhrase,
    setTargetPhrase,
  } = useAnagramSolver({
    sourceName,
    filterText,
    isAnchorPinned,
    allowSpicy,
    onError: (err) => showToast(err, 'error'),
  });

  const handleSourceNameChange = useCallback((name: string) => {
    setSourceName(name);
    setSelectedLengthFilter(null);
    if (!name.trim()) {
      setTargetPhrase('');
    }
  }, []);

  const handleAnimatePhrase = useCallback((phrase: string) => {
    setTargetPhrase(phrase);
    progressBus.set(0);
  }, [progressBus]);

  // Handle reordering or editing phrases from cards
  const handleUpdatePhrase = useCallback((oldPhrase: string, newPhrase: string) => {
    const trimmed = newPhrase.trim();
    setResults(prev => prev.map(item => {
      if (item.phrase === oldPhrase) {
        const words = trimmed.split(/\s+/).filter(Boolean);
        return {
          ...item,
          phrase: trimmed,
          words,
        };
      }
      return item;
    }));
    setTargetPhrase(trimmed);
    progressBus.set(0);
  }, [progressBus]);

  const [selectedLengthFilter, setSelectedLengthFilter] = useState<number[] | null>(null);
  const [selectedPosFilter, setSelectedPosFilter] = useState<POS | 'all' | null>(null);

  // Reactive multiset delta & construction state (Source \ Target)
  const {
    remainingLetters,
    surplusLetters,
    isExactMatch,
    candidateWords,
    histogramData,
    exactClosers,
    finisherPairs,
    solvableWordsCount,
    deadEndWordsCount,
    budget,
    getAppendedPhrase,
  } = useAnagramDelta(sourceName, targetPhrase);

  // Track dynamic visual viewport height to prevent keyboard from pushing UI out of view
  const { viewportHeight, isKeyboardOpen } = useVisualViewport();

  // Physical tactile haptic feedback
  const haptics = useHaptics();

  const handleAddWordToTarget = useCallback((word: string) => {
    haptics.wordAdded();
    setTargetPhrase(prev => getAppendedPhrase(prev, word));
    progressBus.set(0);
  }, [getAppendedPhrase, progressBus, haptics]);

  const handleRemoveLastWord = useCallback(() => {
    haptics.wordRemoved();
    setTargetPhrase(prev => {
      const words = prev.trim().split(/\s+/);
      if (words.length <= 1) return '';
      words.pop();
      return words.join(' ');
    });
    progressBus.set(0);
  }, [progressBus, haptics]);

  const handleSetWordAsTarget = useCallback((word: string) => {
    haptics.medium();
    setTargetPhrase(word.toUpperCase());
    progressBus.set(0);
  }, [progressBus, haptics]);

  // Physical celebration haptics when 100% exact solve match is achieved
  const wasSolvedRef = useRef<boolean>(false);
  useEffect(() => {
    if (isExactMatch && !wasSolvedRef.current) {
      haptics.solved();
    }
    wasSolvedRef.current = Boolean(isExactMatch);
  }, [isExactMatch, haptics]);

  // Hoisted Complication State for Main Horizontal Divider & Word Explorer
  const [inspectorCategory, setInspectorCategory] = useState<'length' | 'pos'>('length');
  const [lexicalViewMode, setLexicalViewMode] = useState<LexicalViewMode>('treemap');
  const [avoidDeadEnds, setAvoidDeadEnds] = useState<boolean>(true);
  const [showGraphPanel, setShowGraphPanel] = useState<boolean>(true);
  const [showInspectorPanel, setShowInspectorPanel] = useState<boolean>(true);

  // 3-Way Explorer View Mode: Graph (One view) -> Inspector (Two views) -> Both (Together)
  const explorerViewMode = useMemo<'both' | 'graph' | 'inspector'>(() => {
    if (showGraphPanel && showInspectorPanel) return 'both';
    if (showGraphPanel) return 'graph';
    return 'inspector';
  }, [showGraphPanel, showInspectorPanel]);

  const handleCycleExplorerView = useCallback(() => {
    haptics.light();
    if (showGraphPanel && showInspectorPanel) {
      // Both -> Graph only (One view)
      setShowGraphPanel(true);
      setShowInspectorPanel(false);
    } else if (showGraphPanel && !showInspectorPanel) {
      // Graph -> Inspector only (Second view)
      setShowGraphPanel(false);
      setShowInspectorPanel(true);
    } else {
      // Inspector -> Both together
      setShowGraphPanel(true);
      setShowInspectorPanel(true);
    }
  }, [showGraphPanel, showInspectorPanel, haptics]);

  const handleToggleGraphPanel = useCallback(() => {
    handleCycleExplorerView();
  }, [handleCycleExplorerView]);

  const handleToggleInspectorPanel = useCallback(() => {
    handleCycleExplorerView();
  }, [handleCycleExplorerView]);

  // Stage Playback & Mode Controller
  const [isStagePlaying, setIsStagePlaying] = useState<boolean>(false);
  const handleToggleStagePlay = useCallback(() => {
    setIsStagePlaying((prev) => {
      const next = !prev;
      if (next && progressBus.get() >= 0.99) {
        progressBus.set(0);
      }
      return next;
    });
  }, [progressBus]);

  const handleResetStage = useCallback(() => {
    setIsStagePlaying(false);
    progressBus.set(0);
  }, [progressBus]);

  // Split-pane layout detent state
  const [splitDetent, setSplitDetent] = useState<SplitDetent>(SplitDetents.balanced);

  // Word Explorer Multi-Mode Filter (Safe, All, Closers, Pairs, Common, Long)
  const [wordFilterMode, setWordFilterMode] = useState<WordFilterMode>('safe');

  const availableModes = useMemo((): WordFilterMode[] => {
    const list: WordFilterMode[] = ['safe', 'all'];
    if (exactClosers && exactClosers.length > 0) {
      list.push('closers');
    }
    if (finisherPairs && finisherPairs.length > 0) {
      list.push('pairs');
    }
    list.push('common');
    list.push('long');
    return list;
  }, [exactClosers, finisherPairs]);

  const handleCycleWordFilter = useCallback(() => {
    haptics.light();
    setWordFilterMode((prev) => {
      const idx = availableModes.indexOf(prev);
      const nextIdx = (idx + 1) % availableModes.length;
      const nextMode = availableModes[nextIdx];
      if (nextMode === 'all') {
        setAvoidDeadEnds(false);
      } else {
        setAvoidDeadEnds(true);
      }
      return nextMode;
    });
  }, [availableModes, haptics]);

  // Global Keyboard Navigation Shortcuts (Space, R, 1, 2, 3, G, I, S, Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        handleToggleStagePlay();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handleResetStage();
      } else if (e.key === '1') {
        e.preventDefault();
        setSplitDetent(SplitDetents.focusTop);
      } else if (e.key === '2') {
        e.preventDefault();
        setSplitDetent(SplitDetents.balanced);
      } else if (e.key === '3') {
        e.preventDefault();
        setSplitDetent(SplitDetents.focusBottom);
      } else if (e.key === 'v' || e.key === 'V' || e.key === 'g' || e.key === 'G' || e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        handleCycleExplorerView();
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        handleCycleWordFilter();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setSplitDetent(SplitDetents.balanced);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handleToggleStagePlay,
    handleResetStage,
    handleToggleGraphPanel,
    handleToggleInspectorPanel,
    handleCycleWordFilter,
  ]);

  const effectiveCandidateWords = useMemo(() => {
    if (wordFilterMode === 'closers' && exactClosers && exactClosers.length > 0) {
      const closerSet = new Set(exactClosers.map(c => c.toLowerCase()));
      const filtered = candidateWords.filter(w => closerSet.has(w.word.toLowerCase()));
      return filtered.length > 0 ? filtered : candidateWords;
    }
    if (wordFilterMode === 'pairs' && finisherPairs && finisherPairs.length > 0) {
      const pairSet = new Set<string>();
      for (const p of finisherPairs) {
        pairSet.add(p.word1.toLowerCase());
        pairSet.add(p.word2.toLowerCase());
      }
      const filtered = candidateWords.filter(w => pairSet.has(w.word.toLowerCase()));
      return filtered.length > 0 ? filtered : candidateWords;
    }
    if (wordFilterMode === 'common') {
      const filtered = candidateWords.filter(w => (w.freq || 0) >= 0.55);
      return filtered.length > 0 ? filtered : candidateWords;
    }
    if (wordFilterMode === 'long') {
      const filtered = candidateWords.filter(w => w.length >= 5);
      return filtered.length > 0 ? filtered : candidateWords;
    }
    return candidateWords;
  }, [wordFilterMode, exactClosers, finisherPairs, candidateWords]);

  const countsByMode = useMemo(() => {
    const commonCount = candidateWords.filter(w => (w.freq || 0) >= 0.55 && (avoidDeadEnds ? w.isSolvable !== false : true)).length;
    const longCount = candidateWords.filter(w => w.length >= 5 && (avoidDeadEnds ? w.isSolvable !== false : true)).length;
    const pairWordSet = new Set<string>();
    if (finisherPairs) {
      for (const p of finisherPairs) {
        pairWordSet.add(p.word1.toLowerCase());
        pairWordSet.add(p.word2.toLowerCase());
      }
    }
    return {
      safe: solvableWordsCount || candidateWords.length,
      all: candidateWords.length,
      closers: exactClosers?.length || 0,
      pairs: pairWordSet.size || finisherPairs?.length || 0,
      common: commonCount,
      long: longCount,
    };
  }, [candidateWords, solvableWordsCount, exactClosers, finisherPairs, avoidDeadEnds]);

  // Derived solve progress metrics for Top Mini Overlay (MapsExample Idea 1: Live Status)
  const sourceLettersOnly = sourceName.replace(/[^a-zA-Z]/g, '');
  const sourceLetterCount = sourceLettersOnly.length;
  const placedLetterCount = Math.max(0, sourceLetterCount - remainingLetters.length);
  const solveProgressPercent =
    sourceLetterCount > 0
      ? Math.min(100, Math.round((placedLetterCount / sourceLetterCount) * 100))
      : 0;

  // Track solver results discovery to trigger subtle status glow on the main divider
  const [justFoundResults, setJustFoundResults] = useState<boolean>(false);
  const prevResultsCountRef = useRef<number>(results.length);

  useEffect(() => {
    // When results update with candidate anagrams and solver finishes
    if (results.length > 0 && results.length !== prevResultsCountRef.current && !isSolving) {
      setJustFoundResults(true);
      const timer = setTimeout(() => {
        setJustFoundResults(false);
      }, 1800);
      return () => clearTimeout(timer);
    }
    prevResultsCountRef.current = results.length;
  }, [results, isSolving]);

  // Immediate next recommended closer/action for Bottom Mini Overlay (MapsExample Idea 1: Next Action)
  const nextRecommendedCloser = exactClosers && exactClosers.length > 0 ? exactClosers[0] : null;
  const nextRecommendedPair = finisherPairs && finisherPairs.length > 0 ? finisherPairs[0] : null;

  return (
    <div
      style={{
        height: `${viewportHeight}px`,
        maxHeight: `${viewportHeight}px`,
      }}
      className="w-full bg-[#09090b] text-[#f4f4f5] flex flex-col overflow-hidden p-1 selection:bg-zinc-800 selection:text-white fixed inset-0"
    >
      {/* Unified 3-Pane Window Split */}
      <ThreePaneSplit
        className="flex-1 w-full h-full min-h-0"
        detent={splitDetent}
        onDetentChange={setSplitDetent}
        isStageActive={Boolean(sourceName.trim())}
        isKeyboardOpen={isKeyboardOpen}
        progressBus={progressBus}
        // Real-time Solver Indicator State on Main Divider
        isSolving={isSolving}
        justFoundResults={justFoundResults}
        // Stage Informative Complications
        isStagePlaying={isStagePlaying}
        onToggleStagePlay={handleToggleStagePlay}
        onResetStage={handleResetStage}
        solveProgressPercent={solveProgressPercent}
        placedLetterCount={placedLetterCount}
        sourceLetterCount={sourceLetterCount}
        remainingLettersCount={remainingLetters.length}
        // Explorer Informative Complications
        inspectorCategory={inspectorCategory}
        onInspectorCategoryChange={setInspectorCategory}
        lexicalViewMode={lexicalViewMode}
        onLexicalViewModeChange={setLexicalViewMode}
        avoidDeadEnds={avoidDeadEnds}
        onAvoidDeadEndsChange={setAvoidDeadEnds}
        candidateWordsCount={candidateWords.length}
        exactClosersCount={exactClosers?.length || 0}
        finisherPairsCount={finisherPairs?.length || 0}
        solvableWordsCount={solvableWordsCount}
        wordFilterMode={wordFilterMode}
        onCycleWordFilter={handleCycleWordFilter}
        countsByMode={countsByMode}
        explorerViewMode={explorerViewMode}
        onCycleExplorerView={handleCycleExplorerView}
        showGraphPanel={showGraphPanel}
        onToggleGraphPanel={handleToggleGraphPanel}
        showInspectorPanel={showInspectorPanel}
        onToggleInspectorPanel={handleToggleInspectorPanel}
        /* WINDOW 1: TOP KINETIC ANAGRAM STAGE */
        card1={
          sourceName.trim() ? (
            <NameAnagramStage
              sourceName={sourceName}
              targetPhrase={targetPhrase}
              progressBus={progressBus}
              onShowToast={showToast}
              isPlaying={isStagePlaying}
              onTogglePlay={handleToggleStagePlay}
              onReset={handleResetStage}
            />
          ) : null
        }
        /* IDLE PEEK 1: Minimized Stage Peek (Clean, Centered & Minimal) */
        card1Idle={
          <div className="flex items-center justify-center w-full h-full min-w-0 px-3 gap-2.5 sm:gap-3 select-none text-zinc-300">
            {/* Center: Source or Target phrase with placement count */}
            <span className="font-mono text-xs tracking-wider text-zinc-100 truncate uppercase font-semibold">
              {targetPhrase.trim() ? targetPhrase : sourceName}
            </span>
            <span className="text-zinc-600">·</span>
            <span className="font-mono text-[11px] text-zinc-400 tabular-nums shrink-0">
              {placedLetterCount}/{sourceLetterCount} placed
            </span>
            {isExactMatch ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 shrink-0">
                <Sparkles className="w-3 h-3 text-emerald-400" /> Solved
              </span>
            ) : (
              <>
                <span className="text-zinc-600 hidden sm:inline">·</span>
                <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                  <div className="w-12 md:w-16 h-1 bg-zinc-800 rounded-full overflow-hidden shrink-0">
                    <div
                      className="h-full bg-zinc-400 rounded-full transition-all duration-300"
                      style={{ width: `${solveProgressPercent}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500 tabular-nums">
                    {solveProgressPercent}%
                  </span>
                </div>
              </>
            )}
          </div>
        }
        /* WINDOW 2: MIDDLE TARGET WORD, CONTROLS & STATUS */
        card2={
          <TargetHistogramWindow
            sourceText={sourceName}
            onSourceNameChange={handleSourceNameChange}
            targetPhrase={targetPhrase}
            onTargetPhraseChange={setTargetPhrase}
            progressBus={progressBus}
            remainingLetters={remainingLetters}
            isExactMatch={isExactMatch}
            onShowToast={showToast}
            exactClosers={exactClosers}
            finisherPairs={finisherPairs}
            solvableWordsCount={solvableWordsCount}
            deadEndWordsCount={deadEndWordsCount}
            onAddWordToTarget={handleAddWordToTarget}
            onRemoveLastWord={handleRemoveLastWord}
          />
        }
        /* WINDOW 3: BOTTOM GRAPH VIEW + HISTOGRAM SIDEBAR */
        card3={
          sourceName.trim() && !isExactMatch ? (
            <CandidateWordsList
              sourceText={sourceName}
              candidateWords={effectiveCandidateWords}
              selectedLengthFilter={selectedLengthFilter}
              onSelectLengthFilter={setSelectedLengthFilter}
              onClearLengthFilter={() => setSelectedLengthFilter(null)}
              selectedPosFilter={selectedPosFilter}
              onSelectPosFilter={setSelectedPosFilter}
              histogramData={histogramData}
              onAddWordToTarget={handleAddWordToTarget}
              onSetWordAsTarget={handleSetWordAsTarget}
              activeTargetPhrase={targetPhrase}
              onShowToast={showToast}
              exactClosers={exactClosers}
              finisherPairs={finisherPairs}
              solvableWordsCount={solvableWordsCount}
              deadEndWordsCount={deadEndWordsCount}
              inspectorCategory={inspectorCategory}
              onInspectorCategoryChange={setInspectorCategory}
              lexicalViewMode={lexicalViewMode}
              onLexicalViewModeChange={setLexicalViewMode}
              avoidDeadEnds={avoidDeadEnds}
              onAvoidDeadEndsChange={setAvoidDeadEnds}
              showGraphPanel={showGraphPanel}
              showInspectorPanel={showInspectorPanel}
              wordFilterMode={wordFilterMode}
              countsByMode={countsByMode}
              onCycleWordFilter={handleCycleWordFilter}
            />
          ) : null
        }
        /* IDLE PEEK 3: Minimized Explorer Peek (Centered & Minimal) */
        card3Idle={
          <div className="flex items-center justify-center w-full h-full min-w-0 px-3 gap-2.5 select-none text-zinc-300">
            {nextRecommendedCloser ? (
              <div className="flex items-center gap-1.5 min-w-0 truncate">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-600/60 shrink-0">
                  <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
                  Exact Closer:
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddWordToTarget(nextRecommendedCloser);
                  }}
                  title={`Click to add finishing closer "${nextRecommendedCloser}"`}
                  className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/50 hover:border-amber-400 transition-colors cursor-pointer truncate shadow-xs"
                >
                  +{nextRecommendedCloser}
                </button>
              </div>
            ) : nextRecommendedPair ? (
              <div className="flex items-center gap-1.5 min-w-0 truncate">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-950/80 text-indigo-300 border border-indigo-700/60 shrink-0">
                  Pair:
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddWordToTarget(nextRecommendedPair.word1);
                  }}
                  title={`Click to add "${nextRecommendedPair.word1}"`}
                  className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 hover:border-zinc-500 transition-colors cursor-pointer truncate shadow-xs"
                >
                  +{nextRecommendedPair.word1}
                </button>
                <span className="text-zinc-500 text-xs">+</span>
                <span className="text-zinc-400 text-[10px] font-mono truncate">{nextRecommendedPair.word2}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 min-w-0 truncate">
                <span className="font-mono text-[11px] text-zinc-400 shrink-0">
                  {candidateWords.length} words available
                </span>
                {/* Quick-add candidate word preview chips */}
                <div className="hidden sm:flex items-center gap-1 min-w-0 overflow-hidden">
                  {candidateWords.slice(0, 3).map((cand) => (
                    <button
                      key={cand.word}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddWordToTarget(cand.word);
                      }}
                      title={`Click to add "${cand.word}" to target phrase`}
                      className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-800/90 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/60 hover:border-zinc-500 transition-colors cursor-pointer truncate max-w-[105px] shadow-xs"
                    >
                      +{cand.word}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        }
      />
    </div>
  );
}

export default App;
