import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export interface IdlePeekDockProps {
  title: string;
  badge?: string;
  actionLabel?: string;
  direction?: 'up' | 'down';
  onRestore?: () => void;
  className?: string;
  children?: React.ReactNode;
}

/**
 * IdlePeekDock
 * Inspired by VerticalSplit mini overlays (Amie iOS splitscreen).
 * Presents a tactile, spring-interactive docked bar with grab notch and status peek.
 */
export const IdlePeekDock: React.FC<IdlePeekDockProps> = ({
  title,
  badge,
  actionLabel = 'Tap to expand',
  direction = 'down',
  onRestore,
  className = '',
  children,
}) => {
  const isUp = direction === 'up';

  return (
    <div
      onClick={onRestore}
      className={`IdlePeekDock w-full h-full flex flex-col justify-center px-3.5 py-1 cursor-pointer select-none text-white group ${className}`}
    >
      {/* Top/Center tactile grab notch */}
      <div className="w-full flex justify-center mb-0.5">
        <div className="w-8 h-[3px] rounded-full bg-zinc-600/70 group-hover:bg-zinc-400 group-hover:w-10 transition-all duration-200" />
      </div>

      <div className="w-full flex items-center justify-between min-w-0">
        <div className="flex items-center gap-2 min-w-0 pr-2">
          <span className="p-1 rounded-md bg-zinc-800/90 text-zinc-300 group-hover:text-white group-hover:bg-zinc-700 transition-colors shrink-0 shadow-xs">
            {isUp ? (
              <ChevronUp className="w-3.5 h-3.5 group-hover:-translate-y-0.5 transition-transform" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 group-hover:translate-y-0.5 transition-transform" />
            )}
          </span>
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-200 group-hover:text-white transition-colors truncate">
            {title}
          </span>
          {badge && badge !== 'PEEK IDLE' && (
            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-mono bg-zinc-800 text-zinc-300 border border-zinc-700 shrink-0">
              {badge}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {children}
          <span className="text-[9.5px] font-mono text-zinc-400 group-hover:text-zinc-100 font-medium uppercase tracking-wider shrink-0 transition-colors">
            {actionLabel}
          </span>
        </div>
      </div>
    </div>
  );
};

