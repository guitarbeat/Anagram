import React, { useRef, useEffect, useCallback, useState } from 'react';
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

  useEffect(() => {
    return progressBus.subscribe(p => {
      setProgress(p);
    });
  }, [progressBus]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    progressBus.set(val);
  };

  // Resize canvas according to exact container client rect and device pixel ratio (1:1 pixel ratio, zero distortion)
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

  // Keyboard shortcut: KeyR = reset rearrangement to 0%
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
        progressBus.set(0);
        onShowToast('Rearrangement reset to 0%');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [progressBus, onShowToast]);

  return (
    <div
      id="anagram-stage"
      className="relative w-full h-full flex items-center justify-center overflow-hidden bg-white"
    >
      <canvas ref={canvasRef} className="w-full h-full block bg-white" />

      {/* Floating Slider Control inside Top Stage Panel */}
      <input
        type="range"
        min={0}
        max={1}
        step={0.001}
        value={progress}
        onChange={handleSliderChange}
        aria-label="Kinetic rearrangement animation progress"
        className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[90%] sm:w-[65%] md:w-[50%] max-w-md h-1 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-black focus:outline-none z-30 transition-all"
      />
    </div>
  );
};
