import { useState, useEffect, useRef, useMemo } from 'react';
import type { AnagramResult, SolveMetrics } from '../engine/types';
import type { WorkerResponse, WorkerRequest } from '../engine/solver.worker';

export interface UseAnagramSolverOptions {
  sourceName: string;
  filterText: string;
  isAnchorPinned: boolean;
  allowSpicy?: boolean;
  customWords?: string[];
  debounceMs?: number;
  onError?: (err: string) => void;
}

function getLetterCounts(str: string): { counts: Uint8Array; length: number } {
  const norm = (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');
  const counts = new Uint8Array(26);
  for (let i = 0; i < norm.length; i++) {
    counts[norm.charCodeAt(i) - 97]++;
  }
  return { counts, length: norm.length };
}

export function useAnagramSolver({
  sourceName,
  filterText,
  isAnchorPinned,
  allowSpicy = true,
  customWords = [],
  debounceMs = 140,
  onError,
}: UseAnagramSolverOptions) {
  const [rawResults, setResults] = useState<AnagramResult[]>([]);
  const [metrics, setMetrics] = useState<SolveMetrics | null>(null);
  const [isSolving, setIsSolving] = useState<boolean>(false);
  const [targetPhrase, setTargetPhrase] = useState<string>('');

  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef<number>(0);

  // Initialize Web Worker
  useEffect(() => {
    const worker = new Worker(
      new URL('../engine/solver.worker.ts', import.meta.url),
      { type: 'module' }
    );
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const data = e.data;
      if (data.id !== requestIdRef.current) return;

      setIsSolving(false);

      if (data.error) {
        onError?.(data.error);
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
  }, [onError]);

  // Determine whether targetPhrase ("Remix it" field) is a valid partial subset of sourceName
  const anchorState = useMemo(() => {
    const src = getLetterCounts(sourceName);
    const effectiveText = targetPhrase.trim() || (isAnchorPinned ? filterText.trim() : '');
    if (!effectiveText || src.length === 0) {
      return {
        mode: 'empty' as const,
        anchorText: undefined,
        anchorWords: [] as string[],
        srcLength: src.length,
      };
    }

    const tgt = getLetterCounts(effectiveText);
    if (tgt.length === 0) {
      return {
        mode: 'empty' as const,
        anchorText: undefined,
        anchorWords: [] as string[],
        srcLength: src.length,
      };
    }

    for (let c = 0; c < 26; c++) {
      if (tgt.counts[c] > src.counts[c]) {
        return {
          mode: 'overspent' as const,
          anchorText: undefined,
          anchorWords: [] as string[],
          srcLength: src.length,
        };
      }
    }

    const anchorWords = effectiveText
      .split(/[\s,./-]+/)
      .map((w) =>
        w
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .replace(/[^a-z]/g, '')
      )
      .filter(Boolean);

    if (tgt.length === src.length) {
      return {
        mode: 'exact' as const,
        anchorText: effectiveText,
        anchorWords,
        srcLength: src.length,
      };
    }

    return {
      mode: 'partial' as const,
      anchorText: effectiveText,
      anchorWords,
      srcLength: src.length,
    };
  }, [sourceName, targetPhrase, isAnchorPinned, filterText]);

  const customWordsKey = useMemo(() => customWords.join(' '), [customWords]);

  // Debounced solving trigger tethered to both sourceName and the "Remix it" targetPhrase
  useEffect(() => {
    const clean = sourceName.trim();
    if (!clean) {
      setResults([]);
      setMetrics(null);
      setTargetPhrase('');
      setIsSolving(false);
      return;
    }

    // If the user just completed a full 100% anagram or typed an overspent letter,
    // preserve the current solutions list without wiping it out.
    if (anchorState.mode === 'exact' || anchorState.mode === 'overspent') {
      setIsSolving(false);
      return;
    }

    setIsSolving(true);
    const reqId = ++requestIdRef.current;

    const debounceTimer = window.setTimeout(() => {
      if (!workerRef.current) return;

      const baseMaxWords = anchorState.srcLength >= 16 ? 5 : 4;
      const dynamicMaxWords =
        anchorState.mode === 'partial'
          ? Math.max(baseMaxWords, anchorState.anchorWords.length + 3)
          : baseMaxWords;

      const msg: WorkerRequest = {
        id: reqId,
        opts: {
          source: clean,
          maxWords: dynamicMaxWords,
          resultLimit: 5000,
          allowSpicy,
          anchorText: anchorState.anchorText,
          anchorPlacement: 'natural',
          customWordsText: customWordsKey || undefined,
        },
      };

      workerRef.current.postMessage(msg);
    }, debounceMs);

    return () => {
      window.clearTimeout(debounceTimer);
    };
  }, [
    sourceName,
    anchorState.mode,
    anchorState.anchorText,
    anchorState.srcLength,
    anchorState.anchorWords.length,
    allowSpicy,
    customWordsKey,
    debounceMs,
  ]);

  // Immediately filter existing results to match the "Remix it" anchor words even before the worker finishes
  const results = useMemo(() => {
    if (anchorState.mode !== 'partial' || anchorState.anchorWords.length === 0) {
      return rawResults;
    }

    return rawResults.filter((res) => {
      const available = res.words.map((w) => w.toLowerCase().replace(/[^a-z]/g, ''));
      for (const reqWord of anchorState.anchorWords) {
        const idx = available.indexOf(reqWord);
        if (idx === -1) return false;
        available.splice(idx, 1);
      }
      return true;
    });
  }, [rawResults, anchorState.mode, anchorState.anchorWords]);

  return {
    results,
    setResults,
    metrics,
    isSolving,
    targetPhrase,
    setTargetPhrase,
  };
}
