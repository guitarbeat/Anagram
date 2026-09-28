import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { renderRearrangementCanvas } from '../render/stage';
import type { ProgressBus } from '../hooks/useProgressBus';

export interface NameAnagramStageProps {
  sourceName: string;
  targetPhrase: string;
  progressBus: ProgressBus;
  onShowToast: (text: string) => void;
}

export const NameAnagramStage: React.FC<NameAnagramStageProps> = ({
  sourceName,
  targetPhrase,
  progressBus,
  onShowToast,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [progress, setProgress] = useState<number>(() => progressBus.get());
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  useEffect(() => {
    return progressBus.subscribe(p => {
      setProgress(p);
    });
  }, [progressBus]);

  // Smooth auto-play loop with requestAnimationFrame
  useEffect(() => {
    if (!isPlaying) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      lastTimeRef.current = null;
      return;
    }

    const animate = (now: number) => {
      if (lastTimeRef.current !== null) {
        const delta = (now - lastTimeRef.current) / 1000;
        let currentP = progressBus.get();
        if (currentP >= 0.999) {
          currentP = 0; // loop back to start smoothly
        }
        const nextP = Math.min(1, currentP + delta * 0.38); // 2.6 second full animation loop
        progressBus.set(nextP);
        if (nextP >= 0.999) {
          setIsPlaying(false); // finish one cycle cleanly or pause
        }
      }
      lastTimeRef.current = now;
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      lastTimeRef.current = null;
    };
  }, [isPlaying, progressBus]);

  const togglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      if (progressBus.get() >= 0.99) {
        progressBus.set(0);
      }
      setIsPlaying(true);
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    progressBus.set(0);
    onShowToast('Rearrangement reset to 0%');
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsPlaying(false);
    const val = parseFloat(e.target.value);
    progressBus.set(val);
  };

  // Resize canvas according to exact container client rect and device pixel ratio
  const resizeCanvasToDPR = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const w = Math.round(rect.width);
    const h = Math.round(rect.height);

    if (w > 0 && h > 0) {
      const targetW = Math.round(w * dpr);
      const targetH = Math.round(h * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
    }
  }, []);

  // Subscribe to progressBus for rendering directly to canvas
  useEffect(() => {
    resizeCanvasToDPR();

    const draw = (p: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      renderRearrangementCanvas(p, canvas, sourceName, targetPhrase, 'arc');
    };

    const unsubscribe = progressBus.subscribe(draw);

    const handleResize = () => {
      resizeCanvasToDPR();
      draw(progressBus.get());
    };
    window.addEventListener('resize', handleResize);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && canvasRef.current) {
      ro = new ResizeObserver(() => {
        handleResize();
      });
      ro.observe(canvasRef.current);
    }

    return () => {
      unsubscribe();
      window.removeEventListener('resize', handleResize);
      if (ro) {
        ro.disconnect();
      }
    };
  }, [sourceName, targetPhrase, progressBus, resizeCanvasToDPR]);

  // Keyboard shortcut: KeyR = reset, Space = toggle play
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

      if (e.code === 'KeyR') {
        e.preventDefault();
        handleReset();
      } else if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [progressBus, onShowToast, isPlaying]);

  return (
    <div
      id="anagram-stage"
      className="relative w-full h-full flex items-center justify-center overflow-hidden bg-white group select-none"
    >
      <canvas ref={canvasRef} className="w-full h-full block bg-white" />

      {/* Floating Control Bar for Kinetic Animation */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-black/90 text-white px-3 py-1.5 rounded-full shadow-xl border border-white/20 backdrop-blur-md transition-all">
        <button
          type="button"
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause animation' : 'Play animation'}
          className="p-1 hover:bg-white/20 rounded-full transition-colors cursor-pointer text-white"
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
        </button>

        <button
          type="button"
          onClick={handleReset}
          aria-label="Reset animation"
          className="p-1 hover:bg-white/20 rounded-full transition-colors cursor-pointer text-white/80 hover:text-white"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <div className="w-24 sm:w-36 md:w-48 flex items-center px-1">
          <input
            type="range"
            min={0}
            max={1}
            step={0.001}
            value={progress}
            onChange={handleSliderChange}
            aria-label="Kinetic rearrangement animation progress"
            className="w-full h-1 bg-white/30 rounded-lg appearance-none cursor-pointer accent-white focus:outline-none transition-all"
          />
        </div>

        <span className="text-[10px] font-mono text-white/80 min-w-[32px] text-right font-medium">
          {Math.round(progress * 100)}%
        </span>
      </div>
    </div>
  );
};
