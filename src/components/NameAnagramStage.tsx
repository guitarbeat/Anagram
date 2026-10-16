import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Share2 } from 'lucide-react';
import { renderRearrangementCanvas, type ShuffleEffectState } from '../render/stage';
import type { ProgressBus } from '../hooks/useProgressBus';
import { ShareModal } from './ShareModal';
import { triggerHaptic } from '../hooks/useHaptics';

export interface NameAnagramStageProps {
  sourceName: string;
  targetPhrase: string;
  progressBus: ProgressBus;
  onShowToast: (text: string) => void;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  onReset?: () => void;
  isExportModalOpen?: boolean;
  onOpenExportModal?: () => void;
  onCloseExportModal?: () => void;
}

export const NameAnagramStage: React.FC<NameAnagramStageProps> = ({
  sourceName,
  targetPhrase,
  progressBus,
  onShowToast,
  isPlaying: externalIsPlaying,
  onTogglePlay: externalOnTogglePlay,
  onReset: externalOnReset,
  isExportModalOpen: externalIsExportModalOpen,
  onOpenExportModal: externalOnOpenExportModal,
  onCloseExportModal: externalOnCloseExportModal,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [progress, setProgress] = useState<number>(() => progressBus.get());
  const [internalIsPlaying, setInternalIsPlaying] = useState<boolean>(false);
  const [internalIsExportModalOpen, setInternalIsExportModalOpen] = useState<boolean>(false);

  const isExportModalOpen =
    externalIsExportModalOpen !== undefined
      ? externalIsExportModalOpen
      : internalIsExportModalOpen;

  const handleOpenExportModal = () => {
    triggerHaptic('light');
    if (externalOnOpenExportModal) {
      externalOnOpenExportModal();
    } else {
      setInternalIsExportModalOpen(true);
    }
  };

  const handleCloseExportModal = () => {
    if (externalOnCloseExportModal) {
      externalOnCloseExportModal();
    } else {
      setInternalIsExportModalOpen(false);
    }
  };

  const isPlaying = externalIsPlaying !== undefined ? externalIsPlaying : internalIsPlaying;
  const setIsPlaying = (val: boolean) => {
    if (externalOnTogglePlay && val !== isPlaying) {
      externalOnTogglePlay();
    } else {
      setInternalIsPlaying(val);
    }
  };
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  // Flicker-shuffle kinetic transition state and refs
  const prevTargetPhraseRef = useRef<string>(targetPhrase);
  const shuffleStateRef = useRef<ShuffleEffectState | null>(null);
  const shuffleAnimFrameRef = useRef<number | null>(null);

  const draw = useCallback(
    (p: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      renderRearrangementCanvas(
        p,
        canvas,
        sourceName,
        targetPhrase,
        'arc',
        shuffleStateRef.current || undefined
      );
    },
    [sourceName, targetPhrase]
  );

  // Trigger snappy mechanical flicker-shuffle transition
  const triggerShuffleTransition = useCallback(() => {
    if (shuffleAnimFrameRef.current) {
      cancelAnimationFrame(shuffleAnimFrameRef.current);
    }

    const startTime = performance.now();
    const duration = 380; // ms: punchy, snappy flicker
    let phaseTick = 0;
    let lastPhaseTime = startTime;

    const step = (now: number) => {
      const elapsed = now - startTime;
      if (elapsed >= duration) {
        shuffleStateRef.current = null;
        draw(progressBus.get());
        return;
      }

      // Increment discrete flicker phase every 36ms for rapid glyph cycling
      if (now - lastPhaseTime >= 36) {
        phaseTick++;
        lastPhaseTime = now;
      }

      const t = elapsed / duration;
      // Smooth cubic decay curve for natural physical settling
      const intensity = Math.pow(1 - t, 2.2);

      shuffleStateRef.current = {
        intensity,
        phase: phaseTick,
      };

      draw(progressBus.get());
      shuffleAnimFrameRef.current = requestAnimationFrame(step);
    };

    shuffleAnimFrameRef.current = requestAnimationFrame(step);
  }, [draw, progressBus]);

  // Listen for target phrase changes (words added or removed) to trigger flicker-shuffle
  useEffect(() => {
    const prevText = prevTargetPhraseRef.current;
    const currText = targetPhrase;

    if (prevText !== currText) {
      prevTargetPhraseRef.current = currText;

      const prevWords = prevText.trim().split(/\s+/).filter(Boolean);
      const currWords = currText.trim().split(/\s+/).filter(Boolean);

      // Trigger transition whenever word tokens or phrase content changes
      if (prevWords.length !== currWords.length || prevText.trim() !== currText.trim()) {
        triggerHaptic(currWords.length > prevWords.length ? 'add' : 'remove');
        triggerShuffleTransition();
      }
    }
  }, [targetPhrase, triggerShuffleTransition]);

  // Clean up shuffle animation frame on unmount
  useEffect(() => {
    return () => {
      if (shuffleAnimFrameRef.current) {
        cancelAnimationFrame(shuffleAnimFrameRef.current);
      }
    };
  }, []);

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
    if (externalOnTogglePlay) {
      externalOnTogglePlay();
    } else {
      if (isPlaying) {
        setIsPlaying(false);
      } else {
        if (progressBus.get() >= 0.99) {
          progressBus.set(0);
        }
        setIsPlaying(true);
      }
    }
  };

  const handleReset = () => {
    if (externalOnReset) {
      externalOnReset();
    } else {
      setIsPlaying(false);
      progressBus.set(0);
      onShowToast('Rearrangement reset to 0%');
    }
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
    const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
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

    draw(progressBus.get());

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
  }, [progressBus, resizeCanvasToDPR, draw]);

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
      className="relative w-full h-full flex items-center justify-center overflow-hidden bg-white select-none group/stage"
    >
      <canvas ref={canvasRef} className="w-full h-full block bg-white" />

      {/* Floating Top-Right Stage Share Button */}
      {sourceName.trim() && (
        <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5 pointer-events-auto">
          <button
            type="button"
            onClick={handleOpenExportModal}
            title="Share kinetic anagram animation or generate shareable link/card"
            aria-label="Share anagram animation"
            className="h-6.5 sm:h-7.5 px-2.5 sm:px-3 bg-white hover:bg-black text-black hover:text-white border-2 border-black rounded-md text-[9.5px] sm:text-[10.5px] font-mono font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-[2px_2px_0px_#000000] hover:shadow-[3px_3px_0px_#000000] hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer group/btn touch-manipulation"
          >
            <Share2 className="w-3.5 h-3.5 text-black group-hover/btn:text-white transition-colors" />
            <span>Share</span>
          </button>
        </div>
      )}

      {/* Share & Export Dialog Modal */}
      <ShareModal
        isOpen={isExportModalOpen}
        onClose={handleCloseExportModal}
        sourceName={sourceName}
        targetPhrase={targetPhrase}
        onShowToast={onShowToast}
      />
    </div>
  );
};
