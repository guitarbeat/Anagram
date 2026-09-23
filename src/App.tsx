import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, X, Pin, ChevronDown, CheckCircle2, AlertCircle } from 'lucide-react';
import type { AnagramResult, SolveMetrics } from './engine/solver';
import type { WorkerResponse, WorkerRequest } from './engine/solver.worker';
import { NameAnagramStage } from './components/NameAnagramStage';
import { SolverSection } from './components/SolverSection';
import { useProgressBus } from './hooks/useProgressBus';

interface ToastMessage {
  id: string;
  text: string;
  type?: 'success' | 'info' | 'error';
}

const PRESET_EXAMPLES = [
  'William Shakespeare',
  'Aaron Lorenzo Woods',
  'Clint Eastwood',
  'Mother-in-law',
  'The Morse Code',
  'Eleven plus two',
  'Dormitory',
];

export function App() {
  const [sourceName, setSourceName] = useState<string>('Aaron Lorenzo Woods');
  const [anchorText, setAnchorText] = useState<string>('');
  const [anchorPlacement, setAnchorPlacement] = useState<'start' | 'end' | 'natural'>('natural');
  const [allowSpicy, setAllowSpicy] = useState<boolean>(false);

  const [results, setResults] = useState<AnagramResult[]>([]);
  const [metrics, setMetrics] = useState<SolveMetrics | null>(null);
  const [isSolving, setIsSolving] = useState<boolean>(false);
  const [targetPhrase, setTargetPhrase] = useState<string>('');

  // Stage animation state
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speed, setSpeed] = useState<number>(1);
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

  // Cleanup all toast timers on unmount
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
      // Ignore responses that are not for the latest request
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

        // Update target phrase if previous target is missing from new results
        const currentTarget = targetPhraseRef.current;
        const exists = data.results.some(r => r.phrase === currentTarget);
        if (!exists && data.results.length > 0) {
          setTargetPhrase(data.results[0].phrase);
        } else if (data.results.length === 0) {
          setTargetPhrase('');
        }
      }
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, [showToast]);

  // Debounced solving trigger (250ms debounce)
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

      const msg: WorkerRequest = {
        id: reqId,
        opts: {
          source: clean,
          maxWords: 4,
          resultLimit: 80,
          allowSpicy,
          anchorText: anchorText.trim() || undefined,
          anchorPlacement,
        },
      };

      workerRef.current.postMessage(msg);
    }, 250);

    return () => {
      window.clearTimeout(debounceTimer);
    };
  }, [sourceName, anchorText, anchorPlacement, allowSpicy]);

  // Animate a specific phrase clicked from results
  const handleAnimatePhrase = useCallback((phrase: string) => {
    setTargetPhrase(phrase);
    setIsPlaying(true);
    progressBus.set(0);

    // Smooth scroll to stage
    const stageEl = document.getElementById('anagram-stage');
    if (stageEl) {
      stageEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [progressBus]);

  const top5Available = results.slice(0, 5).map(r => r.phrase);

  return (
    <div className="min-h-screen bg-[#0f0f11] text-[#f4f4f5] flex flex-col selection:bg-emerald-900 selection:text-emerald-200">
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

      {/* Header */}
      <header className="border-b border-[#27272a] bg-[#121214]/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-4xl w-full mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-semibold text-[#f4f4f5] tracking-tight flex items-center gap-2">
                Funny Exact Anagram Lab
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-950/50 text-emerald-400 border border-emerald-800/40 hidden sm:inline-block">
                  Exact Letters
                </span>
              </h1>
            </div>
          </div>

          {/* Preset Examples Dropdown */}
          <div className="flex items-center gap-2">
            <div className="relative group">
              <select
                onChange={e => {
                  if (e.target.value) {
                    setSourceName(e.target.value);
                    e.target.value = '';
                  }
                }}
                defaultValue=""
                className="bg-[#18181b] border border-[#27272a] text-[#a1a1aa] hover:text-[#f4f4f5] hover:border-[#3f3f46] rounded-lg px-2.5 py-1.5 text-xs font-mono transition-colors cursor-pointer appearance-none pr-7 focus:outline-none"
                aria-label="Preset name examples"
              >
                <option value="" disabled>
                  Try Examples...
                </option>
                {PRESET_EXAMPLES.map(name => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#71717a] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Input & Search Section */}
        <section aria-label="Input search" className="space-y-3">
          {/* Main Input Box */}
          <div className="relative">
            <input
              id="source-input"
              type="text"
              value={sourceName}
              onChange={e => setSourceName(e.target.value)}
              placeholder="Enter name or phrase to solve (e.g. William Shakespeare)..."
              className="w-full bg-[#121214] border border-[#27272a] focus:border-emerald-500/60 rounded-xl px-4 py-3 text-sm sm:text-base font-mono text-[#f4f4f5] placeholder-[#52525b] focus:outline-none transition-colors shadow-inner"
            />
            {sourceName && (
              <button
                type="button"
                onClick={() => {
                  setSourceName('');
                  setTargetPhrase('');
                }}
                aria-label="Clear input"
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#71717a] hover:text-[#f4f4f5] p-1 rounded-md hover:bg-[#27272a] cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Optional Anchor / "Must Include" Bar */}
          <div className="flex items-center gap-2 flex-wrap text-xs font-mono bg-[#141417] p-2.5 rounded-lg border border-[#232326]">
            <div className="flex items-center gap-1.5 text-[#a1a1aa] shrink-0">
              <Pin className="w-3.5 h-3.5 text-emerald-400" />
              <span>Must include:</span>
            </div>

            <input
              type="text"
              value={anchorText}
              onChange={e => setAnchorText(e.target.value)}
              placeholder="e.g. zoolander or roo"
              className="flex-1 min-w-[140px] bg-[#18181b] border border-[#27272a] focus:border-[#52525b] rounded px-2.5 py-1 text-xs font-mono text-[#f4f4f5] placeholder-[#52525b] focus:outline-none"
            />

            {anchorText && (
              <button
                type="button"
                onClick={() => setAnchorText('')}
                aria-label="Clear must include input"
                className="text-[#71717a] hover:text-[#f4f4f5] p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            )}

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[#71717a]">Placement:</span>
              <select
                value={anchorPlacement}
                onChange={e =>
                  setAnchorPlacement(e.target.value as 'start' | 'end' | 'natural')
                }
                className="bg-[#18181b] border border-[#27272a] text-[#a1a1aa] rounded px-2 py-1 text-xs font-mono focus:outline-none cursor-pointer"
              >
                <option value="natural">Natural (anywhere)</option>
                <option value="start">Start of phrase</option>
                <option value="end">End of phrase</option>
              </select>
            </div>
          </div>
        </section>

        {/* Kinetic Rearrangement Stage (Rendered above results) */}
        {sourceName.trim() && targetPhrase && (
          <section aria-label="Kinetic Rearrangement Stage">
            <NameAnagramStage
              sourceName={sourceName}
              targetPhrase={targetPhrase}
              availableAnagrams={top5Available}
              isPlaying={isPlaying}
              onPlayingChange={setIsPlaying}
              speed={speed}
              onSpeedChange={setSpeed}
              progressBus={progressBus}
              onShowToast={showToast}
            />
          </section>
        )}

        {/* Discovered Anagrams Section */}
        <section aria-label="Anagram Results Grid">
          <SolverSection
            sourceText={sourceName}
            results={results}
            isSolving={isSolving}
            metrics={metrics}
            activeTargetPhrase={targetPhrase}
            progressBus={progressBus}
            allowSpicy={allowSpicy}
            onToggleSpicy={setAllowSpicy}
            onAnimatePhrase={handleAnimatePhrase}
            onShowToast={showToast}
          />
        </section>
      </main>
    </div>
  );
}

export default App;
