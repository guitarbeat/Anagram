import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ArrowDownUp, Sparkles, SlidersHorizontal } from 'lucide-react';
import type { CandidateWordItem, POS } from '../engine/types';
import { getBlobBorderRadius } from '../utils/blobStyle';
import { triggerHaptic } from '../hooks/useHaptics';

export type WordSortOption = 'length-desc' | 'length-asc' | 'alpha' | 'freq' | 'closers';

export interface WordPebblesExplorerProps {
  candidateWords: CandidateWordItem[];
  onAddWordToTarget: (word: string) => void;
  onSetWordAsTarget: (word: string) => void;
  onShowToast: (text: string, type?: 'success' | 'info' | 'error') => void;
  exactClosers?: string[];
  activeTargetPhrase?: string;
  sourceText?: string;
  watermarkLabel?: string;
  selectedWord?: CandidateWordItem | null;
  onSelectWord?: (word: CandidateWordItem) => void;
  selectedLengthFilter?: number[] | number | null;
  onClearLengthFilter?: () => void;
  selectedPosFilter?: POS | 'all' | null;
  onClearPosFilter?: () => void;
  sortBy?: WordSortOption;
  onSortByChange?: (sort: WordSortOption) => void;
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
  hoveredWord?: string | null;
  onHoverWordChange?: (word: string | null) => void;
  compatibleWordSet?: Set<string> | null;
}

