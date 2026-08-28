import React, { useState, useEffect, useRef } from 'react';
import {
  Shuffle,
  RotateCcw,
  Play,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Wand2,
  Plus,
  Keyboard,
  ArrowRight,
  Info,
} from 'lucide-react';
import {
  autocompleteMissingLetters,
  getLetterDiff,
  normalize,
  exact,
} from '../utils/anagramSolver';
import { showToast } from '../utils/toast';

interface UnifiedRackVerifierProps {
  sourceText: string;
  candidatePhrase: string;
  onChangeCandidate: (phrase: string) => void;
  onAnimatePhrase: (phrase: string) => void;
}

interface TileItem {
  id: string;
  char: string;
  placed: boolean;
}

export const UnifiedRackVerifier: React.FC<UnifiedRackVerifierProps> = ({
  sourceText,
  candidatePhrase,
  onChangeCandidate,
  onAnimatePhrase,
}) => {
  const [bankTiles, setBankTiles] = useState<TileItem[]>([]);
  const [placedTiles, setPlacedTiles] = useState<{ id: string; char: string; isSpace?: boolean }[]>([]);
  const [completions, setCompletions] = useState<string[]>([]);
  const [copied, setCopied] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Sync internal tiles with sourceText and candidatePhrase
  useEffect(() => {
    const rawChars = normalize(sourceText).toUpperCase().split('');
    const allTiles: TileItem[] = rawChars.map((char, idx) => ({
      id: `tile_${idx}_${char}_${Math.random().toString(36).substr(2, 4)}`,
      char,
      placed: false,
    }));

    const upperPhrase = candidatePhrase.toUpperCase();
    const placed: { id: string; char: string; isSpace?: boolean }[] = [];
    const available = [...allTiles];

    for (let i = 0; i < upperPhrase.length; i++) {
      const ch = upperPhrase[i];
      if (ch === ' ') {
        placed.push({ id: `space_${i}_${Math.random()}`, char: ' ', isSpace: true });
      } else if (ch >= 'A' && ch <= 'Z') {
        const matchIndex = available.findIndex(t => !t.placed && t.char === ch);
        if (matchIndex !== -1) {
          available[matchIndex].placed = true;
          placed.push({ id: available[matchIndex].id, char: ch });
        }
      }
    }

    setBankTiles(available);
    setPlacedTiles(placed);
  }, [sourceText, candidatePhrase]);

  // Diff calculation
  const diff = getLetterDiff(sourceText, candidatePhrase);
  const isExactMatch = diff.isExact;
  const unplacedCount = bankTiles.filter(t => !t.placed).length;

  // Autocomplete suggestions if letters are missing and no extra
  useEffect(() => {
    if (!diff.isExact && diff.missing.length > 0 && diff.extra.length === 0) {
      const suggestions = autocompleteMissingLetters(sourceText, candidatePhrase);
      setCompletions(suggestions.slice(0, 16));
    } else {
      setCompletions([]);
    }
  }, [sourceText, candidatePhrase, diff.isExact, diff.missing.length, diff.extra.length]);

  const handleTileClick = (tile: TileItem) => {
    if (tile.placed) return;
    const newPhrase = candidatePhrase ? `${candidatePhrase.trim()}${tile.char}` : tile.char;
    onChangeCandidate(newPhrase);
  };

  const handleRemovePlaced = (index: number) => {
    const item = placedTiles[index];
    if (item.isSpace) {
      const parts = placedTiles.filter((_, i) => i !== index).map(p => p.char).join('');
      onChangeCandidate(parts);
    } else {
      // Reconstruct phrase without this specific tile
      const remainingPlaced = placedTiles.filter((_, i) => i !== index);
      onChangeCandidate(remainingPlaced.map(p => p.char).join(''));
    }
  };

  const handleAddSpace = () => {
    if (!candidatePhrase || candidatePhrase.endsWith(' ')) return;
    onChangeCandidate(`${candidatePhrase} `);
  };

  const handleBackspace = () => {
    if (placedTiles.length === 0) return;
    handleRemovePlaced(placedTiles.length - 1);
  };

  const handleResetRack = () => {
    onChangeCandidate('');
    showToast('Reset letter rack', 'info');
  };

  const handleShuffleBank = () => {
    setBankTiles(prev => [...prev].sort(() => Math.random() - 0.5));
    showToast('Shuffled tile bank', 'info');
  };

  const handleSortBank = () => {
    setBankTiles(prev => [...prev].sort((a, b) => a.char.localeCompare(b.char)));
    showToast('Sorted tile bank A-Z', 'info');
  };

  const handleApplyCompletion = (word: string) => {
    const trimmed = candidatePhrase.trim().replace(/[.?]+$/, '');
    const updated = trimmed ? `${trimmed} ${word}` : word;
    onChangeCandidate(updated);
    showToast(`Appended "${word}"`, 'success');
  };

  const handleCopyPhrase = () => {
    if (!candidatePhrase) return;
    navigator.clipboard.writeText(candidatePhrase);
    setCopied(true);
    showToast('Copied phrase to clipboard', 'info');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCleanSpaces = () => {
    const cleaned = candidatePhrase.replace(/\s+/g, ' ').trim();
    onChangeCandidate(cleaned);
    showToast('Cleaned whitespace', 'info');
  };

  const srcLen = normalize(sourceText).length;
  const candLen = normalize(candidatePhrase).length;
  const missingCount = diff.missing.reduce((acc, [, n]) => acc + n, 0);
  const matchPct = srcLen > 0 ? Math.max(0, Math.min(100, Math.round(((srcLen - missingCount) / srcLen) * 100))) : 0;

  return (
    <div className="space-y-5 bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 sm:p-6 transition-all">
      {/* Header & Verification Parity Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
        <div>
          <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isExactMatch ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            <span>Interactive Letter Rack &amp; Verifier</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Real-time letter parity inspector and tactile letter-tile arrangement rack.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isExactMatch ? (
            <span className="px-3 py-1 rounded-md bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-mono font-medium flex items-center gap-1.5 shadow-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>100% Exact Anagram</span>
            </span>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded-full transition-all duration-300"
                  style={{ width: `${matchPct}%` }}
                />
              </div>
              <span className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-400 text-xs font-mono">
                {candLen}/{srcLen} letters ({matchPct}%)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Text Input with Quick Actions */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-zinc-400">
            Candidate Anagram Phrase
          </label>
          <div className="flex items-center gap-2">
            {candidatePhrase && (
              <button
                type="button"
                onClick={handleCleanSpaces}
                className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition-colors"
                title="Normalize spaces"
              >
                <Wand2 className="w-3 h-3" />
                <span>Clean</span>
              </button>
            )}
            {candidatePhrase && (
              <button
                type="button"
                onClick={handleCopyPhrase}
                className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition-colors"
                title="Copy to clipboard"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            )}
            {candidatePhrase && (
              <button
                type="button"
                onClick={handleResetRack}
                className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition-colors"
                title="Clear phrase"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>
        <input
          ref={inputRef}
          type="text"
          value={candidatePhrase}
          onChange={e => onChangeCandidate(e.target.value)}
          placeholder="Type letters or click tiles below to arrange words..."
          className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 font-mono focus:outline-none transition-all"
        />
      </div>

      {/* Arranged Tile Rack */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-400">
            Tile Board Rack ({placedTiles.length > 0 ? `${placedTiles.length} tiles arranged` : 'empty'})
          </span>
          <span className="text-xs font-mono text-zinc-500">
            Click tile on rack to return to bank
          </span>
        </div>

        <div
          onClick={() => inputRef.current?.focus()}
          className="min-h-[84px] p-3 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center flex-wrap gap-1.5 cursor-text select-none"
        >
          {placedTiles.length === 0 ? (
            <div className="flex items-center gap-2 text-xs text-zinc-500 py-3 px-2">
              <Info className="w-4 h-4 text-zinc-600 shrink-0" />
              <span>Click available letter tiles below or type directly above to arrange...</span>
            </div>
          ) : (
            placedTiles.map((item, index) => {
              if (item.isSpace) {
                return (
                  <button
                    key={item.id}
                    onClick={e => {
                      e.stopPropagation();
                      handleRemovePlaced(index);
                    }}
                    className="h-10 px-2 bg-zinc-900 hover:bg-zinc-800 border border-dashed border-zinc-700 rounded text-zinc-400 text-xs flex items-center justify-center font-mono transition-colors"
                    title="Space (click to remove)"
                  >
                    ␣
                  </button>
                );
              }
              return (
                <button
                  key={item.id}
                  onClick={e => {
                    e.stopPropagation();
                    handleRemovePlaced(index);
                  }}
                  className="w-8 h-10 bg-zinc-100 hover:bg-white text-zinc-950 font-mono font-bold text-sm rounded shadow-xs border border-zinc-300 flex items-center justify-center transition-transform active:scale-90"
                  title="Click to remove from rack"
                >
                  {item.char}
                </button>
              );
            })
          )}
        </div>

        {/* Rack Quick Buttons */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
          <div className="flex items-center gap-2">
            <button
              onClick={handleAddSpace}
              className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded text-xs font-mono transition-colors"
            >
              + Space
            </button>
            <button
              onClick={handleBackspace}
              disabled={placedTiles.length === 0}
              className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-30 text-zinc-300 border border-zinc-800 rounded text-xs font-mono transition-colors"
            >
              Backspace ⌫
            </button>
          </div>

          <button
            onClick={() => onAnimatePhrase(candidatePhrase)}
            disabled={!candidatePhrase}
            className="px-3.5 py-1.5 bg-zinc-100 hover:bg-white disabled:opacity-30 text-zinc-950 font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Animate in Studio</span>
          </button>
        </div>
      </div>

      {/* Discrepancy Breakdown */}
      {!isExactMatch && (
        <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Letter Discrepancy</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1 border-t border-zinc-850">
            <div>
              <span className="text-zinc-400 block mb-1">
                Missing Letters ({diff.missing.reduce((acc, [, n]) => acc + n, 0)} needed):
              </span>
              {diff.missing.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {diff.missing.map(([ch, n]) => (
                    <span
                      key={ch}
                      className="bg-zinc-900 border border-zinc-800 text-amber-300 px-2 py-0.5 rounded font-mono text-xs"
                    >
                      {ch.toUpperCase()} ×{n}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-zinc-500 font-mono">None</span>
              )}
            </div>

            <div>
              <span className="text-zinc-400 block mb-1">
                Surplus Letters ({diff.extra.reduce((acc, [, n]) => acc + n, 0)} extra):
              </span>
              {diff.extra.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {diff.extra.map(([ch, n]) => (
                    <span
                      key={ch}
                      className="bg-zinc-900 border border-zinc-800 text-rose-300 px-2 py-0.5 rounded font-mono text-xs"
                    >
                      {ch.toUpperCase()} ×{n}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-zinc-500 font-mono">None</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Autocomplete Words */}
      {completions.length > 0 && (
        <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400">
              Valid words that exhaust remaining missing letters:
            </span>
            <span className="text-[11px] font-mono text-zinc-500">
              Click word to append
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {completions.map(word => (
              <button
                key={word}
                onClick={() => handleApplyCompletion(word)}
                className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-emerald-300 border border-zinc-800 hover:border-emerald-800 rounded text-xs font-mono flex items-center gap-1 transition-colors"
                title={`Append "${word}" to complete anagram`}
              >
                <Plus className="w-3 h-3" />
                <span>{word}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Available Letter Tiles Bank */}
      <div className="space-y-2 pt-2 border-t border-zinc-800/80">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-400">
            Available Letter Tiles ({unplacedCount} unplaced)
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleShuffleBank}
              className="px-2 py-0.5 bg-zinc-950 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded text-xs flex items-center gap-1 transition-colors"
              title="Shuffle"
            >
              <Shuffle className="w-3 h-3" />
              <span>Shuffle</span>
            </button>
            <button
              onClick={handleSortBank}
              className="px-2 py-0.5 bg-zinc-950 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded text-xs transition-colors"
              title="Sort A-Z"
            >
              <span>A-Z</span>
            </button>
          </div>
        </div>

        <div className="p-3 bg-zinc-950/80 border border-zinc-800 rounded-xl flex items-center flex-wrap gap-1.5 min-h-[64px]">
          {bankTiles.map(tile => (
            <button
              key={tile.id}
              onClick={() => handleTileClick(tile)}
              disabled={tile.placed}
              className={`w-8 h-10 rounded font-mono font-bold text-sm transition-all flex items-center justify-center ${
                tile.placed
                  ? 'opacity-20 bg-zinc-900 border border-zinc-800 text-zinc-600 cursor-not-allowed'
                  : 'bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-500 text-zinc-100 cursor-pointer active:scale-90 shadow-xs'
              }`}
            >
              {tile.char}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
