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
  isHoverPreview?: boolean;
  sourceText: string;
  activeRemainingLetters?: string[];
  allCandidates: CandidateWordItem[];
  exactClosers?: string[];
  finisherPairs?: FinisherPair[];
  compatibleData?: {
    compatibleLengthCounts?: Record<number, number>;
    compatiblePosCounts?: Record<string, number>;
  } | null;
  onAddWordToTarget: (word: string) => void;
  onSetWordAsTarget: (word: string) => void;
  onClose: () => void;
  onShowToast: (text: string, type?: 'success' | 'info' | 'error') => void;
  onSelectCompanionWord?: (word: CandidateWordItem) => void;
}

export const WordDetailLens: React.FC<WordDetailLensProps> = ({
  selectedWord,
  isHoverPreview = false,
  sourceText,
  activeRemainingLetters,
  allCandidates,
  exactClosers = [],
  finisherPairs = [],
  compatibleData,
  onAddWordToTarget,
  onClose,
  onShowToast,
  onSelectCompanionWord,
}) => {
  const normWord = normalize(selectedWord.word);
  const normSource = normalize(sourceText);
  const wordPos = pos(selectedWord.word);

  // In-line dictionary definition state (debounced on hover so fast graph scrubbing stays 60fps)
  const [definition, setDefinition] = useState<DefinitionEntry | null>(null);
  const [isDefLoading, setIsDefLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const delayMs = isHoverPreview ? 220 : 0;
    const timer = setTimeout(async () => {
      if (!isMounted) return;
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
    }, delayMs);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [normWord, isHoverPreview]);

  // Compute letter subtraction against active remaining letter pool (or sourceText if none)
  const { consumedLetters, remainingLetters, remainingCounts, remainingLength } = useMemo(() => {
    const poolStr =
      activeRemainingLetters && activeRemainingLetters.length > 0
        ? activeRemainingLetters.join('')
        : normSource;
    const sCounts = countsArray(normalize(poolStr));
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
  }, [activeRemainingLetters, normSource, normWord]);

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

    return { partnerFinishes: partners, companionWords: companions.slice(0, 18) };
  }, [remainingLength, remainingCounts, allCandidates, selectedWord.word, finisherPairs]);

  const handleAdd = () => {
    onAddWordToTarget(selectedWord.word);
    onShowToast(`Added "${selectedWord.word}" to sentence`, 'success');
  };

  const handleAddPair = (partnerWord: string) => {
    const combined = `${selectedWord.word} ${partnerWord}`;
    onAddWordToTarget(combined);
    onShowToast(`Added pair "${combined.toUpperCase()}" to sentence!`, 'success');
  };

  const compatibleLengthEntries = useMemo(() => {
    if (!compatibleData?.compatibleLengthCounts) return [];
    return Object.entries(compatibleData.compatibleLengthCounts)
      .map(([len, count]) => ({ length: Number(len), count }))
      .filter((item) => item.count > 0)
      .sort((a, b) => b.length - a.length);
  }, [compatibleData]);

  const compatiblePosEntries = useMemo(() => {
    if (!compatibleData?.compatiblePosCounts) return [];
    return Object.entries(compatibleData.compatiblePosCounts)
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1]);
  }, [compatibleData]);

  return (
    <div className="w-full h-full flex flex-col bg-white overflow-hidden text-zinc-900 select-none">
      {/* Scrollable Lens Content */}
      <div className="flex-1 h-full min-w-0 min-h-0 overflow-y-auto p-3 space-y-2.5">
        {/* HERO WORD CARD */}
        <div className="p-3 bg-white border-2 border-black rounded-xl shadow-xs">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
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
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-black text-white uppercase tracking-wide">
                    <Sparkles className="w-3 h-3 text-white fill-white" />
                    1-Word Win
                  </span>
                )}
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
                  {isHoverPreview ? '· Hover Preview' : '· Pinned'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                {definition?.phonetic && (
                  <>
                    <span className="font-mono text-[11px] font-bold text-zinc-500">
                      {definition.phonetic}
                    </span>
                    <span className="text-zinc-300">·</span>
                  </>
                )}
                <span className="font-mono text-[11px] font-bold text-zinc-600 uppercase">
                  {wordPos ? wordPos.toUpperCase() : 'WORD'}
                </span>
                <span className="text-zinc-300">·</span>
                <span className="font-mono text-[11px] text-zinc-500 tabular-nums">
                  {selectedWord.length} Letters
                </span>
                <span className="text-zinc-300">·</span>
                <span className="font-mono text-[11px] text-zinc-500 tabular-nums">
                  {remainingLength === 0 ? '0 Left' : `${remainingLength} Left`}
                </span>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleAdd}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-black text-white hover:bg-zinc-800 text-xs font-mono font-bold uppercase rounded-lg border border-black shadow-xs cursor-pointer transition-all active:scale-95 whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
              {!isHoverPreview && (
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-lg bg-zinc-100 hover:bg-black text-zinc-700 hover:text-white border border-zinc-300 hover:border-black transition-colors cursor-pointer"
                  title="Unpin word and return to overview (Esc)"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* WINNING 2-WORD PARTNERS (Elevated to top when available!) */}
        {partnerFinishes.length > 0 && (
          <div className="p-3 bg-zinc-50 border-2 border-black rounded-xl">
            <div className="flex items-center justify-between gap-1.5 mb-1.5">
              <span className="font-mono text-[11px] font-black uppercase tracking-wider text-black flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-black fill-black" />
                Exact Partner Finishes ({partnerFinishes.length})
              </span>
              <span className="text-[10px] font-mono text-zinc-500">Solves puzzle</span>
            </div>
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
                  className="px-2.5 py-1 bg-black hover:bg-zinc-800 text-white border border-black rounded-lg font-mono font-black text-xs tracking-wide cursor-pointer transition-all flex items-center gap-1 active:scale-95 shadow-2xs"
                  title={`Solve with: ${selectedWord.word.toUpperCase()} + ${partner.word.toUpperCase()}`}
                >
                  <span>+ {partner.word}</span>
                  <CheckCircle2 className="w-3 h-3 text-white" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* COMPANION WORDS (CAN BE PLAYED NEXT) */}
        {remainingLength > 0 && (
          <div className="p-3 bg-white border-2 border-black rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[11px] font-bold text-zinc-800 uppercase tracking-wider">
                Compatible Follow-Ups ({companionWords.length})
              </span>
              <span className="text-[10px] font-mono text-zinc-400">Fits remaining letters</span>
            </div>
            {companionWords.length === 0 ? (
              <p className="font-mono text-xs text-zinc-400 italic">
                No follow-up words fit the remaining {remainingLength} letters.
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
                      onAddWordToTarget(`${selectedWord.word} ${comp.word}`);
                      onShowToast(
                        `Added "${selectedWord.word.toUpperCase()} ${comp.word.toUpperCase()}"`,
                        'success'
                      );
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      if (onSelectCompanionWord) onSelectCompanionWord(comp);
                    }}
                    className="px-2 py-1 bg-zinc-100 hover:bg-black hover:text-white text-zinc-900 border border-black rounded-md font-mono text-xs font-bold tracking-wide cursor-pointer transition-all active:scale-95"
                    title={`Click to add "${selectedWord.word} + ${comp.word}" · Right-click to inspect "${comp.word}"`}
                  >
                    +{comp.word}
                    <span className="text-[9px] opacity-60 ml-1 tabular-nums">{comp.length}L</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* LETTER IMPACT & REMAINING STATS */}
        <div className="p-3 bg-zinc-50 border-2 border-black rounded-xl space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-bold text-zinc-700 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-zinc-700" />
              Remaining Pool & Stats
            </span>
            <span className="font-mono text-[11px] font-bold text-zinc-900 tabular-nums">
              {remainingLength === 0 ? 'All Letters Used' : `${remainingLength} Letters Left`}
            </span>
          </div>

          {remainingLength > 0 && (
            <div className="flex flex-wrap gap-1">
              {remainingLetters.map((letter, idx) => (
                <span
                  key={`${letter}-${idx}`}
                  className="w-6 h-6 rounded flex items-center justify-center font-mono font-bold text-xs bg-white text-zinc-900 border border-black shadow-2xs"
                >
                  {letter}
                </span>
              ))}
            </div>
          )}

          {/* Compact Compatible Length & POS Breakdown */}
          {(compatibleLengthEntries.length > 0 || compatiblePosEntries.length > 0) && (
            <div className="pt-2 border-t border-zinc-200 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10.5px] font-mono">
              {compatibleLengthEntries.length > 0 && (
                <div>
                  <div className="text-[9.5px] font-bold uppercase text-zinc-400 mb-1">
                    Compatible by Length
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-zinc-700">
                    {compatibleLengthEntries.map((item, idx) => (
                      <React.Fragment key={item.length}>
                        {idx > 0 && <span className="text-zinc-300">·</span>}
                        <span className="tabular-nums">
                          <strong className="text-black">{item.length}L</strong> ({item.count})
                        </span>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}
              {compatiblePosEntries.length > 0 && (
                <div>
                  <div className="text-[9.5px] font-bold uppercase text-zinc-400 mb-1">
                    Compatible by Speech
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-zinc-700">
                    {compatiblePosEntries.map(([posKey, count], idx) => (
                      <React.Fragment key={posKey}>
                        {idx > 0 && <span className="text-zinc-300">·</span>}
                        <span className="tabular-nums uppercase">
                          <strong className="text-black">{posKey}</strong> ({count})
                        </span>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* IN-LINE DICTIONARY DEFINITION */}
        <div className="p-3 bg-white border-2 border-black rounded-xl">
          <div className="flex items-center gap-1.5 mb-1.5">
            <BookOpen className="w-3.5 h-3.5 text-zinc-700" />
            <span className="font-mono text-[11px] font-bold text-zinc-700 uppercase tracking-wider">
              Definition
            </span>
          </div>

          {isDefLoading ? (
            <div className="py-1 text-xs font-mono text-zinc-400">
              Loading definition...
            </div>
          ) : definition && definition.meanings.length > 0 ? (
            <div className="space-y-1.5">
              {definition.meanings.slice(0, 2).map((meaning, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="font-mono text-[10px] font-bold text-zinc-500 uppercase">
                    {meaning.partOfSpeech}
                  </div>
                  {meaning.definitions.slice(0, 2).map((def, defIdx) => (
                    <div key={defIdx} className="text-xs text-zinc-800 font-sans leading-relaxed">
                      <span className="font-mono font-bold text-zinc-400 mr-1.5">
                        {defIdx + 1}.
                      </span>
                      {def.definition}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-zinc-600 font-sans leading-relaxed">
              Valid {selectedWord.length}-letter English word (
              <span className="font-mono font-bold">{wordPos || 'lexicon'}</span>).
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

