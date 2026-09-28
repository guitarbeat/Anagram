import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { SplitDivider } from './SplitDivider';

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
        const clamped1 = Math.max(0.06, Math.min(0.80, relativeY));
        const maxCard2 = Math.max(0.06, 0.92 - clamped1);
        const newRatio2 = Math.min(ratio2, maxCard2);
        setRatio1(clamped1);
        setRatio2(newRatio2);
      } else if (activeDrag === 2 && hasCard3) {
        if (hasStage) {
          const clampedBottom = Math.max(0.12, Math.min(0.94, relativeY));
          const newRatio2 = Math.max(0.06, clampedBottom - ratio1);
          setRatio2(newRatio2);
        } else {
          const clamped2 = Math.max(0.06, Math.min(0.60, relativeY));
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

  const applyPreset = (preset: 'balanced' | 'focusStage' | 'focusExplorer') => {
    setHasUserCustomized(true);
    setIsCard1Minimized(false);
    setIsCard3Minimized(false);
    setSoloCard(null);
    if (preset === 'balanced') {
      setRatio1(0.48);
      setRatio2(0.11);
    } else if (preset === 'focusStage') {
      setRatio1(0.72);
      setRatio2(0.09);
    } else if (preset === 'focusExplorer') {
      setRatio1(0.15);
      setRatio2(0.09);
    }
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
                  : `calc(${ratio1 * 100}% - 6px)`,
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
              className="w-full h-8 sm:h-9 bg-[#111114] hover:bg-[#18181c] border border-zinc-800 hover:border-zinc-700 rounded-[14px] flex items-center justify-between px-3 cursor-pointer transition-all shrink-0 text-white select-none shadow-sm group"
              title="Click to expand Kinetic Stage"
            >
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <span className="p-1 rounded-md bg-zinc-800/80 text-zinc-400 group-hover:text-zinc-200 transition-colors shrink-0">
                  <ChevronDown className="w-3.5 h-3.5 group-hover:translate-y-0.5 transition-transform" />
                </span>
                <span className="text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-200 group-hover:text-white transition-colors truncate">
                  Kinetic Stage
                </span>
                <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-zinc-800/90 text-zinc-400 border border-zinc-700/60 shrink-0">
                  MINIMIZED
                </span>
              </div>
              <span className="text-[9.5px] font-mono text-zinc-400 group-hover:text-zinc-200 font-bold uppercase tracking-wider shrink-0 transition-colors">
                Show Stage
              </span>
            </div>
          )}

          {/* DIVIDER BAR 1 */}
          <SplitDivider
            orientation="horizontal"
            isDragging={activeDrag === 1}
            onPointerDown={startDrag1}
            onDoubleClick={resetRatios}
            title="Drag to resize Stage & Input (Double-click to reset)"
            onCollapsePrev={toggleMinimizeCard1}
            collapsePrevTitle={isCard1Minimized ? 'Expand Stage' : 'Minimize Stage'}
            onCollapseNext={toggleMinimizeCard3}
            collapseNextTitle={isCard3Minimized ? 'Expand Explorer' : 'Minimize Explorer'}
            showReset={Boolean(hasUserCustomized || isCard1Minimized || isCard3Minimized || soloCard)}
            onReset={resetRatios}
            presets={
              <>
                <button
                  type="button"
                  onClick={() => applyPreset('focusStage')}
                  className="px-1.5 py-0.5 rounded bg-[#09090b]/80 border border-zinc-800 text-[8.5px] font-mono font-bold text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-all cursor-pointer hover:scale-105"
                  title="Focus Stage (70%)"
                >
                  Stage+
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('balanced')}
                  className="px-1.5 py-0.5 rounded bg-[#09090b]/80 border border-zinc-800 text-[8.5px] font-mono font-bold text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-all cursor-pointer hover:scale-105"
                  title="Balanced 50/50 Layout"
                >
                  Balanced
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('focusExplorer')}
                  className="px-1.5 py-0.5 rounded bg-[#09090b]/80 border border-zinc-800 text-[8.5px] font-mono font-bold text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-all cursor-pointer hover:scale-105"
                  title="Focus Explorer (70%)"
                >
                  Words+
                </button>
              </>
            }
          />
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
                : `calc(${ratio2 * 100}% - 6px)`
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
          <SplitDivider
            orientation="horizontal"
            isDragging={activeDrag === 2}
            onPointerDown={startDrag2}
            onDoubleClick={resetRatios}
            title="Drag to resize Word Explorer (Double-click to reset)"
            onCollapsePrev={toggleMinimizeCard1}
            collapsePrevTitle={isCard1Minimized ? 'Expand Stage' : 'Minimize Stage'}
            onCollapseNext={toggleMinimizeCard3}
            collapseNextTitle={isCard3Minimized ? 'Expand Explorer' : 'Minimize Explorer'}
            showReset={Boolean(hasUserCustomized || isCard1Minimized || isCard3Minimized || soloCard)}
            onReset={resetRatios}
          />

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
              className="w-full h-8 sm:h-9 bg-[#111114] hover:bg-[#18181c] border border-zinc-800 hover:border-zinc-700 rounded-[14px] flex items-center justify-between px-3 cursor-pointer transition-all shrink-0 text-white select-none shadow-sm group"
              title="Click to expand Word Explorer"
            >
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <span className="p-1 rounded-md bg-zinc-800/80 text-zinc-400 group-hover:text-zinc-200 group-hover:-translate-y-0.5 transition-transform shrink-0">
                  <ChevronUp className="w-3.5 h-3.5" />
                </span>
                <span className="text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-200 group-hover:text-white transition-colors truncate">
                  Word Explorer
                </span>
                <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-zinc-800/90 text-zinc-400 border border-zinc-700/60 shrink-0">
                  MINIMIZED
                </span>
              </div>
              <span className="text-[9.5px] font-mono text-zinc-400 group-hover:text-zinc-200 font-bold uppercase tracking-wider shrink-0 transition-colors">
                Show Explorer
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
};

