import { useState, useEffect, useRef } from 'react';
import type { AnagramResult, SolveMetrics } from '../engine/types';
import type { WorkerResponse, WorkerRequest } from '../engine/solver.worker';

export interface UseAnagramSolverOptions {
  sourceName: string;
  filterText: string;
  isAnchorPinned: boolean;
  allowSpicy?: boolean;
  debounceMs?: number;
  onError?: (err: string) => void;
}

export function useAnagramSolver({
  sourceName,
  filterText,
  isAnchorPinned,
  allowSpicy = true,
  debounceMs = 200,
  onError,
}: UseAnagramSolverOptions) {
  const [results, setResults] = useState<AnagramResult[]>([]);
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
  }, [onError]);

  // Debounced solving trigger
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
    }, debounceMs);

    return () => {
      window.clearTimeout(debounceTimer);
    };
  }, [sourceName, isAnchorPinned, filterText, allowSpicy, debounceMs]);

  return {
    results,
    setResults,
    metrics,
    isSolving,
    targetPhrase,
    setTargetPhrase,
  };
}
