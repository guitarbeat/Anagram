import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { AnagramResult, SolveMetrics } from './engine/types';
import type { WorkerResponse, WorkerRequest } from './engine/solver.worker';
import { NameAnagramStage } from './components/NameAnagramStage';
import { TargetHistogramWindow } from './components/TargetHistogramWindow';
import { CandidateWordsList } from './components/CandidateWordsList';
import { ThreePaneSplit } from './components/ThreePaneSplit';
import { useProgressBus } from './hooks/useProgressBus';
import { useAnagramDelta } from './hooks/useAnagramDelta';

interface ToastMessage {
  id: string;
  text: string;
  type?: 'success' | 'info' | 'error';
}

export function App() {
  const [sourceName, setSourceName] = useState<string>('');
  const [filterText, setFilterText] = useState<string>('');
  const [isAnchorPinned, setIsAnchorPinned] = useState<boolean>(false);
  const [allowSpicy] = useState<boolean>(true);

  const [results, setResults] = useState<AnagramResult[]>([]);
  const [metrics, setMetrics] = useState<SolveMetrics | null>(null);
  const [isSolving, setIsSolving] = useState<boolean>(false);
  const [targetPhrase, setTargetPhrase] = useState<string>('');

  // Stage animation state (strictly user-controlled via divider slider, no auto-moving)
  const progressBus = useProgressBus(0);

  // Toasts disabled
  const showToast = useCallback((_text: string, _type: 'success' | 'info' | 'error' = 'info') => {
    // Toast notifications have been disabled
  }, []);

  // Web worker reference and request tracking
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
        showToast(data.error, 'error');
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
  }, [showToast]);

  // Debounced solving trigger (200ms debounce)
  // When isAnchorPinned is true, filterText (comma-separated words) is passed as the strict solver anchor
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

  // Handle locking/pinning a word directly from cards
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
      showToast(`Unlocked "${cleanWord}"`, 'info');
    } else {
      setFilterText(newPinnedWords.join(', '));
      setIsAnchorPinned(true);
      showToast(exists ? `Unlocked "${cleanWord}"` : `Locked in "${cleanWord}"`, 'success');
    }
  }, [isAnchorPinned, filterText, showToast]);

  const [selectedLengthFilter, setSelectedLengthFilter] = useState<number[] | null>(null);

  // Reactive multiset delta & construction state (Source \ Target)
  const {
    remainingLetters,
    surplusLetters,
    isExactMatch,
    candidateWords,
    histogramData,
    exactClosers,
    budget,
  } = useAnagramDelta(sourceName, targetPhrase);

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

  return (
    <div className="h-[100dvh] w-screen max-h-[100dvh] bg-[#09090b] text-[#f4f4f5] flex flex-col overflow-hidden p-1 selection:bg-emerald-900 selection:text-emerald-200">
      {/* Unified 3-Pane Window Split */}
      <ThreePaneSplit
        className="flex-1 w-full h-full"
        isStageActive={Boolean(sourceName.trim() && targetPhrase.trim())}
        /* WINDOW 1: TOP KINETIC ANAGRAM STAGE */
        card1={
          sourceName.trim() && targetPhrase.trim() ? (
            <NameAnagramStage
              sourceName={sourceName}
              targetPhrase={targetPhrase}
              progressBus={progressBus}
              onShowToast={showToast}
            />
          ) : null
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
          />
        }
        /* WINDOW 3: BOTTOM GRAPH VIEW + HISTOGRAM SIDEBAR */
        card3={
          sourceName.trim() && !isExactMatch ? (
            <CandidateWordsList
              sourceText={sourceName}
              candidateWords={candidateWords}
              selectedLengthFilter={selectedLengthFilter}
              onSelectLengthFilter={setSelectedLengthFilter}
              onClearLengthFilter={() => setSelectedLengthFilter(null)}
              histogramData={histogramData}
              onAddWordToTarget={handleAddWordToTarget}
              onSetWordAsTarget={handleSetWordAsTarget}
              activeTargetPhrase={targetPhrase}
              onShowToast={showToast}
              results={results}
              isSolving={isSolving}
              exactClosers={exactClosers}
              remainingLetters={remainingLetters}
              surplusLetters={surplusLetters}
              budget={budget}
            />
          ) : null
        }
      />
    </div>
  );
}

export default App;
