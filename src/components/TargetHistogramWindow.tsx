import React, { useRef, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { ProgressBus } from '../hooks/useProgressBus';

export interface TargetHistogramWindowProps {
  sourceText: string;
  onSourceNameChange: (name: string) => void;
  targetPhrase: string;
  onTargetPhraseChange: (phrase: string) => void;
  progressBus: ProgressBus;
  remainingLetters?: string[];
  isExactMatch?: boolean;
  onShowToast: (text: string, type?: 'success' | 'info' | 'error') => void;
}

interface EditableBoxProps {
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  id: string;
  isHero?: boolean;
}

const EditableBox: React.FC<EditableBoxProps> = ({ value, onChange, placeholder, id, isHero = false }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && ref.current.innerText !== value) {
      ref.current.innerText = value;
    }
  }, [value]);

  const handleFocus = () => {
    // Keep window and body anchored to (0,0) so mobile Safari doesn't scroll inputs off-screen
    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
    });
    setTimeout(() => {
      window.scrollTo(0, 0);
    }, 100);
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-white border-2 border-black focus-within:border-zinc-900 rounded-[18px] sm:rounded-[22px] px-3 sm:px-6 transition-all overflow-hidden">
      <div
        ref={ref}
        id={id}
        contentEditable
        suppressContentEditableWarning
        onFocus={handleFocus}
        onInput={e => {
          const text = e.currentTarget.innerText.replace(/\n/g, ' ');
          onChange(text);
        }}
        className={`w-full text-center bg-transparent text-zinc-900 font-black uppercase tracking-widest outline-none select-text break-words cursor-text py-1 px-3 max-h-full overflow-y-auto no-scrollbar unified-app-text transition-all duration-300 ${
          isHero
            ? 'text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl'
            : 'text-base sm:text-base md:text-lg font-extrabold tracking-wider'
        }`}
      />
      {!value && (
        <span
          className={`absolute inset-0 flex items-center justify-center pointer-events-none text-zinc-300 font-black uppercase tracking-widest text-center px-4 sm:px-6 select-none unified-app-text transition-all duration-300 ${
            isHero
              ? 'text-3xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl'
              : 'text-xs sm:text-sm font-extrabold tracking-wider'
          }`}
        >
          {placeholder}
        </span>
      )}
    </div>
  );
};

export const TargetHistogramWindow: React.FC<TargetHistogramWindowProps> = ({
  sourceText,
  onSourceNameChange,
  targetPhrase,
  onTargetPhraseChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasUserCustomizedWidth, setHasUserCustomizedWidth] = useState<boolean>(false);
  const [widthRatio, setWidthRatio] = useState<number>(0.5); // Equal 50/50 split
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const startDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setHasUserCustomizedWidth(true);
    setIsDragging(true);
  };

  const resetAdaptiveWidth = () => {
    setHasUserCustomizedWidth(false);
    setWidthRatio(0.5);
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relativeX = (e.clientX - rect.left) / rect.width;
    let clampedX = Math.max(0.20, Math.min(0.80, relativeX));
    if (Math.abs(clampedX - 0.5) < 0.025) {
      clampedX = 0.5;
    }
    setWidthRatio(clampedX);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (!isDragging) return;
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [isDragging]);

  const hasSource = Boolean(sourceText.trim());

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex flex-col items-stretch p-0 text-zinc-200 select-none"
    >
      {/* Unified Input Pair with draggable divider */}
      <div className="w-full h-full flex flex-row items-stretch min-w-0">
        {/* Source Input Panel */}
        <div
          className={`relative flex items-stretch min-w-[80px] sm:min-w-[100px] transition-all ${
            isDragging ? 'duration-0' : 'duration-300 ease-out'
          }`}
          style={{ width: hasSource ? `calc(${widthRatio * 100}% - 5px)` : '100%' }}
        >
          <EditableBox
            id="source-input"
            value={sourceText}
            onChange={onSourceNameChange}
            placeholder="Write name"
            isHero={!sourceText.trim()}
          />
          {sourceText && (
            <button
              type="button"
              onClick={() => {
                onSourceNameChange('');
                onTargetPhraseChange('');
              }}
              aria-label="Clear source input"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-900 p-0.5 rounded cursor-pointer transition-colors z-10"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* MIDDLE VERTICAL RESIZER & Target Input (Only when sourceText has text) */}
        {hasSource && (
          <>
            <div
              role="separator"
              onPointerDown={startDrag}
              onDoubleClick={resetAdaptiveWidth}
              className={`w-2.5 shrink-0 z-30 cursor-col-resize hover:bg-black/10 active:bg-black/20 relative transition-all ${
                isDragging ? 'bg-black/15' : 'bg-transparent'
              }`}
              style={{ touchAction: 'none' }}
              title="Drag to resize input widths (Double-click to reset adaptive sizing)"
            />

            {/* Target Input Panel */}
            <div
              className={`relative flex items-stretch min-w-[80px] sm:min-w-[100px] transition-all ${
                isDragging ? 'duration-0' : 'duration-300 ease-out'
              }`}
              style={{ width: `calc(${(1 - widthRatio) * 100}% - 5px)` }}
            >
              <EditableBox
                id="target-input"
                value={targetPhrase}
                onChange={onTargetPhraseChange}
                placeholder="Remix it"
              />
              {targetPhrase && (
                <button
                  type="button"
                  onClick={() => onTargetPhraseChange('')}
                  aria-label="Clear target input"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-900 p-0.5 rounded cursor-pointer transition-colors z-10"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