export const WordPebblesExplorer: React.FC<WordPebblesExplorerProps> = ({
  candidateWords,
  onAddWordToTarget,
  onSetWordAsTarget,
  onShowToast,
  exactClosers = [],
  watermarkLabel = 'SOLVABLE WORDS',
  selectedWord,
  onSelectWord,
  selectedLengthFilter,
  onClearLengthFilter,
  selectedPosFilter,
  onClearPosFilter,
  sortBy: externalSortBy,
  onSortByChange: externalOnSortByChange,
  searchQuery: externalSearchQuery,
  onSearchQueryChange: externalOnSearchQueryChange,
  hoveredWord: externalHoveredWord,
  onHoverWordChange,
  compatibleWordSet,
}) => {
  const [internalSearchQuery, setInternalSearchQuery] = useState<string>('');
  const [internalSortBy, setInternalSortBy] = useState<WordSortOption>('length-desc');
  const [displayLimit, setDisplayLimit] = useState<number>(() =>
    watermarkLabel === 'ALL WORDS' ? 5000 : 250
  );
  const [internalHoveredWord, setInternalHoveredWord] = useState<string | null>(null);

  useEffect(() => {
    if (watermarkLabel === 'ALL WORDS') {
      setDisplayLimit(5000);
    }
  }, [watermarkLabel]);

  const activeHoveredWord =
    externalHoveredWord !== undefined ? externalHoveredWord : internalHoveredWord;

  const handleHoverWord = (word: string | null) => {
    if (onHoverWordChange) {
      onHoverWordChange(word);
    } else {
      setInternalHoveredWord(word);
    }
  };

  const searchQuery = externalSearchQuery !== undefined ? externalSearchQuery : internalSearchQuery;
  const setSearchQuery = (val: string) => {
    if (externalOnSearchQueryChange) {
      externalOnSearchQueryChange(val);
    } else {
      setInternalSearchQuery(val);
    }
  };

  const sortBy = externalSortBy !== undefined ? externalSortBy : internalSortBy;
  const setSortBy = (val: WordSortOption) => {
    if (externalOnSortByChange) {
      externalOnSortByChange(val);
    } else {
      setInternalSortBy(val);
    }
  };

  const closersSet = useMemo(
    () => new Set(exactClosers.map((w) => w.toUpperCase())),
    [exactClosers]
  );

  // Filter and sort candidate words
  const processedWords = useMemo(() => {
    let list = [...candidateWords];

    // Substring search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((item) => item.word.toLowerCase().includes(q));
    }

    // Apply sorting
    if (sortBy === 'length-desc') {
      list.sort((a, b) => {
        if (b.length !== a.length) return b.length - a.length;
        return (b.freq || 0) - (a.freq || 0) || a.word.localeCompare(b.word);
      });
    } else if (sortBy === 'length-asc') {
      list.sort((a, b) => {
        if (a.length !== b.length) return a.length - b.length;
        return (b.freq || 0) - (a.freq || 0) || a.word.localeCompare(b.word);
      });
    } else if (sortBy === 'alpha') {
      list.sort((a, b) => a.word.localeCompare(b.word));
    } else if (sortBy === 'freq') {
      list.sort((a, b) => {
        const diff = (b.freq || 0) - (a.freq || 0);
        if (diff !== 0) return diff;
        return b.length - a.length || a.word.localeCompare(b.word);
      });
    } else if (sortBy === 'closers') {
      list.sort((a, b) => {
        const aClose = closersSet.has(a.word.toUpperCase()) ? 1 : 0;
        const bClose = closersSet.has(b.word.toUpperCase()) ? 1 : 0;
        if (aClose !== bClose) return bClose - aClose;
        if (b.length !== a.length) return b.length - a.length;
        return (b.freq || 0) - (a.freq || 0);
      });
    }

    return list;
  }, [candidateWords, searchQuery, sortBy, closersSet]);

  const displayedWords = useMemo(() => {
    return processedWords.slice(0, displayLimit);
  }, [processedWords, displayLimit]);

  const [poppingWord, setPoppingWord] = useState<string | null>(null);

  const handleWordClick = (item: CandidateWordItem) => {
    triggerHaptic('medium');
    setPoppingWord(item.word.toUpperCase());
    setTimeout(() => {
      setPoppingWord((prev) => (prev === item.word.toUpperCase() ? null : prev));
    }, 350);
    onAddWordToTarget(item.word);
    if (onSelectWord) {
      onSelectWord(item);
    }
  };

  const handleWordDoubleClick = (e: React.MouseEvent, word: string) => {
    e.preventDefault();
    e.stopPropagation();
    triggerHaptic('heavy');
    setPoppingWord(word.toUpperCase());
    setTimeout(() => {
      setPoppingWord((prev) => (prev === word.toUpperCase() ? null : prev));
    }, 350);
    onAddWordToTarget(word);
  };

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
      (selectedLengthFilter !== null && selectedLengthFilter !== undefined) ||
      (selectedPosFilter && selectedPosFilter !== 'all')
  );

  return (
    <div className="w-full h-full relative bg-white overflow-hidden select-none flex flex-col text-zinc-900">
      {/* Floating Active Filter Chips (Only shown when active modifier filters exist) */}
      {((selectedLengthFilter !== null && selectedLengthFilter !== undefined) ||
        (selectedPosFilter && selectedPosFilter !== 'all') ||
        searchQuery.trim()) && (
        <div className="absolute top-2 left-2 z-20 flex items-center gap-1.5 flex-wrap pointer-events-auto bg-white/95 backdrop-blur-xs px-2 py-1 rounded-md border border-black shadow-xs">
          {/* Active Length Filter Chip */}
          {selectedLengthFilter !== null && selectedLengthFilter !== undefined && onClearLengthFilter && (
            <button
              type="button"
              onClick={onClearLengthFilter}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-zinc-100 border border-black text-black hover:bg-zinc-200 cursor-pointer transition-colors"
              title="Clear length filter"
            >
              <span>
                {Array.isArray(selectedLengthFilter)
                  ? selectedLengthFilter.join(',')
                  : selectedLengthFilter}
                L
              </span>
              <X className="w-2.5 h-2.5" />
            </button>
          )}

          {/* Active POS Filter Chip */}
          {selectedPosFilter && selectedPosFilter !== 'all' && onClearPosFilter && (
            <button
              type="button"
              onClick={onClearPosFilter}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-zinc-100 border border-black text-black hover:bg-zinc-200 cursor-pointer transition-colors"
              title="Clear POS filter"
            >
              <span>{selectedPosFilter.toUpperCase()}</span>
              <X className="w-2.5 h-2.5" />
            </button>
          )}

          {/* Active Search Query Chip */}
          {searchQuery.trim() && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-zinc-200 border border-zinc-300 text-zinc-800 hover:bg-zinc-300 cursor-pointer transition-colors"
              title="Clear search query"
            >
              <span>"{searchQuery}"</span>
              <X className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
      )}

      {/* Organic Pebble Word Field with Framer Motion Layout Animation */}
      <motion.div
        layout
        onPointerLeave={() => handleHoverWord(null)}
        className="flex-1 w-full min-h-0 overflow-y-auto p-3 sm:p-4 flex flex-wrap items-center justify-center content-start gap-2 sm:gap-2.5"
      >
        <AnimatePresence mode="popLayout">
          {displayedWords.length === 0 ? (
            <motion.div
              key="empty-state"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="w-full h-full flex flex-col items-center justify-center text-zinc-400 p-8 text-center"
            >
              <span className="font-mono text-xs font-bold text-zinc-700 uppercase tracking-wider">
                No words match active filter
              </span>
              <span className="font-mono text-[10.5px] text-zinc-400 mt-1">
                {hasActiveFilters
                  ? 'Try clearing active length, part-of-speech, or search filters'
                  : 'Click the filter pill above to view ALL WORDS'}
              </span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    if (onClearLengthFilter) onClearLengthFilter();
                    if (onClearPosFilter) onClearPosFilter();
                  }}
                  className="mt-3 px-3 py-1 bg-black text-white text-[10px] font-mono font-bold uppercase rounded cursor-pointer hover:bg-zinc-800 transition-colors"
                >
                  Clear All Filters
                </button>
              )}
            </motion.div>
          ) : (
            displayedWords.map((item, index) => {
              const isCloser = closersSet.has(item.word.toUpperCase());
              const isSelected = selectedWord?.word.toUpperCase() === item.word.toUpperCase();
              const isPopping = poppingWord === item.word.toUpperCase();
              const isHovered = activeHoveredWord?.toLowerCase() === item.word.toLowerCase();
              const isDimmedByHover = Boolean(
                activeHoveredWord &&
                  !isHovered &&
                  compatibleWordSet &&
                  !compatibleWordSet.has(item.word.toLowerCase())
              );
              const blobRadius = getBlobBorderRadius(item.word, 'tile');

              return (
                <motion.button
                  key={item.word}
                  layout={displayedWords.length <= 250 ? 'position' : false}
                  initial={{ opacity: 0, scale: 0.7, y: 12 }}
                  animate={{
                    opacity: isDimmedByHover ? 0.15 : 1,
                    scale: isPopping ? 1.25 : isSelected || isHovered ? 1.05 : 1,
                    y: 0,
                  }}
                  exit={{ opacity: 0, scale: 0.7, y: -12 }}
                  whileTap={{ scale: 1.18 }}
                  transition={{
                    layout: { type: 'spring', damping: 22, stiffness: 380, mass: 0.8 },
                    opacity: {
                      duration: activeHoveredWord ? 0.12 : 0.2,
                      delay: activeHoveredWord ? 0 : Math.min(index * 0.008, 0.2),
                    },
                    y: { type: 'spring', damping: 24, stiffness: 400, delay: Math.min(index * 0.008, 0.2) },
                    scale: { type: 'spring', damping: 14, stiffness: 480 },
                  }}
                  type="button"
                  draggable
                  onPointerEnter={() => handleHoverWord(item.word)}
                  onPointerLeave={() => handleHoverWord(null)}
                  onDragStartCapture={(e: React.DragEvent<HTMLButtonElement>) => {
                    e.dataTransfer.setData('text/plain', item.word);
                    e.dataTransfer.setData('application/x-anagram-word', item.word);
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  onClick={() => handleWordClick(item)}
                  onDoubleClick={(e) => handleWordDoubleClick(e, item.word)}
                  style={{ borderRadius: blobRadius }}
                  aria-label={`Word ${item.word}, ${item.length} letters${isCloser ? ', exact closer' : ''}`}
                  className={`min-h-[36px] sm:min-h-[38px] min-w-[42px] px-3 py-1.5 border-2 font-mono font-bold text-xs sm:text-sm tracking-wide lowercase cursor-grab active:cursor-grabbing select-none focus-visible:ring-2 focus-visible:ring-black focus-visible:outline-hidden touch-manipulation flex items-center justify-center gap-1 transition-colors duration-150 ${
                    isPopping
                      ? 'bg-black text-white border-black ring-4 ring-black shadow-xl z-30 font-black'
                      : isSelected || isHovered
                      ? 'bg-black text-white border-black ring-2 ring-black font-black shadow-[3px_3px_0px_#000000] z-10'
                      : isDimmedByHover
                      ? 'bg-white text-zinc-400 border-zinc-300 shadow-none'
                      : isCloser
                      ? 'bg-black text-white border-black hover:bg-zinc-800 font-black shadow-[2px_2px_0px_#000000] hover:shadow-[3px_3px_0px_#000000] hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none'
                      : 'bg-white hover:bg-zinc-50 text-zinc-900 border-black shadow-[1.5px_1.5px_0px_#000000] hover:shadow-[2.5px_2.5px_0px_#000000] hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none'
                  }`}
                >
                  {isCloser && <span className="w-1.5 h-1.5 rounded-full bg-white inline-block shrink-0" />}
                  {item.isTLD && <span className="text-[11px] font-mono opacity-50 font-normal mr-[-1px]">.</span>}
                  <span>{item.word.toLowerCase()}</span>
                  {item.isCustom && (
                    <span className="text-[7.5px] font-mono uppercase bg-zinc-200 text-black px-1 rounded font-black ml-0.5 tracking-tighter">
                      custom
                    </span>
                  )}
                </motion.button>
              );
            })
          )}
        </AnimatePresence>

        {/* Load More / Show All Buttons for large result sets */}
        {processedWords.length > displayLimit && (
          <div className="w-full flex items-center justify-center gap-2 pt-2 pb-4 flex-wrap">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setDisplayLimit((prev) => prev + 250);
              }}
              className="px-4 py-1.5 bg-zinc-100 hover:bg-black hover:text-white border-2 border-black text-black rounded-lg text-xs font-mono font-black uppercase tracking-wider transition-colors cursor-pointer shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            >
              Show +{Math.min(250, processedWords.length - displayLimit)} More
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('snap');
                setDisplayLimit(processedWords.length);
              }}
              className="px-4 py-1.5 bg-black hover:bg-zinc-800 border-2 border-black text-white rounded-lg text-xs font-mono font-black uppercase tracking-wider transition-colors cursor-pointer shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            >
              Show All ({processedWords.length})
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
