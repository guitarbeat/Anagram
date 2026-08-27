import React, { useState, useEffect } from 'react';
import {
  Shuffle,
  RotateCcw,
  Play,
  CheckCircle2,
  Boxes,
} from 'lucide-react';
import { exact, normalize } from '../utils/anagramSolver';

interface LetterSandboxProps {
  sourceText: string;
  onAnimatePhrase: (target: string) => void;
}

interface TileItem {
  id: string;
  char: string;
  placed: boolean;
}

export const LetterSandbox: React.FC<LetterSandboxProps> = ({
  sourceText,
  onAnimatePhrase,
}) => {
  const [bankTiles, setBankTiles] = useState<TileItem[]>([]);
  const [placedSequence, setPlacedSequence] = useState<{ id: string; char: string; isSpace?: boolean }[]>([]);

  useEffect(() => {
    const raw = normalize(sourceText).toUpperCase().split('');
    const newTiles: TileItem[] = raw.map((char, i) => ({
      id: `tile_${i}_${char}_${Math.random().toString(36).substr(2, 4)}`,
      char,
      placed: false,
    }));
    setBankTiles(newTiles);
    setPlacedSequence([]);
  }, [sourceText]);

  const handleTileClick = (tile: TileItem) => {
    if (tile.placed) return;
    setBankTiles(prev => prev.map(t => (t.id === tile.id ? { ...t, placed: true } : t)));
    setPlacedSequence(prev => [...prev, { id: tile.id, char: tile.char }]);
  };

  const handleRemovePlaced = (index: number) => {
    const item = placedSequence[index];
    if (!item.isSpace) {
      setBankTiles(prev => prev.map(t => (t.id === item.id ? { ...t, placed: false } : t)));
    }
    setPlacedSequence(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddSpace = () => {
    setPlacedSequence(prev => [
      ...prev,
      { id: `space_${Date.now()}_${Math.random()}`, char: ' ', isSpace: true },
    ]);
  };

  const handleBackspace = () => {
    if (placedSequence.length === 0) return;
    handleRemovePlaced(placedSequence.length - 1);
  };

  const handleReset = () => {
    setBankTiles(prev => prev.map(t => ({ ...t, placed: false })));
    setPlacedSequence([]);
  };

  const handleShuffleBank = () => {
    setBankTiles(prev => [...prev].sort(() => Math.random() - 0.5));
  };

  const handleSortBank = () => {
    setBankTiles(prev => [...prev].sort((a, b) => a.char.localeCompare(b.char)));
  };

  const builtString = placedSequence.map(p => p.char).join('').trim();
  const isSolved = exact(sourceText, builtString);
  const remainingCount = bankTiles.filter(t => !t.placed).length;

  return (
    <div className="space-y-4 bg-zinc-900/70 border border-zinc-800 rounded-xl p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-850 pb-3.5">
        <p className="text-xs text-zinc-400">
          Click letter tiles to arrange and test anagrams manually.
        </p>

        <div className="flex items-center gap-1.5 self-start sm:self-auto flex-wrap">
          <button
            onClick={handleShuffleBank}
            className="px-2.5 py-1 bg-zinc-950 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-md text-xs flex items-center gap-1 transition-colors"
          >
            <Shuffle className="w-3 h-3" />
            <span>Shuffle</span>
          </button>
          <button
            onClick={handleSortBank}
            className="px-2.5 py-1 bg-zinc-950 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-md text-xs transition-colors"
          >
            <span>Sort A-Z</span>
          </button>
          <button
            onClick={handleReset}
            className="px-2.5 py-1 bg-zinc-950 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-md text-xs flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>
      </div>

        {/* The Placed Rack */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">
              Arranged Letters ({builtString.length > 0 ? `"${builtString}"` : 'empty'})
            </span>
            {isSolved && remainingCount === 0 && (
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Exact Anagram Match!
              </span>
            )}
          </div>

          <div className="min-h-[88px] p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center flex-wrap gap-2">
            {placedSequence.length === 0 ? (
              <span className="text-xs text-zinc-500 select-none">
                Click any letter tile below to place it here...
              </span>
            ) : (
              placedSequence.map((item, index) => {
                if (item.isSpace) {
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleRemovePlaced(index)}
                      className="w-8 h-10 bg-zinc-900 hover:bg-zinc-800 border border-dashed border-zinc-700 rounded-md text-zinc-400 text-xs flex items-center justify-center font-medium transition-colors"
                      title="Space (click to remove)"
                    >
                      Space
                    </button>
                  );
                }
                return (
                  <button
                    key={item.id}
                    onClick={() => handleRemovePlaced(index)}
                    className="w-9 h-11 bg-zinc-100 hover:bg-zinc-300 text-zinc-950 font-mono font-bold text-base rounded-md shadow-xs flex items-center justify-center transition-transform active:scale-95"
                    title="Click to return to bank"
                  >
                    {item.char}
                  </button>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <button
                onClick={handleAddSpace}
                className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-md text-xs font-medium transition-colors"
              >
                <span>+ Add Space</span>
              </button>
              <button
                onClick={handleBackspace}
                disabled={placedSequence.length === 0}
                className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-30 text-zinc-300 border border-zinc-800 rounded-md text-xs font-medium transition-colors"
              >
                <span>Backspace ⌫</span>
              </button>
            </div>

            {isSolved && remainingCount === 0 && (
              <button
                onClick={() => onAnimatePhrase(builtString)}
                className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold rounded-md text-xs flex items-center gap-1.5 transition-colors"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Animate This Anagram</span>
              </button>
            )}
          </div>
        </div>

        {/* Tile Inventory */}
        <div className="space-y-2 pt-2 border-t border-zinc-850">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">
              Available Letter Tiles ({remainingCount} remaining)
            </span>
          </div>

          <div className="p-3.5 bg-zinc-950/70 border border-zinc-800/80 rounded-xl flex items-center flex-wrap gap-2 min-h-[76px]">
            {bankTiles.map(tile => (
              <button
                key={tile.id}
                onClick={() => handleTileClick(tile)}
                disabled={tile.placed}
                className={`w-9 h-11 rounded-md font-mono font-bold text-base transition-all flex items-center justify-center ${
                  tile.placed
                    ? 'opacity-15 bg-zinc-900 border border-zinc-850 text-zinc-600 cursor-not-allowed'
                    : 'bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 text-zinc-100 hover:border-zinc-500 cursor-pointer active:scale-95 shadow-xs'
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
