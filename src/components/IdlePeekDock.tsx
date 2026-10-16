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
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onRestore?.();
        }
      }}
      aria-label={`${title}: ${actionLabel}`}
      className={`IdlePeekDock w-full h-full flex items-center justify-between px-3 cursor-pointer select-none text-white group bg-transparent hover:bg-white/[0.03] active:scale-[0.99] transition-all ${className}`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <div className="p-0.5 rounded bg-white/5 border border-white/10 text-zinc-400 group-hover:text-white group-hover:bg-white/10 transition-colors shrink-0">
          {isUp ? (
            <ChevronUp className="w-3 h-3 transition-transform group-hover:-translate-y-0.5" />
          ) : (
            <ChevronDown className="w-3 h-3 transition-transform group-hover:translate-y-0.5" />
          )}
        </div>
        <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-300 group-hover:text-white transition-colors truncate">
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
        <span className="text-[10px] font-medium text-zinc-500 group-hover:text-zinc-300 transition-colors hidden sm:inline">
          {actionLabel}
        </span>
      </div>
    </div>
  );
};

