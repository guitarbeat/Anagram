import React, { useRef, useEffect, useCallback } from 'react';
import { Play, Copy, Check } from 'lucide-react';
import type { AnagramResult } from '../engine/solver';
import type { POS } from '../engine/lexicon';
import { renderMiniCardCanvas } from '../render/mini';
import type { ProgressBus } from '../hooks/useProgressBus';

export const POS_BADGES: Record<
  POS,
  { label: string; bg: string; text: string; border: string }
> = {
  noun: { label: 'noun', bg: 'bg-blue-950/40', text: 'text-blue-300', border: 'border-blue-800/40' },
  verb: { label: 'verb', bg: 'bg-emerald-950/40', text: 'text-emerald-300', border: 'border-emerald-800/40' },
  adj: { label: 'adj', bg: 'bg-amber-950/40', text: 'text-amber-300', border: 'border-amber-800/40' },
  adv: { label: 'adv', bg: 'bg-purple-950/40', text: 'text-purple-300', border: 'border-purple-800/40' },
  art: { label: 'art', bg: 'bg-zinc-800/60', text: 'text-zinc-400', border: 'border-zinc-700/40' },
  prep: { label: 'prep', bg: 'bg-rose-950/40', text: 'text-rose-300', border: 'border-rose-800/40' },
  pron: { label: 'pron', bg: 'bg-cyan-950/40', text: 'text-cyan-300', border: 'border-cyan-800/40' },
  conj: { label: 'conj', bg: 'bg-orange-950/40', text: 'text-orange-300', border: 'border-orange-800/40' },
  other: { label: 'word', bg: 'bg-zinc-800/40', text: 'text-zinc-400', border: 'border-zinc-700/40' },
};

export interface AnagramResultCardProps {
  item: AnagramResult;
  isActive?: boolean;
  sourceText?: string;
  showMiniPath?: boolean;
  progressBus: ProgressBus;
  onAnimatePhrase: (phrase: string) => void;
  onCopy: (phrase: string) => void;
  isCopied: boolean;
}

export const AnagramResultCard: React.FC<AnagramResultCardProps> = React.memo(({
  item,
  isActive,
  sourceText = '',
  showMiniPath = false,
  progressBus,
  onAnimatePhrase,
  onCopy,
  isCopied,
}) => {
  const phrase = item.phrase;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const w = Math.max(180, Math.floor(rect.width || 240));
    const h = 64;
    if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
    }
  }, []);

  // Single unified subscription to progressBus ONLY while visible on screen
  useEffect(() => {
    if (!showMiniPath || !sourceText) return;

    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    let unsubscribeBus: (() => void) | null = null;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          resizeCanvas();
          if (!unsubscribeBus) {
            unsubscribeBus = progressBus.subscribe((p: number) => {
              if (canvasRef.current) {
                renderMiniCardCanvas(p, canvasRef.current, sourceText, phrase, 'arc');
              }
            });
          }
        } else {
          if (unsubscribeBus) {
            unsubscribeBus();
            unsubscribeBus = null;
          }
        }
      },
      { threshold: 0.05 }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      if (unsubscribeBus) {
        unsubscribeBus();
      }
    };
  }, [showMiniPath, sourceText, phrase, progressBus, resizeCanvas]);

  return (
    <div
      ref={containerRef}
      className={`border rounded-lg p-3.5 transition-all flex flex-col justify-between space-y-3 group cursor-pointer ${
        isActive
          ? 'bg-[#18181b] border-emerald-500/70 shadow-lg shadow-emerald-950/20 ring-1 ring-emerald-500/40'
          : 'bg-[#121214] border-[#27272a] hover:border-[#3f3f46] hover:bg-[#151518]'
      }`}
      onClick={() => onAnimatePhrase(phrase)}
    >
      <div className="space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="text-sm font-medium text-[#f4f4f5] select-text break-words leading-snug group-hover:text-emerald-300 transition-colors">
            &ldquo;{phrase}&rdquo;
          </div>
        </div>

        {/* Word Tokens with POS Badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {item.words.map((word, wIdx) => {
            const p = item.posTags?.[wIdx] || 'other';
            const badge = POS_BADGES[p] || POS_BADGES.other;
            return (
              <span
                key={`${word}_${wIdx}`}
                className="inline-flex items-center gap-1 font-mono text-[11px] text-[#e4e4e7] bg-[#1a1a1e] px-2 py-0.5 rounded border border-[#27272a]"
              >
                <span>{word}</span>
                <span
                  className={`text-[9px] px-1 py-0.2 rounded font-semibold uppercase tracking-wider ${badge.bg} ${badge.text} border ${badge.border}`}
                >
                  {badge.label}
                </span>
              </span>
            );
          })}
          <span className="text-[10px] text-[#52525b] font-mono">
            {item.words.length} words
          </span>
        </div>

        {/* Optional Mini Path Canvas */}
        {showMiniPath && (
          <div className="relative w-full h-[64px] rounded bg-[#09090b] border border-[#27272a] overflow-hidden flex items-center justify-center">
            <canvas ref={canvasRef} className="w-full h-full block" />
          </div>
        )}
      </div>

      {/* Action footer */}
      <div className="flex items-center justify-between pt-2 border-t border-[#232326]">
        <span
          className={`text-[11px] font-mono flex items-center gap-1.5 ${
            isActive ? 'text-emerald-400 font-medium' : 'text-[#71717a] group-hover:text-[#f4f4f5]'
          }`}
        >
          <Play className="w-2.5 h-2.5 fill-current" />
          <span>{isActive ? 'Active on Stage' : 'Animate'}</span>
        </span>

        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            onCopy(phrase);
          }}
          aria-label={`Copy "${phrase}"`}
          className="p-1.5 text-[#71717a] hover:text-[#f4f4f5] hover:bg-[#27272a] rounded transition-colors cursor-pointer"
          title="Copy phrase to clipboard"
        >
          {isCopied ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    </div>
  );
});
