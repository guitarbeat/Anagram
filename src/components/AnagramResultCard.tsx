import React from 'react';
import {
  Play,
  Copy,
  Check,
  CheckCircle2,
  SlidersHorizontal,
} from 'lucide-react';
import { AnagramResult } from '../types';

interface AnagramResultCardProps {
  item: AnagramResult;
  idx: number;
  onAnimatePhrase: (phrase: string) => void;
  onLoadIntoRack: (phrase: string) => void;
  onCopy: (phrase: string, idx: number) => void;
  isCopied: boolean;
}

export const AnagramResultCard: React.FC<AnagramResultCardProps> = ({
  item,
  idx,
  onAnimatePhrase,
  onLoadIntoRack,
  onCopy,
  isCopied,
}) => {
  const phrase = item.phrase;

  return (
    <div className="bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 rounded-xl p-4 transition-all flex flex-col justify-between space-y-3">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <span className="text-base font-semibold text-zinc-100 tracking-tight select-text block break-words">
            {phrase}
          </span>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800 text-emerald-400 flex items-center gap-1 shrink-0">
            <CheckCircle2 className="w-3 h-3" />
            <span>Exact</span>
          </span>
        </div>

        {/* Word Token Chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {item.words.map((w, wIdx) => (
            <span
              key={`${w}_${wIdx}`}
              className="inline-flex items-center px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs font-mono"
            >
              {w}
            </span>
          ))}
          <span className="text-[11px] font-mono text-zinc-500 ml-1">
            ({item.words.length} {item.words.length === 1 ? 'word' : 'words'})
          </span>
        </div>
      </div>

      {/* Action Strip */}
      <div className="flex items-center justify-between pt-2.5 border-t border-zinc-800/80">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onAnimatePhrase(phrase)}
            aria-label={`Animate "${phrase}" in Studio`}
            className="px-3 py-1 bg-zinc-100 hover:bg-white text-zinc-950 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Animate</span>
          </button>

          <button
            onClick={() => onLoadIntoRack(phrase)}
            aria-label={`Load "${phrase}" into Rack`}
            className="px-2.5 py-1 bg-zinc-950 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 hover:border-zinc-700 rounded-md text-xs font-medium transition-colors flex items-center gap-1"
            title="Load into interactive rack"
          >
            <SlidersHorizontal className="w-3 h-3 text-zinc-400" />
            <span>Rack</span>
          </button>
        </div>

        <button
          onClick={() => onCopy(phrase, idx)}
          aria-label={`Copy "${phrase}"`}
          className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors"
          title="Copy phrase"
        >
          {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
};
