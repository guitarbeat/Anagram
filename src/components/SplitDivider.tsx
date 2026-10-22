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

  /** Optional callback to suppress stray clicks immediately after a drag gesture */
  shouldSuppressClick?: () => boolean;

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
 * Directly inspired by VerticalSplit (vedantgurav/VerticalSplit) & Amie splitscreen.
 * A full-width dark complication dock featuring:
 * - Left: Leading complication buttons (e.g. WORDS, GRAPH, BLOCKS, STATS, SOLVE)
 * - Center: Tactile drag notch pill combined with show/hide toggle
 * - Right: Trailing complication buttons (e.g. FILTER, SORT, Split Presets)
 * - Pop-out Menu Accessories that bloom directly from the split bar
 */
const AccessoryItem: React.FC<{ accessory: SplitAccessory }> = ({ accessory }) => {
  if (accessory.customContent) {
    return (
      <div className="flex items-center shrink-0">
        {accessory.customContent}
      </div>
    );
  }

  const isIconOnly = !accessory.label && (accessory.badge === undefined || accessory.badge === null);
  const isTab = accessory.variant === 'tab';

  if (isTab) {
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
        className={`relative flex items-center justify-center gap-1.5 transition-all duration-150 cursor-pointer shrink-0 select-none whitespace-nowrap active:scale-[0.98] ${
          accessory.active
            ? 'h-8 sm:h-8.5 px-3.5 sm:px-4 bg-white text-black font-black rounded-t-xl sm:rounded-t-2xl rounded-b-none border-t-2 border-l-2 border-r-2 border-black border-b-0 z-30 translate-y-[2px] self-end shadow-xs'
            : 'h-6.5 sm:h-7 px-2.5 sm:px-3 bg-white/[0.05] text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.12] font-bold rounded-xl border border-white/10 hover:border-white/25 z-10 self-center my-auto shadow-xs'
        }`}
      >
        {/* Seamless bottom mask bridging active tab directly into the white card below */}
        {accessory.active && (
          <span className="absolute -bottom-[2px] inset-x-0 h-[3px] bg-white pointer-events-none z-30" />
        )}

        {accessory.icon && (
          <span className="shrink-0 flex items-center justify-center">{accessory.icon}</span>
        )}
        {accessory.label && (
          <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider leading-none whitespace-nowrap">
            {accessory.label}
          </span>
        )}
        {accessory.badge !== undefined && accessory.badge !== null && (
          <span
            className={`text-[8.5px] sm:text-[9px] font-mono font-black tabular-nums px-1.5 py-0.2 rounded-full leading-none shrink-0 ${
              accessory.active
                ? 'bg-black text-white'
                : 'bg-white/15 text-zinc-200'
            }`}
          >
            {accessory.badge}
          </span>
        )}
      </button>
    );
  }

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
          ? `h-6.5 w-6.5 flex items-center justify-center rounded-lg border transition-all duration-150 ease-out cursor-pointer shrink-0 select-none active:scale-[0.88] ${
              accessory.active
                ? 'bg-white text-black border-white shadow-xs'
                : 'bg-white/[0.04] border-white/[0.08] text-zinc-400 hover:text-white hover:bg-white/[0.1] hover:border-white/20'
            }`
          : `h-6.5 sm:h-7 px-2 sm:px-3 min-w-[24px] flex items-center justify-center gap-1 rounded-lg sm:rounded-xl border transition-all duration-150 ease-out cursor-pointer shrink-0 select-none whitespace-nowrap active:scale-[0.92] ${
              accessory.active
                ? 'bg-white text-black border-white font-black shadow-xs'
                : 'bg-white/[0.04] text-zinc-400 border-white/[0.08] hover:text-zinc-100 hover:bg-white/[0.1] hover:border-white/20 font-bold'
            }`
      }
    >
      {accessory.icon && (
        <span className="shrink-0 flex items-center justify-center">{accessory.icon}</span>
      )}
      {accessory.label && (
        <span className="text-[9.5px] sm:text-[10.5px] font-mono uppercase tracking-wider leading-none whitespace-nowrap">
          {accessory.label}
        </span>
      )}
      {accessory.badge !== undefined && accessory.badge !== null && (
        <span
          className={`text-[8.5px] sm:text-[9px] font-mono font-black tabular-nums px-1 py-0.2 rounded leading-none shrink-0 ${
            accessory.active
              ? 'bg-black/15 text-black'
              : 'bg-white/15 text-zinc-200'
          }`}
        >
          {accessory.badge}
        </span>
      )}
      {accessory.shortcut && !isIconOnly && (
        <kbd
          className={`hidden xl:inline text-[8px] font-mono font-bold px-1 py-0.2 rounded leading-none ${
            accessory.active
              ? 'bg-black/10 text-zinc-800 border border-black/15'
              : 'bg-white/10 text-zinc-400 border border-white/10'
          }`}
        >
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
  shouldSuppressClick,
  presets,
  onCollapsePrev,
  collapsePrevTitle,
  collapsePrevIcon,
  onCollapseNext,
  collapseNextTitle,
  collapseNextIcon,
}) => {
  const isHorizontal = orientation === 'horizontal';
  const hasOpenMenu = Boolean(leadingMenu || trailingMenu);

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

  const handleCaptureClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (shouldSuppressClick && shouldSuppressClick()) {
      e.stopPropagation();
      e.preventDefault();
    }
  };

  const hasTabs = resolvedLeading?.some((a) => a.variant === 'tab');

  return (
    <div
      role="separator"
      tabIndex={0}
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
      onClickCapture={handleCaptureClick}
      aria-label="Split resizer and complications bar"
      style={{ touchAction: 'none' }}
      className={`SplitDivider relative select-none shrink-0 ${
        hasOpenMenu ? 'z-50' : 'z-30'
      } touch-none group transition-colors duration-150 ${
        isHorizontal
          ? hasTabs
            ? 'w-full h-8 sm:h-8.5 bg-[#09090b] flex items-end justify-between px-2 sm:px-2.5 cursor-row-resize border-b-2 border-black'
            : 'w-full h-8 sm:h-9 bg-[#09090b] flex items-center justify-between gap-1.5 px-1.5 sm:px-2 cursor-row-resize'
          : 'h-full w-7 sm:w-8 bg-[#09090b] flex flex-col items-center justify-between py-1.5 sm:py-2 cursor-col-resize'
      } ${isDragging ? 'bg-[#121217]' : 'hover:bg-[#0d0d11]'} ${className}`}
    >
      {/* LEADING COMPLICATIONS (Left / Top) */}
      <div
        className={`flex shrink-0 z-30 relative ${
          isHorizontal ? 'gap-1.5 sm:gap-2 h-full items-end' : 'flex-col gap-1 items-center'
        }`}
      >
        {resolvedLeading?.map((accessory) => (
          <AccessoryItem key={accessory.id} accessory={accessory} />
        ))}
        {leadingMenu}
      </div>

      {/* CENTER TACTILE VERTICALSPLIT DRAG NOTCH & SHOW/HIDE HANDLE */}
      <div
        className={`flex items-center justify-center z-20 pointer-events-auto shrink-0 ${
          isHorizontal
            ? hasTabs
              ? 'mx-auto xl:absolute xl:left-1/2 xl:-translate-x-1/2 mb-1'
              : 'mx-auto xl:absolute xl:left-1/2 xl:-translate-x-1/2 h-full'
            : 'my-auto xl:absolute xl:top-1/2 xl:-translate-y-1/2 w-full'
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
            title={
              collapseTooltip ||
              statusTooltip ||
              (isCollapsed ? 'Tap to expand · Drag to resize' : 'Tap to minimize · Drag to resize')
            }
            aria-label={
              collapseTooltip ||
              statusTooltip ||
              (isCollapsed ? 'Expand panel' : 'Minimize panel')
            }
            data-drag-handle="split-divider-notch"
            className="flex items-center justify-center py-1.5 px-2 bg-transparent border-0 ring-0 shadow-none outline-none cursor-row-resize select-none group/notch active:scale-95 transition-all duration-150"
          >
            <div
              className={`rounded-full transition-all duration-200 flex items-center justify-center border ${
                isDragging
                  ? 'w-14 sm:w-18 h-1.5 bg-white border-white shadow-[0_0_14px_rgba(255,255,255,0.95)] scale-95'
                  : isSuccess
                  ? 'w-12 sm:w-14 h-1.5 bg-emerald-400 border-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.7)]'
                  : isBusy
                  ? 'w-11 sm:w-13 h-1.5 bg-zinc-300 border-white/60 animate-pulse'
                  : 'w-9 sm:w-12 h-1.5 bg-zinc-600/90 hover:bg-zinc-300 border-white/15 hover:border-white/50 group-hover/notch:w-14'
              }`}
            />
          </button>
        ) : (
          <div
            aria-label="Drag to resize split"
            data-drag-handle="split-divider-notch"
            className={`rounded-full transition-all duration-200 pointer-events-none flex items-center justify-center border ${
              isHorizontal
                ? isDragging
                  ? 'w-14 sm:w-18 h-1.5 bg-white border-white shadow-[0_0_14px_rgba(255,255,255,0.95)] scale-95'
                  : 'w-9 sm:w-12 h-1.5 bg-zinc-600/90 border-white/15 group-hover:bg-zinc-400 group-hover:w-14'
                : isDragging
                ? 'w-1.5 h-14 sm:h-18 bg-white border-white shadow-[0_0_14px_rgba(255,255,255,0.95)] scale-95'
                : 'w-1.5 h-9 sm:h-12 bg-zinc-600/90 border-white/15 group-hover:bg-zinc-400 group-hover:h-14'
            }`}
          />
        )}
      </div>

      {/* TRAILING COMPLICATIONS (Right / Bottom) + POP-OUT MENUS */}
      <div
        className={`flex items-center shrink-0 z-30 relative ${
          isHorizontal ? 'gap-1' : 'flex-col gap-1'
        } ${hasTabs && isHorizontal ? 'mb-1' : ''}`}
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
