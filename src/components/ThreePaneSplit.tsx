import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Hash,
  Tag,
  LayoutGrid,
  BarChart3,
  ShieldCheck,
  RotateCcw,
  Network,
  Play,
  Pause,
  ChevronsUp,
  ChevronUp,
  ChevronDown,
  Rows2,
  Target,
  Type,
  Sparkles,
  Link2,
  Star,
  Zap,
} from 'lucide-react';
import { SplitDivider } from './SplitDivider';
import { TopWrapper, BottomWrapper } from './PanelWrappers';
import { IdlePeekDock } from './IdlePeekDock';
import { useSplitController } from '../hooks/useSplitController';
import type { SplitDetent, PanelId, SplitAccessory, WordFilterMode } from '../types/split';
import { SplitDetents } from '../types/split';
import type { LexicalViewMode } from './CandidateWordsList';
import type { ProgressBus } from '../hooks/useProgressBus';

interface ModeConfig {
  label: string;
  icon: React.ReactNode;
  getDescription: (count: number) => string;
}

const MODE_CONFIGS: Record<WordFilterMode, ModeConfig> = {
  safe: {
    label: 'Safe Words',
    icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />,
    getDescription: (count) => `Safe Words: Showing ${count} solvable words (avoids dead ends). Click to toggle modes.`,
  },
  all: {
    label: 'All Words',
    icon: <BookOpen className="w-3.5 h-3.5 text-zinc-300" />,
    getDescription: (count) => `All Words: Showing all ${count} candidate words. Click to toggle modes.`,
  },
  closers: {
    label: 'Closers',
    icon: <Sparkles className="w-3.5 h-3.5 text-amber-400" />,
    getDescription: (count) => `Exact Closers: ${count} instant 1-word solutions! Click to toggle modes.`,
  },
  pairs: {
    label: 'Pairs',
    icon: <Link2 className="w-3.5 h-3.5 text-cyan-400" />,
    getDescription: (count) => `Finisher Pairs: ${count} 2-word combinations. Click to toggle modes.`,
  },
  common: {
    label: 'Common',
    icon: <Star className="w-3.5 h-3.5 text-yellow-400" />,
    getDescription: (count) => `Common Words: ${count} top everyday English words. Click to toggle modes.`,
  },
  long: {
    label: 'Long Words',
    icon: <Zap className="w-3.5 h-3.5 text-purple-400" />,
    getDescription: (count) => `Long Words: ${count} words with 5+ letters. Click to toggle modes.`,
  },
};

export interface ThreePaneSplitProps {
  card1: React.ReactNode;
  card1Idle?: React.ReactNode;
  card2: React.ReactNode;
  card3: React.ReactNode;
  card3Idle?: React.ReactNode;
  isStageActive?: boolean;
  isKeyboardOpen?: boolean;
  detent?: SplitDetent;
  onDetentChange?: (detent: SplitDetent) => void;
  className?: string;

  // Kinetic Stage Scrubber
  progressBus?: ProgressBus;

  // Stage (Divider 1) Informative Complications
  isStagePlaying?: boolean;
  onToggleStagePlay?: () => void;
  onResetStage?: () => void;
  solveProgressPercent?: number;
  placedLetterCount?: number;
  sourceLetterCount?: number;
  remainingLettersCount?: number;

  // Explorer (Divider 2) Informative Complications
  inspectorCategory?: 'length' | 'pos';
  onInspectorCategoryChange?: (cat: 'length' | 'pos') => void;
  lexicalViewMode?: LexicalViewMode;
  onLexicalViewModeChange?: (mode: LexicalViewMode) => void;
  avoidDeadEnds?: boolean;
  onAvoidDeadEndsChange?: (val: boolean) => void;
  candidateWordsCount?: number;
  exactClosersCount?: number;
  finisherPairsCount?: number;
  solvableWordsCount?: number;
  wordFilterMode?: WordFilterMode;
  onCycleWordFilter?: () => void;
  countsByMode?: Record<WordFilterMode, number>;
  activeModeFilter?: 'all' | 'closers' | 'pairs';
  onSelectModeFilter?: (mode: 'all' | 'closers' | 'pairs') => void;
  explorerViewMode?: 'both' | 'graph' | 'inspector';
  onCycleExplorerView?: () => void;
  showGraphPanel?: boolean;
  onToggleGraphPanel?: () => void;
  showInspectorPanel?: boolean;
  onToggleInspectorPanel?: () => void;

