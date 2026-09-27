import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ChevronUp,
  ChevronDown,
  Maximize2,
  Minimize2,
  RotateCcw,
} from 'lucide-react';

export interface ThreePaneSplitProps {
  card1: React.ReactNode;
  card2: React.ReactNode;
  card3: React.ReactNode;
  isStageActive?: boolean;
  isKeyboardOpen?: boolean;
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
  isStageActive = false,
  isKeyboardOpen = false,
  divider1Accessories,
  divider2Accessories,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Track if user manually customized ratios via drag
  const [hasUserCustomized, setHasUserCustomized] = useState<boolean>(false);

  const hasStage = Boolean(isStageActive && card1);
  const hasCard3 = Boolean(card3);

  // Minimization / Solo panel states
  const [isCard1Minimized, setIsCard1Minimized] = useState<boolean>(false);
  const [isCard3Minimized, setIsCard3Minimized] = useState<boolean>(false);
  const [soloCard, setSoloCard] = useState<1 | 3 | null>(null);

  // Default ratios:
  // When stage is active: Card 1 gets 48%, Card 2 gets 11%, Card 3 gets remaining 41%
  const [ratio1, setRatio1] = useState<number>(0.48);
  const [ratio2, setRatio2] = useState<number>(0.11);
  const [activeDrag, setActiveDrag] = useState<1 | 2 | null>(null);

