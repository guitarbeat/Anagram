import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  X,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import type { AnagramResult, SolveMetrics } from './engine/types';
import type { WorkerResponse, WorkerRequest } from './engine/solver.worker';
import { WORDS, LETTER_COUNTS, LETTER_MASKS, FREQ } from './engine/lexicon';
import { NameAnagramStage } from './components/NameAnagramStage';
import { TargetHistogramWindow } from './components/TargetHistogramWindow';
import { CandidateWordsList, type CandidateWordItem } from './components/CandidateWordsList';
import { ThreePaneSplit } from './components/ThreePaneSplit';
import { useProgressBus, type ProgressBus } from './hooks/useProgressBus';

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

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastTimersRef = useRef<Map<string, number>>(new Map());

  // Web worker reference and request tracking
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef<number>(0);
  const targetPhraseRef = useRef<string>(targetPhrase);
  targetPhraseRef.current = targetPhrase;

  const showToast = useCallback((text: string, type: 'success' | 'info' | 'error' = 'info') => {
    const id = `${Date.now()}_${Math.random()}`;
    setToasts(prev => [...prev, { id, text, type }]);

    const timer = window.setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
      toastTimersRef.current.delete(id);
    }, 3200);

    toastTimersRef.current.set(id, timer);
  }, []);

  useEffect(() => {
    return () => {
      toastTimersRef.current.forEach(timer => window.clearTimeout(timer));
      toastTimersRef.current.clear();
    };
  }, []);

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

  const [selectedLengthFilter, setSelectedLengthFilter] = useState<number | null>(null);

  // Compute remaining letters between source text and active target phrase
  const { remainingLetters, isExactMatch, isSurplus } = useMemo(() => {
    const sourceLetters = sourceName.toLowerCase().replace(/[^a-z]/g, '').split('');
    const targetLetters = targetPhrase.toLowerCase().replace(/[^a-z]/g, '').split('');

    const sourceCounts = new Map<string, number>();
    for (const char of sourceLetters) {
      sourceCounts.set(char, (sourceCounts.get(char) || 0) + 1);
    }

    const targetCounts = new Map<string, number>();
    for (const char of targetLetters) {
      targetCounts.set(char, (targetCounts.get(char) || 0) + 1);
    }

    const remaining: string[] = [];
    let surplus = false;

    for (const [char, count] of sourceCounts.entries()) {
      const used = targetCounts.get(char) || 0;
      if (used < count) {
        for (let i = 0; i < count - used; i++) {
          remaining.push(char);
        }
      } else if (used > count) {
        surplus = true;
      }
    }

    for (const [char, count] of targetCounts.entries()) {
      if ((sourceCounts.get(char) || 0) < count) {
        surplus = true;
      }
    }

    const exact = remaining.length === 0 && !surplus && sourceLetters.length > 0 && targetLetters.length > 0;
    return {
      remainingLetters: remaining.sort(),
      isExactMatch: exact,
      isSurplus: surplus,
    };
  }, [sourceName, targetPhrase]);

  // Active letter pool for candidate words and histogram:
  // If words are chosen in the target phrase and letters remain, use leftover letters!
  // If target phrase is empty, use full source letters.
  const activeLetterPool = useMemo(() => {
    const targetClean = targetPhrase.toLowerCase().replace(/[^a-z]/g, '');
    if (!targetClean) {
      return sourceName.toLowerCase().replace(/[^a-z]/g, '');
    }
    return remainingLetters.join('');
  }, [targetPhrase, sourceName, remainingLetters]);

  // Compute all dictionary words that fit inside the active leftover letter pool
  const candidateWords = useMemo<CandidateWordItem[]>(() => {
    const clean = activeLetterPool;
    if (!clean) return [];

    const poolCounts = new Array(26).fill(0);
    let poolMask = 0;
    for (let i = 0; i < clean.length; i++) {
      const code = clean.charCodeAt(i) - 97;
      poolCounts[code]++;
      poolMask |= 1 << code;
    }

    const matches: CandidateWordItem[] = [];
    const numWords = WORDS.length;

    for (let i = 0; i < numWords; i++) {
      const mask = LETTER_MASKS[i];
      if ((mask & ~poolMask) !== 0) continue;

      const offset = i * 26;
      let fits = true;
      for (let j = 0; j < 26; j++) {
        if (LETTER_COUNTS[offset + j] > poolCounts[j]) {
          fits = false;
          break;
        }
      }

      if (fits) {
        const w = WORDS[i];
        matches.push({
          word: w,
          length: w.length,
          freq: FREQ.get(w) || 0,
        });
      }
    }

    // Sort strictly from longest to shortest, then by frequency
    matches.sort((a, b) => {
      if (b.length !== a.length) return b.length - a.length;
      return b.freq - a.freq;
    });

    return matches;
  }, [activeLetterPool]);

  // Compute histogram of words grouped by letter length from leftover letters
  const histogramData = useMemo(() => {
    const countsMap = new Map<number, number>();
    for (const item of candidateWords) {
      countsMap.set(item.length, (countsMap.get(item.length) || 0) + 1);
    }

    // Find min and max length
    const lengths = Array.from(countsMap.keys());
    if (lengths.length === 0) return [];

    const minL = Math.max(2, Math.min(...lengths));
    const maxL = Math.max(...lengths);

    const hist: { length: number; count: number }[] = [];
    for (let l = minL; l <= maxL; l++) {
      hist.push({
        length: l,
        count: countsMap.get(l) || 0,
      });
    }

    return hist;
  }, [candidateWords]);

  const handleAddWordToTarget = useCallback((word: string) => {
    setTargetPhrase(prev => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed} ${word}` : word;
    });
    progressBus.set(0);
  }, [progressBus]);

  const handleSetWordAsTarget = useCallback((word: string) => {
    setTargetPhrase(word);
    progressBus.set(0);
  }, [progressBus]);

  return (
    <div className="h-[100dvh] w-screen max-h-[100dvh] bg-[#09090b] text-[#f4f4f5] flex flex-col overflow-hidden p-1 selection:bg-emerald-900 selection:text-emerald-200">
      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-2 px-3.5 py-2.5 rounded-lg border text-xs font-mono shadow-2xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-2 ${
              t.type === 'error'
                ? 'bg-[#181113]/95 border-rose-600/50 text-rose-200'
                : t.type === 'success'
                ? 'bg-[#101814]/95 border-emerald-600/50 text-emerald-200'
                : 'bg-[#18181b]/95 border-[#27272a] text-[#f4f4f5]'
            }`}
          >
            {t.type === 'error' ? (
              <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            )}
            <span>{t.text}</span>
          </div>
        ))}
      </div>

      {/* Unified 3-Pane Window Split */}
      <ThreePaneSplit
        className="flex-1 w-full h-full"
        /* WINDOW 1: TOP KINETIC ANAGRAM STAGE */
        card1={
          sourceName.trim() && targetPhrase ? (
            <NameAnagramStage
              sourceName={sourceName}
              targetPhrase={targetPhrase}
              progressBus={progressBus}
              onShowToast={showToast}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-600 font-mono text-sm p-4">
              Enter text in the middle window to preview kinetic letter rearrangements
            </div>
          )
        }
        /* WINDOW 2: MIDDLE TARGET WORD, CONTROLS & STATUS */
        card2={
          <TargetHistogramWindow
            sourceText={sourceName}
            onSourceNameChange={setSourceName}
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
          />
        }
      />
    </div>
  );
}

export default App;
