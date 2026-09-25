import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { WordsGraphView } from './WordsGraphView';
import { BarChart3, X } from 'lucide-react';

export interface CandidateWordItem {
  word: string;
  length: number;
  freq: number;
}

export interface CandidateWordsListProps {
  sourceText: string;
  candidateWords: CandidateWordItem[];
  selectedLengthFilter: number | null;
  onSelectLengthFilter: (length: number | null) => void;
  onClearLengthFilter: () => void;
  histogramData: { length: number; count: number }[];
  onAddWordToTarget: (word: string) => void;
  onSetWordAsTarget: (word: string) => void;
  activeTargetPhrase?: string;
  onShowToast: (text: string, type?: 'success' | 'info' | 'error') => void;
}

export const CandidateWordsList: React.FC<CandidateWordsListProps> = ({
  sourceText,
  candidateWords,
  selectedLengthFilter,
  onSelectLengthFilter,
  onClearLengthFilter,
  histogramData,
  onAddWordToTarget,
  onSetWordAsTarget,
  activeTargetPhrase = '',
  onShowToast,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasUserCustomizedSplit, setHasUserCustomizedSplit] = useState<boolean>(false);

  const getAdaptiveSplit = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      return 0.76; // Mobile: allocate 76% to word cloud
    }
    return 0.68; // Desktop: allocate 68% to word cloud
  };

  const [splitRatio, setSplitRatio] = useState<number>(getAdaptiveSplit);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Adaptively adjust on window resize if user hasn't manually customized
  useEffect(() => {
    if (hasUserCustomizedSplit) return;
    const handleResize = () => {
      setSplitRatio(getAdaptiveSplit());
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [hasUserCustomizedSplit]);

  const startDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setHasUserCustomizedSplit(true);
    setIsDragging(true);
  }, []);

  const resetAdaptiveSplit = useCallback(() => {
    setHasUserCustomizedSplit(false);
    setSplitRatio(getAdaptiveSplit());
  }, []);

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relativeX = (e.clientX - rect.left) / rect.width;
    const clampedX = Math.max(0.25, Math.min(0.85, relativeX));
    setSplitRatio(clampedX);
  }, [isDragging]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

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
  }, [isDragging, handlePointerMove, handlePointerUp]);

  const maxHistogramCount = useMemo(() => {
    return Math.max(1, ...histogramData.map(d => d.count));
  }, [histogramData]);

  const totalWords = useMemo(() => {
    return histogramData.reduce((acc, curr) => acc + curr.count, 0);
  }, [histogramData]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative flex flex-row items-stretch min-h-0 text-zinc-900 select-none overflow-hidden bg-transparent"
    >
      {/* LEFT: Constellation Graph View (Separate Panel) */}
      <div
        className={`h-full relative min-w-[120px] bg-white border-2 border-black rounded-[18px] sm:rounded-[22px] overflow-hidden transition-all ${
          isDragging ? 'duration-0' : 'duration-300 ease-out'
        }`}
        style={{
          width: totalWords > 0 ? `${splitRatio * 100}%` : '100%',
        }}
      >
        <WordsGraphView
          sourceText={sourceText}
          candidateWords={candidateWords}
          selectedLengthFilter={selectedLengthFilter}
          onAddWordToTarget={onAddWordToTarget}
          onSetWordAsTarget={onSetWordAsTarget}
          activeTargetPhrase={activeTargetPhrase}
          onShowToast={onShowToast}
        />
      </div>

      {/* DRAGGABLE VERTICAL RESIZER DIVIDER */}
      {totalWords > 0 && (
        <div
          role="separator"
          onPointerDown={startDrag}
          onDoubleClick={resetAdaptiveSplit}
          className={`w-2.5 shrink-0 z-30 cursor-col-resize hover:bg-black/10 active:bg-black/20 relative transition-colors ${
            isDragging ? 'bg-black/15' : 'bg-transparent'
          }`}
          style={{ touchAction: 'none' }}
          title="Drag to resize left/right panels (Double-click to reset adaptive sizing)"
        />
      )}

      {/* RIGHT: Histogram Panel (Separate Panel) */}
      {totalWords > 0 && (
        <div
          className={`h-full shrink-0 bg-white border-2 border-black rounded-[18px] sm:rounded-[22px] overflow-hidden flex flex-col p-2.5 justify-between min-w-[120px] sm:min-w-[140px] shadow-sm transition-all ${
            isDragging ? 'duration-0' : 'duration-300 ease-out'
          }`}
          style={{
            width: `calc(${(1 - splitRatio) * 100}% - 10px)`,
          }}
        >
          {/* Minimal Floating Clear Badge when Filter is Active */}
          {selectedLengthFilter !== null && (
            <div className="flex justify-end pb-1.5 border-b border-zinc-200/60">
              <button
                type="button"
                onClick={onClearLengthFilter}
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-mono font-bold hover:bg-emerald-200 transition-colors cursor-pointer"
                title="Clear length filter"
              >
                <span>{selectedLengthFilter}L Filter Active</span>
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          )}

          {/* Vertical Histogram Bars */}
          <div className="flex-1 min-h-0 flex items-end justify-between gap-1 pt-2 pb-1">
            {histogramData.map(item => {
              const isSelected = selectedLengthFilter === item.length;
              const heightPercent = item.count > 0 ? Math.max(14, (item.count / maxHistogramCount) * 100) : 0;

              return (
                <div
                  key={item.length}
                  onClick={() => {
                    if (isSelected) {
                      onSelectLengthFilter(null);
                    } else {
                      onSelectLengthFilter(item.length);
                    }
                  }}
                  className={`flex-1 flex flex-col items-center justify-end h-full group cursor-pointer transition-all rounded py-1 ${
                    isSelected
                      ? 'bg-emerald-100/90 ring-1 ring-emerald-500 shadow-sm'
                      : 'hover:bg-zinc-200/60'
                  }`}
                  title={`${item.length}-letter words (${item.count} words)`}
                >
                  {/* Count Label */}
                  <span
                    className={`text-[9px] font-mono mb-1 transition-colors ${
                      isSelected
                        ? 'text-emerald-950 font-bold'
                        : item.count > 0
                        ? 'text-zinc-700 group-hover:text-zinc-950 font-semibold'
                        : 'text-zinc-400'
                    }`}
                  >
                    {item.count}
                  </span>

                  {/* Vertical Bar */}
                  <div
                    className={`w-full max-w-[18px] rounded-t-sm transition-all duration-150 ${
                      isSelected
                        ? 'bg-emerald-600 shadow-[0_0_8px_rgba(5,150,105,0.4)]'
                        : item.count > 0
                        ? 'bg-zinc-400 group-hover:bg-zinc-600'
                        : 'bg-zinc-200'
                    }`}
                    style={{ height: `${heightPercent}%` }}
                  />

                  {/* Length Label */}
                  <span
                    className={`text-[9.5px] font-mono mt-1 ${
                      isSelected
                        ? 'text-emerald-950 font-bold'
                        : 'text-zinc-600 group-hover:text-zinc-900 font-medium'
                    }`}
                  >
                    {item.length}L
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
