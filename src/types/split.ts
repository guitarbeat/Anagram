import React from 'react';

/**
 * SplitDetent.ts
 * Direct TypeScript implementation of SplitDetent.swift from VerticalSplit
 *
 * A type that represents how the top and bottom views are split in VerticalSplit.
 */

export type SplitDetentType =
  | 'topFull'
  | 'bottomFull'
  | 'topMini'
  | 'bottomMini'
  | 'fraction';

export type SplitDetent =
  /** A detent when the top view fills the entirety of the screen. A pill is shown at the bottom of the screen with accessories and the title of the bottom view. */
  | { type: 'topFull' }
  /** A detent when the bottom view fills the entirety of the screen. A pill is shown at the top of the screen with accessories and the title of the top view. */
  | { type: 'bottomFull' }
  /** A detent when the bottom view fills most of the screen. The mini overlay for the top view is shown. */
  | { type: 'topMini' }
  /** A detent when the top view fills most of the screen. The mini overlay for the bottom view is shown. */
  | { type: 'bottomMini' }
  /** A detent where the specified value represents the proportion of the screen occupied by the top view. The value is within 0 and 1. */
  | { type: 'fraction'; value: number };

export const SplitDetents = {
  topFull: { type: 'topFull' } as const,
  bottomFull: { type: 'bottomFull' } as const,
  topMini: { type: 'topMini' } as const,
  bottomMini: { type: 'bottomMini' } as const,
  fraction: (value: number): SplitDetent => ({
    type: 'fraction',
    value: Math.max(0, Math.min(1, Number(value.toFixed(3)))),
  }),

  // Harmonic presets
  balanced: { type: 'fraction', value: 0.48 } as const,
  focusTop: { type: 'fraction', value: 0.72 } as const,
  focusBottom: { type: 'fraction', value: 0.28 } as const,

  /** A textual representation of the detent, matching SplitDetent.description in Swift */
  description(detent: SplitDetent): string {
    if (detent.type === 'fraction') {
      return `fraction(${detent.value.toFixed(3)})`;
    }
    return detent.type;
  },

  /** Human-friendly UI badge label */
  label(detent: SplitDetent): string {
    switch (detent.type) {
      case 'topFull':
        return 'Solo Stage';
      case 'bottomFull':
        return 'Solo Words';
      case 'topMini':
        return 'Mini Stage';
      case 'bottomMini':
        return 'Mini Words';
      case 'fraction':
        if (Math.abs(detent.value - 0.48) < 0.04) return '50/50 Balanced';
        if (detent.value >= 0.65) return 'Stage 75%';
        if (detent.value <= 0.25) return 'Words 75%';
        return `${Math.round(detent.value * 100)}% Split`;
    }
  },

  isFull(detent: SplitDetent): boolean {
    return detent.type === 'topFull' || detent.type === 'bottomFull';
  },

  isMini(detent: SplitDetent): boolean {
    return detent.type === 'topMini' || detent.type === 'bottomMini';
  },

  toFraction(detent: SplitDetent): number {
    switch (detent.type) {
      case 'topFull':
        return 1.0;
      case 'bottomFull':
        return 0.0;
      case 'topMini':
        return 0.12;
      case 'bottomMini':
        return 0.88;
      case 'fraction':
        return detent.value;
    }
  },

  fromFraction(value: number, notches = 6): SplitDetent {
    if (value <= 0.10) return SplitDetents.topMini;
    if (value >= 0.88) return SplitDetents.bottomMini;
    const notch = Math.round(value * notches);
    const snapped = notch / notches;
    return SplitDetents.fraction(snapped);
  },

  equals(a: SplitDetent, b: SplitDetent): boolean {
    if (a.type !== b.type) return false;
    if (a.type === 'fraction' && b.type === 'fraction') {
      return Math.abs(a.value - b.value) < 0.03;
    }
    return true;
  },
};

/**
 * Accessory buttons shown on each side of the drag indicator in VerticalSplit
 * Ported from Accessories.swift & Modifiers.swift
 */
export interface SplitAccessory {
  id: string;
  title: string;
  icon?: React.ReactNode;
  label?: React.ReactNode;
  badge?: React.ReactNode;
  shortcut?: string;
  action: (e?: React.MouseEvent) => void;
  color?: string;
  active?: boolean;
  customContent?: React.ReactNode;
  onContextMenu?: (e: React.MouseEvent) => void;
  onDoubleClick?: (e: React.MouseEvent) => void;
  onPointerDown?: (e: React.PointerEvent) => void;
  onPointerUp?: (e: React.PointerEvent) => void;
  onPointerLeave?: (e: React.PointerEvent) => void;
}

/**
 * Factory helper for SplitAccessory
 * Ported from `init(title: String? = nil, systemName: String, color: Color = .white, action: ...)`
 */
export function createSplitAccessory(params: {
  title?: string;
  systemName?: string;
  icon?: React.ReactNode;
  label?: React.ReactNode;
  badge?: React.ReactNode;
  shortcut?: string;
  color?: string;
  action: () => void;
  active?: boolean;
}): SplitAccessory {
  const title = params.title || params.systemName || 'Accessory';
  const id = `${title}_${params.systemName || 'icon'}`;
  return {
    id,
    title,
    icon: params.icon,
    label: params.label,
    badge: params.badge,
    shortcut: params.shortcut,
    action: params.action,
    color: params.color || '#ffffff',
    active: params.active,
  };
}

/**
 * Larger accessory buttons shown in a pop-out menu in VerticalSplit
 * Ported from Accessories.swift & Modifiers.swift
 */
export interface MenuAccessory {
  id: string;
  title: string;
  icon?: React.ReactNode;
  action: () => void;
  color?: string;
  active?: boolean;
}

/**
 * Factory helper for MenuAccessory
 * Ported from `init(title: String? = nil, systemName: String, color: Color = Color(uiColor: .label), action: ...)`
 */
export function createMenuAccessory(params: {
  title?: string;
  systemName?: string;
  icon?: React.ReactNode;
  color?: string;
  action: () => void;
  active?: boolean;
}): MenuAccessory {
  const title = params.title || params.systemName || 'Menu';
  const id = `${title}_${params.systemName || 'icon'}`;
  return {
    id,
    title,
    icon: params.icon,
    action: params.action,
    color: params.color,
    active: params.active,
  };
}

export type PresetType = 'balanced' | 'focusStage' | 'focusExplorer';

export type PanelId = 'stage' | 'composer' | 'explorer';

export type WordFilterMode = 'safe' | 'all' | 'closers' | 'pairs' | 'common' | 'long' | 'top' | 'rare';

export interface PanelConfig {
  id: PanelId;
  name: string;
  shortName: string;
  iconName: string;
}