  const startDrag1 = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setHasUserCustomized(true);
    setIsCard1Minimized(false);
    setSoloCard(null);
    setActiveDrag(1);
  };

  const startDrag2 = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setHasUserCustomized(true);
    setIsCard3Minimized(false);
    setSoloCard(null);
    setActiveDrag(2);
  };

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!activeDrag || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const relativeY = (e.clientY - rect.top) / rect.height;

      if (activeDrag === 1 && hasStage) {
        const clamped1 = Math.max(0.12, Math.min(0.65, relativeY));
        const maxCard2 = Math.max(0.10, 0.86 - clamped1);
        const newRatio2 = Math.min(ratio2, maxCard2);
        setRatio1(clamped1);
        setRatio2(newRatio2);
      } else if (activeDrag === 2 && hasCard3) {
        if (hasStage) {
          const clampedBottom = Math.max(0.18, Math.min(0.88, relativeY));
          const newRatio2 = Math.max(0.09, clampedBottom - ratio1);
          setRatio2(newRatio2);
        } else {
          const clamped2 = Math.max(0.08, Math.min(0.45, relativeY));
          setRatio2(clamped2);
        }
      }
    },
    [activeDrag, hasStage, hasCard3, ratio1, ratio2]
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
    setHasUserCustomized(false);
    setIsCard1Minimized(false);
    setIsCard3Minimized(false);
    setSoloCard(null);
    setRatio1(0.48);
    setRatio2(0.11);
  };

  const toggleMinimizeCard1 = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSoloCard(null);
    setIsCard1Minimized(prev => !prev);
  };

  const toggleMinimizeCard3 = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSoloCard(null);
    setIsCard3Minimized(prev => !prev);
  };

  const toggleSoloCard1 = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (soloCard === 1) {
      setSoloCard(null);
    } else {
      setSoloCard(1);
      setIsCard1Minimized(false);
      setIsCard3Minimized(false);
    }
  };

  const toggleSoloCard3 = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (soloCard === 3) {
      setSoloCard(null);
    } else {
      setSoloCard(3);
      setIsCard1Minimized(false);
      setIsCard3Minimized(false);
    }
  };

  // Calculate actual height behavior
  const showCard1 = hasStage && !isCard1Minimized && soloCard !== 3;
  const showCard3 = hasCard3 && !isCard3Minimized && soloCard !== 1;

  return (
    <div
      ref={containerRef}
      className={`ThreePaneSplit relative flex flex-col w-full h-full min-h-0 select-none overflow-hidden bg-[#09090b] gap-0.5 ${className}`}
    >
      {/* WINDOW CARD 1: TOP KINETIC STAGE */}
      {hasStage && (
        <>
          {showCard1 ? (
            <div
              className={`w-full rounded-[18px] sm:rounded-[22px] bg-white border border-white/[0.12] shadow-2xl relative overflow-hidden transition-all flex flex-col min-h-0 shrink-0 ${
                activeDrag ? 'duration-0' : 'duration-300 ease-out'
              }`}
              style={{
                height: soloCard === 1
                  ? 'calc(100% - 70px)'
                  : isKeyboardOpen
                  ? '78px'
                  : !showCard3
                  ? 'calc(100% - 70px)'
                  : `calc(${ratio1 * 100}% - 14px)`,
                minHeight: isKeyboardOpen ? '60px' : '80px',
              }}
            >
              <div className="w-full h-full overflow-y-auto no-scrollbar flex flex-col min-h-0">
                {card1}
              </div>
            </div>
          ) : (
            /* Minimized Stage Pill Banner */
            <div
              onClick={() => {
                setIsCard1Minimized(false);
                setSoloCard(null);
              }}
              className="w-full h-6 bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700/60 rounded-xl flex items-center justify-between px-3 cursor-pointer transition-colors shrink-0"
              title="Click to expand Kinetic Stage"
            >
              <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <ChevronDown className="w-3 h-3 text-emerald-400" />
                Kinetic Stage (Minimized)
              </span>
              <span className="text-[9px] font-mono text-emerald-400 font-bold uppercase">
                Show Stage
              </span>
            </div>
          )}

          {/* DIVIDER BAR 1 */}
          <div
            role="separator"
            tabIndex={0}
            onPointerDown={startDrag1}
            onDoubleClick={resetRatios}
            className={`relative w-full h-3 sm:h-3.5 flex items-center justify-between gap-1.5 px-2 z-30 cursor-row-resize touch-none select-none transition-colors shrink-0 overflow-x-auto no-scrollbar hover:bg-white/10 active:bg-white/20 ${
              activeDrag === 1 ? 'bg-white/15' : 'bg-transparent'
            }`}
            style={{ touchAction: 'none' }}
            title="Drag to resize Window 1 & 2 (Double-click to reset layout)"
          >
            {/* Leading Accessories & Minimize/Solo Buttons */}
            <div
              className="flex items-center gap-1 pointer-events-auto shrink-0"
              onPointerDown={e => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={toggleMinimizeCard1}
                className="px-1.5 py-0.5 rounded bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center gap-1 text-[9px] font-mono transition-colors"
                title={isCard1Minimized ? 'Expand Stage' : 'Minimize Stage'}
              >
                {isCard1Minimized ? (
                  <ChevronDown className="w-2.5 h-2.5 text-emerald-400" />
                ) : (
                  <ChevronUp className="w-2.5 h-2.5 text-zinc-400" />
                )}
                <span>{isCard1Minimized ? 'Show Stage' : 'Stage'}</span>
              </button>

              <button
                type="button"
                onClick={toggleSoloCard1}
                className={`p-0.5 rounded transition-colors ${
                  soloCard === 1
                    ? 'bg-emerald-600 text-white'
                    : 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white'
                }`}
                title={soloCard === 1 ? 'Restore Split' : 'Solo Stage Fullscreen'}
              >
                {soloCard === 1 ? (
                  <Minimize2 className="w-2.5 h-2.5" />
                ) : (
                  <Maximize2 className="w-2.5 h-2.5" />
                )}
              </button>

              {divider1Accessories?.leading?.map((acc, idx) => (
                <React.Fragment key={idx}>{acc}</React.Fragment>
              ))}
            </div>

            {/* Center Accessory / Drag Handle */}
            <div
              className="flex items-center gap-1 pointer-events-auto shrink-0 opacity-40 hover:opacity-100 transition-opacity"
              onPointerDown={e => e.stopPropagation()}
            >
              {divider1Accessories?.center || (
                <div className="w-8 h-1 rounded-full bg-zinc-600" />
              )}
            </div>

            {/* Trailing Accessories */}
            <div
              className="flex items-center gap-1 pointer-events-auto shrink-0"
              onPointerDown={e => e.stopPropagation()}
            >
              {(hasUserCustomized || isCard1Minimized || isCard3Minimized || soloCard) && (
                <button
                  type="button"
                  onClick={resetRatios}
                  className="p-1 rounded bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                  title="Reset layout proportions"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                </button>
              )}
              {divider1Accessories?.trailing?.map((acc, idx) => (
                <React.Fragment key={idx}>{acc}</React.Fragment>
              ))}
            </div>
          </div>
        </>
      )}

      {/* WINDOW CARD 2: MIDDLE TARGET WORD & INPUT ROW */}
      <div
        className={`w-full relative overflow-hidden transition-all flex flex-col min-h-0 shrink-0 ${
          !showCard3 && !showCard1 ? 'flex-1 justify-center' : ''
        } ${activeDrag ? 'duration-0' : 'duration-300 ease-out'}`}
        style={{
          height: showCard3
            ? showCard1
              ? isKeyboardOpen
                ? '50px'
                : `calc(${ratio2 * 100}% - 14px)`
              : hasUserCustomized
              ? `${ratio2 * 100}%`
              : '54px'
            : '54px',
          minHeight: showCard1 ? '44px' : '52px',
        }}
      >
        <div className="w-full h-full overflow-y-auto min-h-0">
          {card2}
        </div>
      </div>

      {/* DIVIDER BAR 2 & CARD 3 */}
      {hasCard3 && (
        <>
          {/* DIVIDER BAR 2 */}
          <div
            role="separator"
            tabIndex={0}
            onPointerDown={startDrag2}
            onDoubleClick={resetRatios}
            className={`relative w-full h-3 sm:h-3.5 flex items-center justify-between gap-1.5 px-2 z-30 cursor-row-resize touch-none select-none transition-colors shrink-0 overflow-x-auto no-scrollbar hover:bg-white/10 active:bg-white/20 ${
              activeDrag === 2 ? 'bg-white/15' : 'bg-transparent'
            }`}
            style={{ touchAction: 'none' }}
            title="Drag to resize Window 2 & 3 (Double-click to reset layout)"
          >
            {/* Leading Accessories & Minimize/Solo Buttons */}
            <div
              className="flex items-center gap-1 pointer-events-auto shrink-0"
              onPointerDown={e => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={toggleMinimizeCard3}
                className="px-1.5 py-0.5 rounded bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center gap-1 text-[9px] font-mono transition-colors"
                title={isCard3Minimized ? 'Expand Explorer' : 'Minimize Explorer'}
              >
                {isCard3Minimized ? (
                  <ChevronUp className="w-2.5 h-2.5 text-emerald-400" />
                ) : (
                  <ChevronDown className="w-2.5 h-2.5 text-zinc-400" />
                )}
                <span>{isCard3Minimized ? 'Show Explorer' : 'Explorer'}</span>
              </button>

              <button
                type="button"
                onClick={toggleSoloCard3}
                className={`p-0.5 rounded transition-colors ${
                  soloCard === 3
                    ? 'bg-emerald-600 text-white'
                    : 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white'
                }`}
                title={soloCard === 3 ? 'Restore Split' : 'Solo Explorer Fullscreen'}
              >
                {soloCard === 3 ? (
                  <Minimize2 className="w-2.5 h-2.5" />
                ) : (
                  <Maximize2 className="w-2.5 h-2.5" />
                )}
              </button>

              {divider2Accessories?.leading?.map((acc, idx) => (
                <React.Fragment key={idx}>{acc}</React.Fragment>
              ))}
            </div>

            {/* Center Drag Handle */}
            <div
              className="flex items-center gap-1 pointer-events-auto shrink-0 opacity-40 hover:opacity-100 transition-opacity"
              onPointerDown={e => e.stopPropagation()}
            >
              {divider2Accessories?.center || (
                <div className="w-8 h-1 rounded-full bg-zinc-600" />
              )}
            </div>

            {/* Trailing Accessories */}
            <div
              className="flex items-center gap-1 pointer-events-auto shrink-0"
              onPointerDown={e => e.stopPropagation()}
            >
              {(hasUserCustomized || isCard1Minimized || isCard3Minimized || soloCard) && (
                <button
                  type="button"
                  onClick={resetRatios}
                  className="p-1 rounded bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                  title="Reset layout proportions"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                </button>
              )}
              {divider2Accessories?.trailing?.map((acc, idx) => (
                <React.Fragment key={idx}>{acc}</React.Fragment>
              ))}
            </div>
          </div>

          {/* WINDOW CARD 3: BOTTOM WORDS THAT FIT & GRAPH */}
          {showCard3 ? (
            <div
              className={`w-full relative overflow-hidden transition-all flex flex-col flex-1 min-h-0 ${
                activeDrag ? 'duration-0' : 'duration-300 ease-out'
              }`}
              style={{
                minHeight: '100px',
              }}
            >
              <div className="w-full h-full overflow-y-auto min-h-0">
                {card3}
              </div>
            </div>
          ) : (
            /* Minimized Explorer Pill Banner */
            <div
              onClick={() => {
                setIsCard3Minimized(false);
                setSoloCard(null);
              }}
              className="w-full h-6 bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700/60 rounded-xl flex items-center justify-between px-3 cursor-pointer transition-colors shrink-0"
              title="Click to expand Word Explorer"
            >
              <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <ChevronUp className="w-3 h-3 text-emerald-400" />
                Word Explorer (Minimized)
              </span>
              <span className="text-[9px] font-mono text-emerald-400 font-bold uppercase">
                Show Explorer
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
};