  // Real-time Solver Indicator State
  isSolving?: boolean;
  justFoundResults?: boolean;
}

export const ThreePaneSplit: React.FC<ThreePaneSplitProps> = ({
  card1,
  card1Idle,
  card2,
  card3,
  card3Idle,
  isStageActive = false,
  isKeyboardOpen = false,
  detent,
  onDetentChange,
  className = '',
  progressBus,
  isStagePlaying = false,
  onToggleStagePlay,
  onResetStage,
  solveProgressPercent = 0,
  placedLetterCount = 0,
  sourceLetterCount = 0,
  remainingLettersCount,
  inspectorCategory,
  onInspectorCategoryChange,
  lexicalViewMode,
  onLexicalViewModeChange,
  avoidDeadEnds,
  onAvoidDeadEndsChange,
  candidateWordsCount,
  exactClosersCount = 0,
  finisherPairsCount = 0,
  solvableWordsCount = 0,
  wordFilterMode,
  onCycleWordFilter,
  countsByMode,
  activeModeFilter = 'all',
  onSelectModeFilter,
  explorerViewMode,
  onCycleExplorerView,
  showGraphPanel = true,
  onToggleGraphPanel,
  showInspectorPanel = true,
  onToggleInspectorPanel,
  isSolving = false,
  justFoundResults = false,
}) => {
  const hasStage = Boolean(isStageActive && card1);
  const hasCard3 = Boolean(card3);

  // Real-time animation progress subscription from progressBus
  const [stageProgress, setStageProgress] = useState<number>(() =>
    progressBus ? progressBus.get() : 0
  );

  useEffect(() => {
    if (!progressBus) return;
    return progressBus.subscribe((p) => {
      setStageProgress(p);
    });
  }, [progressBus]);

  const {
    containerRef,
    panelOrder,
    movePanel,
    draggedPanel,
    dropTargetIndex,
    startPanelDrag,
    detentLabel,
    currentDetent,
    isCard1Minimized,
    isCard3Minimized,
    soloCard,
    ratio1,
    activeDrag,
    showCard1,
    showCard3,
    topHeight,
    middleHeight,
    bottomHeight,
    startDrag1,
    startDrag2,
    resetRatios,
    toggleMinimizeCard1,
    toggleMinimizeCard3,
    cyclePresets,
    setDetent,
    setIsCard1Minimized,
    setIsCard3Minimized,
    setSoloCard,
    divider1MenuAccessories,
    divider2MenuAccessories,
  } = useSplitController({
    hasStage,
    hasCard3,
    isKeyboardOpen,
    defaultDetent: detent,
    onDetentChange,
  });

  // DIVIDER 1 MERGED CENTER WIDGET: Unified Bar-Integrated Scrubber & Tactile Drag Handle
  const divider1CenterContent =
    hasStage && progressBus ? (
      <div
        className="flex items-center justify-center gap-2 sm:gap-3 h-full select-none"
        onPointerDown={(e) => {
          // Allow interactive elements to stopPropagation, while non-interactive parts permit divider dragging
        }}
      >
        {/* Transport controls */}
        <div className="flex items-center gap-0.5" onPointerDown={(e) => e.stopPropagation()}>
          {onToggleStagePlay && (
            <button
              type="button"
              onClick={onToggleStagePlay}
              aria-label={isStagePlaying ? 'Pause animation' : 'Play animation'}
              title={isStagePlaying ? 'Pause Animation (Space)' : 'Play Animation (Space)'}
              className="h-5 w-5 flex items-center justify-center rounded text-zinc-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer active:scale-90"
            >
              {isStagePlaying ? (
                <Pause className="w-3 h-3 fill-current text-emerald-400" />
              ) : (
                <Play className="w-3 h-3 fill-current text-white ml-0.5" />
              )}
            </button>
          )}

          {onResetStage && (
            <button
              type="button"
              onClick={onResetStage}
              aria-label="Reset animation"
              title="Rewind Letter Tiles to Start (Key R)"
              className="h-5 w-5 flex items-center justify-center rounded text-zinc-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer active:scale-90"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Center: Integrated Bar Scrubber with Visible Track and Glowing Thumb */}
        <div
          className="flex items-center gap-2 w-36 sm:w-56 md:w-72 lg:w-80 group/slider"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="relative w-full h-1 sm:h-1.5 bg-zinc-800/90 hover:bg-zinc-700/80 rounded-full flex items-center cursor-ew-resize">
            {/* Filled track portion */}
            <div
              className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-zinc-300 via-white to-zinc-200 rounded-full pointer-events-none transition-all duration-75"
              style={{ width: `${Math.max(0, Math.min(1, stageProgress)) * 100}%` }}
            />
            {/* Hidden native input capturing dragging & scrubbing */}
            <input
              type="range"
              min={0}
              max={1}
              step={0.001}
              value={stageProgress}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                progressBus.set(val);
              }}
              aria-label="Kinetic rearrangement animation progress"
              className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-10"
            />
            {/* Smooth glowing thumb */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-white rounded-full shadow-[0_0_6px_rgba(255,255,255,0.9)] pointer-events-none group-hover/slider:scale-125 transition-transform"
              style={{ left: `${Math.max(0, Math.min(1, stageProgress)) * 100}%` }}
            />
          </div>
        </div>

        {/* Merged Percentage & Minimize Button (Replaces disjointed pipe and duplicate notch) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleMinimizeCard1();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          title={
            isCard1Minimized
              ? 'Click to expand Kinetic Stage (Drag divider to resize)'
              : 'Click to minimize Kinetic Stage (Drag divider to resize)'
          }
          className="flex items-center justify-center py-0.5 px-1.5 h-4 sm:h-4.5 rounded-full text-zinc-400 hover:text-white bg-zinc-800/60 hover:bg-zinc-700/80 border border-zinc-700/40 hover:border-zinc-500/60 cursor-pointer select-none group/notch active:scale-95 transition-all shadow-xs shrink-0"
        >
          <span
            className={`text-[9.5px] font-mono font-medium tabular-nums transition-colors ${
              activeDrag === 1 ? 'text-white font-bold' : ''
            }`}
          >
            {Math.round(stageProgress * 100)}%
          </span>
        </button>
      </div>
    ) : null;

  const resolvedDivider1Leading: SplitAccessory[] = [];

  // DIVIDER 1 TRAILING: Clean status (Solved badge when exact match)
  const resolvedDivider1Trailing: SplitAccessory[] = [
    ...(solveProgressPercent === 100
      ? [
          {
            id: 'solvedBanner',
            title: 'Exact Anagram Solved!',
            icon: <Sparkles className="w-3.5 h-3.5 text-emerald-400" />,
            label: <span className="text-emerald-300 font-semibold text-[11px]">Exact Match</span>,
            action: () => {},
            active: true,
          },
        ]
      : []),
  ];

  // DIVIDER 2 LEADING: Mode Filter (Cycles between Safe, All, Closers, Pairs, Common, Long)
  const currentMode = wordFilterMode || (avoidDeadEnds ? 'safe' : 'all');
  const safeCounts = countsByMode || {
    safe: solvableWordsCount || candidateWordsCount || 0,
    all: candidateWordsCount || 0,
    closers: exactClosersCount || 0,
    pairs: finisherPairsCount || 0,
    common: 0,
    long: 0,
  };

  // Current Explorer View Mode (Graph / Inspector / Both)
  const currentExplorerView =
    explorerViewMode ||
    (showGraphPanel && showInspectorPanel ? 'both' : showGraphPanel ? 'graph' : 'inspector');

  const viewConfigs: Record<
    'both' | 'graph' | 'inspector',
    { label: string; icon: React.ReactNode; title: string }
  > = {
    both: {
      label: 'Both',
      icon: <LayoutGrid className="w-3.5 h-3.5 text-cyan-400" />,
      title: 'Current view: Both (Graph + Inspector together). Click to switch to Graph.',
    },
    graph: {
      label: 'Graph',
      icon: <Network className="w-3.5 h-3.5 text-emerald-400" />,
      title: 'Current view: Graph only. Click to switch to Inspector.',
    },
    inspector: {
      label: 'Inspector',
      icon: <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />,
      title: 'Current view: Inspector only. Click to switch to Both.',
    },
  };

  const activeViewConfig = viewConfigs[currentExplorerView];

  // DIVIDER 2 LEADING: Mode Filter (Cycles between Safe, All, Closers, Pairs, Common, Long) - Minimal Single Icon Button
  const resolvedDivider2Leading: SplitAccessory[] = [
    {
      id: 'wordsFilterToggle',
      title: MODE_CONFIGS[currentMode].getDescription(safeCounts[currentMode]),
      icon: MODE_CONFIGS[currentMode].icon,
      // Minimal: No text label or count badge, just the single iconic toggle
      shortcut: 'S',
      action: onCycleWordFilter
        ? onCycleWordFilter
        : () => {
            if (activeModeFilter !== 'all') {
              onSelectModeFilter?.('all');
            } else {
              onAvoidDeadEndsChange?.(!avoidDeadEnds);
            }
          },
      active: true,
    },
  ];

  // DIVIDER 2 TRAILING: Single Merged View Mode Button (Toggles between Graph, Inspector, and Both) - Minimal Single Icon
  const resolvedDivider2Trailing: SplitAccessory[] = [
    {
      id: 'explorerViewToggle',
      title: activeViewConfig.title,
      icon: activeViewConfig.icon,
      // Minimal: No text label, just the iconic toggle
      shortcut: 'V',
      action: onCycleExplorerView
        ? onCycleExplorerView
        : () => {
            if (showGraphPanel && showInspectorPanel) {
              onToggleInspectorPanel?.();
            } else if (showGraphPanel) {
              onToggleGraphPanel?.();
              onToggleInspectorPanel?.();
            } else {
              onToggleGraphPanel?.();
            }
          },
      active: true,
    },
  ];

  // Filter only visible panels
  const visiblePanels = panelOrder.filter((id) => {
    if (id === 'stage') return hasStage;
    if (id === 'composer') return true;
    if (id === 'explorer') return hasCard3;
    return true;
  });

  const renderPanel = (panelId: PanelId, index: number) => {
    const isFirst = index === 0;
    const isLast = index === visiblePanels.length - 1;
    const isBeingDragged = draggedPanel === panelId;

    const isStageMinimized = isCard1Minimized || soloCard === 3;
    const isExplorerMinimized = isCard3Minimized || soloCard === 1;

    switch (panelId) {
      case 'stage':
        if (!hasStage) return null;
        return (
          <TopWrapper
            key="stage"
            id="stage"
            title="Kinetic Stage"
            isFirst={isFirst}
            isLast={isLast}
            isBeingDragged={isBeingDragged}
            onStartDrag={(e) => startPanelDrag('stage', e)}
            onMoveUp={() => movePanel('stage', 'up')}
            onMoveDown={() => movePanel('stage', 'down')}
            isMinimized={isStageMinimized}
            isFull={soloCard === 1}
            isResizing={activeDrag === 1}
            onRestore={() => {
              setIsCard1Minimized(false);
              setSoloCard(null);
            }}
            style={
              isStageMinimized
                ? { height: '34px', flex: 'none' }
                : isExplorerMinimized || !hasCard3
                ? { flex: '1 1 0%', minHeight: '120px' }
                : { flex: `${Math.max(0.18, Math.min(0.82, ratio1))} 1 0%`, minHeight: '100px' }
            }
            content={card1}
            overlay={
              card1Idle ? (
                card1Idle
              ) : (
                <IdlePeekDock
                  title="Kinetic Stage"
                  badge="PEEK IDLE"
                  actionLabel="Tap to expand"
                  direction="down"
                />
              )
            }
          />
        );

      case 'composer':
        return (
          <div
            key="composer"
            className={`w-full relative overflow-hidden flex flex-col min-h-0 flex-none shrink-0 bg-transparent ${
              activeDrag ? 'duration-0' : 'duration-350 ease-[cubic-bezier(0.16,1,0.3,1)]'
            } ${
              isBeingDragged
                ? 'opacity-80 ring-2 ring-white/40 shadow-2xl scale-[0.99] z-40'
                : ''
            }`}
            style={{
              height: isKeyboardOpen ? '58px' : '72px',
              minHeight: '56px',
            }}
          >
            <div className="w-full h-full flex flex-col justify-center min-h-0">
              {card2}
            </div>
          </div>
        );

      case 'explorer':
        if (!hasCard3) return null;
        return (
          <BottomWrapper
            key="explorer"
            id="explorer"
            title="Word Explorer"
            isFirst={isFirst}
            isLast={isLast}
            isBeingDragged={isBeingDragged}
            onStartDrag={(e) => startPanelDrag('explorer', e)}
            onMoveUp={() => movePanel('explorer', 'up')}
            onMoveDown={() => movePanel('explorer', 'down')}
            isMinimized={isExplorerMinimized}
            isFull={soloCard === 3}
            isResizing={activeDrag === 2}
            onRestore={() => {
              setIsCard3Minimized(false);
              setSoloCard(null);
            }}
            style={
              isExplorerMinimized
                ? { height: '34px', flex: 'none' }
                : isStageMinimized || !hasStage
                ? { flex: '1 1 0%', minHeight: '120px' }
                : { flex: `${Math.max(0.18, Math.min(0.82, 1 - ratio1))} 1 0%`, minHeight: '100px' }
            }
            content={card3}
            overlay={
              card3Idle ? (
                card3Idle
              ) : (
                <IdlePeekDock
                  title="Word Explorer"
                  badge="PEEK IDLE"
                  actionLabel="Tap to expand"
                  direction="up"
                />
              )
            }
          />
        );
    }
  };

  return (
    <div
      ref={containerRef}
      className={`ThreePaneSplit relative flex flex-col w-full h-full min-h-0 select-none overflow-hidden bg-[#09090b] gap-0.5 ${className}`}
    >
      {visiblePanels.map((panelId, index) => (
        <React.Fragment key={panelId}>
          {/* Drop indicator if hovering above this panel */}
          {draggedPanel && dropTargetIndex === index && (
            <div className="w-full h-1.5 py-0.5 my-0.5 flex items-center justify-center shrink-0 z-50">
              <div className="w-full h-1 bg-white rounded-full shadow-[0_0_12px_rgba(255,255,255,0.9)] animate-pulse" />
            </div>
          )}

          {renderPanel(panelId, index)}

          {/* Divider between adjacent visible panels */}
          {index < visiblePanels.length - 1 && (() => {
            const currentPanel = visiblePanels[index];
            const nextPanel = visiblePanels[index + 1];

            // If the next panel is explorer, this divider directly controls the Explorer panel (Divider 2)
            // If the current panel is stage, this divider directly controls the Stage panel (Divider 1)
            const isExplorerDivider = nextPanel === 'explorer' || currentPanel === 'explorer';
            const isDivider1 = currentPanel === 'stage' || (!isExplorerDivider && index === 0);

            return (
              <SplitDivider
                key={`divider-${currentPanel}-${nextPanel}`}
                orientation="horizontal"
                isDragging={isDivider1 ? activeDrag === 1 : activeDrag === 2}
                onPointerDown={isDivider1 ? startDrag1 : startDrag2}
                onDoubleClick={cyclePresets}
                title="Drag to resize panel split"
                onToggleCollapse={isDivider1 ? toggleMinimizeCard1 : toggleMinimizeCard3}
                isCollapsed={isDivider1 ? isCard1Minimized : isCard3Minimized}
                collapseTooltip={
                  isDivider1
                    ? isCard1Minimized
                      ? 'Click to expand Kinetic Stage (Drag to resize)'
                      : 'Click to minimize Kinetic Stage (Drag to resize)'
                    : isCard3Minimized
                    ? 'Click to expand Word Explorer (Drag to resize)'
                    : 'Click to minimize Word Explorer (Drag to resize)'
                }
                isBusy={isExplorerDivider && isSolving}
                isSuccess={isExplorerDivider && justFoundResults}
                statusTooltip={
                  isExplorerDivider
                    ? isSolving
                      ? 'Solver calculating anagram permutations...'
                      : justFoundResults
                      ? 'New anagram candidates found!'
                      : 'Drag to resize panel split'
                    : 'Drag to resize panel split'
                }
                centerContent={isDivider1 ? divider1CenterContent : undefined}
                leadingAccessories={isDivider1 ? resolvedDivider1Leading : resolvedDivider2Leading}
                trailingAccessories={isDivider1 ? resolvedDivider1Trailing : resolvedDivider2Trailing}
              />
            );
          })()}

          {/* Drop indicator if hovering below the last panel */}
          {draggedPanel && index === visiblePanels.length - 1 && dropTargetIndex === visiblePanels.length && (
            <div className="w-full h-1.5 py-0.5 my-0.5 flex items-center justify-center shrink-0 z-50">
              <div className="w-full h-1 bg-white rounded-full shadow-[0_0_12px_rgba(255,255,255,0.9)] animate-pulse" />
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};
