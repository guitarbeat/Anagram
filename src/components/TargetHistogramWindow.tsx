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
    <div className="relative w-full h-full flex items-stretch">
      <div
        ref={ref}
        id={id}
        contentEditable
        suppressContentEditableWarning
        onInput={e => {
          const text = e.currentTarget.innerText.replace(/\n/g, ' ');
          onChange(text);
        }}
        className="w-full h-full min-h-[44px] bg-white text-zinc-900 font-bold uppercase tracking-wider text-center flex items-center justify-center px-12 outline-none border-2 border-black focus:border-emerald-500 rounded-[18px] sm:rounded-[22px] select-text break-words overflow-y-auto text-sm sm:text-base md:text-lg cursor-text transition-all no-scrollbar"
      />
      {!value && (
        <span className="absolute inset-0 flex items-center justify-center pointer-events-none text-zinc-400 font-bold uppercase tracking-wider text-center text-sm sm:text-base md:text-lg px-12">
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
  const [widthRatio, setWidthRatio] = useState<number>(0.5); // Default 50/50 split
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const startDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
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

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex flex-col items-stretch p-0 text-zinc-200 select-none"
    >
      {/* Unified Input Pair with draggable divider */}
      <div className="w-full h-full flex flex-row items-stretch min-w-0">
        {/* Source Input Panel */}
        <div
          className="relative flex items-stretch min-w-[100px]"
          style={{ width: `${widthRatio * 100}%` }}
        >
          <EditableBox
            id="source-input"
            value={sourceText}
            onChange={onSourceNameChange}
            placeholder="Source name or phrase..."
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

        {/* MIDDLE VERTICAL RESIZER FOR INPUTS */}
        <div
          role="separator"
          onPointerDown={startDrag}
          className={`w-2.5 shrink-0 z-30 cursor-col-resize hover:bg-black/10 active:bg-black/20 relative transition-all ${
            isDragging ? 'bg-black/15' : 'bg-transparent'
          }`}
          style={{ touchAction: 'none' }}
          title="Drag to resize input widths"
        >
          {/* Grabber indicator inside divider */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-0.5 pointer-events-none">
            <div className="w-0.5 h-1 bg-zinc-500" />
            <div className="w-0.5 h-1 bg-zinc-500" />
            <div className="w-0.5 h-1 bg-zinc-500" />
          </div>
        </div>

        {/* Target Input Panel */}
        <div
          className="relative flex items-stretch min-w-[100px]"
          style={{ width: `calc(${(1 - widthRatio) * 100}% - 6px)` }}
        >
          <EditableBox
            id="target-input"
            value={targetPhrase}
            onChange={onTargetPhraseChange}
            placeholder="Target phrase..."
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
      </div>
    </div>
  );
};
