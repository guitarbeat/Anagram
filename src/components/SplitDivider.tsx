import React from 'react';
import {
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { SplitAccessory, MenuAccessory } from '../types/split';
export type { SplitAccessory, MenuAccessory };

export interface SplitDividerProps {
  orientation: 'horizontal' | 'vertical';
  isDragging: boolean;
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onDoubleClick?: () => void;
  title?: string;
  className?: string;

  /** Buttons shown to the left (or top) of the drag indicator */
  leadingAccessories?: SplitAccessory[];

  /** Optional floating menu or popover anchored to the leading accessories */
  leadingMenu?: React.ReactNode;

  /** Buttons shown to the right (or bottom) of the drag indicator */
  trailingAccessories?: SplitAccessory[];

  /** Optional floating menu or popover anchored to the trailing accessories */
  trailingMenu?: React.ReactNode;

  /** Custom center content that unifies accessories and handle (e.g. merged scrubber & collapse notch) */
  centerContent?: React.ReactNode;

  /** Preferred container background color */
  bgColor?: string;

  /** Whether the solver or background task is running (subtle pulsing glow) */
  isBusy?: boolean;

  /** Whether new results were just found (subtle triumphant emerald glow) */
  isSuccess?: boolean;

  /** Optional status tooltip for the indicator */
  statusTooltip?: string;

  /** Combined Show/Hide Toggle on Center Handle */
  onToggleCollapse?: () => void;
  isCollapsed?: boolean;
  collapseTooltip?: string;

  // Backwards compatibility fallbacks
  presets?: React.ReactNode;
  onReset?: (e: React.MouseEvent) => void;
  showReset?: boolean;
  resetTitle?: string;
  onCollapsePrev?: (e: React.MouseEvent) => void;
  collapsePrevTitle?: string;
  collapsePrevIcon?: string;
  onCollapseNext?: (e: React.MouseEvent) => void;
  collapseNextTitle?: string;
  collapseNextIcon?: string;
}

/**
 * SplitDivider
 * Directly inspired by VerticalSplit (SwiftUI) & Amie splitscreen.
 * A full-width dark toolbar dock featuring:
 * - Left: Leading accessory buttons (modes, toggles)
 * - Center: Tactile drag notch pill combined with show/hide toggle
 * - Right: Trailing accessory buttons (presets, actions)
 */
const AccessoryItem: React.FC<{ accessory: SplitAccessory }> = ({ accessory }) => {
  if (accessory.customContent) {
    return (
      <div className="flex items-center shrink-0" onPointerDown={(e) => e.stopPropagation()}>
        {accessory.customContent}
      </div>
    );
  }

  const isIconOnly = !accessory.label && (accessory.badge === undefined || accessory.badge === null);

  return (
    <button
      type="button"
      onClick={accessory.action}
      onContextMenu={accessory.onContextMenu}
      onDoubleClick={accessory.onDoubleClick}
      onPointerDown={accessory.onPointerDown}
      onPointerUp={accessory.onPointerUp}
      onPointerLeave={accessory.onPointerLeave}
      title={accessory.title}
      className={
        isIconOnly
          ? 'p-1 flex items-center justify-center bg-transparent border-0 ring-0 shadow-none outline-none transition-all duration-150 ease-out cursor-pointer shrink-0 select-none active:scale-[0.85] text-zinc-400 hover:text-white hover:scale-110'
          : `h-6 sm:h-6.5 px-2 min-w-[24px] sm:min-w-[26px] flex items-center justify-center gap-1.5 rounded-full sm:rounded-md border border-white/5 transition-all duration-150 ease-out cursor-pointer shrink-0 select-none active:scale-[0.88] active:opacity-80 ${
              accessory.active
                ? 'text-white bg-white/20 border-white/25 shadow-xs ring-1 ring-white/15 font-semibold'
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.07] hover:border-white/10'
            }`
      }
    >
      {accessory.icon}
      {accessory.label && (
        <span className="text-[11px] tracking-tight font-medium whitespace-nowrap">
          {accessory.label}
        </span>
      )}
      {accessory.badge !== undefined && accessory.badge !== null && (
        <span className="text-[9.5px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-white/20 text-white leading-none">
          {accessory.badge}
        </span>
      )}
      {accessory.shortcut && !isIconOnly && (
        <kbd className="hidden lg:inline text-[8.5px] font-mono font-semibold px-1 py-0.2 rounded bg-white/10 text-zinc-300 border border-white/10 leading-none">
          {accessory.shortcut}
        </kbd>
      )}
    </button>
  );
};

export const SplitDivider: React.FC<SplitDividerProps> = ({
  orientation,
  isDragging,
  onPointerDown,
  onDoubleClick,
  title,
  className = '',
  leadingAccessories,
  leadingMenu,
  trailingAccessories,
  trailingMenu,
  centerContent,
  isBusy = false,
  isSuccess = false,
  statusTooltip,
  onToggleCollapse,
  isCollapsed = false,
  collapseTooltip,
  presets,
  onReset,
  showReset = false,
  onCollapsePrev,
  collapsePrevTitle,
  collapsePrevIcon,
  onCollapseNext,
  collapseNextTitle,
  collapseNextIcon,
}) => {
  const isHorizontal = orientation === 'horizontal';

  // Synthesize from legacy props if explicit accessories are not provided
  const resolvedLeading =
    leadingAccessories ||
    (onCollapsePrev
      ? [
          {
            id: 'legacyPrev',
            title: collapsePrevTitle || 'Collapse previous',
            icon:
              collapsePrevIcon === 'left' ? (
                <ChevronLeft className="w-3.5 h-3.5" />
              ) : (
                <ChevronUp className="w-3.5 h-3.5" />
              ),
            action: onCollapsePrev,
          },
        ]
      : []);

  const resolvedTrailing =
    trailingAccessories ||
    (onCollapseNext
      ? [
          {
            id: 'legacyNext',
            title: collapseNextTitle || 'Collapse next',
            icon:
              collapseNextIcon === 'right' ? (
                <ChevronRight className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              ),
            action: onCollapseNext,
          },
        ]
      : []);

  return (
    <div
      role="separator"
      tabIndex={0}
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
      title={title || 'Drag to resize split (Double-click to reset 50/50)'}
      style={{ touchAction: 'none' }}
      className={`SplitDivider relative select-none shrink-0 z-30 touch-none group transition-colors duration-150 ${
        isHorizontal
          ? 'w-full h-5 sm:h-5.5 bg-[#09090b] flex items-center justify-between px-2.5 cursor-row-resize border-y border-white/[0.06]'
          : 'h-full w-5 sm:w-5.5 bg-[#09090b] flex flex-col items-center justify-between py-2.5 cursor-col-resize border-x border-white/[0.06]'
      } ${isDragging ? 'bg-[#121217]' : 'hover:bg-[#0e0e12]'} ${className}`}
    >
      {/* LEADING ACCESSORIES (Left / Top) */}
      <div
        className={`flex items-center shrink-0 z-30 relative ${
          isHorizontal ? 'gap-1' : 'flex-col gap-1'
        }`}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {resolvedLeading?.map((accessory) => (
          <AccessoryItem key={accessory.id} accessory={accessory} />
        ))}
        {leadingMenu}
      </div>

      {/* CENTER TACTILE DRAG NOTCH & COMBINED SHOW/HIDE HANDLE OR UNIFIED CENTER CONTENT */}
      <div
        className={`flex items-center justify-center z-20 pointer-events-auto h-full ${
          isHorizontal
            ? 'absolute left-1/2 -translate-x-1/2'
            : 'absolute top-1/2 -translate-y-1/2'
        }`}
      >
        {centerContent ? (
          centerContent
        ) : onToggleCollapse ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapse();
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
            }}
            title={
              collapseTooltip ||
              statusTooltip ||
              (isCollapsed
                ? 'Click to expand panel (Drag to resize, double-click to reset)'
                : 'Click to minimize panel (Drag to resize, double-click to reset)')
            }
            className="flex items-center justify-center py-0.5 px-1.5 bg-transparent border-0 ring-0 shadow-none outline-none cursor-pointer select-none group/notch active:scale-95 transition-all duration-150"
          >
            <span
              className={`rounded-full transition-all duration-200 block ${
                isDragging
                  ? 'w-12 h-1 bg-white shadow-[0_0_8px_rgba(255,255,255,0.7)]'
                  : 'w-7 sm:w-8 h-0.5 sm:h-1 bg-zinc-600/80 group-hover/notch:bg-zinc-200 group-hover/notch:w-10'
              }`}
            />
          </button>
        ) : (
          <span
            title={statusTooltip || title}
            className={`rounded-full transition-all duration-200 pointer-events-none block ${
              isHorizontal
                ? isDragging
                  ? 'w-12 h-1 bg-white shadow-[0_0_8px_rgba(255,255,255,0.7)]'
                  : 'w-7 sm:w-8 h-0.5 sm:h-1 bg-zinc-600/80 group-hover:bg-zinc-300 group-hover:w-10'
                : isDragging
                  ? 'w-1 h-12 bg-white shadow-[0_0_8px_rgba(255,255,255,0.7)]'
                  : 'w-0.5 sm:w-1 h-7 sm:h-8 bg-zinc-600/80 group-hover:bg-zinc-300 group-hover:h-10'
            }`}
          />
        )}
      </div>

      {/* TRAILING ACCESSORIES (Right / Bottom) + PRESETS MENU */}
      <div
        className={`flex items-center shrink-0 z-30 relative ${
          isHorizontal ? 'gap-1' : 'flex-col gap-1'
        }`}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {resolvedTrailing?.map((accessory) => (
          <AccessoryItem key={accessory.id} accessory={accessory} />
        ))}
        {trailingMenu}

        {/* Backwards compatible presets slot */}
        {presets && <div className="hidden sm:flex items-center">{presets}</div>}
      </div>
    </div>
  );
};
