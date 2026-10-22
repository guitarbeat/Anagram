import React, { useState, useEffect, useRef } from 'react';
import {
  BookOpen,
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
  Sparkles,
  Link2,
  Star,
  Zap,
  Check,
  Layers,
  Globe,
  SlidersHorizontal,
  Theater,
  Columns2,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  ArrowDownAZ,
  TrendingUp,
  Search,
  X,
  ArrowLeftRight,
  Eye,
  EyeOff,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react';
import { triggerHaptic } from '../hooks/useHaptics';
import { SplitDivider } from './SplitDivider';
import { TopWrapper, BottomWrapper } from './PanelWrappers';
import { IdlePeekDock } from './IdlePeekDock';
import { useSplitController } from '../hooks/useSplitController';
import type { SplitDetent, PanelId, SplitAccessory, WordFilterMode } from '../types/split';
import { SplitDetents } from '../types/split';
import type { LexicalViewMode } from './CandidateWordsList';
import type { WordSortOption } from './WordPebblesExplorer';
import type { ProgressBus } from '../hooks/useProgressBus';
import type { POS, HistogramBin } from '../engine/types';
import type { FrequencyTier } from '../engine/lexicon';

interface ModeConfig {
  label: string;
  shortLabel: string;
  sublabel: string;
  icon: React.ReactNode;
  color: string;
  dotColor: string;
  getDescription: (count: number) => string;
}

const MODE_CONFIGS: Record<WordFilterMode, ModeConfig> = {
  safe: {
    label: 'Solvable Words',
    shortLabel: 'SOLVABLE',
    sublabel: 'No dead ends',
    icon: <ShieldCheck className="w-3 h-3" />,
    color: 'text-white',
    dotColor: 'bg-white',
    getDescription: (count) => `Solvable Words (${count}): Prevents dead ends. Click to open Filter menu, Shift-click to cycle.`,
  },
  domains: {
    label: 'Domains & TLDs',
    shortLabel: 'DOMAINS',
    sublabel: 'Global extensions',
    icon: <Globe className="w-3 h-3" />,
    color: 'text-white',
    dotColor: 'bg-white',
    getDescription: (count) => `Domains & TLDs (${count}): Global ccTLDs and web extensions. Click to open Filter menu.`,
  },
  all: {
    label: 'All Words',
    shortLabel: 'ALL WORDS',
    sublabel: 'Complete lexicon',
    icon: <BookOpen className="w-3 h-3" />,
    color: 'text-zinc-300',
    dotColor: 'bg-zinc-400',
    getDescription: (count) => `All Words (${count}): Complete dictionary. Click to open Filter menu.`,
  },
  closers: {
    label: '1-Word Wins',
    shortLabel: '1-WORD',
    sublabel: 'Instant wins',
    icon: <Sparkles className="w-3 h-3" />,
    color: 'text-white',
    dotColor: 'bg-white',
    getDescription: (count) => `1-Word Solutions (${count}): Words that finish the puzzle right now.`,
  },
  pairs: {
    label: '2-Word Pairs',
    shortLabel: '2-WORD',
    sublabel: 'Two-word finishes',
    icon: <Link2 className="w-3 h-3" />,
    color: 'text-zinc-200',
    dotColor: 'bg-zinc-300',
    getDescription: (count) => `2-Word Solutions (${count}): Word pairs that finish the puzzle.`,
  },
  common: {
    label: 'Common Tier',
    shortLabel: 'COMMON',
    sublabel: 'Everyday English',
    icon: <Star className="w-3 h-3" />,
    color: 'text-zinc-200',
    dotColor: 'bg-zinc-300',
    getDescription: (count) => `Common Words (${count}): Familiar everyday words.`,
  },
  long: {
    label: '5+ Letters',
    shortLabel: '5+ LTRS',
    sublabel: 'Longer anagrams',
    icon: <Zap className="w-3 h-3" />,
    color: 'text-zinc-200',
    dotColor: 'bg-zinc-300',
    getDescription: (count) => `Long Words (${count}): Words with 5 or more letters.`,
  },
  top: {
    label: 'Top Everyday',
    shortLabel: 'TOP WORDS',
    sublabel: 'Most frequent',
    icon: <Star className="w-3 h-3" />,
    color: 'text-white',
    dotColor: 'bg-white',
    getDescription: (count) => `Top Everyday Words (${count}): High-frequency spoken vocabulary.`,
  },
  rare: {
    label: 'Rare / Scrabble',
    shortLabel: 'RARE',
    sublabel: 'Specialized words',
    icon: <Sparkles className="w-3 h-3" />,
    color: 'text-zinc-300',
    dotColor: 'bg-zinc-400',
    getDescription: (count) => `Rare & Literary Words (${count}): Less common or poetic words.`,
  },
};

const SORT_OPTIONS: {
  id: WordSortOption;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
}[] = [
  {
    id: 'length-desc',
    label: 'Length ↓ (Longest)',
    shortLabel: 'LEN ↓',
    icon: <ArrowDownWideNarrow className="w-3 h-3" />,
  },
  {
    id: 'length-asc',
    label: 'Length ↑ (Shortest)',
    shortLabel: 'LEN ↑',
    icon: <ArrowUpNarrowWide className="w-3 h-3" />,
  },
  {
    id: 'freq',
    label: 'Frequency (Common)',
    shortLabel: 'FREQ',
    icon: <TrendingUp className="w-3 h-3" />,
  },
  {
    id: 'alpha',
    label: 'Alphabetical (A–Z)',
    shortLabel: 'A–Z',
    icon: <ArrowDownAZ className="w-3 h-3" />,
  },
  {
    id: 'closers',
    label: 'Exact Closers First',
    shortLabel: 'WINS',
    icon: <Sparkles className="w-3 h-3" />,
  },
];

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
  completeSolutionsCount?: number;
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
  splitLeftView?: 'graph' | 'pebbles' | 'blocks' | 'solutions' | 'inspector';
  onSplitLeftViewChange?: (view: 'graph' | 'pebbles' | 'blocks' | 'solutions' | 'inspector') => void;
  splitRightView?: 'inspector' | 'blocks' | 'pebbles' | 'solutions' | 'graph';
  onSplitRightViewChange?: (view: 'inspector' | 'blocks' | 'pebbles' | 'solutions' | 'graph') => void;
  splitRatio?: number;
  showGraphPanel?: boolean;
  onToggleGraphPanel?: () => void;
  showInspectorPanel?: boolean;
  onToggleInspectorPanel?: () => void;

  // Hoisted Filter, Sort, Search & Custom Words Complications
  sortBy?: WordSortOption;
  onSortByChange?: (sort: WordSortOption) => void;
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
  selectedLengthFilter?: number[] | number | null;
  onSelectLengthFilter?: (lengths: number[] | null) => void;
  onClearLengthFilter?: () => void;
  histogramData?: HistogramBin[];
  selectedPosFilter?: POS | 'all' | null;
  onSelectPosFilter?: (pos: POS | 'all' | null) => void;
  selectedFreqFilter?: FrequencyTier | 'all' | null;
  onSelectFreqFilter?: (tier: FrequencyTier | null) => void;
  onClearFreqFilter?: () => void;
  customWordsCount?: number;
  onOpenCustomWordManager?: () => void;

  // Real-time Solver Indicator State
  isSolving?: boolean;
  justFoundResults?: boolean;

  // Collapsible Composer Dock State
  isComposerCollapsed?: boolean;
  onToggleComposerCollapse?: () => void;

  // Auto-Hide Disappearing Names State
  autoHideDimmedNames?: boolean;
  onAutoHideDimmedNamesChange?: (val: boolean) => void;

  // Zoom & Fit Controls State
  zoomScale?: number;
  onZoomOut?: () => void;
  onZoomIn?: () => void;
  onResetZoomFit?: () => void;
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
  avoidDeadEnds,
  candidateWordsCount,
  exactClosersCount = 0,
  finisherPairsCount = 0,
  completeSolutionsCount = 0,
  solvableWordsCount = 0,
  wordFilterMode,
  onCycleWordFilter,
  onSelectWordFilterMode,
  countsByMode,
  onSelectModeFilter,
  explorerViewMode,
  onSelectExplorerView,
  splitLeftView = 'graph',
  onSplitLeftViewChange,
  splitRightView = 'inspector',
  onSplitRightViewChange,
  splitRatio = 0.5,
  showGraphPanel = true,
  onToggleGraphPanel,
  showInspectorPanel = true,
  onToggleInspectorPanel,
  sortBy = 'length-desc',
  onSortByChange,
  searchQuery = '',
  onSearchQueryChange,
  selectedLengthFilter,
  onSelectLengthFilter,
  onClearLengthFilter,
  histogramData = [],
  selectedPosFilter,
  onSelectPosFilter,
  selectedFreqFilter,
  onClearFreqFilter,
  customWordsCount = 0,
  onOpenCustomWordManager,
  isSolving = false,
  justFoundResults = false,
  isComposerCollapsed: externalComposerCollapsed,
  onToggleComposerCollapse,
  autoHideDimmedNames = true,
  onAutoHideDimmedNamesChange,
  zoomScale = 1.0,
  onZoomOut,
  onZoomIn,
  onResetZoomFit,
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
    hasUserCustomized,
    currentDetent,
    isCard1Minimized,
    isCard3Minimized,
    soloCard,
    ratio1,
    activeDrag,
    startDrag1,
    startDrag2,
    shouldSuppressClick,
    resetRatios,
    toggleMinimizeCard1,
    toggleMinimizeCard3,
    cyclePresets,
    setDetent,
    setIsCard1Minimized,
    setIsCard3Minimized,
    setSoloCard,
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
            title: isStagePlaying ? 'Pause Animation (Space)' : 'Play Kinetic Animation (Space)',
            icon: isStagePlaying ? (
              <Pause className="w-3 h-3 fill-current" />
            ) : (
              <Play className="w-3 h-3 fill-current" />
            ),
            label: isStagePlaying ? 'PAUSE' : 'PLAY',
            action: onToggleStagePlay,
            active: isStagePlaying,
          },
        ]
      : []),
    ...(onResetStage
      ? [
          {
            id: 'stageReset',
            title: 'Rewind Animation (R)',
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
                className="flex items-center gap-1.5 px-2 h-6 rounded-md bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 transition-colors"
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
                <span className="text-[9px] font-mono tabular-nums text-zinc-300 font-bold">
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
            icon: <Sparkles className="w-3 h-3" />,
            label: 'EXACT MATCH',
            action: () => {},
            active: true,
          },
        ]
      : sourceLetterCount > 0
      ? [
          {
            id: 'placedProgressComplication',
            title: `${placedLetterCount} of ${sourceLetterCount} source letters placed (${solveProgressPercent}%)`,
            label: `${placedLetterCount}/${sourceLetterCount}`,
            badge: `${solveProgressPercent}%`,
            action: toggleMinimizeCard1,
            active: !isCard1Minimized,
          },
        ]
      : []),
    {
      id: 'presetsMenuTrigger',
      title: 'Split Presets (VerticalSplit)',
      icon: <SlidersHorizontal className="w-3 h-3" />,
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
      role="menu"
      className="absolute top-full right-0 mt-1.5 w-52 bg-[#141417]/98 backdrop-blur-xl border border-white/15 rounded-xl shadow-2xl p-1.5 z-50 select-none animate-in fade-in zoom-in-95 duration-100"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-2 py-1 mb-1 border-b border-white/10">
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
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
                ? 'bg-white/15 text-white font-medium'
                : 'text-zinc-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="shrink-0">{item.icon}</span>
              <span className="text-[11.5px] font-mono truncate">{item.label}</span>
            </div>
            {item.isActive && <Check className="w-3.5 h-3.5 text-white shrink-0 ml-1.5" />}
          </button>
        ))}
      </div>
    </div>
  ) : null;

  // ============================================================================
  // DIVIDER 2 (WORD EXPLORER VERTICALSPLIT COMPLICATION BAR)
  // Leading: WORDS | GRAPH | BLOCKS | STATS | SOLVE
  // Center: Tactile Drag Notch Pill
  // Trailing: FILTER (with Pop-Out Preset/Length/Search/Lexicon Menu) | SORT
  // ============================================================================
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

  const ALL_MODES: WordFilterMode[] = [
    'safe',
    'domains',
    'all',
    'closers',
    'pairs',
    'long',
    'top',
    'common',
    'rare',
  ];

  // Pop-out menu states for Divider 2 complications
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showViewMenu, setShowViewMenu] = useState(false);
  const [showLeftSplitMenu, setShowLeftSplitMenu] = useState(false);
  const [showRightSplitMenu, setShowRightSplitMenu] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement>(null);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const viewMenuRef = useRef<HTMLDivElement>(null);
  const leftSplitMenuRef = useRef<HTMLDivElement>(null);
  const rightSplitMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (
      !showFilterMenu &&
      !showSortMenu &&
      !showViewMenu &&
      !showLeftSplitMenu &&
      !showRightSplitMenu
    ) {
      return;
    }
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (showFilterMenu && filterMenuRef.current && !filterMenuRef.current.contains(target)) {
        setShowFilterMenu(false);
      }
      if (showSortMenu && sortMenuRef.current && !sortMenuRef.current.contains(target)) {
        setShowSortMenu(false);
      }
      if (showViewMenu && viewMenuRef.current && !viewMenuRef.current.contains(target)) {
        setShowViewMenu(false);
      }
      if (
        showLeftSplitMenu &&
        leftSplitMenuRef.current &&
        !leftSplitMenuRef.current.contains(target)
      ) {
        setShowLeftSplitMenu(false);
      }
      if (
        showRightSplitMenu &&
        rightSplitMenuRef.current &&
        !rightSplitMenuRef.current.contains(target)
      ) {
        setShowRightSplitMenu(false);
      }
    };
    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, [showFilterMenu, showSortMenu, showViewMenu, showLeftSplitMenu, showRightSplitMenu]);

  const handleSelectFilterMode = (mode: WordFilterMode) => {
    triggerHaptic('snap');
    if (onSelectWordFilterMode) {
      onSelectWordFilterMode(mode);
    } else if (onSelectModeFilter && (mode === 'all' || mode === 'closers' || mode === 'pairs')) {
      onSelectModeFilter(mode);
    }
  };

  // Current Explorer View Mode (Graph is the primary default view)
  const rawExplorerView =
    explorerViewMode ||
    (showGraphPanel && showInspectorPanel ? 'graph' : showGraphPanel ? 'graph' : 'inspector');
  const currentExplorerView: 'both' | 'graph' | 'inspector' | 'blocks' | 'pebbles' | 'solutions' =
    rawExplorerView === 'cards' ? 'blocks' : rawExplorerView;

  const handleSelectViewMode = (
    mode: 'both' | 'graph' | 'inspector' | 'blocks' | 'pebbles' | 'solutions'
  ) => {
    triggerHaptic('snap');
    setShowViewMenu(false);
    // If Explorer panel is currently minimized, expand it immediately when a view complication is clicked
    if (isCard3Minimized || soloCard === 1) {
      setIsCard3Minimized(false);
      setSoloCard(null);
      if (currentDetent.type === 'bottomMini' || currentDetent.type === 'topFull') {
        setDetent(SplitDetents.topMini);
      }
    }
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

  const totalSolveCount = exactClosersCount + finisherPairsCount + completeSolutionsCount;

  // Smart vertical direction for Divider 2 pop-out menus:
  // Open downward (`top-full mt-1.5`) when Divider 2 is in the upper/middle portion of the viewport,
  // and upward (`bottom-full mb-1.5`) only when the Explorer panel is minimized at the bottom edge.
  const isDivider2NearBottom = isCard3Minimized || (hasStage && !isCard1Minimized && ratio1 > 0.68);
  const menuVerticalPosClass = isDivider2NearBottom
    ? 'bottom-full mb-1.5'
    : 'top-full mt-1.5';

  // DIVIDER 2 LEADING TABS & CHROME SPLIT SCREEN BUTTON
  const isSplitActive = currentExplorerView === 'both';

  // Primary Single-View Tabs: GRAPH (Main)
  const PRIMARY_TABS: {
    id: 'graph';
    label: string;
    title: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'graph',
      label: 'GRAPH',
      title: 'Graph View: Interactive physics word clusters',
      icon: <Network className="w-3.5 h-3.5" />,
    },
  ];

  // Full Split-Pane View Options (for Left / Right Split Pane Switchers)
  const VIEW_COMPLICATIONS: {
    id: 'graph' | 'inspector' | 'solutions' | 'blocks';
    label: string;
    title: string;
    icon: React.ReactNode;
    badge?: number;
  }[] = [
    {
      id: 'graph',
      label: 'GRAPH',
      title: 'Graph View: Interactive physics word network',
      icon: <Network className="w-3.5 h-3.5" />,
    },
    {
      id: 'inspector',
      label: 'INSPECT',
      title: 'Live Word Lens, Finishes & Distributions (Updates on hover or click)',
      icon: <BarChart3 className="w-3.5 h-3.5" />,
    },
    {
      id: 'solutions',
      label: 'SOLVE',
      title: `All Anagram Completions & Pairs (${totalSolveCount})`,
      icon: <Sparkles className="w-3.5 h-3.5" />,
      badge: totalSolveCount > 0 ? totalSolveCount : undefined,
    },
    {
      id: 'blocks',
      label: 'BLOCKS',
      title: 'Blocks View: Squarified word treemap',
      icon: <LayoutGrid className="w-3.5 h-3.5" />,
    },
  ];

  const leftConfig =
    VIEW_COMPLICATIONS.find((v) => v.id === splitLeftView) || VIEW_COMPLICATIONS[0];
  const rightConfig =
    VIEW_COMPLICATIONS.find((v) => v.id === splitRightView) || VIEW_COMPLICATIONS[2];

  const resolvedDivider2Leading: SplitAccessory[] = isSplitActive
    ? [
        // Left Split Pane Direct View Tabs: GRAPH | INSPECT | SOLVE | BLOCKS
        ...VIEW_COMPLICATIONS.map((v) => ({
          id: `left-split-tab-${v.id}`,
          title: `Left Pane: ${v.label}`,
          variant: 'tab' as const,
          active: splitLeftView === v.id && !isCard3Minimized,
          icon: v.icon,
          label: v.label,
          badge: v.badge,
          action: () => {
            triggerHaptic('snap');
            if (isCard3Minimized || soloCard === 1) {
              setIsCard3Minimized(false);
              setSoloCard(null);
            }
            if (onSplitLeftViewChange) {
              onSplitLeftViewChange(v.id);
            }
          },
        })),
        // Swap Left ⇄ Right Button
        {
          id: 'swap-split-panes-btn',
          title: 'Swap left and right views',
          icon: <ArrowLeftRight className="w-3 h-3" />,
          label: 'SWAP',
          action: () => {
            triggerHaptic('snap');
            if (onSplitLeftViewChange && onSplitRightViewChange) {
              const temp = splitLeftView;
              onSplitLeftViewChange(splitRightView);
              onSplitRightViewChange(temp);
            }
          },
        },
      ]
    : [
        // Direct View Tabs: GRAPH | INSPECT | SOLVE | BLOCKS
        ...VIEW_COMPLICATIONS.map((v) => ({
          id: `view-tab-${v.id}`,
          title: v.title,
          icon: v.icon,
          label: v.label,
          badge: v.badge,
          variant: 'tab' as const,
          active: currentExplorerView === v.id && !isCard3Minimized && !isSplitActive,
          action: () => {
            triggerHaptic('snap');
            handleSelectViewMode(v.id);
          },
        })),
        // Split View Toggle
        {
          id: 'split-screen-toggle',
          title: 'Open Split View: Side-by-side dual pane view',
          icon: <Columns2 className="w-3.5 h-3.5" />,
          label: 'SPLIT',
          active: false,
          action: () => {
            triggerHaptic('snap');
            handleSelectViewMode('both');
          },
        },
      ];

  const resolvedDivider2RightLeading: SplitAccessory[] | undefined = isSplitActive
    ? [
        // Right Split Pane Direct View Tabs: GRAPH | INSPECT | SOLVE | BLOCKS
        ...VIEW_COMPLICATIONS.map((v) => ({
          id: `right-split-tab-${v.id}`,
          title: `Right Pane: ${v.label}`,
          variant: 'tab' as const,
          active: splitRightView === v.id && !isCard3Minimized,
          icon: v.icon,
          label: v.label,
          badge: v.badge,
          action: () => {
            triggerHaptic('snap');
            if (isCard3Minimized || soloCard === 1) {
              setIsCard3Minimized(false);
              setSoloCard(null);
            }
            if (onSplitRightViewChange) {
              onSplitRightViewChange(v.id);
            }
          },
        })),
        // Close Split Screen Button
        {
          id: 'exit-split-btn',
          title: 'Close split screen (Return to single view)',
          icon: <X className="w-3.5 h-3.5 text-zinc-400 hover:text-white" />,
          label: 'CLOSE',
          action: () =>
            handleSelectViewMode(
              splitLeftView === 'pebbles' ? 'pebbles' : splitLeftView
            ),
        },
      ]
    : undefined;

  const divider2RightLeadingMenu = null;

  // DIVIDER 2 LEADING MENU: Workspace & Split Context Menu
  const divider2LeadingMenu = showViewMenu ? (
    <div
      ref={viewMenuRef}
      role="menu"
      className={`absolute ${menuVerticalPosClass} left-0 w-56 bg-[#141417]/98 backdrop-blur-xl border border-white/15 rounded-xl shadow-2xl p-1.5 z-50 select-none animate-in fade-in zoom-in-95 duration-100`}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-2 py-1 mb-1 border-b border-white/10">
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
          Workspace & Split
        </span>
        <kbd className="text-[9px] font-mono text-zinc-400 bg-white/5 border border-white/10 px-1 py-0.2 rounded">
          V
        </kbd>
      </div>
      <div className="flex flex-col gap-0.5">
        <button
          type="button"
          onClick={() => handleSelectViewMode('both')}
          className={`flex items-center justify-between w-full h-7.5 px-2 rounded-lg text-left transition-colors cursor-pointer ${
            currentExplorerView === 'both'
              ? 'bg-white/15 text-white font-medium'
              : 'text-zinc-300 hover:text-white hover:bg-white/5'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Rows2 className="w-3.5 h-3.5 text-zinc-200 shrink-0" />
            <span className="text-[11.5px] font-mono truncate">Side-by-Side (Graph + Stats)</span>
          </div>
          {currentExplorerView === 'both' && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
        </button>
        <div className="my-0.5 border-t border-white/10" />
        {[
          {
            id: 'words75',
            label: 'Focus Explorer (75%)',
            icon: <ChevronsUp className="w-3.5 h-3.5 text-zinc-200" />,
            action: () => setDetent(SplitDetents.focusBottom),
          },
          {
            id: 'balanced',
            label: 'Balanced Split (50/50)',
            icon: <Rows2 className="w-3.5 h-3.5 text-zinc-200" />,
            action: () => setDetent(SplitDetents.balanced),
          },
          {
            id: 'bottomMini',
            label: isCard3Minimized ? 'Expand Explorer' : 'Minimize Explorer (34px)',
            icon: <ChevronDown className="w-3.5 h-3.5 text-zinc-200" />,
            action: toggleMinimizeCard3,
          },
        ].map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => {
              triggerHaptic('snap');
              setShowViewMenu(false);
              preset.action();
            }}
            className="flex items-center gap-2 w-full h-7.5 px-2 rounded-lg text-left text-zinc-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <span className="shrink-0">{preset.icon}</span>
            <span className="text-[11.5px] font-mono truncate">{preset.label}</span>
          </button>
        ))}
      </div>
    </div>
  ) : null;

  // Check if any secondary filter modifiers are currently active
  const activeLengthArray = Array.isArray(selectedLengthFilter)
    ? selectedLengthFilter
    : selectedLengthFilter !== null && selectedLengthFilter !== undefined
    ? [selectedLengthFilter]
    : [];

  const hasActiveFilterModifiers = Boolean(
    currentMode !== 'safe' ||
      activeLengthArray.length > 0 ||
      (selectedPosFilter && selectedPosFilter !== 'all') ||
      (selectedFreqFilter && selectedFreqFilter !== 'all') ||
      searchQuery.trim()
  );

  const handleResetAllFilters = () => {
    triggerHaptic('snap');
    handleSelectFilterMode('safe');
    if (onClearLengthFilter) onClearLengthFilter();
    if (onSelectPosFilter) onSelectPosFilter(null);
    if (onClearFreqFilter) onClearFreqFilter();
    if (onSearchQueryChange) onSearchQueryChange('');
  };

  const handleToggleLengthChip = (len: number) => {
    triggerHaptic('light');
    if (!onSelectLengthFilter) return;
    if (activeLengthArray.includes(len)) {
      const next = activeLengthArray.filter((l) => l !== len);
      onSelectLengthFilter(next.length > 0 ? next : null);
    } else {
      onSelectLengthFilter([...activeLengthArray, len]);
    }
  };

  const activeSortConfig =
    SORT_OPTIONS.find((s) => s.id === sortBy) || SORT_OPTIONS[0];

  const availableLengths = histogramData.filter((bin) => bin.count > 0);

  // DIVIDER 2 TRAILING COMPLICATIONS:
  // Always-visible inline quick filter pills (so filters are never forgotten) + Search/More Filter menu
  const resolvedDivider2Trailing: SplitAccessory[] = [
    // Inline Quick Filter Pills (Visible directly on the divider bar)
    {
      id: 'inlineQuickFilters',
      title: 'Quick Filters: Click to filter Graph or Words immediately',
      customContent: (
        <div
          className="hidden sm:flex items-center gap-1"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {/* Solvable vs All Toggle */}
          <button
            type="button"
            onClick={() =>
              handleSelectFilterMode(currentMode === 'safe' ? 'all' : 'safe')
            }
            title={
              currentMode === 'safe'
                ? `Showing ${safeCounts.safe} Solvable Words (no dead ends). Click to show All (${safeCounts.all}).`
                : `Showing All ${safeCounts.all} Words. Click to filter to Solvable (${safeCounts.safe}).`
            }
            className={`h-5.5 px-2 rounded-md text-[9.5px] font-mono font-bold uppercase tracking-tight transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap shrink-0 border ${
              currentMode === 'safe' || currentMode === 'all'
                ? 'bg-white text-black border-white font-black shadow-2xs'
                : 'bg-white/5 text-zinc-300 hover:text-white hover:bg-white/10 border-white/10'
            }`}
          >
            <span>{currentMode === 'all' ? 'ALL' : 'SOLVABLE'}</span>
            <span
              className={`text-[8.5px] tabular-nums font-black px-1 py-0.1 rounded ${
                currentMode === 'safe' || currentMode === 'all'
                  ? 'bg-black/15 text-black'
                  : 'bg-white/10 text-zinc-300'
              }`}
            >
              {currentMode === 'all' ? safeCounts.all : safeCounts.safe}
            </span>
          </button>

          {/* 1-Word Wins Quick Filter (when available) */}
          {safeCounts.closers > 0 && (
            <button
              type="button"
              onClick={() =>
                handleSelectFilterMode(
                  currentMode === 'closers' ? 'safe' : 'closers'
                )
              }
              title={`Filter to ${safeCounts.closers} 1-word exact solutions`}
              className={`h-5.5 px-2 rounded-md text-[9.5px] font-mono font-bold uppercase tracking-tight transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap shrink-0 border ${
                currentMode === 'closers'
                  ? 'bg-white text-black border-white font-black shadow-2xs'
                  : 'bg-white/5 text-zinc-300 hover:text-white hover:bg-white/10 border-white/10'
              }`}
            >
              <span>1-WORD</span>
              <span
                className={`text-[8.5px] tabular-nums font-black px-1 py-0.1 rounded ${
                  currentMode === 'closers'
                    ? 'bg-black/15 text-black'
                    : 'bg-white/10 text-zinc-300'
                }`}
              >
                {safeCounts.closers}
              </span>
            </button>
          )}

          {/* 2-Word Pairs Quick Filter (when available) */}
          {safeCounts.pairs > 0 && (
            <button
              type="button"
              onClick={() =>
                handleSelectFilterMode(currentMode === 'pairs' ? 'safe' : 'pairs')
              }
              title={`Filter to ${safeCounts.pairs} words that form 2-word exact finishes`}
              className={`h-5.5 px-2 rounded-md text-[9.5px] font-mono font-bold uppercase tracking-tight transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap shrink-0 border ${
                currentMode === 'pairs'
                  ? 'bg-white text-black border-white font-black shadow-2xs'
                  : 'bg-white/5 text-zinc-300 hover:text-white hover:bg-white/10 border-white/10'
              }`}
            >
              <span>PAIRS</span>
              <span
                className={`text-[8.5px] tabular-nums font-black px-1 py-0.1 rounded ${
                  currentMode === 'pairs'
                    ? 'bg-black/15 text-black'
                    : 'bg-white/10 text-zinc-300'
                }`}
              >
                {safeCounts.pairs}
              </span>
            </button>
          )}

          {/* 5+ Letters Quick Filter */}
          {safeCounts.long > 0 && (
            <button
              type="button"
              onClick={() =>
                handleSelectFilterMode(currentMode === 'long' ? 'safe' : 'long')
              }
              title={`Filter to ${safeCounts.long} words with 5 or more letters`}
              className={`h-5.5 px-2 rounded-md text-[9.5px] font-mono font-bold uppercase tracking-tight transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap shrink-0 border ${
                currentMode === 'long'
                  ? 'bg-white text-black border-white font-black shadow-2xs'
                  : 'bg-white/5 text-zinc-300 hover:text-white hover:bg-white/10 border-white/10'
              }`}
            >
              <span>5+ LTRS</span>
              <span
                className={`text-[8.5px] tabular-nums font-black px-1 py-0.1 rounded ${
                  currentMode === 'long'
                    ? 'bg-black/15 text-black'
                    : 'bg-white/10 text-zinc-300'
                }`}
              >
                {safeCounts.long}
              </span>
            </button>
          )}

          {/* Merged View Controls Capsule (Auto-Hide + Zoom) */}
          <div className="flex items-center gap-0.5 p-0.5 rounded-md bg-white/5 border border-white/10 shrink-0">
            <button
              type="button"
              onClick={() => onAutoHideDimmedNamesChange?.(!autoHideDimmedNames)}
              title={
                autoHideDimmedNames
                  ? 'Auto-hide names for dimmed/disappearing words (Click to show all names always)'
                  : 'Show all word names always (Click to auto-hide names for dimmed/disappearing words)'
              }
              className={`h-4.5 px-1.5 rounded text-[9px] font-mono font-bold uppercase tracking-tight transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap shrink-0 ${
                autoHideDimmedNames
                  ? 'bg-white text-black font-black shadow-2xs'
                  : 'text-zinc-300 hover:text-white hover:bg-white/10'
              }`}
            >
              {autoHideDimmedNames ? (
                <EyeOff className="w-3 h-3 shrink-0" />
              ) : (
                <Eye className="w-3 h-3 text-zinc-400 shrink-0" />
              )}
              <span>AUTO-HIDE</span>
            </button>

            <div className="w-px h-3 bg-white/15 my-auto mx-0.5 shrink-0" />

            <button
              type="button"
              onClick={onZoomOut}
              title="Zoom Out"
              className="h-4.5 w-4.5 rounded text-[9px] font-mono font-bold transition-all cursor-pointer text-zinc-400 hover:text-white hover:bg-white/10 flex items-center justify-center shrink-0"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={onResetZoomFit}
              title="Fit all words to screen"
              className="h-4.5 px-1.5 rounded text-[9px] font-mono font-bold tabular-nums transition-all cursor-pointer text-zinc-300 hover:text-white hover:bg-white/10 flex items-center gap-0.5 shrink-0"
            >
              <Maximize2 className="w-2.5 h-2.5 text-zinc-400" />
              <span>{Math.round((zoomScale || 1.0) * 100)}%</span>
            </button>
            <button
              type="button"
              onClick={onZoomIn}
              title="Zoom In"
              className="h-4.5 w-4.5 rounded text-[9px] font-mono font-bold transition-all cursor-pointer text-zinc-400 hover:text-white hover:bg-white/10 flex items-center justify-center shrink-0"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
          </div>

          {/* Compact Inline Length Segmented Chips */}
          {availableLengths.length > 0 && onSelectLengthFilter && (
            <div className="hidden md:flex items-center gap-0.5 p-0.5 rounded-md bg-white/5 border border-white/10 ml-0.5">
              {availableLengths.slice(0, 6).map((bin) => {
                const isLenActive = activeLengthArray.includes(bin.length);
                return (
                  <button
                    key={bin.length}
                    type="button"
                    onClick={() => handleToggleLengthChip(bin.length)}
                    title={`Filter ${bin.length}-letter words (${bin.count})`}
                    className={`h-4.5 px-1.5 rounded text-[9px] font-mono font-bold tabular-nums transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center justify-center ${
                      isLenActive
                        ? 'bg-white text-black font-black'
                        : 'text-zinc-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {bin.length}L
                  </button>
                );
              })}
            </div>
          )}

          {/* Quick Reset when any filter is active */}
          {hasActiveFilterModifiers && (
            <button
              type="button"
              onClick={handleResetAllFilters}
              title="Reset active filters"
              className="h-5.5 px-1.5 rounded-md bg-white/10 hover:bg-white/20 text-zinc-200 hover:text-white text-[9px] font-mono font-bold transition-colors cursor-pointer flex items-center gap-1 border border-white/15"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              <span className="hidden lg:inline text-[8.5px] font-bold">RESET</span>
            </button>
          )}
        </div>
      ),
      action: () => {},
    },
    ...(onSortByChange && currentExplorerView === 'pebbles'
      ? [
          {
            id: 'sortComplication',
            title: `Sort Words: ${activeSortConfig.label} (Click for menu, Shift-click to cycle)`,
            icon: activeSortConfig.icon,
            label: activeSortConfig.shortLabel,
            active: showSortMenu,
            action: (e?: React.MouseEvent) => {
              if (e?.shiftKey) {
                triggerHaptic('light');
                const idx = SORT_OPTIONS.findIndex((o) => o.id === sortBy);
                const nextIdx = (idx + 1) % SORT_OPTIONS.length;
                onSortByChange(SORT_OPTIONS[nextIdx].id);
                return;
              }
              triggerHaptic('snap');
              setShowFilterMenu(false);
              setShowViewMenu(false);
              setShowSortMenu((prev) => !prev);
            },
          },
        ]
      : []),
    {
      id: 'filterComplication',
      title: MODE_CONFIGS[currentMode].getDescription(safeCounts[currentMode]),
      icon: searchQuery.trim() ? (
        <Search className="w-3 h-3" />
      ) : (
        <SlidersHorizontal className="w-3 h-3" />
      ),
      label: searchQuery.trim() ? `"${searchQuery.trim()}"` : 'MORE',
      badge: hasActiveFilterModifiers ? '●' : undefined,
      active: showFilterMenu,
      action: (e?: React.MouseEvent) => {
        if (e?.shiftKey) {
          if (onCycleWordFilter) {
            onCycleWordFilter();
          } else {
            const idx = ALL_MODES.indexOf(currentMode);
            const nextIdx = (idx + 1) % ALL_MODES.length;
            handleSelectFilterMode(ALL_MODES[nextIdx]);
          }
          return;
        }
        triggerHaptic('snap');
        setShowSortMenu(false);
        setShowViewMenu(false);
        setShowFilterMenu((prev) => !prev);
      },
      onContextMenu: (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (onCycleWordFilter) onCycleWordFilter();
      },
    },
  ];

  const divider2TrailingMenu = showFilterMenu ? (
    <div
      ref={filterMenuRef}
      role="menu"
      className={`absolute ${menuVerticalPosClass} right-0 w-[220px] sm:w-[240px] bg-[#121215]/98 backdrop-blur-xl border border-white/15 rounded-xl shadow-2xl p-1.5 z-50 select-none animate-in fade-in zoom-in-95 duration-100`}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Header Row: Title + Custom Words + Reset */}
      <div className="flex items-center justify-between gap-1 pb-1 mb-1 border-b border-white/10">
        <div className="flex items-center gap-1">
          <SlidersHorizontal className="w-3 h-3 text-white" />
          <span className="text-[9px] font-mono font-black uppercase tracking-wider text-white">
            Filter & Lexicon
          </span>
        </div>

        <div className="flex items-center gap-0.5">
          {onOpenCustomWordManager && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setShowFilterMenu(false);
                onOpenCustomWordManager();
              }}
              className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[8px] font-mono font-bold bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-colors cursor-pointer"
              title="Manage custom dictionary words and 1,200+ global TLDs"
            >
              <Globe className="w-2.5 h-2.5" />
              <span>Custom</span>
              {customWordsCount > 0 && (
                <span className="px-0.5 rounded bg-white text-black text-[7.5px] font-black tabular-nums">
                  {customWordsCount}
                </span>
              )}
            </button>
          )}
          {hasActiveFilterModifiers && (
            <button
              type="button"
              onClick={handleResetAllFilters}
              className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[8px] font-mono font-bold bg-white/5 hover:bg-white/15 text-zinc-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
              title="Reset all active filters"
            >
              <RotateCcw className="w-2 h-2" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Substring Search Input */}
      {onSearchQueryChange && (
        <div className="relative flex items-center mb-1">
          <Search className="w-3 h-3 text-zinc-400 absolute left-2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Search candidate words..."
            className="w-full h-6 pl-6 pr-6 rounded-md bg-black/60 border border-white/15 focus:border-white text-[10px] font-mono text-white placeholder:text-zinc-500 outline-none transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchQueryChange('')}
              className="absolute right-1.5 text-zinc-400 hover:text-white p-0.5 cursor-pointer"
              title="Clear search"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
      )}

      {/* 3x3 Filter Preset Matrix */}
      <div className="grid grid-cols-3 gap-0.5 mb-1">
        {ALL_MODES.map((modeKey) => {
          const config = MODE_CONFIGS[modeKey];
          const count = safeCounts[modeKey] || 0;
          const isSelected = currentMode === modeKey;
          const isZero = count === 0;

          return (
            <button
              key={modeKey}
              type="button"
              onClick={() => handleSelectFilterMode(modeKey)}
              className={`flex items-center justify-between px-1 py-0.5 h-5 rounded border text-left transition-all cursor-pointer ${
                isSelected
                  ? 'bg-white text-black border-white font-black shadow-2xs'
                  : isZero
                  ? 'bg-white/[0.02] text-zinc-500 border-white/5 hover:border-white/15 font-medium'
                  : 'bg-white/[0.05] text-zinc-200 border-white/10 hover:bg-white/10 hover:border-white/25 font-bold'
              }`}
            >
              <span className="text-[8px] font-mono uppercase tracking-tight truncate">
                {config.shortLabel}
              </span>
              <span
                className={`text-[7.5px] font-mono tabular-nums ml-0.5 shrink-0 px-0.5 rounded ${
                  isSelected
                    ? 'bg-black/15 text-black font-black'
                    : isZero
                    ? 'text-zinc-600'
                    : 'bg-white/10 text-zinc-300'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Quick Word Length Multi-Select Pills */}
      {availableLengths.length > 0 && onSelectLengthFilter && (
        <div className="pt-1 border-t border-white/10">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[8px] font-mono font-bold uppercase tracking-wider text-zinc-400">
              Length Filter
            </span>
            {activeLengthArray.length > 0 && onClearLengthFilter && (
              <button
                type="button"
                onClick={onClearLengthFilter}
                className="text-[8px] font-mono text-zinc-400 hover:text-white cursor-pointer"
              >
                Clear ({activeLengthArray.length})
              </button>
            )}
          </div>
          <div className="flex items-center gap-0.5 flex-wrap">
            {availableLengths.map((bin) => {
              const isLenActive = activeLengthArray.includes(bin.length);
              return (
                <button
                  key={bin.length}
                  type="button"
                  onClick={() => handleToggleLengthChip(bin.length)}
                  className={`px-1 py-0.2 rounded text-[8px] font-mono tabular-nums border transition-all cursor-pointer ${
                    isLenActive
                      ? 'bg-white text-black border-white font-black'
                      : 'bg-white/[0.05] text-zinc-300 border-white/10 hover:bg-white/15 hover:text-white font-bold'
                  }`}
                  title={`${bin.length} letters (${bin.count} words)`}
                >
                  {bin.length}L <span className="opacity-60 text-[7.5px]">{bin.count}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  ) : showSortMenu && onSortByChange ? (
    <div
      ref={sortMenuRef}
      role="menu"
      className={`absolute ${menuVerticalPosClass} right-0 w-48 bg-[#121215]/98 backdrop-blur-xl border border-white/15 rounded-xl shadow-2xl p-1.5 z-50 select-none animate-in fade-in zoom-in-95 duration-100`}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-2 py-1 mb-1 border-b border-white/10">
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
          Sort Words
        </span>
      </div>
      <div className="flex flex-col gap-0.5">
        {SORT_OPTIONS.map((option) => {
          const isSelected = sortBy === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                triggerHaptic('snap');
                onSortByChange(option.id);
                setShowSortMenu(false);
              }}
              className={`flex items-center justify-between w-full h-7.5 px-2 rounded-lg text-left transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-white text-black font-bold'
                  : 'text-zinc-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="shrink-0">{option.icon}</span>
                <span className="text-[11px] font-mono truncate">{option.label}</span>
              </div>
              {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
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
            isResizing={activeDrag === 1 || activeDrag === 2}
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

      case 'composer': {
        // When !hasStage (only composer and explorer are visible), allow dragging the divider
        // to smoothly resize composer or collapse it to 36px when minimized!
        const isComposerMini = isComposerCollapsed || (!hasStage && isCard1Minimized && hasUserCustomized);
        const isComposerFlexing =
          !hasStage &&
          (isExplorerMinimized ||
            activeDrag !== null ||
            (hasUserCustomized && !isCard1Minimized && ratio1 > 0.22));

        const composerStyle: React.CSSProperties = isComposerMini
          ? { height: '36px', minHeight: '34px', flex: 'none' }
          : !hasStage && isExplorerMinimized
          ? { flex: '1 1 0%', minHeight: '120px' }
          : isComposerFlexing
          ? {
              flex: `${Math.max(0.14, Math.min(0.75, ratio1))} 1 0%`,
              minHeight: isKeyboardOpen ? '56px' : '72px',
            }
          : {
              height: isKeyboardOpen ? '58px' : '72px',
              minHeight: '56px',
              flex: 'none',
            };

        return (
          <div
            key="composer"
            className={`w-full relative overflow-hidden flex flex-col min-h-0 shrink-0 bg-transparent px-2 sm:px-2.5 transition-all ${
              activeDrag ? 'duration-0' : 'duration-350 ease-[cubic-bezier(0.16,1,0.3,1)]'
            } ${
              isBeingDragged
                ? 'opacity-80 ring-2 ring-white/40 shadow-2xl scale-[0.99] z-40'
                : ''
            }`}
            style={composerStyle}
          >
            <div className="w-full h-full flex flex-col justify-center min-h-0">
              {React.isValidElement(card2)
                ? React.cloneElement(card2 as React.ReactElement<any>, {
                    isCollapsed: isComposerMini,
                    onToggleCollapse: () => {
                      if (!hasStage && isCard1Minimized && hasUserCustomized) {
                        setIsCard1Minimized(false);
                        setDetent(SplitDetents.balanced);
                      } else {
                        handleToggleComposerCollapse();
                      }
                    },
                  })
                : card2}
            </div>
          </div>
        );
      }

      case 'explorer': {
        if (!hasCard3) return null;
        const isComposerFlexing =
          !hasStage &&
          (isExplorerMinimized ||
            activeDrag !== null ||
            (hasUserCustomized && !isCard1Minimized && ratio1 > 0.22));

        return (
          <BottomWrapper
            key="explorer"
            id="explorer"
            className="px-2 sm:px-2.5"
            title="Word Explorer"
            isFirst={isFirst}
            isLast={isLast}
            isBeingDragged={isBeingDragged}
            onStartDrag={(e) => startPanelDrag('explorer', e)}
            onMoveUp={() => movePanel('explorer', 'up')}
            onMoveDown={() => movePanel('explorer', 'down')}
            isMinimized={isExplorerMinimized}
            isFull={soloCard === 3}
            isResizing={activeDrag === 1 || activeDrag === 2}
            onRestore={() => {
              setIsCard3Minimized(false);
              setSoloCard(null);
              setDetent(SplitDetents.balanced);
            }}
            style={
              isExplorerMinimized
                ? { height: '34px', flex: 'none' }
                : (isStageMinimized && hasStage) || (!hasStage && !isComposerFlexing)
                ? { flex: '1 1 0%', minHeight: '120px' }
                : { flex: `${Math.max(0.18, Math.min(0.86, 1 - ratio1))} 1 0%`, minHeight: '100px' }
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
    }
  };

  return (
    <div
      ref={containerRef}
      className={`ThreePaneSplit relative flex flex-col w-full h-full min-h-0 select-none overflow-hidden bg-[#09090b] ${className}`}
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
                shouldSuppressClick={shouldSuppressClick}
                onToggleCollapse={isDivider1 ? toggleMinimizeCard1 : toggleMinimizeCard3}
                isCollapsed={isDivider1 ? isCard1Minimized : isCard3Minimized}
                collapseTooltip={
                  isDivider1
                    ? isCard1Minimized
                      ? 'Expand stage · Drag to resize'
                      : 'Minimize stage · Drag to resize'
                    : isCard3Minimized
                    ? 'Expand word panel · Drag to resize'
                    : 'Minimize word panel · Drag to resize'
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
                splitRatio={!isDivider1 && isSplitActive ? splitRatio : undefined}
                rightLeadingAccessories={!isDivider1 ? resolvedDivider2RightLeading : undefined}
                rightLeadingMenu={!isDivider1 ? divider2RightLeadingMenu : undefined}
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
            <span className="px-1.5 py-0.2 rounded-full bg-white/10 text-[10px] font-mono tabular-nums text-zinc-300">
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
            <span className="px-1.5 py-0.2 rounded-full bg-white/10 text-[10px] font-mono tabular-nums text-zinc-300">
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
