import React from 'react';
import {
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';

export interface SplitDividerProps {
  orientation: 'horizontal' | 'vertical';
  isDragging: boolean;
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onDoubleClick?: () => void;
  title?: string;
  className?: string;

  // Primary collapse/expand buttons on the capsule handle
  onCollapsePrev?: (e: React.MouseEvent) => void;
  collapsePrevTitle?: string;
  collapsePrevIcon?: 'up' | 'left';

  onCollapseNext?: (e: React.MouseEvent) => void;
  collapseNextTitle?: string;
  collapseNextIcon?: 'down' | 'right';

  // Optional reset button
  onReset?: (e: React.MouseEvent) => void;
  showReset?: boolean;
  resetTitle?: string;

  // Optional presets slot (e.g. Stage+, Balanced, Words+)
  presets?: React.ReactNode;
}

export const SplitDivider: React.FC<SplitDividerProps> = ({
  orientation,
  isDragging,
  onPointerDown,
  onDoubleClick,
  title,
  className = '',
  onCollapsePrev,
  collapsePrevTitle,
  collapsePrevIcon,
  onCollapseNext,
  collapseNextTitle,
  collapseNextIcon,
  onReset,
  showReset = false,
  resetTitle = 'Reset layout proportions',
  presets,
}) => {
  const isHorizontal = orientation === 'horizontal';

  // Determine appropriate default chevron icons based on orientation
  const prevIcon = collapsePrevIcon || (isHorizontal ? 'up' : 'left');
  const nextIcon = collapseNextIcon || (isHorizontal ? 'down' : 'right');

  return (
    <div
      role="separator"
      tabIndex={0}
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
      title={title}
      style={{ touchAction: 'none' }}
      className={`relative flex items-center justify-center z-30 touch-none select-none shrink-0 group my-0 py-0 ${
        isHorizontal
          ? 'w-full h-3 cursor-row-resize flex-row gap-1'
          : 'h-full w-3.5 cursor-col-resize flex-col gap-0.5'
      } ${className}`}
    >
      {/* Laser highlight line */}
      <div
        className={`absolute transition-colors duration-300 pointer-events-none ${
          isHorizontal ? 'inset-x-0 h-[1px]' : 'inset-y-0 w-[1px]'
        } ${
          isDragging
            ? 'bg-zinc-400 shadow-[0_0_8px_rgba(255,255,255,0.25)]'
            : 'bg-zinc-800/80 group-hover:bg-zinc-600'
        }`}
      />

      {/* Prev / Collapse Button (Up or Left) - Directly on the divider */}
      {onCollapsePrev && (
        <button
          type="button"
          onClick={onCollapsePrev}
          title={collapsePrevTitle}
          onPointerDown={(e) => e.stopPropagation()}
          className="relative z-10 w-3.5 h-3.5 flex items-center justify-center rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 transition-colors cursor-pointer shrink-0"
        >
          {prevIcon === 'left' ? (
            <ChevronLeft className="w-2.5 h-2.5" />
          ) : (
            <ChevronUp className="w-2.5 h-2.5" />
          )}
        </button>
      )}

      {/* Grip Indicator Line - Seamlessly merged into the divider center */}
      <div
        className={`relative z-10 rounded-full transition-all shrink-0 pointer-events-none ${
          isHorizontal
            ? 'w-6 h-[2px] mx-1'
            : 'w-[2px] h-6 my-0.5'
        } ${
          isDragging
            ? 'bg-white shadow-[0_0_6px_rgba(255,255,255,0.4)]'
            : 'bg-zinc-500 group-hover:bg-zinc-300'
        }`}
      />

      {/* Next / Collapse Button (Down or Right) - Directly on the divider */}
      {onCollapseNext && (
        <button
          type="button"
          onClick={onCollapseNext}
          title={collapseNextTitle}
          onPointerDown={(e) => e.stopPropagation()}
          className="relative z-10 w-3.5 h-3.5 flex items-center justify-center rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 transition-colors cursor-pointer shrink-0"
        >
          {nextIcon === 'right' ? (
            <ChevronRight className="w-2.5 h-2.5" />
          ) : (
            <ChevronDown className="w-2.5 h-2.5" />
          )}
        </button>
      )}

      {/* Otherside Container (Right side): Presets & Reset Controls */}
      {(presets || (showReset && onReset)) && (
        <div
          className="absolute right-3 z-20 flex items-center gap-1.5 pointer-events-auto"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {presets && (
            <div className="hidden sm:flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity duration-300">
              {presets}
            </div>
          )}
          {showReset && onReset && (
            <button
              type="button"
              onClick={onReset}
              title={resetTitle}
              className="w-3.5 h-3.5 flex items-center justify-center rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-all duration-200 cursor-pointer"
            >
              <RotateCcw className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
