import React from 'react';
import type { PanelId } from '../types/split';

export interface PanelWrapperProps {
  id?: PanelId;
  title?: string;
  isFirst?: boolean;
  isLast?: boolean;
  isMinimized: boolean;
  isFull?: boolean;
  onRestore?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onStartDrag?: (e: React.PointerEvent) => void;
  isBeingDragged?: boolean;
  isDropTarget?: boolean;
  style?: React.CSSProperties;
  className?: string;
  bgColorClass?: string;
  isResizing?: boolean;
  content: React.ReactNode;
  overlay: React.ReactNode;
}

export const TopWrapper: React.FC<PanelWrapperProps> = ({
  isMinimized,
  isFull = false,
  onRestore,
  isBeingDragged = false,
  isDropTarget = false,
  style,
  className = '',
  bgColorClass,
  isResizing = false,
  content,
  overlay,
}) => {
  const progress = isMinimized ? 0 : 1;
  const activeBg =
    bgColorClass ||
    (isMinimized
      ? 'bg-[#121217] hover:bg-[#16161f] border border-zinc-800/90 hover:border-zinc-700 shadow-md group'
      : 'bg-white border-2 border-black shadow-sm');

  return (
    <div
      style={style}
      className={`TopWrapper relative flex flex-col min-h-0 ${
        isMinimized ? 'shrink-0' : 'shrink'
      } w-full overflow-hidden select-none rounded-xl sm:rounded-2xl transition-all ${activeBg} ${
        isResizing
          ? 'duration-0'
          : 'duration-350 ease-[cubic-bezier(0.16,1,0.3,1)]'
      } ${
        isBeingDragged
          ? 'opacity-80 ring-2 ring-white/40 shadow-2xl scale-[0.99] z-40'
          : isDropTarget
          ? 'ring-2 ring-white/60'
          : ''
      } ${className}`}
    >
      {/* Main Content Layer */}
      <div
        className="w-full h-full overflow-hidden flex flex-col min-h-0 origin-top transition-all duration-350 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{
          transform: `scale(${1 - (1 - progress) * 0.12})`,
          filter: progress < 1 ? `blur(${(1 - progress) * 3}px)` : 'none',
          opacity: progress,
          pointerEvents: progress > 0.2 ? 'auto' : 'none',
        }}
      >
        <div className="w-full h-full overflow-y-auto no-scrollbar flex flex-col min-h-0">
          {content}
        </div>
      </div>

      {/* Mini Overlay Layer (Amie style) */}
      <div
        onClick={onRestore}
        className={`absolute inset-x-0 bottom-0 z-20 flex flex-col justify-center px-3 transition-all duration-350 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isMinimized ? 'cursor-pointer hover:bg-white/[0.02]' : 'pointer-events-none'
        }`}
        style={{
          height: '38px',
          opacity: 1 - progress,
          transform: `translateY(${14 * progress}px) scale(${1 + progress * 0.08})`,
          filter: progress > 0 ? `blur(${progress * 3}px)` : 'none',
          pointerEvents: isMinimized ? 'auto' : 'none',
        }}
      >
        {/* Amie grab notch */}
        <div className="w-full flex justify-center mb-0.5 pointer-events-none">
          <div className="w-8 h-[2.5px] rounded-full bg-zinc-600/70 group-hover:bg-zinc-400 group-hover:w-10 transition-all duration-200" />
        </div>
        {overlay}
      </div>
    </div>
  );
};

export const BottomWrapper: React.FC<PanelWrapperProps> = ({
  isMinimized,
  isFull = false,
  onRestore,
  isBeingDragged = false,
  isDropTarget = false,
  style,
  className = '',
  bgColorClass,
  isResizing = false,
  content,
  overlay,
}) => {
  const progress = isMinimized ? 0 : 1;
  const activeBg =
    bgColorClass ||
    (isMinimized
      ? 'bg-[#121217] hover:bg-[#16161f] border border-zinc-800/90 hover:border-zinc-700 shadow-md group'
      : 'bg-[#09090b] border-2 border-black shadow-sm');

  return (
    <div
      style={style}
      className={`BottomWrapper relative flex flex-col min-h-0 ${
        isMinimized ? 'shrink-0' : 'shrink'
      } w-full overflow-hidden select-none rounded-xl sm:rounded-2xl transition-all ${activeBg} ${
        isResizing
          ? 'duration-0'
          : 'duration-350 ease-[cubic-bezier(0.16,1,0.3,1)]'
      } ${
        isBeingDragged
          ? 'opacity-80 ring-2 ring-white/40 shadow-2xl scale-[0.99] z-40'
          : isDropTarget
          ? 'ring-2 ring-white/60'
          : ''
      } ${className}`}
    >
      {/* Main Content Layer */}
      <div
        className="w-full h-full overflow-hidden flex flex-col min-h-0 origin-bottom transition-all duration-350 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{
          transform: `scale(${1 - (1 - progress) * 0.12})`,
          filter: progress < 1 ? `blur(${(1 - progress) * 3}px)` : 'none',
          opacity: progress,
          pointerEvents: progress > 0.2 ? 'auto' : 'none',
        }}
      >
        <div className="w-full h-full overflow-y-auto no-scrollbar flex flex-col min-h-0">
          {content}
        </div>
      </div>

      {/* Mini Overlay Layer (Amie style) */}
      <div
        onClick={onRestore}
        className={`absolute inset-x-0 top-0 z-20 flex flex-col justify-center px-3 transition-all duration-350 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isMinimized ? 'cursor-pointer hover:bg-white/[0.02]' : 'pointer-events-none'
        }`}
        style={{
          height: '38px',
          opacity: 1 - progress,
          transform: `translateY(${-14 * progress}px) scale(${1 + progress * 0.08})`,
          filter: progress > 0 ? `blur(${progress * 3}px)` : 'none',
          pointerEvents: isMinimized ? 'auto' : 'none',
        }}
      >
        {/* Amie grab notch */}
        <div className="w-full flex justify-center mb-0.5 pointer-events-none">
          <div className="w-8 h-[2.5px] rounded-full bg-zinc-600/70 group-hover:bg-zinc-400 group-hover:w-10 transition-all duration-200" />
        </div>
        {overlay}
      </div>
    </div>
  );
};
