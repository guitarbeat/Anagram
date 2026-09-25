import React, { useState, useRef, useEffect } from 'react';
import type { AnagramResult, SolveMetrics } from '../engine/types';
import { AnagramResultCard } from './AnagramResultCard';

export interface SolverSectionProps {
  sourceText: string;
  results: AnagramResult[];
  isSolving: boolean;
  metrics: SolveMetrics | null;
  activeTargetPhrase?: string;
  pinnedWordsSet?: Set<string>;
  onAnimatePhrase: (target: string) => void;
  onUpdatePhrase?: (oldPhrase: string, newPhrase: string) => void;
  onTogglePinWord?: (word: string) => void;
  onShowToast: (text: string) => void;
}

export const SolverSection: React.FC<SolverSectionProps> = ({
  sourceText,
  results,
  isSolving,
  metrics: _metrics,
  activeTargetPhrase,
  pinnedWordsSet,
  onAnimatePhrase,
  onUpdatePhrase,
  onTogglePinWord,
  onShowToast,
}) => {
  const [copiedPhrase, setCopiedPhrase] = useState<string | null>(null);
  const copyTimeoutRef = useRef<number | null>(null);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current !== null) {
        window.clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const copyToClipboard = (text: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      });
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  };

  const handleCopyPhrase = (phrase: string) => {
    copyToClipboard(phrase);
    setCopiedPhrase(phrase);
    onShowToast(`Copied "${phrase}"`);

    if (copyTimeoutRef.current !== null) {
      window.clearTimeout(copyTimeoutRef.current);
    }
    copyTimeoutRef.current = window.setTimeout(() => {
      setCopiedPhrase(null);
      copyTimeoutRef.current = null;
    }, 2000);
  };

  return (
    <div className="space-y-3.5">
      {/* Results Grid View */}
      {isSolving ? (
        <div className="border border-[#27272a] rounded-xl p-10 sm:p-12 text-center space-y-3 bg-[#121214]">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent" />
          <p className="font-mono text-sm text-[#a1a1aa]">
            Searching exact letter rearrangements...
          </p>
        </div>
      ) : results.length > 0 ? (
        <div className="w-full">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-2.5 pb-12">
            {results.map(item => (
              <AnagramResultCard
                key={item.phrase}
                item={item}
                isActive={activeTargetPhrase === item.phrase}
                pinnedWordsSet={pinnedWordsSet}
                onAnimatePhrase={onAnimatePhrase}
                onUpdatePhrase={onUpdatePhrase}
                onTogglePinWord={onTogglePinWord}
                onCopy={handleCopyPhrase}
                isCopied={copiedPhrase === item.phrase}
              />
            ))}
          </div>
        </div>
      ) : sourceText.trim() ? (
        <div className="border border-[#27272a] rounded-xl p-8 text-center space-y-2 bg-[#121214]">
          <p className="font-mono text-sm text-[#a1a1aa]">No anagrams found.</p>
          <p className="font-mono text-xs text-[#52525b]">
            Try removing punctuation, adjusting word length filters, or enabling Spicy words.
          </p>
        </div>
      ) : (
        <div className="border border-[#27272a] border-dashed rounded-xl p-10 text-center space-y-2">
          <p className="font-mono text-sm text-[#71717a]">
            Enter any name, word, or phrase above to solve exact anagrams.
          </p>
        </div>
      )}
    </div>
  );
};
