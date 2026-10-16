import React, { useState, useEffect, useRef } from 'react';
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
  Check,
  Layers,
  Globe,
  SlidersHorizontal,
  Theater,
} from 'lucide-react';
import { triggerHaptic } from '../hooks/useHaptics';
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
  sublabel: string;
  icon: React.ReactNode;
  color: string;
  dotColor: string;
  getDescription: (count: number) => string;
}

const MODE_CONFIGS: Record<WordFilterMode, ModeConfig> = {
  safe: {
    label: 'Solvable Words',
    sublabel: 'No dead ends',
    icon: <ShieldCheck className="w-3.5 h-3.5 text-white" />,
    color: 'text-white',
    dotColor: 'bg-white',
    getDescription: (count) => `Solvable Words (${count}): Words you can win with. Click to cycle, right-click for menu.`,
  },
  domains: {
    label: 'Domains & TLDs',
    sublabel: 'Global extensions',
    icon: <Globe className="w-3.5 h-3.5 text-white" />,
    color: 'text-white',
    dotColor: 'bg-white',
    getDescription: (count) => `Domains & TLDs (${count}): Global ccTLDs and web extensions. Click to cycle.`,
  },
  all: {
    label: 'All Words',
    sublabel: 'All matches',
    icon: <BookOpen className="w-3.5 h-3.5 text-zinc-300" />,
    color: 'text-zinc-300',
    dotColor: 'bg-zinc-400',
    getDescription: (count) => `All Words (${count}): Complete dictionary. Click to cycle, right-click for menu.`,
  },
  closers: {
    label: '1-Word Solutions',
    sublabel: 'Instant wins',
    icon: <Sparkles className="w-3.5 h-3.5 text-white" />,
    color: 'text-white',
    dotColor: 'bg-white',
    getDescription: (count) => `1-Word Solutions (${count}): Words that finish the puzzle right now. Click to cycle, right-click for menu.`,
  },
  pairs: {
    label: '2-Word Solutions',
    sublabel: 'Two-word finishes',
    icon: <Link2 className="w-3.5 h-3.5 text-zinc-200" />,
    color: 'text-zinc-200',
    dotColor: 'bg-zinc-300',
    getDescription: (count) => `2-Word Solutions (${count}): Word pairs that finish the puzzle. Click to cycle, right-click for menu.`,
  },
  common: {
    label: 'Common Words',
    sublabel: 'Everyday English',
    icon: <Star className="w-3.5 h-3.5 text-zinc-200" />,
    color: 'text-zinc-200',
    dotColor: 'bg-zinc-300',
    getDescription: (count) => `Common Words (${count}): Familiar everyday words. Click to cycle, right-click for menu.`,
  },
  long: {
    label: 'Long Words',
    sublabel: '5+ letters',
    icon: <Zap className="w-3.5 h-3.5 text-zinc-200" />,
    color: 'text-zinc-200',
    dotColor: 'bg-zinc-300',
    getDescription: (count) => `Long Words (${count}): Words with 5 or more letters. Click to cycle, right-click for menu.`,
  },
  top: {
    label: 'Top Everyday',
    sublabel: 'Most frequent',
    icon: <Star className="w-3.5 h-3.5 text-white" />,
    color: 'text-white',
    dotColor: 'bg-white',
    getDescription: (count) => `Top Everyday Words (${count}): High-frequency spoken vocabulary. Click to cycle, right-click for menu.`,
  },
  rare: {
    label: 'Rare & Literary',
    sublabel: 'Specialized words',
    icon: <Sparkles className="w-3.5 h-3.5 text-zinc-300" />,
    color: 'text-zinc-300',
    dotColor: 'bg-zinc-400',
    getDescription: (count) => `Rare & Literary Words (${count}): Less common or poetic words. Click to cycle, right-click for menu.`,
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
  onExportStageVideo?: () => void;
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
  onSelectWordFilterMode?: (mode: WordFilterMode) => void;
  countsByMode?: Record<WordFilterMode, number>;
  activeModeFilter?: 'all' | 'closers' | 'pairs';
  onSelectModeFilter?: (mode: 'all' | 'closers' | 'pairs') => void;
  explorerViewMode?:
    | 'both'
    | 'graph'
    | 'inspector'
    | 'blocks'
    | 'pebbles'
    | 'solutions'
    | 'cards';
  onCycleExplorerView?: () => void;
  onSelectExplorerView?: (
    mode: 'both' | 'graph' | 'inspector' | 'blocks' | 'pebbles' | 'solutions'
  ) => void;
  showGraphPanel?: boolean;
  onToggleGraphPanel?: () => void;
  showInspectorPanel?: boolean;
  onToggleInspectorPanel?: () => void;

  // Real-time Solver Indicator State
  isSolving?: boolean;
  justFoundResults?: boolean;

  // Collapsible Composer Dock State
  isComposerCollapsed?: boolean;
  onToggleComposerCollapse?: () => void;
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
  onExportStageVideo,
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
  onSelectWordFilterMode,
  countsByMode,
  activeModeFilter = 'all',
  onSelectModeFilter,
  explorerViewMode,
  onCycleExplorerView,
  onSelectExplorerView,
  showGraphPanel = true,
  onToggleGraphPanel,
  showInspectorPanel = true,
  onToggleInspectorPanel,
  isSolving = false,
  justFoundResults = false,
  isComposerCollapsed: externalComposerCollapsed,
  onToggleComposerCollapse,
}) => {
  const hasStage = Boolean(isStageActive && card1);
  const hasCard3 = Boolean(card3);

  // Internal collapsible composer state if not managed externally
  const [internalComposerCollapsed, setInternalComposerCollapsed] = useState<boolean>(false);
  const isComposerCollapsed =
    externalComposerCollapsed !== undefined ? externalComposerCollapsed : internalComposerCollapsed;
  const handleToggleComposerCollapse =
    onToggleComposerCollapse || (() => setInternalComposerCollapsed((prev) => !prev));

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

  // Divider 1 Split Presets Popover Menu state
  const [showDivider1Menu, setShowDivider1Menu] = useState(false);
  const divider1MenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showDivider1Menu) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (divider1MenuRef.current && !divider1MenuRef.current.contains(e.target as Node)) {
        setShowDivider1Menu(false);
      }
    };
    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, [showDivider1Menu]);

  // DIVIDER 1 LEADING ACCESSORIES: Stage Transport & Progress Scrubber
  const resolvedDivider1Leading: SplitAccessory[] = [
    ...(onToggleStagePlay
      ? [
          {
            id: 'stagePlayToggle',
            title: isStagePlaying ? 'Pause Animation' : 'Play Kinetic Animation',
            icon: isStagePlaying ? (
              <Pause className="w-3 h-3 fill-current text-white" />
            ) : (
              <Play className="w-3 h-3 fill-current text-white ml-0.5" />
            ),
            action: onToggleStagePlay,
            active: isStagePlaying,
          },
        ]
      : []),
    ...(onResetStage
      ? [
          {
            id: 'stageReset',
            title: 'Rewind Animation',
            icon: <RotateCcw className="w-3 h-3" />,
            action: onResetStage,
          },
        ]
      : []),
    ...(hasStage && progressBus
      ? [
          {
            id: 'stageScrubberPill',
            title: `Progress: ${Math.round(stageProgress * 100)}%`,
            customContent: (
              <div
                className="flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 rounded-full bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 transition-colors"
                onPointerDown={(e) => e.stopPropagation()}
              >
                <div className="relative w-14 sm:w-20 md:w-28 h-1 bg-zinc-800 hover:bg-zinc-700 rounded-full flex items-center cursor-ew-resize group/slider">
                  <div
                    className="absolute left-0 top-0 bottom-0 bg-white rounded-full transition-all duration-75"
                    style={{ width: `${Math.max(0, Math.min(1, stageProgress)) * 100}%` }}
                  />
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
                    aria-label="Animation progress slider"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-10"
                  />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full shadow-[0_0_4px_rgba(255,255,255,0.9)] pointer-events-none group-hover/slider:scale-125 transition-transform"
                    style={{ left: `${Math.max(0, Math.min(1, stageProgress)) * 100}%` }}
                  />
                </div>
                <span className="text-[9.5px] font-mono tabular-nums text-zinc-300">
                  {Math.round(stageProgress * 100)}%
                </span>
              </div>
            ),
            action: () => {},
          },
        ]
      : []),
  ];

  // DIVIDER 1 TRAILING: Solved Banner & Pop-Out Presets Menu Trigger (menuAccessories)
  const resolvedDivider1Trailing: SplitAccessory[] = [
    ...(solveProgressPercent === 100
      ? [
          {
            id: 'solvedBanner',
            title: 'Exact Anagram Solved!',
            icon: <Sparkles className="w-3.5 h-3.5 text-white" />,
            label: <span className="text-white font-mono font-bold text-[11px]">Exact Match</span>,
            action: () => {},
            active: true,
          },
        ]
      : []),
    {
      id: 'presetsMenuTrigger',
      title: 'Split Presets (VerticalSplit)',
      icon: <SlidersHorizontal className="w-3.5 h-3.5" />,
      action: () => {
        triggerHaptic('snap');
        setShowDivider1Menu((prev) => !prev);
      },
      active: showDivider1Menu,
    },
  ];

  // DIVIDER 1 TRAILING MENU: Floating VerticalSplit Popover Menu
  const divider1TrailingMenu = showDivider1Menu ? (
    <div
      ref={divider1MenuRef}
      className="absolute top-full right-0 mt-2 w-52 bg-[#18181b]/98 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl p-1 z-50 select-none animate-in fade-in zoom-in-95 duration-100"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-2 py-1 mb-0.5 border-b border-white/5">
        <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
          Split Presets
        </span>
        <span className="text-[9px] font-mono text-zinc-400 bg-white/5 border border-white/10 px-1 py-0.2 rounded">
          VerticalSplit
        </span>
      </div>
      <div className="flex flex-col gap-0.5">
        {[
          {
            id: 'balanced',
            label: '50/50 Balanced',
            icon: <Rows2 className="w-3.5 h-3.5 text-zinc-200" />,
            action: () => setDetent(SplitDetents.balanced),
            isActive: currentDetent.type === 'fraction' && Math.abs(currentDetent.value - 0.48) < 0.05,
          },
          {
            id: 'stage75',
            label: 'Stage Focus (75%)',
            icon: <ChevronsUp className="w-3.5 h-3.5 text-white" />,
            action: () => setDetent(SplitDetents.focusTop),
            isActive: currentDetent.type === 'fraction' && currentDetent.value >= 0.65,
          },
          {
            id: 'words75',
            label: 'Words Focus (75%)',
            icon: <BookOpen className="w-3.5 h-3.5 text-zinc-300" />,
            action: () => setDetent(SplitDetents.focusBottom),
            isActive: currentDetent.type === 'fraction' && currentDetent.value <= 0.35,
          },
          {
            id: 'topMini',
            label: 'Mini Stage (34px)',
            icon: <ChevronUp className="w-3.5 h-3.5 text-zinc-300" />,
            action: () => setDetent(SplitDetents.topMini),
            isActive: currentDetent.type === 'topMini',
          },
          {
            id: 'bottomMini',
            label: 'Mini Words (34px)',
            icon: <ChevronDown className="w-3.5 h-3.5 text-zinc-300" />,
            action: () => setDetent(SplitDetents.bottomMini),
            isActive: currentDetent.type === 'bottomMini',
          },
          {
            id: 'soloStage',
            label: soloCard === 1 ? 'Exit Solo Stage' : 'Solo Stage',
            icon: <Theater className="w-3.5 h-3.5 text-zinc-200" />,
            action: () => setDetent(soloCard === 1 ? SplitDetents.balanced : SplitDetents.topFull),
            isActive: soloCard === 1,
          },
          {
            id: 'reset',
            label: 'Reset Split Ratios',
            icon: <RotateCcw className="w-3.5 h-3.5 text-zinc-300" />,
            action: resetRatios,
            isActive: false,
          },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              triggerHaptic('snap');
              setShowDivider1Menu(false);
              item.action();
            }}
            className={`flex items-center justify-between w-full h-7.5 px-2 rounded-lg text-left transition-colors cursor-pointer group ${
              item.isActive
                ? 'bg-white/10 text-white font-medium'
                : 'text-zinc-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="shrink-0">{item.icon}</span>
              <span className="text-[12px] truncate">{item.label}</span>
            </div>
            {item.isActive && <Check className="w-3.5 h-3.5 text-white shrink-0 ml-1.5" />}
          </button>
        ))}
      </div>
    </div>
  ) : null;

  // DIVIDER 2 LEADING: Mode Filter (Cycles between Safe, All, Closers, Pairs, Common, Long)
  const currentMode = wordFilterMode || (avoidDeadEnds ? 'safe' : 'all');
  const safeCounts: Record<WordFilterMode, number> = countsByMode || {
    safe: solvableWordsCount || candidateWordsCount || 0,
    domains: 0,
    all: candidateWordsCount || 0,
    top: 0,
    common: 0,
    rare: 0,
    closers: exactClosersCount || 0,
    pairs: finisherPairsCount || 0,
    long: 0,
  };

  const ALL_MODES: WordFilterMode[] = ['safe', 'domains', 'all', 'top', 'common', 'rare', 'closers', 'pairs', 'long'];

  // Word Filter Quick-Select Menu state & interaction handlers
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Close menu when clicking outside
  useEffect(() => {
    if (!showFilterMenu) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(e.target as Node)) {
        setShowFilterMenu(false);
      }
    };
    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, [showFilterMenu]);

  const handleSelectFilterMode = (mode: WordFilterMode) => {
    triggerHaptic('snap');
    setShowFilterMenu(false);
    if (onSelectWordFilterMode) {
      onSelectWordFilterMode(mode);
    } else if (onSelectModeFilter && (mode === 'all' || mode === 'closers' || mode === 'pairs')) {
      onSelectModeFilter(mode);
    }
  };

  // Current Explorer View Mode (Graph / Inspector / Both / Blocks / Pebbles / Solutions)
  const rawExplorerView =
    explorerViewMode ||
    (showGraphPanel && showInspectorPanel ? 'both' : showGraphPanel ? 'graph' : 'inspector');
  const currentExplorerView: 'both' | 'graph' | 'inspector' | 'blocks' | 'pebbles' | 'solutions' =
    rawExplorerView === 'cards' ? 'blocks' : rawExplorerView;

  const ALL_VIEWS: ('both' | 'graph' | 'inspector' | 'blocks' | 'pebbles' | 'solutions')[] = [
    'both',
    'graph',
    'inspector',
    'blocks',
    'pebbles',
    'solutions',
  ];

  const viewConfigs: Record<
    'both' | 'graph' | 'inspector' | 'blocks' | 'pebbles' | 'solutions',
    {
      label: string;
      sublabel: string;
      icon: React.ReactNode;
      color: string;
      dotColor: string;
      title: string;
    }
  > = {
    both: {
      label: 'Split View',
      sublabel: 'Graph and stats',
      icon: <LayoutGrid className="w-3.5 h-3.5 text-zinc-100" />,
      color: 'text-zinc-100',
      dotColor: 'bg-white',
      title: 'Split View: Word graph and stats side by side. Click to cycle, right-click for menu.',
    },
    graph: {
      label: 'Word Graph',
      sublabel: 'Physics cloud',
      icon: <Network className="w-3.5 h-3.5 text-zinc-100" />,
      color: 'text-zinc-100',
      dotColor: 'bg-white',
      title: 'Word Graph: Interactive physics-based word cloud. Click to cycle, right-click for menu.',
    },
    inspector: {
      label: 'Word Stats',
      sublabel: 'Length & letter charts',
      icon: <BarChart3 className="w-3.5 h-3.5 text-zinc-200" />,
      color: 'text-zinc-200',
      dotColor: 'bg-zinc-300',
      title: 'Word Stats: Length and letter charts. Click to cycle, right-click for menu.',
    },
    blocks: {
      label: 'Word Blocks',
      sublabel: 'Squarified treemap',
      icon: <LayoutGrid className="w-3.5 h-3.5 text-zinc-200" />,
      color: 'text-zinc-200',
      dotColor: 'bg-zinc-300',
      title: 'Word Blocks: Squarified word treemap. Click to cycle, right-click for menu.',
    },
    pebbles: {
      label: 'Word Pebbles',
      sublabel: 'Organic word field',
      icon: <Layers className="w-3.5 h-3.5 text-zinc-200" />,
      color: 'text-zinc-200',
      dotColor: 'bg-zinc-300',
      title: 'Word Pebbles: Organic word bubbles. Click to cycle, right-click for menu.',
    },
    solutions: {
      label: 'Solutions',
      sublabel: 'Winning finishes',
      icon: <Sparkles className="w-3.5 h-3.5 text-white" />,
      color: 'text-white',
      dotColor: 'bg-white',
      title: 'Solutions: Direct 1-word and 2-word finishes. Click to cycle, right-click for menu.',
    },
  };

  const activeViewConfig = viewConfigs[currentExplorerView] || viewConfigs.both;

  // Explorer View Quick-Select Menu state & interaction handlers
  const [showViewMenu, setShowViewMenu] = useState(false);
  const viewMenuRef = useRef<HTMLDivElement>(null);
  const viewLongPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Close view menu when clicking outside
  useEffect(() => {
    if (!showViewMenu) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (viewMenuRef.current && !viewMenuRef.current.contains(e.target as Node)) {
        setShowViewMenu(false);
      }
    };
    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, [showViewMenu]);

  const handleSelectViewMode = (
    mode: 'both' | 'graph' | 'inspector' | 'blocks' | 'pebbles' | 'solutions'
  ) => {
    triggerHaptic('snap');
    setShowViewMenu(false);
    if (onSelectExplorerView) {
      onSelectExplorerView(mode);
    } else {
      if (mode === 'both') {
        if (!showGraphPanel) onToggleGraphPanel?.();
        if (!showInspectorPanel) onToggleInspectorPanel?.();
      } else if (mode === 'graph') {
        if (!showGraphPanel) onToggleGraphPanel?.();
        if (showInspectorPanel) onToggleInspectorPanel?.();
      } else if (mode === 'inspector') {
        if (showGraphPanel) onToggleGraphPanel?.();
        if (!showInspectorPanel) onToggleInspectorPanel?.();
      }
    }
  };

  // DIVIDER 2 LEADING: Mode Filter with rich multi-action functionality
  const resolvedDivider2Leading: SplitAccessory[] = [
    {
      id: 'wordsFilterToggle',
      title: MODE_CONFIGS[currentMode].getDescription(safeCounts[currentMode]),
      icon: (
        <div className="relative flex items-center justify-center group/filtericon">
          {MODE_CONFIGS[currentMode].icon}
          {/* Micro active mode accent indicator dot */}
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full ${MODE_CONFIGS[currentMode].dotColor} ring-1 ring-black/80 transition-all group-hover/filtericon:scale-125`}
          />
        </div>
      ),
      shortcut: 'S',
      action: (e?: React.MouseEvent) => {
        if (e?.shiftKey) {
          // Shift-Click: cycle backwards!
          const idx = ALL_MODES.indexOf(currentMode);
          const prevIdx = (idx - 1 + ALL_MODES.length) % ALL_MODES.length;
          handleSelectFilterMode(ALL_MODES[prevIdx]);
          return;
        }
        if (onCycleWordFilter) {
          onCycleWordFilter();
        } else {
          const idx = ALL_MODES.indexOf(currentMode);
          const nextIdx = (idx + 1) % ALL_MODES.length;
          handleSelectFilterMode(ALL_MODES[nextIdx]);
        }
      },
      onContextMenu: (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        triggerHaptic('medium');
        setShowFilterMenu((prev) => !prev);
      },
      onDoubleClick: (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        triggerHaptic('snap');
        handleSelectFilterMode('safe');
      },
      onPointerDown: () => {
        longPressTimerRef.current = setTimeout(() => {
          triggerHaptic('medium');
          setShowFilterMenu(true);
        }, 420);
      },
      onPointerUp: () => {
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      },
      onPointerLeave: () => {
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      },
      active: true,
    },
  ];

  // DIVIDER 2 LEADING MENU: Quick-Select Mode Popover (Deslopped, minimal, high-craft)
  const divider2LeadingMenu = showFilterMenu ? (
    <div
      ref={filterMenuRef}
      className="absolute bottom-full left-0 mb-2 w-52 bg-[#18181b]/98 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl p-1 z-50 select-none animate-in fade-in zoom-in-95 duration-100"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-2 py-1 mb-0.5 border-b border-white/5">
        <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
          Filter Words
        </span>
        <kbd className="text-[9px] font-mono text-zinc-400 bg-white/5 border border-white/10 px-1 py-0.2 rounded">
          S
        </kbd>
      </div>

      <div className="flex flex-col gap-0.5">
        {ALL_MODES.map((modeKey) => {
          const config = MODE_CONFIGS[modeKey];
          const count = safeCounts[modeKey] || 0;
          const isActive = currentMode === modeKey;

          return (
            <button
              key={modeKey}
              type="button"
              onClick={() => handleSelectFilterMode(modeKey)}
              className={`flex items-center justify-between w-full h-7.5 px-2 rounded-lg text-left transition-colors cursor-pointer group ${
                isActive
                  ? 'bg-white/10 text-white font-medium'
                  : 'text-zinc-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className={`shrink-0 ${config.color}`}>{config.icon}</span>
                <span className="text-[12px] truncate">{config.label}</span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                <span className="text-[11px] font-mono tabular-nums text-zinc-400 group-hover:text-zinc-300">
                  {count}
                </span>
                {isActive && (
                  <Check className="w-3.5 h-3.5 text-white shrink-0" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  ) : null;

  // DIVIDER 2 TRAILING: Single Merged View Mode Button with rich multi-action functionality
  const resolvedDivider2Trailing: SplitAccessory[] = [
    {
      id: 'explorerViewToggle',
      title: activeViewConfig.title,
      icon: (
        <div className="relative flex items-center justify-center group/viewicon">
          {activeViewConfig.icon}
          {/* Micro active layout accent indicator dot */}
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full ${activeViewConfig.dotColor} ring-1 ring-black/80 transition-all group-hover/viewicon:scale-125`}
          />
        </div>
      ),
      shortcut: 'V',
      action: (e?: React.MouseEvent) => {
        if (e?.shiftKey) {
          // Shift-Click: cycle backward!
          const idx = ALL_VIEWS.indexOf(currentExplorerView);
          const prevIdx = (idx - 1 + ALL_VIEWS.length) % ALL_VIEWS.length;
          handleSelectViewMode(ALL_VIEWS[prevIdx]);
          return;
        }
        if (onCycleExplorerView) {
          onCycleExplorerView();
        } else {
          const idx = ALL_VIEWS.indexOf(currentExplorerView);
          const nextIdx = (idx + 1) % ALL_VIEWS.length;
          handleSelectViewMode(ALL_VIEWS[nextIdx]);
        }
      },
      onContextMenu: (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        triggerHaptic('medium');
        setShowViewMenu((prev) => !prev);
      },
      onDoubleClick: (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        triggerHaptic('snap');
        handleSelectViewMode('both');
      },
      onPointerDown: () => {
        viewLongPressTimerRef.current = setTimeout(() => {
          triggerHaptic('medium');
          setShowViewMenu(true);
        }, 420);
      },
      onPointerUp: () => {
        if (viewLongPressTimerRef.current) {
          clearTimeout(viewLongPressTimerRef.current);
          viewLongPressTimerRef.current = null;
        }
      },
      onPointerLeave: () => {
        if (viewLongPressTimerRef.current) {
          clearTimeout(viewLongPressTimerRef.current);
          viewLongPressTimerRef.current = null;
        }
      },
      active: true,
    },
  ];

  // DIVIDER 2 TRAILING MENU: Quick-Select Explorer Layout Popover (Deslopped, minimal, high-craft)
  const divider2TrailingMenu = showViewMenu ? (
    <div
      ref={viewMenuRef}
      className="absolute bottom-full right-0 mb-2 w-48 bg-[#18181b]/98 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl p-1 z-50 select-none animate-in fade-in zoom-in-95 duration-100"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-2 py-1 mb-0.5 border-b border-white/5">
        <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
          View Layout
        </span>
        <kbd className="text-[9px] font-mono text-zinc-400 bg-white/5 border border-white/10 px-1 py-0.2 rounded">
          V
        </kbd>
      </div>

      <div className="flex flex-col gap-0.5">
        {ALL_VIEWS.map((viewKey) => {
          const config = viewConfigs[viewKey];
          const isActive = currentExplorerView === viewKey;

          return (
            <button
              key={viewKey}
              type="button"
              onClick={() => handleSelectViewMode(viewKey)}
              className={`flex items-center justify-between w-full h-7.5 px-2 rounded-lg text-left transition-colors cursor-pointer group ${
                isActive
                  ? 'bg-white/10 text-white font-medium'
                  : 'text-zinc-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className={`shrink-0 ${config.color}`}>{config.icon}</span>
                <span className="text-[12px] truncate">{config.label}</span>
              </div>

              {isActive && (
                <Check className="w-3.5 h-3.5 text-white shrink-0 ml-2" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  ) : null;

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
              setDetent(SplitDetents.balanced);
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
            className={`w-full relative overflow-hidden flex flex-col min-h-0 flex-none shrink-0 bg-transparent px-1 sm:px-1.5 transition-all ${
              activeDrag ? 'duration-0' : 'duration-350 ease-[cubic-bezier(0.16,1,0.3,1)]'
            } ${
              isBeingDragged
                ? 'opacity-80 ring-2 ring-white/40 shadow-2xl scale-[0.99] z-40'
                : ''
            }`}
            style={{
              height: isComposerCollapsed ? '34px' : isKeyboardOpen ? '58px' : '72px',
              minHeight: isComposerCollapsed ? '32px' : '56px',
            }}
          >
            <div className="w-full h-full flex flex-col justify-center min-h-0">
              {React.isValidElement(card2)
                ? React.cloneElement(card2 as React.ReactElement<any>, {
                    isCollapsed: isComposerCollapsed,
                    onToggleCollapse: handleToggleComposerCollapse,
                  })
                : card2}
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
              setDetent(SplitDetents.balanced);
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
                onToggleCollapse={isDivider1 ? toggleMinimizeCard1 : toggleMinimizeCard3}
                isCollapsed={isDivider1 ? isCard1Minimized : isCard3Minimized}
                collapseTooltip={
                  isDivider1
                    ? isCard1Minimized
                      ? 'Expand stage'
                      : 'Minimize stage'
                    : isCard3Minimized
                    ? 'Expand word panel'
                    : 'Minimize word panel'
                }
                isBusy={isExplorerDivider && isSolving}
                isSuccess={isExplorerDivider && justFoundResults}
                statusTooltip={
                  isExplorerDivider
                    ? isSolving
                      ? 'Finding words...'
                      : justFoundResults
                      ? 'New words found!'
                      : 'Drag to resize'
                    : 'Drag to resize'
                }
                centerContent={undefined}
                leadingAccessories={isDivider1 ? resolvedDivider1Leading : resolvedDivider2Leading}
                leadingMenu={isDivider1 ? undefined : divider2LeadingMenu}
                trailingAccessories={isDivider1 ? resolvedDivider1Trailing : resolvedDivider2Trailing}
                trailingMenu={isDivider1 ? divider1TrailingMenu : divider2TrailingMenu}
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

      {/* VerticalSplit Floating Edge Restore Pill for topFull (Solo Stage) */}
      {soloCard === 1 && (
        <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#18181b]/95 border border-white/15 backdrop-blur-md shadow-2xl text-white select-none animate-in fade-in slide-in-from-bottom-2 duration-200">
          <BookOpen className="w-3.5 h-3.5 text-zinc-300" />
          <span className="text-xs font-semibold">Word Explorer</span>
          {candidateWordsCount !== undefined && candidateWordsCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-white/10 text-[10px] font-mono text-zinc-300">
              {candidateWordsCount} words
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('snap');
              setDetent(SplitDetents.balanced);
            }}
            className="ml-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            Restore Split
          </button>
        </div>
      )}

      {/* VerticalSplit Floating Edge Restore Pill for bottomFull (Solo Words) */}
      {soloCard === 3 && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#18181b]/95 border border-white/15 backdrop-blur-md shadow-2xl text-white select-none animate-in fade-in slide-in-from-top-2 duration-200">
          <Theater className="w-3.5 h-3.5 text-zinc-200" />
          <span className="text-xs font-semibold">Kinetic Stage</span>
          {solveProgressPercent !== undefined && (
            <span className="px-1.5 py-0.2 rounded-full bg-white/10 text-[10px] font-mono text-zinc-300">
              {solveProgressPercent}% solved
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('snap');
              setDetent(SplitDetents.balanced);
            }}
            className="ml-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            Restore Split
          </button>
        </div>
      )}
    </div>
  );
};
