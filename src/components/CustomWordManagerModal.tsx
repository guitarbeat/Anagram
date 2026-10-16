import React, { useState, useMemo } from 'react';
import {
  X,
  Plus,
  Trash2,
  Globe,
  BookOpen,
  Search,
  Check,
  AlertCircle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { GLOBAL_TLDS, getTLDCategory } from '../engine/tlds';

export interface CustomWordManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customWords: string[];
  onAddWord: (word: string) => void;
  onAddBulkWords: (words: string[]) => void;
  onRemoveWord: (word: string) => void;
  onClearAll: () => void;
  onShowToast?: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const CustomWordManagerModal: React.FC<CustomWordManagerModalProps> = ({
  isOpen,
  onClose,
  customWords,
  onAddWord,
  onAddBulkWords,
  onRemoveWord,
  onClearAll,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'custom' | 'tlds'>('custom');
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const cleanInput = inputText.trim().toLowerCase();

  const handleAdd = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!cleanInput) return;

    // Support comma or whitespace separated entries
    const tokens = cleanInput
      .split(/[\s,]+/)
      .map((t) => t.replace(/[^a-z]/g, '').trim())
      .filter(Boolean);

    if (tokens.length === 0) {
      setValidationError('Please enter valid letters (a-z).');
      return;
    }

    const invalidToken = tokens.find((t) => t.length < 2 || t.length > 16);
    if (invalidToken) {
      setValidationError(`Word "${invalidToken}" must be between 2 and 16 letters.`);
      return;
    }

    if (tokens.length === 1) {
      const word = tokens[0];
      if (customWords.includes(word)) {
        setValidationError(`"${word}" is already in your custom dictionary.`);
        return;
      }
      onAddWord(word);
      if (onShowToast) onShowToast(`Added "${word.toUpperCase()}" to dictionary`, 'success');
    } else {
      const uniqueNew = tokens.filter((t) => !customWords.includes(t));
      if (uniqueNew.length === 0) {
        setValidationError('All words are already in your custom dictionary.');
        return;
      }
      onAddBulkWords(uniqueNew);
      if (onShowToast) onShowToast(`Added ${uniqueNew.length} words to dictionary`, 'success');
    }

    setInputText('');
    setValidationError(null);
  };

  const filteredCustomWords = useMemo(() => {
    if (!searchQuery.trim()) return customWords;
    const q = searchQuery.toLowerCase().trim();
    return customWords.filter((w) => w.includes(q));
  }, [customWords, searchQuery]);

  const filteredTLDs = useMemo(() => {
    if (!searchQuery.trim()) return GLOBAL_TLDS;
    const q = searchQuery.toLowerCase().trim().replace(/^\./, '');
    return GLOBAL_TLDS.filter((t) => t.includes(q));
  }, [searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs select-none">
      <div className="w-full max-w-lg bg-white border-2 border-black rounded-xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden">
        {/* Header */}
        <div className="px-3.5 py-3 border-b-2 border-black flex items-center justify-between bg-zinc-50">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-black" />
            <h2 className="text-xs sm:text-sm font-mono font-black uppercase tracking-wider text-black">
              Lexicon & Domain Extensions
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-zinc-600 hover:text-black hover:bg-zinc-200 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <nav className="flex border-b border-zinc-200 bg-white px-3 gap-4" aria-label="Custom word tabs">
          {[
            { id: 'custom', label: `Custom Words (${customWords.length})` },
            { id: 'tlds', label: `Global TLDs (${GLOBAL_TLDS.length})` },
          ].map(({ id, label }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setActiveTab(id as any);
                  setSearchQuery('');
                }}
                className={`py-2 text-[11px] font-mono uppercase tracking-wider transition-all cursor-pointer ${
                  isActive
                    ? 'font-black text-black border-b-2 border-black'
                    : 'font-bold text-zinc-400 hover:text-black border-b-2 border-transparent'
                }`}
              >
                {label}
              </button>
            );
          })}
        </nav>

        {/* TAB 1: CUSTOM WORDS */}
        {activeTab === 'custom' && (
          <div className="flex-1 flex flex-col p-3.5 sm:p-4 gap-3 overflow-y-auto">
            {/* Quick Add Form */}
            <form onSubmit={handleAdd} className="flex flex-col gap-1.5">
              <span className="text-[9px] font-mono font-extrabold uppercase text-zinc-500 tracking-wider">
                Add Word, Brand, or Domain Term
              </span>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => {
                    setInputText(e.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  placeholder="e.g. crypto, substack, solana (or comma-separated)"
                  className="flex-1 px-3 py-2 bg-zinc-50 border-2 border-black rounded-lg text-base sm:text-xs font-mono font-bold text-black placeholder:text-zinc-400 focus:outline-none focus:bg-white"
                />
                <button
                  type="submit"
                  disabled={!cleanInput}
                  className="px-3.5 py-2 min-h-[40px] bg-black hover:bg-zinc-800 disabled:opacity-40 disabled:hover:bg-black text-white border-2 border-black rounded-lg text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer shadow-xs active:scale-95 touch-manipulation"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add
                </button>
              </div>
              {validationError && (
                <div className="flex items-center gap-1 text-[10px] font-mono text-red-600 font-bold mt-0.5">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}
            </form>

            {/* Search within Custom Words */}
            {customWords.length > 4 && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter custom words..."
                  className="w-full pl-8 pr-3 py-1 bg-zinc-100 border border-zinc-300 rounded text-[11px] font-mono text-black placeholder:text-zinc-400 focus:outline-none focus:border-black"
                />
              </div>
            )}

            {/* Custom Words List */}
            <div className="flex-1 min-h-[140px] flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono font-extrabold uppercase text-zinc-400 tracking-wider">
                  Active Custom Words ({filteredCustomWords.length})
                </span>
                {customWords.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Remove all custom words from dictionary?')) {
                        onClearAll();
                        if (onShowToast) onShowToast('Cleared all custom words', 'info');
                      }
                    }}
                    className="text-[9px] font-mono font-bold text-zinc-500 hover:text-red-600 transition-colors cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {filteredCustomWords.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 border-2 border-dashed border-zinc-200 rounded-xl text-center gap-2">
                  <Sparkles className="w-6 h-6 text-zinc-400" />
                  <p className="text-xs font-mono font-bold text-zinc-600">
                    No custom words added yet.
                  </p>
                  <p className="text-[10px] font-mono text-zinc-400 max-w-xs">
                    Add specialized domain terms, Web3 jargon, brand names, or slang to include them in candidate anagrams.
                  </p>
                  {/* Quick Starter Suggestions */}
                  <div className="flex items-center gap-1 flex-wrap justify-center mt-1">
                    {['crypto', 'substack', 'solana', 'voxel', 'pixel'].map((sample) => (
                      <button
                        key={sample}
                        type="button"
                        onClick={() => {
                          onAddWord(sample);
                          if (onShowToast) onShowToast(`Added "${sample.toUpperCase()}"`, 'success');
                        }}
                        className="px-2 py-0.5 rounded border border-zinc-300 bg-zinc-50 hover:border-black hover:bg-zinc-100 text-[10px] font-mono font-semibold text-zinc-700 transition-colors cursor-pointer"
                      >
                        + {sample}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5 max-h-[220px] overflow-y-auto p-1 bg-zinc-50 rounded-lg border border-zinc-200">
                  {filteredCustomWords.map((word) => (
                    <div
                      key={word}
                      className="inline-flex items-center gap-1.5 px-2 py-1 bg-white border border-zinc-300 hover:border-black rounded-md shadow-2xs group"
                    >
                      <span className="text-xs font-mono font-bold uppercase text-black">
                        {word}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          onRemoveWord(word);
                          if (onShowToast) onShowToast(`Removed "${word.toUpperCase()}"`, 'info');
                        }}
                        className="text-zinc-400 group-hover:text-red-600 transition-colors cursor-pointer"
                        title={`Remove "${word}"`}
                        aria-label={`Remove ${word}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: BUILT-IN GLOBAL TLDS */}
        {activeTab === 'tlds' && (
          <div className="flex-1 flex flex-col p-3.5 sm:p-4 gap-2.5 overflow-y-auto">
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-mono font-bold text-black">
                {GLOBAL_TLDS.length} Global Country-Code (ccTLD) & Generic (gTLD) Extensions
              </span>
              <p className="text-[9.5px] font-mono text-zinc-500">
                All official IANA domains (e.g. .io, .ai, .com, .dev, .app, .xyz, .co, .me) are automatically bundled into the anagram engine.
              </p>
            </div>

            {/* Search TLDs */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search TLD (e.g. io, ai, com, tech, app)..."
                className="w-full pl-8 pr-3 py-2 bg-zinc-100 border border-zinc-300 rounded-lg text-base sm:text-xs font-mono text-black placeholder:text-zinc-400 focus:outline-none focus:border-black"
              />
            </div>

            {/* TLDs Grid */}
            <div className="flex-1 min-h-[160px] max-h-[260px] overflow-y-auto p-1.5 bg-zinc-50 rounded-lg border border-zinc-200">
              <div className="flex flex-wrap gap-1">
                {filteredTLDs.map((tld) => {
                  const cat = getTLDCategory(tld);
                  return (
                    <span
                      key={tld}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white border border-zinc-200 rounded text-[10.5px] font-mono font-bold text-zinc-800"
                    >
                      <span className="text-zinc-400 font-normal">.</span>
                      <span>{tld}</span>
                      {cat === 'tech' && (
                        <span className="text-[7px] font-mono bg-zinc-100 text-zinc-600 px-1 rounded">
                          tech
                        </span>
                      )}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-3.5 py-2.5 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between">
          <span className="text-[9.5px] font-mono text-zinc-500">
            Saved locally in browser localStorage
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 bg-black text-white rounded-md text-xs font-mono font-bold uppercase cursor-pointer hover:bg-zinc-800 transition-colors shadow-2xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
