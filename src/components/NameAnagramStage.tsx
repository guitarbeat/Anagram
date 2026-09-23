import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Pause, RotateCcw, Layers, Eye } from 'lucide-react';
import { renderRearrangementCanvas } from '../render/stage';
import { renderMultiAnagramCanvas } from '../render/multi';
import type { ProgressBus } from '../hooks/useProgressBus';

export interface NameAnagramStageProps {
  sourceName: string;
  targetPhrase: string;
  onSelectPhrase?: (phrase: string) => void;
  availableAnagrams?: string[];
  isPlaying: boolean;
  onPlayingChange: (isPlaying: boolean) => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
  progressBus: ProgressBus;
  onShowToast: (text: string) => void;
}

export const NameAnagramStage: React.FC<NameAnagramStageProps> = ({
  sourceName,
  targetPhrase,
  availableAnagrams = [],
  isPlaying,
  onPlayingChange,
  speed,
  onSpeedChange,
  progressBus,
  onShowToast,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafHandleRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const [viewMode, setViewMode] = useState<'single' | 'all'>('single');

  // Throttled progress for UI slider & readout (~10 updates/sec)
  const [displayProgress, setDisplayProgress] = useState<number>(0);
  const lastThrottleUpdateRef = useRef<number>(0);

  // Resize canvas according to container and DPR
  const resizeCanvasToDPR = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const w = Math.max(300, Math.floor(rect.width || 720));
    const h = 200;

    if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
    }
  }, []);

  // Subscribe to progressBus for rendering directly to canvas
  useEffect(() => {
    resizeCanvasToDPR();

    const draw = (p: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      if (viewMode === 'all') {
        renderMultiAnagramCanvas(p, canvas, sourceName, availableAnagrams);
      } else {
        renderRearrangementCanvas(p, canvas, sourceName, targetPhrase, 'arc');
      }

      // Throttled UI state update for slider (~100ms)
      const now = performance.now();
      if (now - lastThrottleUpdateRef.current > 100) {
        lastThrottleUpdateRef.current = now;
        setDisplayProgress(p);
      }
    };

    const unsubscribe = progressBus.subscribe(draw);

    const handleResize = () => {
      resizeCanvasToDPR();
      draw(progressBus.get());
    };
    window.addEventListener('resize', handleResize);

    return () => {
      unsubscribe();
      window.removeEventListener('resize', handleResize);
    };
  }, [sourceName, targetPhrase, availableAnagrams, viewMode, progressBus, resizeCanvasToDPR]);

  // Main animation loop: runs when isPlaying is true
  useEffect(() => {
    if (!isPlaying) {
      cancelAnimationFrame(rafHandleRef.current);
      lastTimeRef.current = 0;
      return;
    }

    lastTimeRef.current = performance.now();

    const step = (now: number) => {
      const dt = lastTimeRef.current ? Math.min(now - lastTimeRef.current, 100) : 16.6;
      lastTimeRef.current = now;

      // Full cycle takes ~2.6 seconds at 1x speed
      const delta = (dt / 2600) * speed;
      const currentP = progressBus.get();
      let nextP = currentP + delta;
      if (nextP > 1) {
        nextP = 0; // loop
      }

      progressBus.notify(nextP);
      rafHandleRef.current = requestAnimationFrame(step);
    };

    rafHandleRef.current = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(rafHandleRef.current);
    };
  }, [isPlaying, speed, progressBus]);

  // Keyboard shortcuts: Space = play/pause, R = restart
  // Ignored while focus is in an input/select/textarea
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'SELECT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        onPlayingChange(!isPlaying);
      } else if (e.code === 'KeyR') {
        e.preventDefault();
        progressBus.set(0);
        setDisplayProgress(0);
        onShowToast('Animation restarted');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPlaying, onPlayingChange, progressBus, onShowToast]);

  const handleSliderChange = (val: number) => {
    setDisplayProgress(val);
    progressBus.set(val);
  };

  const handleRestart = () => {
    progressBus.set(0);
    setDisplayProgress(0);
    onShowToast('Animation restarted');
  };

  return (
    <div
      id="anagram-stage"
      className="border border-[#27272a] rounded-xl bg-[#121214] overflow-hidden shadow-2xl space-y-3 p-4 sm:p-5"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Kinetic Rearrangement Stage
          </span>
          {targetPhrase && (
            <span className="text-xs text-[#71717a] font-mono truncate max-w-[200px] sm:max-w-xs">
              &ldquo;{targetPhrase}&rdquo;
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          {availableAnagrams.length > 1 && (
            <div className="flex items-center bg-[#18181b] p-0.5 rounded border border-[#27272a]">
              <button
                type="button"
                onClick={() => setViewMode('single')}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                  viewMode === 'single'
                    ? 'bg-[#27272a] text-[#f4f4f5] font-medium'
                    : 'text-[#71717a] hover:text-[#f4f4f5]'
                }`}
                title="Single anagram rearrangement"
              >
                <Eye className="w-3 h-3" />
                <span>Single</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('all')}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                  viewMode === 'all'
                    ? 'bg-[#27272a] text-[#f4f4f5] font-medium'
                    : 'text-[#71717a] hover:text-[#f4f4f5]'
                }`}
                title="Multi-anagram arrangement (top 5)"
              >
                <Layers className="w-3 h-3" />
                <span>Multi (5)</span>
              </button>
            </div>
          )}

          {/* Speed selector */}
          <div className="flex items-center bg-[#18181b] p-0.5 rounded border border-[#27272a]">
            {[0.5, 1, 1.5, 2].map(s => (
              <button
                key={s}
                type="button"
                onClick={() => onSpeedChange(s)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                  speed === s
                    ? 'bg-[#27272a] text-[#f4f4f5] font-medium'
                    : 'text-[#71717a] hover:text-[#f4f4f5]'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Canvas viewport */}
      <div className="relative w-full h-[200px] rounded-lg bg-[#09090b] border border-[#27272a] overflow-hidden flex items-center justify-center">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>

      {/* Playback Controls and Scrubber */}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={() => onPlayingChange(!isPlaying)}
          aria-label={isPlaying ? 'Pause animation (Space)' : 'Play animation (Space)'}
          className="p-2 rounded-lg bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] text-[#f4f4f5] transition-colors cursor-pointer"
          title="Play/Pause (Space)"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
        </button>

        <button
          type="button"
          onClick={handleRestart}
          aria-label="Restart animation (R)"
          className="p-2 rounded-lg bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] text-[#a1a1aa] hover:text-[#f4f4f5] transition-colors cursor-pointer"
          title="Restart (R)"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Progress Scrubber */}
        <div className="flex-1 flex items-center gap-3">
          <input
            type="range"
            min="0"
            max="1"
            step="0.005"
            value={displayProgress}
            onChange={e => handleSliderChange(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-[#27272a] rounded-lg appearance-none cursor-pointer accent-emerald-500"
            aria-label="Rearrangement progress scrubber"
          />
          <span className="text-[11px] font-mono text-[#71717a] w-10 text-right tabular-nums">
            {Math.round(displayProgress * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
};
