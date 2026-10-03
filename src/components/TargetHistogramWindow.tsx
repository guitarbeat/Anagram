import React, { useRef, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { ProgressBus } from '../hooks/useProgressBus';
import type { FinisherPair } from '../engine/types';
import { triggerHaptic } from '../hooks/useHaptics';

export interface TargetHistogramWindowProps {
  sourceText: string;
  onSourceNameChange: (name: string) => void;
  targetPhrase: string;
  onTargetPhraseChange: (phrase: string) => void;
  progressBus: ProgressBus;
  remainingLetters?: string[];
  isExactMatch?: boolean;
  onShowToast: (text: string, type?: 'success' | 'info' | 'error') => void;
  exactClosers?: string[];
  finisherPairs?: FinisherPair[];
  solvableWordsCount?: number;
  deadEndWordsCount?: number;
  onAddWordToTarget?: (word: string) => void;
  onRemoveLastWord?: () => void;
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
    <div className="relative w-full h-full flex items-center justify-center bg-transparent px-3 sm:px-6 transition-all overflow-hidden">
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

interface TargetPhraseBoxProps {
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  id: string;
}

const TargetPhraseBox: React.FC<TargetPhraseBoxProps> = ({ value, onChange, placeholder, id }) => {
  const ref = useRef<HTMLDivElement>(null);
  const prevWordsRef = useRef<string[]>([]);
  const isTypingRef = useRef<boolean>(false);

  useEffect(() => {
    if (!ref.current) return;

    // If change came from native typing in this box, preserve native cursor
    if (isTypingRef.current) {
      isTypingRef.current = false;
      return;
    }

    const currentWords = value.trim().split(/\s+/).filter(Boolean);
    const prevWords = prevWordsRef.current;

    // Detect newly appended or added words
    const newIndices = new Set<number>();
    if (currentWords.length > prevWords.length) {
      let isAppended = true;
      for (let i = 0; i < prevWords.length; i++) {
        if (currentWords[i].toLowerCase() !== prevWords[i].toLowerCase()) {
          isAppended = false;
          break;
        }
      }
      if (isAppended) {
        for (let i = prevWords.length; i < currentWords.length; i++) {
          newIndices.add(i);
        }
      } else {
        // Whole phrase replaced (e.g. set target or multi-word finisher)
        for (let i = 0; i < currentWords.length; i++) {
          newIndices.add(i);
        }
      }
    }

    prevWordsRef.current = currentWords;

    if (currentWords.length === 0) {
      if (ref.current.innerText !== '') {
        ref.current.innerHTML = '';
      }
      return;
    }

    // Render words with animate-word-pop on newly added tokens
    const html = currentWords
      .map((w, idx) => {
        const isNew = newIndices.has(idx);
        return `<span class="inline-block px-1 transition-transform ${
          isNew ? 'animate-word-pop text-zinc-950 font-black' : 'text-zinc-900 font-extrabold'
        }">${w}</span>`;
      })
      .join(' ');

    ref.current.innerHTML = html;
  }, [value]);

  const handleFocus = () => {
    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
    });
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-transparent px-3 sm:px-6 transition-all overflow-hidden">
      <div
        ref={ref}
        id={id}
        contentEditable
        suppressContentEditableWarning
        onFocus={handleFocus}
        onInput={e => {
          isTypingRef.current = true;
          const text = e.currentTarget.innerText.replace(/\n/g, ' ');
          onChange(text);
        }}
        className="w-full text-center bg-transparent text-zinc-900 font-black uppercase tracking-widest outline-none select-text break-words cursor-text py-1 px-3 max-h-full overflow-y-auto no-scrollbar unified-app-text transition-all duration-300 text-base sm:text-base md:text-lg font-extrabold tracking-wider"
      />
      {!value && (
        <span className="absolute inset-0 flex items-center justify-center pointer-events-none text-zinc-300 font-black uppercase tracking-widest text-center px-4 sm:px-6 select-none unified-app-text transition-all duration-300 text-xs sm:text-sm font-extrabold tracking-wider">
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
  const hasSource = Boolean(sourceText.trim());

  // Subtle visual feedback pulse on the target card when words are added
  const [cardPulse, setCardPulse] = useState(false);
  const prevTargetPhraseRef = useRef(targetPhrase);

  useEffect(() => {
    const prevWords = prevTargetPhraseRef.current.trim().split(/\s+/).filter(Boolean);
    const currentWords = targetPhrase.trim().split(/\s+/).filter(Boolean);

    if (currentWords.length > prevWords.length) {
      setCardPulse(true);
      const timer = setTimeout(() => setCardPulse(false), 400);
      return () => clearTimeout(timer);
    }
    prevTargetPhraseRef.current = targetPhrase;
  }, [targetPhrase]);

  return (
    <div className="w-full h-full flex flex-col items-stretch p-0 text-zinc-900 select-none">
      {/* Unified Input Pair: Side-by-side white cards */}
      <div className="w-full h-full flex flex-row items-stretch min-w-0 gap-1.5 sm:gap-2">
        {/* Source Input Card */}
        <div className="group flex-1 flex flex-col min-w-0 bg-white border-2 border-black rounded-xl sm:rounded-2xl overflow-hidden shadow-xs relative">
          <div className="flex-1 relative min-h-0 flex items-center justify-center">
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
                  triggerHaptic('remove');
                  onSourceNameChange('');
                  onTargetPhraseChange('');
                }}
                aria-label="Clear source input"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-900 p-1 rounded-full cursor-pointer transition-all duration-150 z-10 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-zinc-100 active:scale-[0.88]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Target Input Card (shown alongside source input) */}
        {hasSource && (
          <div
            className={`group flex-1 flex flex-col min-w-0 bg-white border-2 rounded-xl sm:rounded-2xl overflow-hidden shadow-xs relative transition-all duration-300 ${
              cardPulse
                ? 'border-emerald-500 ring-2 ring-emerald-500/30 scale-[1.008] shadow-md'
                : 'border-black'
            }`}
          >
            <div className="flex-1 relative min-h-0 flex items-center justify-center">
              <TargetPhraseBox
                id="target-input"
                value={targetPhrase}
                onChange={onTargetPhraseChange}
                placeholder="Remix it"
              />
              {targetPhrase && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('remove');
                    onTargetPhraseChange('');
                  }}
                  aria-label="Clear target input"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-900 p-1 rounded-full cursor-pointer transition-all duration-150 z-10 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-zinc-100 active:scale-[0.88]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
