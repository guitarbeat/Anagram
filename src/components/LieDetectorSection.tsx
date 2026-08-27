import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Play,
  Boxes,
  Plus,
} from 'lucide-react';
import { autocompleteMissingLetters, getLetterDiff, normalize } from '../utils/anagramSolver';

interface LieDetectorSectionProps {
  sourceText: string;
  candidateText: string;
  setCandidateText: (val: string) => void;
  onAnimatePhrase: (target: string) => void;
  onOpenSandbox: (target: string) => void;
}

export const LieDetectorSection: React.FC<LieDetectorSectionProps> = ({
  sourceText,
  candidateText,
  setCandidateText,
  onAnimatePhrase,
  onOpenSandbox,
}) => {
  const [completions, setCompletions] = useState<string[]>([]);
  const diff = getLetterDiff(sourceText, candidateText);

  useEffect(() => {
    if (!diff.isExact && diff.missing.length > 0 && diff.extra.length === 0) {
      const suggestions = autocompleteMissingLetters(sourceText, candidateText);
      setCompletions(suggestions);
    } else {
      setCompletions([]);
    }
  }, [sourceText, candidateText]);

  const handleApplyCompletion = (word: string) => {
    const trimmed = candidateText.trim().replace(/[.?]+$/, '');
    const updated = trimmed ? `${trimmed} ${word}.` : `${word}.`;
    setCandidateText(updated);
  };

  const handleUseTarget = () => {
    if (diff.isExact) {
      onAnimatePhrase(candidateText);
    }
  };

  return (
    <div className="space-y-4 bg-zinc-900/70 border border-zinc-800 rounded-xl p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-850 pb-3.5">
        <p className="text-xs text-zinc-400">
          Compare your custom phrase against <span className="font-mono text-zinc-200 font-medium">"{sourceText}"</span> to verify 100% letter parity.
        </p>
      </div>

      {/* Input Field */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-zinc-400">
            Phrase to Test & Verify
          </label>
          <span className="text-xs font-mono text-zinc-500">
            {normalize(candidateText).length} / {normalize(sourceText).length} letters
          </span>
        </div>
        <input
          type="text"
          value={candidateText}
          onChange={e => setCandidateText(e.target.value)}
          placeholder="Type or paste your anagram candidate here..."
          className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 font-mono focus:outline-none transition-all"
        />
      </div>

        {/* Status Box */}
        <div
          className={`p-4 rounded-xl border transition-colors ${
            diff.isExact
              ? 'bg-emerald-950/30 border-emerald-800/80 text-zinc-200'
              : 'bg-zinc-950 border-zinc-800 text-zinc-300'
          }`}
        >
          <div className="flex items-start gap-3">
            {diff.isExact ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            )}
            <div className="space-y-2 flex-1">
              <div className="font-semibold text-sm flex items-center gap-2">
                <span>
                  {diff.isExact
                    ? 'Exact Anagram Match — All letters match 100%!'
                    : 'Letters do not match yet'}
                </span>
              </div>

              {!diff.isExact && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1 border-t border-zinc-850">
                  <div>
                    <span className="text-xs text-zinc-400 block mb-1">
                      Letters needed ({diff.missing.reduce((acc, [, n]) => acc + n, 0)}):
                    </span>
                    {diff.missing.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {diff.missing.map(([ch, n]) => (
                          <span
                            key={ch}
                            className="bg-zinc-900 border border-zinc-800 text-amber-300 px-2 py-0.5 rounded font-mono text-xs font-medium"
                          >
                            {ch.toUpperCase()} ×{n}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-zinc-500 text-xs">None (all used)</span>
                    )}
                  </div>

                  <div>
                    <span className="text-xs text-zinc-400 block mb-1">
                      Extra letters to remove ({diff.extra.reduce((acc, [, n]) => acc + n, 0)}):
                    </span>
                    {diff.extra.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {diff.extra.map(([ch, n]) => (
                          <span
                            key={ch}
                            className="bg-zinc-900 border border-zinc-800 text-rose-300 px-2 py-0.5 rounded font-mono text-xs font-medium"
                          >
                            {ch.toUpperCase()} ×{n}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-zinc-500 text-xs">None</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Autocomplete Helper */}
        {completions.length > 0 && (
          <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-850 space-y-2">
            <div className="text-xs text-zinc-400">
              Suggestions using remaining needed letters:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {completions.map(word => (
                <button
                  key={word}
                  onClick={() => handleApplyCompletion(word)}
                  className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 rounded-md text-xs font-mono flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>{word}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleUseTarget}
            disabled={!diff.isExact}
            className="px-4 py-2 bg-zinc-100 hover:bg-white disabled:opacity-40 text-zinc-950 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Open in Letter Animator</span>
          </button>

          <button
            onClick={() => onOpenSandbox(candidateText)}
            className="px-3.5 py-2 bg-zinc-950 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>Open in Tile Board</span>
          </button>
        </div>
      </div>
  );
};
