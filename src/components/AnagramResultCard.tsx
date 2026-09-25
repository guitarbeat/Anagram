import React, { useState, useEffect, useRef } from 'react';
import { Edit2, Check, X, ChevronLeft, ChevronRight, Pin } from 'lucide-react';
import type { AnagramResult } from '../engine/types';

export interface AnagramResultCardProps {
  item: AnagramResult;
  isActive?: boolean;
  pinnedWordsSet?: Set<string>;
  onAnimatePhrase: (phrase: string) => void;
  onUpdatePhrase?: (oldPhrase: string, newPhrase: string) => void;
  onTogglePinWord?: (word: string) => void;
  onCopy?: (phrase: string) => void;
  isCopied?: boolean;
}

export const AnagramResultCard: React.FC<AnagramResultCardProps> = React.memo(({
  item,
  isActive,
  pinnedWordsSet,
  onAnimatePhrase,
  onUpdatePhrase,
  onTogglePinWord,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(item.phrase);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const words = item.words && item.words.length > 0 ? item.words : item.phrase.split(/\s+/);

  useEffect(() => {
    setEditText(item.phrase);
  }, [item.phrase]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSaveEdit = () => {
    const trimmed = editText.trim();
    if (trimmed && trimmed !== item.phrase) {
      if (onUpdatePhrase) {
        onUpdatePhrase(item.phrase, trimmed);
      } else {
        onAnimatePhrase(trimmed);
      }
    }
    setIsEditing(false);
  };

  const handleMoveWord = (index: number, direction: 'left' | 'right', e: React.MouseEvent) => {
    e.stopPropagation();
    const newWords = [...words];
    const targetIdx = direction === 'left' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newWords.length) return;

    const [moved] = newWords.splice(index, 1);
    newWords.splice(targetIdx, 0, moved);
    const newPhrase = newWords.join(' ');

    if (onUpdatePhrase) {
      onUpdatePhrase(item.phrase, newPhrase);
    } else {
      onAnimatePhrase(newPhrase);
    }
  };

  const handleDragStart = (idx: number, e: React.DragEvent) => {
    e.stopPropagation();
    setDraggedIdx(idx);
    e.dataTransfer.setData('text/plain', String(idx));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (idx: number, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedIdx !== null && draggedIdx !== idx) {
      setDragOverIdx(idx);
    }
  };

  const handleDrop = (idx: number, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedIdx === null || draggedIdx === idx) {
      setDraggedIdx(null);
      setDragOverIdx(null);
      return;
    }

    const newWords = [...words];
    const [moved] = newWords.splice(draggedIdx, 1);
    newWords.splice(idx, 0, moved);
    const newPhrase = newWords.join(' ');

    setDraggedIdx(null);
    setDragOverIdx(null);

    if (onUpdatePhrase) {
      onUpdatePhrase(item.phrase, newPhrase);
    } else {
      onAnimatePhrase(newPhrase);
    }
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const handleWordClick = (word: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onTogglePinWord) {
      onTogglePinWord(word);
    }
  };

  return (
    <div
      className={`relative border rounded-xl px-3 py-2 sm:px-3.5 sm:py-2.5 min-h-[42px] transition-all duration-150 flex items-center justify-center text-center group touch-manipulation select-none cursor-pointer ${
        isActive
          ? 'bg-[#18181b] border-emerald-500/70 shadow-lg shadow-emerald-950/20 ring-1 ring-emerald-500/40 text-emerald-300'
          : 'bg-[#121214] border-[#27272a] hover:border-[#3f3f46] hover:bg-[#161619] text-[#f4f4f5]'
      }`}
      onClick={() => {
        if (!isEditing) onAnimatePhrase(item.phrase);
      }}
    >
      <div className="flex items-center justify-center min-w-0 w-full">
        {isEditing ? (
          <div
            className="flex items-center gap-1.5 w-full"
            onClick={e => e.stopPropagation()}
          >
            <input
              ref={inputRef}
              type="text"
              value={editText}
              onChange={e => setEditText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSaveEdit();
                if (e.key === 'Escape') {
                  setEditText(item.phrase);
                  setIsEditing(false);
                }
              }}
              className="flex-1 h-7 bg-black/70 border border-emerald-500/50 rounded-lg px-2 text-xs font-mono text-white text-center focus:outline-none"
            />
            <button
              type="button"
              onClick={handleSaveEdit}
              title="Save phrase"
              className="p-1 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20 rounded cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setEditText(item.phrase);
                setIsEditing(false);
              }}
              title="Cancel"
              className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-white/10 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-center min-w-0 flex-1">
              {/* Interactive Word Chips (draggable, reorderable, clickable to lock/pin) */}
              <div className="flex items-center justify-center gap-1 sm:gap-1.5 flex-wrap w-full">
                {words.map((word, idx) => {
                  const isPinned = pinnedWordsSet?.has(word.toLowerCase());
                  return (
                    <span
                      key={`${word}-${idx}`}
                      draggable
                      onDragStart={e => handleDragStart(idx, e)}
                      onDragOver={e => handleDragOver(idx, e)}
                      onDrop={e => handleDrop(idx, e)}
                      onDragEnd={handleDragEnd}
                      onClick={e => handleWordClick(word, e)}
                      className={`inline-flex items-center gap-0.5 text-xs font-mono px-2 py-0.5 rounded-md transition-all cursor-pointer select-none group/word ${
                        dragOverIdx === idx
                          ? 'bg-emerald-500/30 ring-1 ring-emerald-400 text-white'
                          : isPinned
                          ? 'bg-emerald-500/20 ring-1 ring-emerald-400/60 text-emerald-200 shadow-sm font-semibold'
                          : isActive
                          ? 'bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/30 hover:ring-1 hover:ring-emerald-500/50'
                          : 'bg-white/[0.05] hover:bg-white/[0.12] hover:text-white text-zinc-200 hover:ring-1 hover:ring-white/15'
                      }`}
                      title={isPinned ? `Locked word (click to unlock "${word}")` : `Click to lock in "${word}" in solver`}
                    >
                      {idx > 0 && (
                        <button
                          type="button"
                          onClick={e => handleMoveWord(idx, 'left', e)}
                          className="opacity-0 group-hover/word:opacity-100 hover:text-emerald-400 transition-opacity p-0.5 -ml-1"
                          title="Move left"
                        >
                          <ChevronLeft className="w-2.5 h-2.5" />
                        </button>
                      )}

                      {isPinned && (
                        <Pin className="w-2.5 h-2.5 text-emerald-400 shrink-0 rotate-45 mr-0.5" />
                      )}
                      
                      <span>{word}</span>

                      {idx < words.length - 1 && (
                        <button
                          type="button"
                          onClick={e => handleMoveWord(idx, 'right', e)}
                          className="opacity-0 group-hover/word:opacity-100 hover:text-emerald-400 transition-opacity p-0.5 -mr-1"
                          title="Move right"
                        >
                          <ChevronRight className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  setIsEditing(true);
                }}
                title="Edit phrase text"
                className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-white/10 rounded-md cursor-pointer touch-manipulation"
              >
                <Edit2 className="w-3 h-3" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
});
