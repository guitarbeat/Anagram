import React, { useState, useMemo } from 'react';
import { Lock, Unlock, Sparkles, Wand2, Copy, Check, ChevronRight } from 'lucide-react';
import { findProgressiveCompletions, findSemanticAnchors } from '../engine/progressiveSolver';
import { smartPunctuate } from '../engine/polish';

export interface ProgressiveComposerProps {
  sourceName: string;
  targetPhrase: string;
  onTargetPhraseChange: (phrase: string) => void;
  remainingLetters: string[];
  isExactMatch: boolean;
  onShowToast?: (text: string, type?: 'success' | 'info' | 'error') => void;
  onAddWordToTarget?: (word: string) => void;
}

export const ProgressiveComposer: React.FC<ProgressiveComposerProps> = ({
  sourceName,
  targetPhrase,
  onTargetPhraseChange,
  remainingLetters,
  isExactMatch,
  onShowToast,
  onAddWordToTarget,
}) => {
  const [isAnchorLocked, setIsAnchorLocked] = useState<boolean>(false);
  const [lockedAnchor, setLockedAnchor] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // Toggle anchor lock
  const handleToggleLock = () => {
    if (!isAnchorLocked) {
      if (!targetPhrase.trim()) return;
      setIsAnchorLocked(true);
      setLockedAnchor(targetPhrase.trim());
      onShowToast?.(`Locked anchor: "${targetPhrase.trim().toUpperCase()}"`, 'success');
    } else {
      setIsAnchorLocked(false);
      setLockedAnchor('');
      onShowToast?.('Anchor unlocked for free editing');
    }
  };

  // Find progressive completions based on remaining letters
  const completions = useMemo(() => {
    if (isExactMatch || remainingLetters.length === 0) return [];
    return findProgressiveCompletions(sourceName, targetPhrase, remainingLetters, 8);
  }, [sourceName, targetPhrase, remainingLetters, isExactMatch]);

  // Semantic anchor discoveries from full source name
  const discoveredAnchors = useMemo(() => {
    if (targetPhrase.trim().length > 0) return [];
    return findSemanticAnchors(sourceName, 6);
  }, [sourceName, targetPhrase]);

  // Formatted literary prose for current target phrase
  const polishedProse = useMemo(() => {
    if (!targetPhrase.trim()) return '';
    return smartPunctuate(targetPhrase, lockedAnchor);
  }, [targetPhrase, lockedAnchor]);

  const handleCopyProse = () => {
    if (!polishedProse) return;
    navigator.clipboard.writeText(polishedProse);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onShowToast?.('Copied formatted prose to clipboard!', 'success');
  };

  const handleApplyCompletion = (completionPhrase: string) => {
    const nextPhrase = targetPhrase.trim()
      ? `${targetPhrase.trim()} ${completionPhrase.trim()}`
      : completionPhrase.trim();
    onTargetPhraseChange(nextPhrase.toUpperCase());
    onShowToast?.(`Applied ending: "${completionPhrase}"`, 'success');
  };

  const hasSource = Boolean(sourceName.trim());
  if (!hasSource) return null;

  return (
    <div className="w-full flex flex-col bg-white border-t border-zinc-200/80 text-zinc-900 select-none overflow-hidden">
      {/* 1. PROGRESSIVE COMPOSITION CONTROLS BAR */}
      <div className="w-full px-3 py-1.5 bg-zinc-50/90 border-b border-zinc-200/60 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
        {/* Left: Lock Anchor Affordance & Status */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleToggleLock}
            disabled={!targetPhrase.trim()}
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-colors ${
              isAnchorLocked
                ? 'bg-zinc-900 text-white shadow-xs'
                : targetPhrase.trim()
                ? 'bg-zinc-200 hover:bg-zinc-300 text-zinc-800'
                : 'bg-zinc-100 text-zinc-400 cursor-not-allowed opacity-60'
            }`}
            title={
              isAnchorLocked
                ? 'Click to unlock and edit full phrase'
                : targetPhrase.trim()
                ? 'Freeze this phrase as an anchor to solve remaining letters'
                : 'Type or choose words first to lock anchor'
            }
          >
            {isAnchorLocked ? (
              <>
                <Lock className="w-3 h-3 text-zinc-200" />
                <span>Locked</span>
              </>
            ) : (
              <>
                <Unlock className="w-3 h-3 text-zinc-600" />
                <span>Lock Anchor</span>
              </>
            )}
          </button>

          {isAnchorLocked && (
            <span className="text-[10px] font-mono text-zinc-600 truncate max-w-[160px] sm:max-w-[260px]">
              "<span className="font-bold text-zinc-900">{lockedAnchor}</span>"
            </span>
          )}

          {remainingLetters.length > 0 && !isExactMatch && (
            <span className="text-[10px] font-mono text-zinc-500">
              · <span className="font-bold text-zinc-800">{remainingLetters.length}</span> letters remaining to solve
            </span>
          )}
        </div>

        {/* Right: Quick action status */}
        {!isExactMatch && remainingLetters.length > 0 && completions.length > 0 && (
          <span className="text-[9.5px] font-mono text-zinc-400 font-medium hidden sm:inline">
            {completions.length} exact closers available
          </span>
        )}
      </div>

      {/* 2. COMPLETION DECK OR PROSE POLISH CARD */}
      {isExactMatch ? (
        /* Polish & Punctuate Prose Card */
        <div className="w-full px-3 py-2 bg-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Wand2 className="w-4 h-4 text-zinc-700 shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                Punctuation & Literary Prose
              </span>
              <span className="text-xs sm:text-sm font-serif italic text-zinc-900 truncate">
                "{polishedProse}"
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopyProse}
            className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold bg-zinc-900 hover:bg-zinc-800 text-white flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors shadow-xs"
            title="Copy formatted prose with punctuation"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-white" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-zinc-300" />
                <span>Copy Prose</span>
              </>
            )}
          </button>
        </div>
      ) : completions.length > 0 ? (
        /* Ranked Exact Leftover Closures Strip */
        <div className="w-full px-3 py-1.5 bg-white flex items-center gap-2 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1 text-[9.5px] font-mono font-bold uppercase text-zinc-400 shrink-0">
            <Sparkles className="w-3 h-3 text-zinc-700" />
            <span className="hidden sm:inline">Exact Endings:</span>
          </div>

          <div className="flex items-center gap-1.5 min-w-0">
            {completions.slice(0, 6).map((comp) => (
              <button
                key={comp.id}
                type="button"
                onClick={() => handleApplyCompletion(comp.phrase)}
                className="px-2 py-0.5 rounded-md text-[10.5px] font-mono font-semibold bg-zinc-100 hover:bg-zinc-900 hover:text-white text-zinc-800 border border-zinc-300/80 hover:border-zinc-900 flex items-center gap-1 cursor-pointer transition-all duration-75 shrink-0 shadow-2xs group"
                title={`Add "+${comp.phrase}" to finish anagram`}
              >
                <span>+{comp.phrase}</span>
                <ChevronRight className="w-2.5 h-2.5 opacity-40 group-hover:opacity-100" />
              </button>
            ))}
          </div>
        </div>
      ) : discoveredAnchors.length > 0 ? (
        /* Semantic Anchor Discoveries */
        <div className="w-full px-3 py-1.5 bg-white flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-[9.5px] font-mono font-bold uppercase text-zinc-400 shrink-0">
            Anchors:
          </span>
          <div className="flex items-center gap-1 min-w-0">
            {discoveredAnchors.map(anc => (
              <button
                key={anc.word}
                type="button"
                onClick={() => onAddWordToTarget?.(anc.word)}
                className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-200 cursor-pointer transition-colors shrink-0"
                title={`Seed with anchor word "${anc.word}" (${anc.length}L)`}
              >
                {anc.word}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};
