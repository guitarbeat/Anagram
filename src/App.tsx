import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { AnagramResult, SolveMetrics } from './engine/types';
import type { WorkerResponse, WorkerRequest } from './engine/solver.worker';
import { NameAnagramStage } from './components/NameAnagramStage';
import { WordsGraphView } from './components/WordsGraphView';
import { IntegratedLengthFilter } from './components/IntegratedLengthFilter';
import { ContextRail } from './components/ContextRail';
import { useProgressBus } from './hooks/useProgressBus';
import { useAnagramDelta } from './hooks/useAnagramDelta';
import { useVisualViewport } from './hooks/useVisualViewport';
import { usePointerDrag } from './hooks/usePointerDrag';
import {
  Sparkles,
  CheckCircle2,
  X,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export function App() {
  const [sourceName, setSourceName] = useState<string>('');
  const [targetPhrase, setTargetPhrase] = useState<string>('');
  const [filterText, setFilterText] = useState<string>('');
  const [isAnchorPinned, setIsAnchorPinned] = useState<boolean>(false);
  const [allowSpicy] = useState<boolean>(true);

  const [results, setResults] = useState<AnagramResult[]>([]);
  const [_metrics, setMetrics] = useState<SolveMetrics | null>(null);
  const [isSolving, setIsSolving] = useState<boolean>(false);

  // Kinetic Stage visibility toggle
  const [showStage, setShowStage] = useState<boolean>(false);

  // Length filtering
  const [selectedLengthFilter, setSelectedLengthFilter] = useState<number[] | null>(null);

  // Mobile Context Rail sheet state
  const [isMobileRailOpen, setIsMobileRailOpen] = useState<boolean>(false);

  // Desktop Context Rail width with single Pointer Events divider
  const [railWidth, setRailWidth] = useState<number>(380);

  // Stage progress bus
  const progressBus = useProgressBus(0);

  // Visual Viewport for mobile virtual keyboards
  const { viewportHeight } = useVisualViewport();

  // Pointer drag for desktop structural divider between Graph Workspace and Context Rail
  const { isDragging: isDividerDragging, pointerProps: dividerPointerProps } = usePointerDrag({
    onDragMove: (_dx, _dy, currentX) => {
      const containerWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
      const calculatedWidth = containerWidth - currentX;
      setRailWidth(Math.max(280, Math.min(640, calculatedWidth)));
    },
  });

  // Quiet toast helper
  const showToast = useCallback((_text: string, _type: 'success' | 'info' | 'error' = 'info') => {
    // Quiet notifications
  }, []);

  // Web worker reference
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef<number>(0);

  // Initialize Web Worker
  useEffect(() => {
    const worker = new Worker(
      new URL('./engine/solver.worker.ts', import.meta.url),
      { type: 'module' }
    );
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const data = e.data;
      if (data.id !== requestIdRef.current) return;

      setIsSolving(false);

      if (data.error) {
        setResults([]);
        setMetrics(null);
        return;
      }

      if (data.results) {
        setResults(data.results);
        setMetrics(data.metrics);
      }
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  // Debounced solving trigger (200ms debounce)
  useEffect(() => {
    const clean = sourceName.trim();
    if (!clean) {
      setResults([]);
      setMetrics(null);
      setTargetPhrase('');
      setIsSolving(false);
      return;
    }

    setIsSolving(true);
    const reqId = ++requestIdRef.current;

    const debounceTimer = window.setTimeout(() => {
      if (!workerRef.current) return;

      const activeAnchor = isAnchorPinned ? filterText.trim() : undefined;

      const msg: WorkerRequest = {
        id: reqId,
        opts: {
          source: clean,
          maxWords: clean.replace(/[^a-z]/gi, '').length >= 16 ? 5 : 4,
          resultLimit: 5000,
          allowSpicy,
          anchorText: activeAnchor || undefined,
          anchorPlacement: 'natural',
        },
      };

      workerRef.current.postMessage(msg);
    }, 200);

    return () => {
      window.clearTimeout(debounceTimer);
    };
  }, [sourceName, isAnchorPinned, filterText, allowSpicy]);

  // Multiset Delta Engine (Source \ Target)
  const {
    remainingLetters,
    surplusLetters,
    isExactMatch,
    candidateWords,
    histogramData,
    exactClosers,
    budget,
  } = useAnagramDelta(sourceName, targetPhrase);

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

  const handleTogglePinWord = useCallback((word: string) => {
    const cleanWord = word.trim();
    if (!cleanWord) return;

    const currentPinnedWords = (isAnchorPinned && filterText.trim())
      ? filterText.split(/[\s,]+/).map(w => w.trim()).filter(Boolean)
      : [];

    const wordLower = cleanWord.toLowerCase();
    const exists = currentPinnedWords.some(w => w.toLowerCase() === wordLower);

    let newPinnedWords: string[];
    if (exists) {
      newPinnedWords = currentPinnedWords.filter(w => w.toLowerCase() !== wordLower);
    } else {
      newPinnedWords = [...currentPinnedWords, cleanWord];
    }

    if (newPinnedWords.length === 0) {
      setFilterText('');
      setIsAnchorPinned(false);
    } else {
      setFilterText(newPinnedWords.join(', '));
      setIsAnchorPinned(true);
    }
  }, [isAnchorPinned, filterText]);

  const pinnedWordsSet = useMemo(() => {
    if (!isAnchorPinned || !filterText.trim()) return new Set<string>();
    return new Set(filterText.split(/[\s,]+/).map(w => w.toLowerCase()).filter(Boolean));
  }, [isAnchorPinned, filterText]);

  const handleAddWordToTarget = useCallback((word: string) => {
    setTargetPhrase(prev => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed} ${word.toUpperCase()}` : word.toUpperCase();
    });
    progressBus.set(0);
  }, [progressBus]);

  const handleSetWordAsTarget = useCallback((word: string) => {
    setTargetPhrase(word.toUpperCase());
    progressBus.set(0);
  }, [progressBus]);

  const hasStageAvailable = Boolean(sourceName.trim() && targetPhrase.trim());

  return (
    <div
      style={{
        height: `${viewportHeight}px`,
        maxHeight: `${viewportHeight}px`,
      }}
      className="w-full bg-[#09090b] text-[#f4f4f5] flex flex-col overflow-hidden fixed inset-0 select-none font-mono"
    >
      {/* ------------------------------------------------------------------- */}
      {/* 1. TOP HEADER: CSS-NATURAL RESIZING SOURCE & TARGET INPUTS + CONTROLS */}
      {/* ------------------------------------------------------------------- */}
      <header className="h-14 sm:h-16 bg-[#09090b] border-b border-zinc-800 px-3 sm:px-4 flex items-center justify-between gap-2.5 sm:gap-3 shrink-0 z-30">
        {/* Brand / Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs sm:text-sm font-mono font-extrabold uppercase tracking-widest text-zinc-100">
            ANAGRAM
          </span>
        </div>

        {/* Natural CSS-Resizing Dual Input Pair (NO Draggable Divider!) */}
        <div className="flex-1 flex items-center gap-2 min-w-0 max-w-4xl">
          {/* Source Input */}
          <div className="relative flex-1 min-w-[100px] sm:min-w-[130px] h-9 sm:h-10 bg-[#121216] border border-zinc-800 focus-within:border-zinc-500 rounded-lg px-2.5 flex items-center transition-colors">
            <input
              type="text"
              value={sourceName}
              onChange={e => handleSourceNameChange(e.target.value.toUpperCase())}
              placeholder="SOURCE PHRASE..."
              className="w-full bg-transparent text-white font-mono font-bold text-xs sm:text-sm uppercase tracking-wider outline-none placeholder-zinc-500 select-text"
              autoComplete="off"
              spellCheck="false"
            />
            {sourceName && (
              <button
                type="button"
                onClick={() => {
                  handleSourceNameChange('');
                  setTargetPhrase('');
                }}
                className="text-zinc-500 hover:text-white p-1 shrink-0"
                title="Clear source phrase"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Target Input */}
          <div
            className={`relative flex-1 min-w-[100px] sm:min-w-[130px] h-9 sm:h-10 bg-[#121216] border rounded-lg px-2.5 flex items-center transition-colors ${
              isExactMatch
                ? 'border-emerald-500 bg-emerald-950/20'
                : surplusLetters.length > 0
                  ? 'border-rose-600 bg-rose-950/20'
                  : 'border-zinc-800 focus-within:border-zinc-500'
            }`}
          >
            <input
              type="text"
              value={targetPhrase}
              onChange={e => setTargetPhrase(e.target.value.toUpperCase())}
              placeholder="REMIX / TARGET..."
              className="w-full bg-transparent font-mono font-bold text-xs sm:text-sm uppercase tracking-wider outline-none placeholder-zinc-500 select-text text-white"
              autoComplete="off"
              spellCheck="false"
            />
            {targetPhrase && (
              <button
                type="button"
                onClick={() => setTargetPhrase('')}
                className="text-zinc-500 hover:text-white p-1 shrink-0"
                title="Clear target phrase"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Right Header Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Exact Match Status Badge */}
          {isExactMatch && (
            <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-950 border border-emerald-500/80 text-emerald-300 text-[11px] font-mono font-bold uppercase tracking-wider animate-pulse-glow">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>EXACT</span>
            </div>
          )}

          {/* Kinetic Stage Toggle */}
          {hasStageAvailable && (
            <button
              type="button"
              onClick={() => setShowStage(prev => !prev)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 border transition-colors ${
                showStage
                  ? 'bg-emerald-900/60 border-emerald-500 text-emerald-200'
                  : 'bg-zinc-800/80 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
              }`}
              title="Toggle Kinetic Letter Morph Stage"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">STAGE</span>
              {showStage ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}

          {/* Mobile Context Rail Drawer Toggle */}
          <button
            type="button"
            onClick={() => setIsMobileRailOpen(prev => !prev)}
            className="md:hidden px-2.5 py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-xs font-mono font-bold text-zinc-200 flex items-center gap-1.5 hover:bg-zinc-700 transition-colors"
            title="Open Results / Context Rail"
          >
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span>{results.length > 0 ? results.length : 'PANEL'}</span>
          </button>
        </div>
      </header>

      {/* ------------------------------------------------------------------- */}
      {/* 2. OPTIONAL EXPANDABLE KINETIC STAGE DECK (Letter Morph Animation) */}
      {/* ------------------------------------------------------------------- */}
      {hasStageAvailable && showStage && (
        <section
          aria-label="Kinetic Stage"
          className="w-full h-44 sm:h-52 bg-white border-b border-zinc-800 shrink-0 relative overflow-hidden"
        >
          <NameAnagramStage
            sourceName={sourceName}
            targetPhrase={targetPhrase}
            progressBus={progressBus}
            onShowToast={showToast}
          />
        </section>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* 3. MAIN WORKSPACE: WORD GRAPH (LEFT) + CONTEXT RAIL (RIGHT)          */}
      {/* ------------------------------------------------------------------- */}
      <main className="flex-1 w-full min-h-0 flex flex-row items-stretch overflow-hidden relative">
        {/* PRIMARY WORD GRAPH WORKSPACE */}
        <section
          aria-label="Word Graph Workspace"
          className="flex-1 h-full min-w-0 flex flex-col bg-white overflow-hidden relative"
        >
          {/* 2D Canvas Word Graph */}
          <div className="flex-1 w-full min-h-0 relative">
            <WordsGraphView
              sourceText={sourceName}
              candidateWords={candidateWords}
              selectedLengthFilter={selectedLengthFilter}
              onAddWordToTarget={handleAddWordToTarget}
              onSetWordAsTarget={handleSetWordAsTarget}
              activeTargetPhrase={targetPhrase}
              onShowToast={showToast}
              exactClosers={exactClosers}
              remainingLetters={remainingLetters}
              onSelectLengthFilter={setSelectedLengthFilter}
            />
          </div>

          {/* Integrated Word-Length & Density Filter Strip (Directly at Base of Graph) */}
          <IntegratedLengthFilter
            histogramData={histogramData}
            selectedLengthFilter={selectedLengthFilter}
            onSelectLengthFilter={setSelectedLengthFilter}
            onClearLengthFilter={() => setSelectedLengthFilter(null)}
            exactClosers={exactClosers}
            totalCandidateCount={candidateWords.length}
          />
        </section>

        {/* SINGLE DRAGGABLE STRUCTURAL DIVIDER (DESKTOP ONLY) */}
        <div
          role="separator"
          aria-orientation="vertical"
          {...dividerPointerProps}
          title="Drag to resize Context Rail"
          className={`hidden md:flex w-2 hover:w-2.5 bg-[#09090b] hover:bg-emerald-500/30 cursor-col-resize shrink-0 z-20 items-center justify-center transition-all ${
            isDividerDragging ? 'bg-emerald-500/40 w-2.5' : ''
          }`}
        >
          <div className="w-[1px] h-8 bg-zinc-700/80 rounded" />
        </div>

        {/* CONTEXT RAIL (DESKTOP) */}
        <div
          style={{ width: `${railWidth}px` }}
          className="hidden md:flex h-full shrink-0 flex-col overflow-hidden"
        >
          <ContextRail
            sourceText={sourceName}
            targetPhrase={targetPhrase}
            results={results}
            isSolving={isSolving}
            candidateWords={candidateWords}
            exactClosers={exactClosers}
            remainingLetters={remainingLetters}
            surplusLetters={surplusLetters}
            budget={budget}
            onAnimatePhrase={handleAnimatePhrase}
            onUpdatePhrase={handleUpdatePhrase}
            onTogglePinWord={handleTogglePinWord}
            onAddWordToTarget={handleAddWordToTarget}
            onSetWordAsTarget={handleSetWordAsTarget}
            pinnedWordsSet={pinnedWordsSet}
            onShowToast={showToast}
          />
        </div>

        {/* CONTEXT RAIL OVERLAY / BOTTOM-SHEET (MOBILE) */}
        {isMobileRailOpen && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm md:hidden">
            <div
              className="w-full h-[72vh] max-h-[640px] rounded-t-2xl overflow-hidden shadow-2xl flex flex-col bg-[#0f0f12] border-t border-zinc-700 animate-fade-in-up"
            >
              {/* Drag Handle Bar */}
              <div className="w-full py-1.5 flex justify-center bg-[#121216] cursor-pointer" onClick={() => setIsMobileRailOpen(false)}>
                <div className="w-10 h-1 rounded-full bg-zinc-600" />
              </div>

              <div className="flex-1 min-h-0">
                <ContextRail
                  sourceText={sourceName}
                  targetPhrase={targetPhrase}
                  results={results}
                  isSolving={isSolving}
                  candidateWords={candidateWords}
                  exactClosers={exactClosers}
                  remainingLetters={remainingLetters}
                  surplusLetters={surplusLetters}
                  budget={budget}
                  onAnimatePhrase={handleAnimatePhrase}
                  onUpdatePhrase={handleUpdatePhrase}
                  onTogglePinWord={handleTogglePinWord}
                  onAddWordToTarget={handleAddWordToTarget}
                  onSetWordAsTarget={handleSetWordAsTarget}
                  pinnedWordsSet={pinnedWordsSet}
                  onShowToast={showToast}
                  onCloseMobile={() => setIsMobileRailOpen(false)}
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
