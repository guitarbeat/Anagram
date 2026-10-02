import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  ChevronUp,
  ChevronDown,
  RotateCcw,
  Theater,
  ChevronsUp,
  ChevronsDown,
  Rows2,
  BookOpen,
  Scale,
} from 'lucide-react';
import type { SplitAccessory, MenuAccessory, PresetType, SplitDetent, PanelId } from '../types/split';
import { SplitDetents, createSplitAccessory, createMenuAccessory } from '../types/split';
import { triggerHaptic } from '../utils/splitHelpers';

const PANEL_ORDER_STORAGE_KEY = 'funny_anagram_panel_order';
const DEFAULT_PANEL_ORDER: PanelId[] = ['stage', 'composer', 'explorer'];

export interface UseSplitControllerOptions {
  hasStage: boolean;
  hasCard3: boolean;
  isKeyboardOpen?: boolean;
  defaultDetent?: SplitDetent;
  onDetentChange?: (detent: SplitDetent) => void;
}

export function useSplitController({
  hasStage,
  hasCard3,
  isKeyboardOpen = false,
  defaultDetent = SplitDetents.balanced,
  onDetentChange,
}: UseSplitControllerOptions) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Dynamic panel order state with localStorage persistence
  const [panelOrder, setPanelOrderState] = useState<PanelId[]>(() => {
    try {
      const saved = localStorage.getItem(PANEL_ORDER_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 3 && DEFAULT_PANEL_ORDER.every(p => parsed.includes(p))) {
          return parsed as PanelId[];
        }
      }
    } catch {
      // Fallback
    }
    return DEFAULT_PANEL_ORDER;
  });

  // Drag-and-drop panel repositioning state
  const [draggedPanel, setDraggedPanel] = useState<PanelId | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);

  const setPanelOrder = useCallback((newOrder: PanelId[]) => {
    setPanelOrderState(newOrder);
    try {
      localStorage.setItem(PANEL_ORDER_STORAGE_KEY, JSON.stringify(newOrder));
    } catch {
      // Ignore
    }
  }, []);

  const movePanel = useCallback((panelId: PanelId, direction: 'up' | 'down') => {
    setPanelOrderState(prev => {
      const index = prev.indexOf(panelId);
      if (index === -1) return prev;
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const copy = [...prev];
      copy.splice(index, 1);
      copy.splice(targetIndex, 0, panelId);
      try {
        localStorage.setItem(PANEL_ORDER_STORAGE_KEY, JSON.stringify(copy));
      } catch {
        // Ignore
      }
      triggerHaptic('notch');
      return copy;
    });
  }, []);

  const resetPanelOrder = useCallback(() => {
    setPanelOrder(DEFAULT_PANEL_ORDER);
    triggerHaptic('notch');
  }, [setPanelOrder]);

  // Layout customization state
  const [hasUserCustomized, setHasUserCustomized] = useState<boolean>(false);
  const [currentDetent, setCurrentDetentState] = useState<SplitDetent>(defaultDetent);
  const [isCard1Minimized, setIsCard1Minimized] = useState<boolean>(
    defaultDetent.type === 'topMini' || defaultDetent.type === 'bottomFull'
  );
  const [isCard3Minimized, setIsCard3Minimized] = useState<boolean>(
    defaultDetent.type === 'bottomMini' || defaultDetent.type === 'topFull'
  );
  const [soloCard, setSoloCard] = useState<1 | 3 | null>(
    defaultDetent.type === 'topFull' ? 1 : defaultDetent.type === 'bottomFull' ? 3 : null
  );

  // Ratios (ratio1: Stage fraction, ratio2: Target Row fraction)
  const [ratio1, setRatio1] = useState<number>(SplitDetents.toFraction(defaultDetent));
  const [ratio2, setRatio2] = useState<number>(0.11);
  const [activeDrag, setActiveDrag] = useState<1 | 2 | null>(null);

  // Pointer history tracking for flick / velocity detection
  const pointerHistoryRef = useRef<{ y: number; time: number }[]>([]);

  // Core setDetent method implementing SplitDetent mechanics from VerticalSplit
  const setDetent = useCallback(
    (detent: SplitDetent) => {
      setHasUserCustomized(true);
      setCurrentDetentState(detent);
      onDetentChange?.(detent);

      switch (detent.type) {
        case 'topFull':
          setSoloCard(1);
          setIsCard1Minimized(false);
          setIsCard3Minimized(true);
          setRatio1(0.72);
          break;
        case 'bottomFull':
          setSoloCard(3);
          setIsCard1Minimized(true);
          setIsCard3Minimized(false);
          setRatio1(0.24);
          break;
        case 'topMini':
          setSoloCard(null);
          setIsCard1Minimized(true);
          setIsCard3Minimized(false);
          setRatio1(0.24);
          break;
        case 'bottomMini':
          setSoloCard(null);
          setIsCard1Minimized(false);
          setIsCard3Minimized(true);
          setRatio1(0.72);
          break;
        case 'fraction':
          setSoloCard(null);
          setIsCard1Minimized(false);
          setIsCard3Minimized(false);
          setRatio1(detent.value);
          setRatio2(0.09);
          break;
      }
    },
    [onDetentChange]
  );

  // Sync if controlled detent changes externally (e.g. from hotkeys or parent state)
  useEffect(() => {
    if (defaultDetent && !SplitDetents.equals(currentDetent, defaultDetent)) {
      setDetent(defaultDetent);
    }
  }, [defaultDetent, currentDetent, setDetent]);

  // Start dragging panel to reposition
  const startPanelDrag = useCallback((panelId: PanelId, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggedPanel(panelId);
    const currentIndex = panelOrder.indexOf(panelId);
    setDropTargetIndex(currentIndex);
    triggerHaptic('light');
  }, [panelOrder]);

  const startDrag1 = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setHasUserCustomized(true);
    setIsCard1Minimized(false);
    setSoloCard(null);
    pointerHistoryRef.current = [{ y: e.clientY, time: performance.now() }];
    setActiveDrag(1);
  };

  const startDrag2 = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setHasUserCustomized(true);
    setIsCard3Minimized(false);
    setSoloCard(null);
    pointerHistoryRef.current = [{ y: e.clientY, time: performance.now() }];
    setActiveDrag(2);
  };

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (draggedPanel && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const relY = (e.clientY - rect.top) / rect.height;
        // Map 0..1 to 0, 1, 2 slot indices
        const targetIdx = relY < 0.33 ? 0 : relY < 0.66 ? 1 : 2;
        setDropTargetIndex(targetIdx);
        return;
      }

      if (!activeDrag || !containerRef.current) return;
      const now = performance.now();
      pointerHistoryRef.current.push({ y: e.clientY, time: now });
      if (pointerHistoryRef.current.length > 6) {
        pointerHistoryRef.current.shift();
      }

      const rect = containerRef.current.getBoundingClientRect();
      const relativeY = (e.clientY - rect.top) / rect.height;

      if (activeDrag === 1 && hasStage) {
        const clamped1 = Math.max(0.18, Math.min(0.78, relativeY));
        setRatio1(clamped1);
      } else if (activeDrag === 2 && hasCard3) {
        const clamped2 = Math.max(0.18, Math.min(0.78, relativeY - 0.12));
        setRatio1(clamped2);
      }
    },
    [draggedPanel, activeDrag, hasStage, hasCard3]
  );

  const handlePointerUp = useCallback(() => {
    if (draggedPanel && dropTargetIndex !== null) {
      setPanelOrderState(prev => {
        const fromIdx = prev.indexOf(draggedPanel);
        if (fromIdx !== -1 && fromIdx !== dropTargetIndex) {
          const updated = [...prev];
          updated.splice(fromIdx, 1);
          updated.splice(dropTargetIndex, 0, draggedPanel);
          try {
            localStorage.setItem(PANEL_ORDER_STORAGE_KEY, JSON.stringify(updated));
          } catch {
            // Ignore
          }
          triggerHaptic('heavy');
          return updated;
        }
        return prev;
      });
      setDraggedPanel(null);
      setDropTargetIndex(null);
      return;
    }

    if (!activeDrag) return;

    const history = pointerHistoryRef.current;
    let velocityY = 0;
    if (history.length >= 2) {
      const first = history[0];
      const last = history[history.length - 1];
      const dt = last.time - first.time;
      if (dt > 12) {
        velocityY = (last.y - first.y) / dt;
      }
    }

    if (activeDrag === 1) {
      if (ratio1 > 0.68 || (velocityY > 0.5 && ratio1 > 0.58)) {
        triggerHaptic('heavy');
        setDetent(SplitDetents.focusTop);
      } else if (ratio1 < 0.26 || (velocityY < -0.38 && ratio1 < 0.34)) {
        triggerHaptic('heavy');
        setDetent(SplitDetents.topMini);
      } else {
        triggerHaptic('notch');
        setDetent(SplitDetents.balanced);
      }
    } else if (activeDrag === 2) {
      if (ratio1 < 0.32 || (velocityY < -0.5 && ratio1 < 0.42)) {
        triggerHaptic('heavy');
        setDetent(SplitDetents.focusBottom);
      } else if (ratio1 > 0.68 || (velocityY > 0.38 && ratio1 > 0.58)) {
        triggerHaptic('heavy');
        setDetent(SplitDetents.bottomMini);
      } else {
        triggerHaptic('notch');
        setDetent(SplitDetents.balanced);
      }
    }

    setActiveDrag(null);
  }, [draggedPanel, dropTargetIndex, activeDrag, ratio1, ratio2, setDetent]);

  useEffect(() => {
    if (!activeDrag && !draggedPanel) return;
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [activeDrag, draggedPanel, handlePointerMove, handlePointerUp]);

  const resetRatios = useCallback(() => {
    setHasUserCustomized(false);
    setDetent(SplitDetents.balanced);
  }, [setDetent]);

  const applyPreset = useCallback(
    (preset: PresetType) => {
      if (preset === 'balanced') {
        setDetent(SplitDetents.balanced);
      } else if (preset === 'focusStage') {
        setDetent(SplitDetents.focusTop);
      } else if (preset === 'focusExplorer') {
        setDetent(SplitDetents.focusBottom);
      }
    },
    [setDetent]
  );

  const cyclePresets = useCallback(() => {
    if (SplitDetents.equals(currentDetent, SplitDetents.balanced)) {
      setDetent(SplitDetents.focusTop);
    } else if (SplitDetents.equals(currentDetent, SplitDetents.focusTop)) {
      setDetent(SplitDetents.focusBottom);
    } else {
      setDetent(SplitDetents.balanced);
    }
  }, [currentDetent, setDetent]);

  const toggleMinimizeCard1 = useCallback(() => {
    if (isCard1Minimized) {
      setDetent(SplitDetents.balanced);
    } else {
      setDetent(SplitDetents.topMini);
    }
  }, [isCard1Minimized, setDetent]);

  const toggleMinimizeCard3 = useCallback(() => {
    if (isCard3Minimized) {
      setDetent(SplitDetents.balanced);
    } else {
      setDetent(SplitDetents.bottomMini);
    }
  }, [isCard3Minimized, setDetent]);

  // Modifiers.swift leadingAccessories & trailingAccessories for Divider 1 (Stage Split)
  const divider1LeadingAccessories: SplitAccessory[] = [
    createSplitAccessory({
      title: isCard1Minimized ? 'Expand Kinetic Stage' : 'Minimize Kinetic Stage',
      systemName: 'theatermasks',
      icon: <Theater className="w-3.5 h-3.5" />,
      action: toggleMinimizeCard1,
      active: !isCard1Minimized,
    }),
    createSplitAccessory({
      title: 'Stage Focus (75%)',
      systemName: 'arrow.up.and.line.horizontal.and.arrow.down',
      icon: <ChevronsUp className="w-3.5 h-3.5" />,
      action: () =>
        setDetent(
          SplitDetents.equals(currentDetent, SplitDetents.focusTop)
            ? SplitDetents.balanced
            : SplitDetents.focusTop
        ),
      active: SplitDetents.equals(currentDetent, SplitDetents.focusTop),
    }),
    createSplitAccessory({
      title: 'Balanced Split (50/50)',
      systemName: 'rectangle.split.2x1',
      icon: <Rows2 className="w-3.5 h-3.5" />,
      action: () => setDetent(SplitDetents.balanced),
      active: SplitDetents.equals(currentDetent, SplitDetents.balanced),
    }),
  ];

  const divider1TrailingAccessories: SplitAccessory[] = [
    createSplitAccessory({
      title: 'Reset Split (50/50)',
      systemName: 'arrow.counterclockwise',
      icon: <RotateCcw className="w-3.5 h-3.5" />,
      action: resetRatios,
      active: false,
    }),
  ];

  const divider1MenuAccessories: MenuAccessory[] = [
    createMenuAccessory({
      title: '50/50 Balanced',
      systemName: 'scale.3d',
      icon: <Scale className="w-3.5 h-3.5" />,
      action: () => setDetent(SplitDetents.balanced),
      active: SplitDetents.equals(currentDetent, SplitDetents.balanced),
    }),
    createMenuAccessory({
      title: 'Stage 75%',
      systemName: 'theatermasks',
      icon: <Theater className="w-3.5 h-3.5" />,
      action: () => setDetent(SplitDetents.focusTop),
      active: SplitDetents.equals(currentDetent, SplitDetents.focusTop),
    }),
    createMenuAccessory({
      title: 'Words 75%',
      systemName: 'books.vertical',
      icon: <BookOpen className="w-3.5 h-3.5" />,
      action: () => setDetent(SplitDetents.focusBottom),
      active: SplitDetents.equals(currentDetent, SplitDetents.focusBottom),
    }),
    createMenuAccessory({
      title: currentDetent.type === 'topFull' ? 'Exit Solo' : 'Solo Stage',
      systemName: 'magnifyingglass',
      action: () =>
        setDetent(
          currentDetent.type === 'topFull' ? SplitDetents.balanced : SplitDetents.topFull
        ),
      active: currentDetent.type === 'topFull',
    }),
    createMenuAccessory({
      title: 'Reset Panel Order',
      systemName: 'arrow.triangle.2.circlepath',
      action: resetPanelOrder,
    }),
  ];

  // Modifiers.swift leadingAccessories & trailingAccessories for Divider 2 (Explorer Split)
  const divider2LeadingAccessories: SplitAccessory[] = [
    createSplitAccessory({
      title: isCard3Minimized ? 'Expand Word Explorer' : 'Minimize Word Explorer',
      systemName: 'books.vertical',
      icon: <BookOpen className="w-3.5 h-3.5" />,
      action: toggleMinimizeCard3,
      active: !isCard3Minimized,
    }),
    createSplitAccessory({
      title: 'Explorer Focus (75%)',
      systemName: 'arrow.down.and.line.horizontal.and.arrow.up',
      icon: <ChevronsDown className="w-3.5 h-3.5" />,
      action: () =>
        setDetent(
          SplitDetents.equals(currentDetent, SplitDetents.focusBottom)
            ? SplitDetents.balanced
            : SplitDetents.focusBottom
        ),
      active: SplitDetents.equals(currentDetent, SplitDetents.focusBottom),
    }),
    createSplitAccessory({
      title: 'Balanced Split (50/50)',
      systemName: 'rectangle.split.2x1',
      icon: <Rows2 className="w-3.5 h-3.5" />,
      action: () => setDetent(SplitDetents.balanced),
      active: SplitDetents.equals(currentDetent, SplitDetents.balanced),
    }),
  ];

  const divider2TrailingAccessories: SplitAccessory[] = [
    createSplitAccessory({
      title: 'Reset Split (50/50)',
      systemName: 'arrow.counterclockwise',
      icon: <RotateCcw className="w-3.5 h-3.5" />,
      action: resetRatios,
      active: false,
    }),
  ];

  const divider2MenuAccessories: MenuAccessory[] = [
    createMenuAccessory({
      title: '50/50 Balanced',
      systemName: 'scale.3d',
      icon: <Scale className="w-3.5 h-3.5" />,
      action: () => setDetent(SplitDetents.balanced),
      active: SplitDetents.equals(currentDetent, SplitDetents.balanced),
    }),
    createMenuAccessory({
      title: 'Words 75%',
      systemName: 'books.vertical',
      icon: <BookOpen className="w-3.5 h-3.5" />,
      action: () => setDetent(SplitDetents.focusBottom),
      active: SplitDetents.equals(currentDetent, SplitDetents.focusBottom),
    }),
    createMenuAccessory({
      title: 'Stage 75%',
      systemName: 'theatermasks',
      icon: <Theater className="w-3.5 h-3.5" />,
      action: () => setDetent(SplitDetents.focusTop),
      active: SplitDetents.equals(currentDetent, SplitDetents.focusTop),
    }),
    createMenuAccessory({
      title: currentDetent.type === 'bottomFull' ? 'Exit Solo' : 'Solo Words',
      systemName: 'magnifyingglass',
      action: () =>
        setDetent(
          currentDetent.type === 'bottomFull' ? SplitDetents.balanced : SplitDetents.bottomFull
        ),
      active: currentDetent.type === 'bottomFull',
    }),
    createMenuAccessory({
      title: 'Reset Panel Order',
      systemName: 'arrow.triangle.2.circlepath',
      action: resetPanelOrder,
    }),
  ];

  // Derived visibility
  const showCard1 = hasStage && !isCard1Minimized && soloCard !== 3;
  const showCard3 = hasCard3 && !isCard3Minimized && soloCard !== 1;

  // Compute heights for Top, Middle, Bottom (flexible, zero-overflow layout)
  const topHeight =
    isCard1Minimized || soloCard === 3
      ? '38px'
      : undefined;

  const middleHeight = isKeyboardOpen ? '58px' : '72px';

  const bottomHeight =
    isCard3Minimized || soloCard === 1
      ? '38px'
      : undefined;

  return {
    containerRef,
    panelOrder,
    setPanelOrder,
    movePanel,
    resetPanelOrder,
    draggedPanel,
    dropTargetIndex,
    startPanelDrag,
    hasUserCustomized,
    currentDetent,
    setDetent,
    detentLabel: SplitDetents.label(currentDetent),
    detentDescription: SplitDetents.description(currentDetent),
    isCard1Minimized,
    isCard3Minimized,
    soloCard,
    ratio1,
    ratio2,
    activeDrag,
    showCard1,
    showCard3,
    topHeight,
    middleHeight,
    bottomHeight,
    startDrag1,
    startDrag2,
    resetRatios,
    applyPreset,
    cyclePresets,
    toggleMinimizeCard1,
    toggleMinimizeCard3,
    setIsCard1Minimized,
    setIsCard3Minimized,
    setSoloCard,
    divider1LeadingAccessories,
    divider1TrailingAccessories,
    divider1MenuAccessories,
    divider2LeadingAccessories,
    divider2TrailingAccessories,
    divider2MenuAccessories,
  };
}
