import React, { useState, useRef, useEffect, useCallback } from 'react';

export interface ThreePaneSplitProps {
  card1: React.ReactNode;
  card2: React.ReactNode;
  card3: React.ReactNode;
  divider1Accessories?: {
    leading?: React.ReactNode[];
    center?: React.ReactNode;
    trailing?: React.ReactNode[];
  };
  divider2Accessories?: {
    leading?: React.ReactNode[];
    center?: React.ReactNode;
    trailing?: React.ReactNode[];
  };
  className?: string;
}

export const ThreePaneSplit: React.FC<ThreePaneSplitProps> = ({
  card1,
  card2,
  card3,
  divider1Accessories,
  divider2Accessories,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Ratios for Card 1, Card 2, Card 3
  const [ratio1, setRatio1] = useState<number>(0.48);
  const [ratio2, setRatio2] = useState<number>(0.11);
  const [activeDrag, setActiveDrag] = useState<1 | 2 | null>(null);

  const startDrag1 = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setActiveDrag(1);
  };

  const startDrag2 = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setActiveDrag(2);
  };

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!activeDrag || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const relativeY = (e.clientY - rect.top) / rect.height;

      if (activeDrag === 1) {
        const clamped1 = Math.max(0.12, Math.min(0.60, relativeY));
        const maxCard2 = Math.max(0.12, 0.86 - clamped1);
        const newRatio2 = Math.min(ratio2, maxCard2);
        setRatio1(clamped1);
        setRatio2(newRatio2);
      } else if (activeDrag === 2) {
        const clampedBottom = Math.max(0.18, Math.min(0.88, relativeY));
        const newRatio2 = Math.max(0.12, clampedBottom - ratio1);
        setRatio2(newRatio2);
      }
    },
    [activeDrag, ratio1, ratio2]
  );

  const handlePointerUp = useCallback(() => {
    setActiveDrag(null);
  }, []);

  useEffect(() => {
    if (!activeDrag) return;
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [activeDrag, handlePointerMove, handlePointerUp]);

  const resetRatios = () => {
    setRatio1(0.48);
    setRatio2(0.11);
  };

  return (
    <div
      ref={containerRef}
      className={`ThreePaneSplit relative flex flex-col w-full h-full min-h-0 select-none overflow-hidden bg-[#09090b] gap-0.5 ${className}`}
    >
      {/* WINDOW CARD 1: TOP KINETIC STAGE */}
      <div
        className={`w-full rounded-[18px] sm:rounded-[22px] bg-white border border-white/[0.12] shadow-2xl relative overflow-hidden transition-all flex flex-col min-h-0 shrink-0 ${
          activeDrag ? 'duration-0' : 'duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]'
        }`}
        style={{
          height: `calc(${ratio1 * 100}% - 14px)`,
          minHeight: '80px',
        }}
      >
        <div className="w-full h-full overflow-y-auto no-scrollbar flex flex-col min-h-0">
          {card1}
        </div>
      </div>

      {/* DIVIDER BAR 1 */}
      <div
        role="separator"
        tabIndex={0}
        onPointerDown={startDrag1}
        onDoubleClick={resetRatios}
        className="relative w-full h-2.5 sm:h-3 flex items-center justify-between gap-1.5 px-2.5 z-30 bg-transparent border-0 cursor-row-resize touch-none select-none transition-colors shrink-0 overflow-x-auto no-scrollbar"
        style={{ touchAction: 'none' }}
        title="Drag to resize Window 1 & 2 (Double-click to reset)"
      >
        {/* Leading Accessories */}
        <div
          className="flex items-center gap-1 pointer-events-auto shrink-0"
          onPointerDown={e => e.stopPropagation()}
        >
          {divider1Accessories?.leading?.map((acc, idx) => (
            <React.Fragment key={idx}>{acc}</React.Fragment>
          ))}
        </div>

        {/* Center Accessory or Grabber */}
        {divider1Accessories?.center ? (
          <div
            className="flex items-center gap-1 pointer-events-auto shrink-0"
            onPointerDown={e => e.stopPropagation()}
          >
            {divider1Accessories.center}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center px-1 py-0.5 shrink-0">
            <div
              className={`w-6 h-0.5 rounded-full transition-all duration-150 ${
                activeDrag === 1
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
        >
          {divider1Accessories?.trailing?.map((acc, idx) => (
            <React.Fragment key={idx}>{acc}</React.Fragment>
          ))}
        </div>
      </div>

      {/* WINDOW CARD 2: MIDDLE TARGET WORD & HISTOGRAM FILTER */}
      <div
        className={`w-full relative overflow-hidden transition-all flex flex-col min-h-0 shrink-0 ${
          activeDrag ? 'duration-0' : 'duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]'
        }`}
        style={{
          height: `calc(${ratio2 * 100}% - 14px)`,
          minHeight: '44px',
        }}
      >
        <div className="w-full h-full overflow-y-auto min-h-0">
          {card2}
        </div>
      </div>

      {/* DIVIDER BAR 2 */}
      <div
        role="separator"
        tabIndex={0}
        onPointerDown={startDrag2}
        onDoubleClick={resetRatios}
        className="relative w-full h-2.5 sm:h-3 flex items-center justify-between gap-1.5 px-2.5 z-30 bg-transparent border-0 cursor-row-resize touch-none select-none transition-colors shrink-0 overflow-x-auto no-scrollbar"
        style={{ touchAction: 'none' }}
        title="Drag to resize Window 2 & 3 (Double-click to reset)"
      >
        {/* Leading Accessories */}
        <div
          className="flex items-center gap-1 pointer-events-auto shrink-0"
          onPointerDown={e => e.stopPropagation()}
        >
          {divider2Accessories?.leading?.map((acc, idx) => (
            <React.Fragment key={idx}>{acc}</React.Fragment>
          ))}
        </div>

        {/* Center Accessory or Grabber */}
        {divider2Accessories?.center ? (
          <div
            className="flex items-center gap-1 pointer-events-auto shrink-0"
            onPointerDown={e => e.stopPropagation()}
          >
            {divider2Accessories.center}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center px-1 py-0.5 shrink-0">
            <div
              className={`w-6 h-0.5 rounded-full transition-all duration-150 ${
                activeDrag === 2
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
        >
          {divider2Accessories?.trailing?.map((acc, idx) => (
            <React.Fragment key={idx}>{acc}</React.Fragment>
          ))}
        </div>
      </div>

      {/* WINDOW CARD 3: BOTTOM WORDS THAT FIT (LONGEST TO SHORTEST) */}
      <div
        className={`w-full relative overflow-hidden transition-all flex flex-col flex-1 min-h-0 ${
          activeDrag ? 'duration-0' : 'duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]'
        }`}
        style={{
          minHeight: '100px',
        }}
      >
        <div className="w-full h-full overflow-y-auto min-h-0">
          {card3}
        </div>
      </div>
    </div>
  );
};
