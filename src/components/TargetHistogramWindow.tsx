import React, { useRef, useEffect, useState } from 'react';
import { X, ArrowLeftRight, Pencil, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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

interface WordToken {
  id: string;
  text: string;
}

interface TargetPhraseBoxProps {
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  id: string;
  isEditing: boolean;
  onToggleEditing: (editing: boolean) => void;
  onInsertWord: (word: string, atIndex?: number) => void;
}

const TargetPhraseBox: React.FC<TargetPhraseBoxProps> = ({
  value,
  onChange,
  placeholder,
  id,
  isEditing,
  onToggleEditing,
  onInsertWord,
}) => {
  const [tokens, setTokens] = useState<WordToken[]>(() => {
    return value
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map(w => ({
        id: `word-${w.toLowerCase()}-${Math.random().toString(36).slice(2, 7)}`,
        text: w,
      }));
  });

  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const editableRef = useRef<HTMLDivElement>(null);

  // Synchronize tokens when value changes from outside (e.g. word added from graph, suggestions, or cleared)
  useEffect(() => {
    setTokens(prevTokens => {
      const currentWords = value.trim().split(/\s+/).filter(Boolean);
      if (currentWords.length === 0) return [];

      // Check if current tokens already match the words in the exact same order
      if (
        prevTokens.length === currentWords.length &&
        prevTokens.every((t, i) => t.text.toLowerCase() === currentWords[i].toLowerCase())
      ) {
        return prevTokens;
      }

      // Reconcile matching tokens to preserve IDs so Framer Motion animates layout swaps and shifts!
      const availableTokens = [...prevTokens];
      const nextTokens: WordToken[] = [];

      for (const word of currentWords) {
        const matchIdx = availableTokens.findIndex(
          t => t.text.toLowerCase() === word.toLowerCase()
        );
        if (matchIdx !== -1) {
          nextTokens.push(availableTokens[matchIdx]);
          availableTokens.splice(matchIdx, 1);
        } else {
          nextTokens.push({
            id: `word-${word.toLowerCase()}-${Math.random().toString(36).slice(2, 7)}`,
            text: word,
          });
        }
      }

      return nextTokens;
    });
  }, [value]);

  // When entering editing mode, populate contentEditable and place cursor at end
  useEffect(() => {
    if (isEditing && editableRef.current) {
      if (editableRef.current.innerText !== value) {
        editableRef.current.innerText = value;
      }
      editableRef.current.focus();
      requestAnimationFrame(() => {
        if (!editableRef.current) return;
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(editableRef.current);
        range.collapse(false);
        sel?.removeAllRanges();
        sel?.addRange(range);
      });
    }
  }, [isEditing, value]);

  const handleSwap = (i: number, j: number) => {
    if (i < 0 || j < 0 || i >= tokens.length || j >= tokens.length || i === j) return;
    triggerHaptic('snap');
    const nextTokens = [...tokens];
    const temp = nextTokens[i];
    nextTokens[i] = nextTokens[j];
    nextTokens[j] = temp;
    setTokens(nextTokens);
    onChange(nextTokens.map(t => t.text).join(' '));
  };

  const handleWordClick = (index: number) => {
    if (tokens.length <= 1) {
      onToggleEditing(true);
      return;
    }
    // Swap with next word (or previous if last)
    const targetIdx = index === tokens.length - 1 ? index - 1 : index + 1;
    handleSwap(index, targetIdx);
  };

  const handleContainerDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleContainerDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const targetIdx = dragOverIndex !== null ? dragOverIndex : tokens.length;
    setDragOverIndex(null);

    // 1. Check if reordering an existing internal token
    const tokenIndexStr = e.dataTransfer.getData('application/x-token-index');
    if (tokenIndexStr !== '') {
      const fromIdx = parseInt(tokenIndexStr, 10);
      if (!isNaN(fromIdx) && fromIdx >= 0 && fromIdx < tokens.length) {
        if (fromIdx !== targetIdx && fromIdx !== targetIdx - 1) {
          triggerHaptic('snap');
          const nextTokens = [...tokens];
          const [movedToken] = nextTokens.splice(fromIdx, 1);
          const insertIdx = targetIdx > fromIdx ? targetIdx - 1 : targetIdx;
          nextTokens.splice(insertIdx, 0, movedToken);
          setTokens(nextTokens);
          onChange(nextTokens.map(t => t.text).join(' '));
        }
        return;
      }
    }

    // 2. Incoming word from CandidateWordsList or Lens
    const rawWord =
      e.dataTransfer.getData('application/x-anagram-word') ||
      e.dataTransfer.getData('text/plain');
    if (rawWord && rawWord.trim()) {
      onInsertWord(rawWord.trim(), targetIdx);
    }
  };

  return (
    <div
      onDragOver={handleContainerDragOver}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setDragOverIndex(null);
        }
      }}
      onDrop={handleContainerDrop}
      className="relative w-full h-full flex items-center justify-center bg-transparent px-3 sm:px-6 transition-all overflow-hidden"
    >
      {isEditing || !value.trim() ? (
        <div
          ref={editableRef}
          id={id}
          contentEditable
          suppressContentEditableWarning
          onFocus={() => {
            requestAnimationFrame(() => {
              window.scrollTo(0, 0);
              if (document.documentElement) document.documentElement.scrollTop = 0;
              if (document.body) document.body.scrollTop = 0;
            });
          }}
          onBlur={(e) => {
            const text = e.currentTarget.innerText.replace(/\n/g, ' ').trim();
            onChange(text);
            if (text) {
              onToggleEditing(false);
            }
          }}
          onInput={(e) => {
            const text = e.currentTarget.innerText.replace(/\n/g, ' ');
            onChange(text);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              editableRef.current?.blur();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              onToggleEditing(false);
            }
          }}
          className="w-full text-center bg-transparent text-zinc-900 font-black uppercase tracking-widest outline-none select-text break-words cursor-text py-1 px-3 max-h-full overflow-y-auto no-scrollbar unified-app-text transition-all duration-300 text-base sm:text-base md:text-lg font-extrabold tracking-wider"
        />
      ) : (
        <div
          onDoubleClick={() => onToggleEditing(true)}
          className="w-full h-full flex flex-wrap items-center justify-center content-center gap-x-1 sm:gap-x-1.5 gap-y-1.5 px-2 sm:px-4 max-h-full overflow-y-auto no-scrollbar py-1"
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {tokens.flatMap((token, index) => {
              const elements: React.ReactNode[] = [];

              // Drop insertion indicator line before this token
              if (dragOverIndex === index) {
                elements.push(
                  <motion.div
                    key={`drop-caret-${index}`}
                    layout
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 12, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    className="h-7 w-3 flex items-center justify-center pointer-events-none"
                  >
                    <span className="w-1 h-6 bg-black rounded-full shadow-xs animate-pulse" />
                  </motion.div>
                );
              }

              elements.push(
                <motion.div
                  layout
                  key={token.id}
                  layoutId={token.id}
                  draggable={!isEditing}
                  onDragStart={(e) => {
                    (e as unknown as React.DragEvent).dataTransfer.setData('application/x-token-index', String(index));
                    (e as unknown as React.DragEvent).dataTransfer.setData('text/plain', token.text);
                    (e as unknown as React.DragEvent).dataTransfer.effectAllowed = 'move';
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.dataTransfer.dropEffect = 'copy';
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    const midX = rect.left + rect.width / 2;
                    setDragOverIndex(e.clientX > midX ? index + 1 : index);
                  }}
                  initial={{ scale: 0.75, opacity: 0, y: 6 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.75, opacity: 0, y: -6 }}
                  transition={{
                    layout: {
                      type: 'spring',
                      stiffness: 420,
                      damping: 28,
                      mass: 0.9,
                    },
                    opacity: { duration: 0.2 },
                    scale: { type: 'spring', stiffness: 450, damping: 25 },
                  }}
                  whileHover={{ scale: 1.06, y: -1 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => handleWordClick(index)}
                  title={
                    tokens.length > 1
                      ? `"${token.text}" · Click to swap, drag to reorder (Double-click to edit)`
                      : 'Double-click to edit text'
                  }
                  className="px-2.5 py-1 rounded-lg text-zinc-900 font-black uppercase tracking-widest cursor-grab active:cursor-grabbing hover:bg-zinc-100 hover:shadow-2xs active:bg-zinc-200 transition-colors select-none text-base sm:text-base md:text-lg font-extrabold unified-app-text"
                >
                  {token.text}
                </motion.div>
              );

              {/* End drop indicator if hovering after the last token */}
              if (index === tokens.length - 1 && dragOverIndex === tokens.length) {
                elements.push(
                  <motion.div
                    key="drop-caret-end"
                    layout
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 12, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    className="h-7 w-3 flex items-center justify-center pointer-events-none"
                  >
                    <span className="w-1 h-6 bg-black rounded-full shadow-xs animate-pulse" />
                  </motion.div>
                );
              }

              {/* Subtle swap arrow button between adjacent words */}
              if (index < tokens.length - 1) {
                elements.push(
                  <motion.button
                    layout
                    key={`swap-${token.id}-${tokens[index + 1]?.id}`}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSwap(index, index + 1);
                    }}
                    whileHover={{ scale: 1.25, rotate: 180 }}
                    whileTap={{ scale: 0.85 }}
                    transition={{
                      layout: { type: 'spring', stiffness: 420, damping: 28 },
                      rotate: { type: 'spring', stiffness: 400, damping: 20 },
                    }}
                    title={`Swap "${token.text}" and "${tokens[index + 1]?.text}"`}
                    className="p-1 rounded-full text-zinc-300 hover:text-zinc-900 hover:bg-zinc-100 transition-all cursor-pointer select-none shrink-0"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                  </motion.button>
                );
              }

              return elements;
            })}
          </AnimatePresence>
        </div>
      )}

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
  onShowToast,
}) => {
  const hasSource = Boolean(sourceText.trim());

  // Subtle visual feedback pulse on the target card when words are added
  const [cardPulse, setCardPulse] = useState(false);
  const [isCardDragOver, setIsCardDragOver] = useState(false);
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const prevTargetPhraseRef = useRef(targetPhrase);

  const handleInsertWord = (word: string, atIndex?: number) => {
    const currentWords = targetPhrase.trim().split(/\s+/).filter(Boolean);
    const incomingWords = word.trim().split(/\s+/).filter(Boolean);
    if (incomingWords.length === 0) return;

    if (atIndex === undefined || atIndex >= currentWords.length) {
      currentWords.push(...incomingWords.map((w) => w.toUpperCase()));
    } else {
      currentWords.splice(atIndex, 0, ...incomingWords.map((w) => w.toUpperCase()));
    }

    const newPhrase = currentWords.join(' ');
    onTargetPhraseChange(newPhrase);
    triggerHaptic('add');
    onShowToast(`Added "${word}" to sentence`, 'success');
  };

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
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'copy';
              setIsCardDragOver(true);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setIsCardDragOver(false);
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              setIsCardDragOver(false);
              const word =
                e.dataTransfer.getData('application/x-anagram-word') ||
                e.dataTransfer.getData('text/plain');
              if (word && word.trim()) {
                handleInsertWord(word.trim());
              }
            }}
            className={`group flex-1 flex flex-col min-w-0 bg-white border-2 rounded-xl sm:rounded-2xl overflow-hidden shadow-xs relative transition-all duration-300 ${
              isCardDragOver
                ? 'border-black ring-2 ring-black bg-zinc-50 border-dashed scale-[1.01]'
                : cardPulse
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
                isEditing={isEditingTarget}
                onToggleEditing={setIsEditingTarget}
                onInsertWord={handleInsertWord}
              />

              {isCardDragOver && (
                <div className="absolute bottom-1 inset-x-0 flex items-center justify-center pointer-events-none z-20">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-black text-white shadow-xs tracking-wider uppercase animate-pulse">
                    Drop word to insert into sentence
                  </span>
                </div>
              )}

              {/* Action buttons (Edit mode & Clear) */}
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10">
                {targetPhrase && (
                  <button
                    type="button"
                    onClick={() => setIsEditingTarget(!isEditingTarget)}
                    title={isEditingTarget ? 'Done editing' : 'Edit phrase text'}
                    className={`p-1 rounded-full cursor-pointer transition-all duration-150 ${
                      isEditingTarget
                        ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                        : 'text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 opacity-60 group-hover:opacity-100 focus:opacity-100'
                    }`}
                  >
                    {isEditingTarget ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Pencil className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
                {targetPhrase && (
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('remove');
                      onTargetPhraseChange('');
                      setIsEditingTarget(false);
                    }}
                    aria-label="Clear target input"
                    className="text-zinc-400 hover:text-zinc-900 p-1 rounded-full cursor-pointer transition-all duration-150 opacity-60 group-hover:opacity-100 focus:opacity-100 hover:bg-zinc-100 active:scale-[0.88]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
