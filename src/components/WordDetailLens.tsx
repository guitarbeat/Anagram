import React, { useMemo, useState, useEffect } from 'react';
import type { CandidateWordItem, FinisherPair } from '../engine/types';
import { normalize, countsArray } from '../engine/solver';
import { pos } from '../engine/lexicon';
import { Sparkles, Plus, X, Layers, CheckCircle2, BookOpen, Volume2 } from 'lucide-react';

interface DefinitionEntry {
  phonetic?: string;
  meanings: {
    partOfSpeech: string;
    definitions: { definition: string; example?: string }[];
  }[];
}

export interface WordDetailLensProps {
  selectedWord: CandidateWordItem;
  sourceText: string;
  allCandidates: CandidateWordItem[];
  exactClosers?: string[];
  finisherPairs?: FinisherPair[];
  onAddWordToTarget: (word: string) => void;
  onSetWordAsTarget: (word: string) => void;
  onClose: () => void;
  onShowToast: (text: string, type?: 'success' | 'info' | 'error') => void;
  onSelectCompanionWord?: (word: CandidateWordItem) => void;
}

export const WordDetailLens: React.FC<WordDetailLensProps> = ({
  selectedWord,
  sourceText,
  allCandidates,
  exactClosers = [],
  finisherPairs = [],
  onAddWordToTarget,
  onSetWordAsTarget,
  onClose,
  onShowToast,
  onSelectCompanionWord,
}) => {
  const normWord = normalize(selectedWord.word);
  const normSource = normalize(sourceText);
  const wordPos = pos(selectedWord.word);

  // In-line dictionary definition state
  const [definition, setDefinition] = useState<DefinitionEntry | null>(null);
  const [isDefLoading, setIsDefLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchDef = async () => {
      setIsDefLoading(true);
      setDefinition(null);
      try {
        const res = await fetch(
          `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(normWord)}`
        );
        if (res.ok) {
          const data = await res.json();
          if (isMounted && Array.isArray(data) && data.length > 0) {
            setDefinition({
              phonetic: data[0].phonetic || (data[0].phonetics && data[0].phonetics[0]?.text),
              meanings: data[0].meanings || [],
            });
          }
        }
      } catch {
        // Network or CORS failure: gracefully fall back to local analysis
      } finally {
        if (isMounted) setIsDefLoading(false);
      }
    };

    fetchDef();
    return () => {
      isMounted = false;
    };
  }, [normWord]);

  // Compute letter subtraction
  const { consumedLetters, remainingLetters, remainingCounts, remainingLength } = useMemo(() => {
    const sCounts = countsArray(normSource);
    const wCounts = countsArray(normWord);

    const consumed: string[] = [];
    for (const char of normWord) {
      consumed.push(char.toUpperCase());
    }

    const remCounts = new Uint8Array(26);
    const remList: string[] = [];
    let remLen = 0;

    for (let i = 0; i < 26; i++) {
      const left = Math.max(0, sCounts[i] - wCounts[i]);
      remCounts[i] = left;
      remLen += left;
      const letter = String.fromCharCode(65 + i);
      for (let j = 0; j < left; j++) {
        remList.push(letter);
      }
    }

    return {
      consumedLetters: consumed,
      remainingLetters: remList.sort(),
      remainingCounts: remCounts,
      remainingLength: remLen,
    };
  }, [normSource, normWord]);

  // Is this word an exact 1-word anagram closer?
  const isExactCloser = useMemo(() => {
    return (
      remainingLength === 0 ||
      exactClosers.some((w) => w.toUpperCase() === selectedWord.word.toUpperCase())
    );
  }, [remainingLength, exactClosers, selectedWord.word]);

  // Find companion words and exact 2-word partner finishes
  const { partnerFinishes, companionWords } = useMemo(() => {
    const partners: CandidateWordItem[] = [];
    const companions: CandidateWordItem[] = [];

    if (remainingLength === 0) {
      return { partnerFinishes: partners, companionWords: companions };
    }

    // Also check precomputed finisher pairs
    const upperWord = selectedWord.word.toUpperCase();
    const knownPartners = new Set<string>();
    for (const pair of finisherPairs) {
      if (pair.word1.toUpperCase() === upperWord) knownPartners.add(pair.word2.toUpperCase());
      if (pair.word2.toUpperCase() === upperWord) knownPartners.add(pair.word1.toUpperCase());
    }

    for (const cand of allCandidates) {
      if (cand.word.toUpperCase() === upperWord) continue;

      const cNorm = normalize(cand.word);
      const cCounts = countsArray(cNorm);

      let canFit = true;
      for (let i = 0; i < 26; i++) {
        if (cCounts[i] > remainingCounts[i]) {
          canFit = false;
          break;
        }
      }

      if (canFit) {
        if (cNorm.length === remainingLength || knownPartners.has(cand.word.toUpperCase())) {
          partners.push(cand);
        } else {
          companions.push(cand);
        }
      }
    }

    // Sort partners and companions by length and frequency
    partners.sort((a, b) => (b.freq || 0) - (a.freq || 0));
    companions.sort((a, b) => b.length - a.length || (b.freq || 0) - (a.freq || 0));

    return { partnerFinishes: partners, companionWords: companions.slice(0, 16) };
  }, [remainingLength, remainingCounts, allCandidates, selectedWord.word, finisherPairs]);

  const handleAdd = () => {
    onAddWordToTarget(selectedWord.word);
    onShowToast(`Added "${selectedWord.word}" to sentence`, 'success');
  };

  const handleSetTarget = () => {
    onAddWordToTarget(selectedWord.word);
    onShowToast(`Added "${selectedWord.word}" to sentence`, 'success');
  };

  const handleAddPair = (partnerWord: string) => {
    const combined = `${selectedWord.word} ${partnerWord}`;
    onAddWordToTarget(combined);
    onShowToast(`Added pair "${combined.toUpperCase()}" to sentence!`, 'success');
  };

  return (
    <div className="w-full h-full flex flex-row bg-white overflow-hidden text-zinc-900 select-none animate-in fade-in duration-150">
      {/* Scrollable Lens Content */}
      <div className="flex-1 h-full min-w-0 min-h-0 overflow-y-auto p-3 space-y-3">
        {/* HERO WORD CARD */}
        <div className="p-3.5 bg-white border-2 border-black rounded-xl shadow-xs">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-baseline gap-2">
                <span
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', selectedWord.word);
                    e.dataTransfer.setData('application/x-anagram-word', selectedWord.word);
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  title="Drag word into target phrase"
                  className="font-mono text-2xl sm:text-3xl font-black uppercase tracking-tight text-black cursor-grab active:cursor-grabbing hover:opacity-80 transition-opacity"
                >
                  {selectedWord.word}
                </span>
                {isExactCloser && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-black bg-amber-300 text-black border border-black uppercase tracking-wide">
                    <Sparkles className="w-3 h-3 text-amber-900 fill-amber-500" />
                    Exact Closer
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                {definition?.phonetic && (
                  <>
                    <span className="font-mono text-[11px] font-bold text-zinc-500">
                      {definition.phonetic}
                    </span>
                    <span className="text-zinc-300">·</span>
                  </>
                )}
                <span className="font-mono text-[11px] font-bold text-zinc-500 uppercase">
                  {wordPos ? wordPos.toUpperCase() : 'WORD'}
                </span>
                <span className="text-zinc-300">·</span>
                <span className="font-mono text-[11px] text-zinc-500">
                  {selectedWord.length} Letters
                </span>
                <span className="text-zinc-300">·</span>
                <span className="font-mono text-[11px] text-zinc-500">
                  {Math.round((selectedWord.freq || 0.5) * 100)}% Familiarity
                </span>
              </div>
              <div className="text-[10px] font-mono text-zinc-400 mt-2 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-300" />
                <span>Clicking words adds them to your sentence</span>
              </div>
            </div>

            {/* Quick Action Button */}
            <div className="flex flex-col gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleAdd}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white hover:bg-zinc-800 text-xs font-mono font-bold uppercase rounded-lg border border-black shadow-xs cursor-pointer transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-black focus-visible:outline-hidden touch-manipulation"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Word</span>
              </button>
            </div>
          </div>
        </div>

        {/* LETTER CONSUMPTION MATRIX */}
        <div className="p-3 bg-zinc-50 border-2 border-black rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[11px] font-bold text-zinc-600 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-zinc-700" />
              Letter Impact
            </span>
            <span className="font-mono text-[11px] font-bold text-zinc-800">
              {remainingLength === 0 ? 'Exact Match!' : `${remainingLength} Letters Remaining`}
            </span>
          </div>

          <div className="space-y-2">
            {/* Consumed Letters */}
            <div>
              <div className="text-[10px] font-mono text-zinc-400 font-bold uppercase mb-1">
                Consumes:
              </div>
              <div className="flex flex-wrap gap-1">
                {consumedLetters.map((letter, idx) => (
                  <span
                    key={`${letter}-${idx}`}
                    className="w-6 h-6 rounded flex items-center justify-center font-mono font-black text-xs bg-black text-white border border-black"
                  >
                    {letter}
                  </span>
                ))}
              </div>
            </div>

            {/* Remaining Letters */}
            {remainingLength > 0 && (
              <div>
                <div className="text-[10px] font-mono text-zinc-400 font-bold uppercase mb-1">
                  Leaves behind:
                </div>
                <div className="flex flex-wrap gap-1">
                  {remainingLetters.map((letter, idx) => (
                    <span
                      key={`${letter}-${idx}`}
                      className="w-6 h-6 rounded flex items-center justify-center font-mono font-bold text-xs bg-white text-zinc-900 border border-zinc-400 shadow-2xs"
                    >
                      {letter}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* WINNING 2-WORD PARTNERS */}
        {partnerFinishes.length > 0 && (
          <div className="p-3 bg-amber-50/80 border-2 border-black rounded-xl">
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-700 fill-amber-400" />
              <span className="font-mono text-[11px] font-black uppercase tracking-wider text-amber-950">
                Winning Finisher Pairs ({partnerFinishes.length})
              </span>
            </div>
            <p className="text-[11px] text-amber-900 font-mono mb-2">
              Combine with any partner below to solve the entire anagram:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {partnerFinishes.map((partner) => (
                <button
                  key={partner.word}
                  type="button"
                  draggable
                  onDragStart={(e) => {
                    const pairText = `${selectedWord.word} ${partner.word}`;
                    e.dataTransfer.setData('text/plain', pairText);
                    e.dataTransfer.setData('application/x-anagram-word', pairText);
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  onClick={() => handleAddPair(partner.word)}
                  className="px-2.5 py-1 bg-amber-300 hover:bg-amber-400 text-black border-2 border-black rounded-lg font-mono font-black text-xs tracking-wide cursor-grab active:cursor-grabbing transition-all flex items-center gap-1 active:scale-95 shadow-2xs focus-visible:ring-2 focus-visible:ring-black focus-visible:outline-hidden touch-manipulation"
                  title={`Solve puzzle with: ${selectedWord.word.toUpperCase()} + ${partner.word.toUpperCase()} (Click or drag)`}
                >
                  <span>+ {partner.word}</span>
                  <CheckCircle2 className="w-3 h-3 text-black" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* COMPANION WORDS (CAN BE PLAYED NEXT) */}
        {remainingLength > 0 && (
          <div className="p-3 bg-white border-2 border-black rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[11px] font-bold text-zinc-700 uppercase tracking-wider">
                Companion Words ({companionWords.length})
              </span>
              <span className="text-[10px] font-mono text-zinc-400">Can be played next</span>
            </div>
            {companionWords.length === 0 ? (
              <p className="font-mono text-xs text-zinc-400 italic">
                No sub-words found in remaining letters.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {companionWords.map((comp) => (
                  <button
                    key={comp.word}
                    type="button"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', comp.word);
                      e.dataTransfer.setData('application/x-anagram-word', comp.word);
                      e.dataTransfer.effectAllowed = 'copy';
                    }}
                    onClick={() => {
                      if (onSelectCompanionWord) onSelectCompanionWord(comp);
                      else onAddWordToTarget(comp.word);
                    }}
                    className="px-2 py-1 bg-zinc-100 hover:bg-black hover:text-white text-zinc-800 border border-black rounded-md font-mono text-xs font-bold tracking-wide cursor-grab active:cursor-grabbing transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-black focus-visible:outline-hidden touch-manipulation"
                    title={`Click to inspect or drag & drop: ${comp.word.toUpperCase()}`}
                  >
                    {comp.word}
                    <span className="text-[9px] opacity-60 ml-1">({comp.length}L)</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* IN-LINE DICTIONARY DEFINITION */}
        <div className="p-3 bg-white border-2 border-black rounded-xl">
          <div className="flex items-center gap-1.5 mb-2">
            <BookOpen className="w-3.5 h-3.5 text-zinc-700" />
            <span className="font-mono text-[11px] font-bold text-zinc-700 uppercase tracking-wider">
              Dictionary Definition
            </span>
          </div>

          {isDefLoading ? (
            <div className="py-2 text-xs font-mono text-zinc-400 animate-pulse">
              Looking up definition...
            </div>
          ) : definition && definition.meanings.length > 0 ? (
            <div className="space-y-2">
              {definition.meanings.slice(0, 2).map((meaning, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="font-mono text-[10px] font-bold text-zinc-500 uppercase">
                    {meaning.partOfSpeech}
                  </div>
                  {meaning.definitions.slice(0, 2).map((def, defIdx) => (
                    <div key={defIdx} className="text-xs text-zinc-800 font-sans leading-relaxed">
                      <span className="font-mono font-bold text-zinc-400 mr-1.5">
                        {defIdx + 1}.
                      </span>
                      {def.definition}
                      {def.example && (
                        <div className="text-[11px] text-zinc-500 italic mt-0.5 ml-4">
                          "{def.example}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-zinc-600 font-sans leading-relaxed">
              <p>
                A valid {selectedWord.length}-letter English word (
                <span className="font-mono font-bold">{wordPos || 'general lexicon'}</span>).
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Right-Side Vertical Sidebar Rail */}
      <div className="w-11 sm:w-12 shrink-0 bg-zinc-50 border-l-2 border-black flex flex-col items-center justify-between py-2.5 px-1 select-none z-10">
        <button
          type="button"
          onClick={onClose}
          className="w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-[3px] bg-black text-white hover:bg-zinc-800 transition-all cursor-pointer flex items-center justify-center shadow-2xs active:scale-90"
          title="Return to Lexical Statistics (Esc)"
        >
          <X className="w-4 h-4 text-white" />
        </button>

        <div className="w-full flex flex-col items-center justify-center gap-0.5 py-1.5 px-0.5 bg-white border border-zinc-300 rounded-md shadow-2xs">
          <span className="font-mono text-[9.5px] sm:text-[10px] font-black text-black tabular-nums leading-none">
            {selectedWord.length}L
          </span>
          <span className="text-[7.5px] font-mono font-bold uppercase text-zinc-400 tracking-tighter leading-none">
            WORD
          </span>
        </div>
      </div>
    </div>
  );
};
