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
  const [splitRatio, setSplitRatio] = useState<number>(0.68); // 68% left, 32% right
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const startDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relativeX = (e.clientX - rect.left) / rect.width;
    const clampedX = Math.max(0.25, Math.min(0.82, relativeX));
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
      className="w-full h-full relative flex flex-row items-stretch min-h-0 text-zinc-900 select-none overflow-hidden bg-white"
    >
      {/* LEFT: Constellation Graph View */}
      <div
        className="h-full relative min-w-[120px]"
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
          className={`w-1 shrink-0 z-30 cursor-col-resize hover:bg-black active:bg-black relative transition-colors ${
            isDragging ? 'bg-black' : 'bg-black'
          }`}
          style={{ touchAction: 'none' }}
          title="Drag to resize left/right panels"
        >
          {/* Grabber indicator inside divider */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-0.5">
            <div className="w-0.5 h-1 bg-zinc-600" />
            <div className="w-0.5 h-1 bg-zinc-600" />
            <div className="w-0.5 h-1 bg-zinc-600" />
          </div>
        </div>
      )}

      {/* RIGHT: Histogram Panel */}
      {totalWords > 0 && (
        <div
          className="h-full shrink-0 border-l border-zinc-200 bg-zinc-50/80 flex flex-col p-2.5 justify-between min-w-[140px]"
          style={{
            width: `calc(${(1 - splitRatio) * 100}% - 4px)`,
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-1 pb-1.5 border-b border-zinc-200">
            <div className="flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-zinc-700" />
              <span className="text-[11px] font-mono font-bold text-zinc-900 uppercase tracking-tight">
                Length Distribution
              </span>
            </div>

            {selectedLengthFilter !== null ? (
              <button
                type="button"
                onClick={onClearLengthFilter}
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-mono font-bold hover:bg-emerald-200 transition-colors cursor-pointer"
                title="Clear length filter"
              >
                <span>{selectedLengthFilter}L</span>
                <X className="w-2.5 h-2.5" />
              </button>
            ) : (
              <span className="text-[10px] font-mono text-zinc-500 font-medium">
                {totalWords} words
              </span>
            )}
          </div>

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
