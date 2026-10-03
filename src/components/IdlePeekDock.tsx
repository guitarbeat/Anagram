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
      className={`IdlePeekDock w-full h-full flex items-center justify-center px-3 cursor-pointer select-none text-white group ${className}`}
    >
      <div className="flex items-center justify-center gap-2.5 min-w-0">
        <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-200 group-hover:text-white transition-colors truncate">
          {title}
        </span>
        {badge && badge !== 'PEEK IDLE' && (
          <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-mono bg-zinc-800 text-zinc-300 border border-zinc-700 shrink-0">
            {badge}
          </span>
        )}
        {children}
      </div>
    </div>
  );
};

