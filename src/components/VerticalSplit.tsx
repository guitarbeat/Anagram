import React, { useState, useRef, useEffect, useCallback } from 'react';

export type SplitDetentType = 'topMini' | 'balanced' | 'bottomMini';

export interface VerticalSplitProps {
  topTitle?: string;
  bottomTitle?: string;
  top: React.ReactNode;
  bottom: React.ReactNode;
  topMiniOverlay?: React.ReactNode;
  bottomMiniOverlay?: React.ReactNode;
  leadingAccessories?: React.ReactNode[];
  centerAccessory?: React.ReactNode;
  trailingAccessories?: React.ReactNode[];
  initialDetent?: SplitDetentType;
  onDetentChange?: (detent: SplitDetentType) => void;
  className?: string;
}

export const VerticalSplit: React.FC<VerticalSplitProps> = ({
  topTitle = 'Stage',
  bottomTitle = 'Results',
  top,
  bottom,
  topMiniOverlay,
  bottomMiniOverlay,
  leadingAccessories = [],
  centerAccessory,
  trailingAccessories = [],
  initialDetent = 'balanced',
  onDetentChange,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Detent percentage targets
  const DETENT_RATIOS: Record<SplitDetentType, number> = {
    topMini: 0.11,
    balanced: 0.48,
    bottomMini: 0.88,
  };

  const [ratio, setRatio] = useState<number>(() => DETENT_RATIOS[initialDetent] || 0.48);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const ratioRef = useRef<number>(ratio);
  ratioRef.current = ratio;

  const isTopMini = ratio <= 0.20;
  const isBottomMini = ratio >= 0.80;

  // Linear interpolation for smooth overlay crossfade
  const topFactor = Math.max(0, Math.min(1, (ratio - 0.10) / 0.15));
  const bottomFactor = Math.max(0, Math.min(1, (0.89 - ratio) / 0.15));

  const updateRatio = useCallback(
    (newRatio: number) => {
      const clamped = Math.max(0.10, Math.min(0.89, newRatio));
      setRatio(clamped);
      if (clamped <= 0.20) {
        onDetentChange?.('topMini');
      } else if (clamped >= 0.80) {
        onDetentChange?.('bottomMini');
      } else {
        onDetentChange?.('balanced');
      }
    },
    [onDetentChange]
  );

  const snapTo = useCallback(
    (detent: SplitDetentType) => {
      const target = DETENT_RATIOS[detent];
      setRatio(target);
      onDetentChange?.(detent);
    },
    [onDetentChange]
  );

  // Pointer drag handling on divider
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (e: PointerEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const clientY = e.clientY;
      const offset = clientY - rect.top;
      const newRatio = offset / rect.height;
      updateRatio(newRatio);
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      const current = ratioRef.current;
      if (current < 0.22) {
        snapTo('topMini');
      } else if (current > 0.77) {
        snapTo('bottomMini');
      } else if (Math.abs(current - 0.48) < 0.12) {
        snapTo('balanced');
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [isDragging, updateRatio, snapTo]);

  // Keyboard accessibility (only when separator div itself is focused, not inputs inside)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) {
      return;
    }
    const targetEl = e.target as HTMLElement | null;
    if (
      targetEl &&
      (targetEl.tagName === 'INPUT' ||
        targetEl.tagName === 'TEXTAREA' ||
        targetEl.tagName === 'SELECT' ||
        targetEl.isContentEditable)
    ) {
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      updateRatio(ratio - 0.08);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      updateRatio(ratio + 0.08);
    } else if (e.key === 'Home') {
      e.preventDefault();
      snapTo('topMini');
    } else if (e.key === 'End') {
      e.preventDefault();
      snapTo('bottomMini');
    } else if (e.key === 'Enter') {
      e.preventDefault();
      snapTo('balanced');
    }
  };

  return (
    <div
      ref={containerRef}
      className={`VerticalSplit relative flex flex-col w-full h-full min-h-0 select-none overflow-hidden bg-[#09090b] ${className}`}
    >
      {/* TOP VIEW CARD */}
      <div
        className={`w-full rounded-[20px] sm:rounded-[24px] bg-white border border-white/[0.12] shadow-2xl relative overflow-hidden transition-all flex flex-col min-h-0 shrink-0 ${
          isDragging ? 'duration-0' : 'duration-400 ease-[cubic-bezier(0.32,0.72,0,1)]'
        }`}
        style={{
          height: `calc(${ratio * 100}% - 20px)`,
        }}
      >
        {/* Full Top Content */}
        <div
          className="w-full h-full overflow-y-auto no-scrollbar transition-all duration-300 flex flex-col min-h-0"
          style={{
            opacity: isTopMini ? 0 : topFactor,
            filter: `blur(${(1 - topFactor) * 8}px)`,
            transform: `scale(${0.97 + topFactor * 0.03})`,
            pointerEvents: isTopMini ? 'none' : 'auto',
          }}
        >
          {top}
        </div>

        {/* Top Mini Overlay */}
        {topMiniOverlay && (
          <div
            onClick={() => snapTo('balanced')}
            className="absolute inset-0 flex items-center justify-between px-4 sm:px-6 cursor-pointer bg-[#141418] hover:bg-[#18181e] transition-all duration-300"
            style={{
              opacity: 1 - topFactor,
              pointerEvents: isTopMini ? 'auto' : 'none',
              transform: `translateY(${topFactor * -8}px)`,
            }}
            title={`Expand ${topTitle}`}
          >
            {topMiniOverlay}
          </div>
        )}
      </div>

      {/* MERGED UNIFIED DIVIDER BAR */}
      <div
        role="separator"
        tabIndex={0}
        aria-valuenow={Math.round(ratio * 100)}
        aria-valuemin={10}
        aria-valuemax={90}
        aria-orientation="horizontal"
        onPointerDown={handlePointerDown}
        onDoubleClick={() => snapTo('balanced')}
        onKeyDown={handleKeyDown}
        className="relative w-full h-5 sm:h-6 flex items-center justify-between gap-1.5 px-2.5 z-30 bg-transparent border-0 cursor-row-resize touch-none select-none transition-colors duration-150 shrink-0 overflow-x-auto no-scrollbar"
        style={{ touchAction: 'none' }}
      >
        {/* Leading Accessories */}
        <div
          className="flex items-center gap-1 pointer-events-auto shrink-0"
          onPointerDown={e => e.stopPropagation()}
          onKeyDown={e => e.stopPropagation()}
          onKeyUp={e => e.stopPropagation()}
        >
          {leadingAccessories.map((accessory, idx) => (
            <React.Fragment key={idx}>{accessory}</React.Fragment>
          ))}
        </div>

        {/* Center Accessory or Minimal Grabber Indicator */}
        {centerAccessory ? (
          <div
            className="flex items-center gap-1 pointer-events-auto shrink-0"
            onPointerDown={e => e.stopPropagation()}
            onKeyDown={e => e.stopPropagation()}
            onKeyUp={e => e.stopPropagation()}
          >
            {centerAccessory}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center px-1 py-0.5 shrink-0">
            <div
              className={`w-6 h-0.5 rounded-full transition-all duration-150 ${
                isDragging
                  ? 'bg-emerald-400 w-10'
                  : 'bg-zinc-600 hover:bg-zinc-400'
              }`}
            />
          </div>
        )}

        {/* Trailing Accessories */}
        <div
          className="flex items-center gap-1 pointer-events-auto shrink-0"
          onPointerDown={e => e.stopPropagation()}
          onKeyDown={e => e.stopPropagation()}
          onKeyUp={e => e.stopPropagation()}
        >
          {trailingAccessories.map((accessory, idx) => (
            <React.Fragment key={idx}>{accessory}</React.Fragment>
          ))}
        </div>
      </div>

      {/* BOTTOM VIEW CARD */}
      <div
        className={`w-full rounded-[20px] sm:rounded-[24px] bg-[#121215] border border-white/[0.08] shadow-2xl relative overflow-hidden transition-all flex flex-col flex-1 min-h-0 ${
          isDragging ? 'duration-0' : 'duration-400 ease-[cubic-bezier(0.32,0.72,0,1)]'
        }`}
      >
        {/* Full Bottom Content */}
        <div
          className="w-full h-full overflow-y-auto transition-all duration-300 min-h-0"
          style={{
            opacity: isBottomMini ? 0 : bottomFactor,
            filter: `blur(${(1 - bottomFactor) * 8}px)`,
            transform: `scale(${0.97 + bottomFactor * 0.03})`,
            pointerEvents: isBottomMini ? 'none' : 'auto',
          }}
        >
          {bottom}
        </div>

        {/* Bottom Mini Overlay */}
        {bottomMiniOverlay && (
          <div
            onClick={() => snapTo('balanced')}
            className="absolute inset-0 flex items-center justify-between px-4 sm:px-6 cursor-pointer bg-[#141418] hover:bg-[#18181e] transition-all duration-300"
            style={{
              opacity: 1 - bottomFactor,
              pointerEvents: isBottomMini ? 'auto' : 'none',
              transform: `translateY(${bottomFactor * 8}px)`,
            }}
            title={`Expand ${bottomTitle}`}
          >
            {bottomMiniOverlay}
          </div>
        )}
      </div>
    </div>
  );
};
