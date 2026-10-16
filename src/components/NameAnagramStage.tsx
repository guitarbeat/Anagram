import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { Share2, X, ArrowLeftRight, GripVertical } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { renderRearrangementCanvas, type ShuffleEffectState } from '../render/stage';
import type { ProgressBus } from '../hooks/useProgressBus';
import { ShareModal } from './ShareModal';
import { triggerHaptic } from '../hooks/useHaptics';

interface SortableWordChipProps {
  id: string;
  word: string;
  index: number;
  total: number;
  disabled?: boolean;
  onRemove?: () => void;
  onSwapWithNext?: () => void;
}

const SortableWordChip: React.FC<SortableWordChipProps> = ({
  id,
  word,
  index,
  total,
  disabled = false,
  onRemove,
  onSwapWithNext,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.35 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 text-zinc-900 font-mono font-bold text-[11px] sm:text-xs shadow-2xs group/chip transition-all shrink-0 select-none ${
        disabled
          ? 'cursor-default'
          : isDragging
          ? 'ring-2 ring-black shadow-lg scale-105 bg-white cursor-grabbing touch-none border-dashed border-zinc-400'
          : 'cursor-grab active:cursor-grabbing hover:border-zinc-400 touch-none'
      }`}
      title={disabled ? undefined : 'Drag to reorder words, or click arrow to swap'}
      {...attributes}
      {...listeners}
    >
      <GripVertical className="w-2.5 h-2.5 text-zinc-400 group-hover/chip:text-zinc-700 pointer-events-none shrink-0" />
      <span>{word}</span>
      {index < total - 1 && onSwapWithNext && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSwapWithNext();
          }}
          title={`Swap with next`}
          className="p-0.5 text-zinc-400 hover:text-black opacity-0 group-hover/chip:opacity-100 transition-opacity cursor-pointer"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <ArrowLeftRight className="w-2.5 h-2.5" />
        </button>
      )}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          title={`Remove "${word}"`}
          className="p-0.5 -mr-0.5 rounded-full text-zinc-400 hover:text-red-600 hover:bg-black/5 transition-colors cursor-pointer"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};

export interface NameAnagramStageProps {
  sourceName: string;
  targetPhrase: string;
  onTargetPhraseChange?: (phrase: string) => void;
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
  onTargetPhraseChange,
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
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  const targetWords = useMemo(
    () => targetPhrase.trim().split(/\s+/).filter(Boolean),
    [targetPhrase]
  );

  const tokenItems = useMemo(
    () =>
      targetWords.map((word, index) => ({
        id: `token-${index}-${word}`,
        word,
        index,
      })),
    [targetWords]
  );

  const activeToken = useMemo(
    () => (activeDragId ? tokenItems.find((t) => t.id === activeDragId) : null),
    [activeDragId, tokenItems]
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
    triggerHaptic('light');
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = tokenItems.findIndex((item) => item.id === active.id);
    const newIndex = tokenItems.findIndex((item) => item.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
      triggerHaptic('snap');
      const updated = arrayMove(targetWords, oldIndex, newIndex);
      if (onTargetPhraseChange) {
        onTargetPhraseChange(updated.join(' '));
      }
      progressBus.set(0);
      onShowToast(`Reordered: ${updated.join(' ')}`);
    }
  };

  const handleDragCancel = () => {
    setActiveDragId(null);
  };

  const handleRemoveWord = (index: number) => {
    if (!onTargetPhraseChange) return;
    triggerHaptic('remove');
    const updated = [...targetWords];
    const removedWord = updated.splice(index, 1)[0];
    onTargetPhraseChange(updated.join(' '));
    progressBus.set(0);
    onShowToast(`Removed "${removedWord}"`);
  };

  const handleSwapWords = (idxA: number, idxB: number) => {
    if (!onTargetPhraseChange) return;
    triggerHaptic('snap');
    const updated = [...targetWords];
    const temp = updated[idxA];
    updated[idxA] = updated[idxB];
    updated[idxB] = temp;
    onTargetPhraseChange(updated.join(' '));
    progressBus.set(0);
  };

  return (
    <div
      id="anagram-stage"
      className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden bg-white select-none group/stage"
    >
      {/* Integrated Stage Header Composer Bar with Interactive Word Chips */}
      <div className="absolute top-0 inset-x-0 h-8 sm:h-9 z-20 flex items-center justify-between px-2.5 sm:px-3 bg-white/95 backdrop-blur-md border-b border-black/10 select-none pointer-events-auto">
        <div className="flex items-center gap-1.5 min-w-0 overflow-x-auto no-scrollbar py-0.5 pr-2">
          <span className="text-[10px] font-mono uppercase font-bold text-zinc-400 shrink-0">
            Target:
          </span>
          {tokenItems.length > 0 ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
            >
              <SortableContext
                items={tokenItems.map((item) => item.id)}
                strategy={horizontalListSortingStrategy}
              >
                <div className="flex items-center gap-1.5 shrink-0">
                  {tokenItems.map((item) => (
                    <SortableWordChip
                      key={item.id}
                      id={item.id}
                      word={item.word}
                      index={item.index}
                      total={tokenItems.length}
                      disabled={!onTargetPhraseChange}
                      onRemove={
                        onTargetPhraseChange
                          ? () => handleRemoveWord(item.index)
                          : undefined
                      }
                      onSwapWithNext={
                        onTargetPhraseChange && item.index < tokenItems.length - 1
                          ? () => handleSwapWords(item.index, item.index + 1)
                          : undefined
                      }
                    />
                  ))}
                </div>
              </SortableContext>
              <DragOverlay dropAnimation={{ duration: 160, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
                {activeToken ? (
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-white border-2 border-black text-black font-mono font-bold text-[11px] sm:text-xs shadow-xl ring-2 ring-black/10 scale-105 cursor-grabbing select-none pointer-events-none">
                    <GripVertical className="w-2.5 h-2.5 text-zinc-800 shrink-0" />
                    <span>{activeToken.word}</span>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          ) : (
            <span className="text-[11px] sm:text-xs text-zinc-400 font-mono italic truncate">
              Tap words in explorer below to compose target
            </span>
          )}
        </div>

        {/* Floating Top-Right Stage Share Button */}
        {sourceName.trim() && (
          <div className="flex items-center gap-1.5 shrink-0 ml-1.5">
            <button
              type="button"
              onClick={handleOpenExportModal}
              title="Share kinetic anagram animation or generate shareable link/card"
              aria-label="Share anagram animation"
              className="h-6 sm:h-6.5 px-2.5 bg-black hover:bg-zinc-800 text-white rounded text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer active:scale-95 shadow-xs"
            >
              <Share2 className="w-3 h-3 text-white" />
              <span className="hidden sm:inline">Share</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Canvas Viewport */}
      <div className="w-full h-full pt-8 sm:pt-9 flex items-center justify-center">
        <canvas ref={canvasRef} className="w-full h-full block bg-white" />
      </div>

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
