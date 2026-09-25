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
}

const EditableBox: React.FC<EditableBoxProps> = ({ value, onChange, placeholder, id }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && ref.current.innerText !== value) {
      ref.current.innerText = value;
    }
  }, [value]);

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-white border-2 border-black focus-within:border-emerald-500 rounded-[18px] sm:rounded-[22px] px-3 sm:px-6 transition-all overflow-hidden">
      <div
        ref={ref}
        id={id}
        contentEditable
        suppressContentEditableWarning
        onInput={e => {
          const text = e.currentTarget.innerText.replace(/\n/g, ' ');
          onChange(text);
        }}
        className="w-full text-center bg-transparent text-zinc-900 font-bold uppercase tracking-wider text-xs sm:text-sm md:text-base outline-none select-text break-words cursor-text py-2 px-3 max-h-full overflow-y-auto no-scrollbar unified-app-text"
      />
      {!value && (
        <span className="absolute inset-0 flex items-center justify-center pointer-events-none text-zinc-500 font-bold uppercase tracking-wider text-[11px] sm:text-sm text-center px-4 sm:px-6 select-none unified-app-text">
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
  const [widthRatio, setWidthRatio] = useState<number>(0.5); // Default 50/50 split
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Content-adaptive width calculation:
  // Dynamically balances the input widths based on character length when not manually customized
  useEffect(() => {
    if (hasUserCustomizedWidth) return;
    const sourceLen = sourceText.trim().length;
    const targetLen = targetPhrase.trim().length;

    if (sourceLen === 0 && targetLen === 0) {
      setWidthRatio(0.5);
    } else {
      const total = sourceLen + targetLen;
      const proportion = sourceLen / total;
      // Damped adaptation bounded between 35% and 65%
      const adaptiveRatio = 0.5 + (proportion - 0.5) * 0.4;
      setWidthRatio(Math.max(0.35, Math.min(0.65, adaptiveRatio)));
    }
  }, [sourceText, targetPhrase, hasUserCustomizedWidth]);

  const startDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setHasUserCustomizedWidth(true);
    setIsDragging(true);
  };

  const resetAdaptiveWidth = () => {
    setHasUserCustomizedWidth(false);
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relativeX = (e.clientX - rect.left) / rect.width;
    const clampedX = Math.max(0.2, Math.min(0.8, relativeX));
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
          style={{ width: hasSource ? `${widthRatio * 100}%` : '100%' }}
        >
          <EditableBox
            id="source-input"
            value={sourceText}
            onChange={onSourceNameChange}
            placeholder="Write name"
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
              style={{ width: `calc(${(1 - widthRatio) * 100}% - 6px)` }}
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
