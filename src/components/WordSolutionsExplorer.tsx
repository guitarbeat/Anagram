import React, { useMemo } from 'react';
import { Sparkles, Play, Zap, ArrowRight, Layers, Flame, Trophy, Globe } from 'lucide-react';
import type { AnagramResult, FinisherPair, WebsiteSolution } from '../engine/types';
import { getTLDCategory, getTLDQualityScore } from '../engine/tlds';
import { findProgressiveCompletions, type ProgressiveCompletion } from '../engine/progressiveSolver';
import { getBlobBorderRadius } from '../utils/blobStyle';
import { triggerHaptic } from '../hooks/useHaptics';

export interface WordSolutionsExplorerProps {
  exactClosers?: string[];
  finisherPairs?: FinisherPair[];
  websiteSolutions?: WebsiteSolution[];
  completeSolutions?: AnagramResult[];
  isSolvingSolutions?: boolean;
  onAddWordToTarget: (word: string) => void;
  onSetWordAsTarget: (word: string) => void;
  onShowToast: (text: string, type?: 'success' | 'info' | 'error') => void;
  sourceText?: string;
  targetPhrase?: string;
  remainingLetters?: string[];
  hoveredWord?: string | null;
  postHoverCounts?: Uint8Array | null;
  onHoverWordChange?: (word: string | null) => void;
}

export const WordSolutionsExplorer: React.FC<WordSolutionsExplorerProps> = ({
  exactClosers = [],
  finisherPairs = [],
  websiteSolutions = [],
  completeSolutions = [],
  isSolvingSolutions = false,
  onAddWordToTarget,
  onSetWordAsTarget,
  onShowToast,
  sourceText = '',
  targetPhrase = '',
  remainingLetters = [],
  hoveredWord = null,
  postHoverCounts = null,
  onHoverWordChange,
}) => {
  const hasPartialTarget = Boolean(targetPhrase.trim() && remainingLetters.length > 0);
  const targetWords = useMemo(
    () => targetPhrase.trim().split(/\s+/).filter(Boolean),
    [targetPhrase]
  );
  const targetWordsSet = useMemo(
    () => new Set(targetWords.map((w) => w.toLowerCase())),
    [targetWords]
  );

  const cleanHoveredWord = useMemo(
    () => (hoveredWord ? hoveredWord.toLowerCase().replace(/[^a-z]/g, '') : ''),
    [hoveredWord]
  );

  // Check if a solution or word set is compatible with the currently hovered word
  const isSolutionCompatibleWithHover = (words: string[], rawText?: string): boolean => {
    if (!cleanHoveredWord) return true;
    // 1. Solution directly contains the hovered word as one of its constituent words
    for (let i = 0; i < words.length; i++) {
      if (words[i].toLowerCase().replace(/[^a-z]/g, '') === cleanHoveredWord) {
        return true;
      }
    }
    // 2. Or all letters of the solution fit within the remaining letter budget after subtracting hoveredWord
    if (postHoverCounts) {
      const textToTest = (rawText ?? words.join('')).toLowerCase().replace(/[^a-z]/g, '');
      if (!textToTest) return false;
      const counts = new Uint8Array(26);
      for (let i = 0; i < textToTest.length; i++) {
        const code = textToTest.charCodeAt(i) - 97;
        counts[code]++;
        if (counts[code] > postHoverCounts[code]) {
          return false;
        }
      }
      return true;
    }
    return false;
  };

  // Combine real-time delta websiteSolutions with full-solver website URLs
  const allWebsiteSolutions = useMemo(() => {
    const map = new Map<string, WebsiteSolution & { isFullPhrase?: boolean }>();

    for (const site of websiteSolutions) {
      const key = site.url.toLowerCase();
      if (!map.has(key)) {
        map.set(key, { ...site, isFullPhrase: !hasPartialTarget });
      }
    }

    for (const sol of completeSolutions) {
      if (sol.websiteUrl) {
        const key = sol.websiteUrl.toLowerCase();
        if (!map.has(key)) {
          const dotParts = sol.websiteUrl.split('/')[0].split('.');
          const tld = dotParts[dotParts.length - 1] || 'com';
          map.set(key, {
            url: sol.websiteUrl,
            domain: sol.websiteUrl.split('/')[0],
            tld,
            tldCategory: getTLDCategory(tld),
            format: sol.websiteUrl.includes('/')
              ? 'url-path'
              : dotParts.length > 2
              ? 'subdomain'
              : 'domain',
            words: sol.words,
            score: sol.score + getTLDQualityScore(tld),
            isFullPhrase: true,
          });
        }
      }
    }

    const list = Array.from(map.values());
    list.sort((a, b) => b.score - a.score);
    return list;
  }, [websiteSolutions, completeSolutions, hasPartialTarget]);

  // Progressive completions for remaining unplaced letters (when user has typed partial phrase)
  const progressiveCompletions: ProgressiveCompletion[] = useMemo(() => {
    if (!remainingLetters || remainingLetters.length === 0 || !targetPhrase.trim()) {
      return [];
    }
    if (remainingLetters.length > 15) {
      return [];
    }
    try {
      return findProgressiveCompletions(sourceText, targetPhrase, remainingLetters, 16);
    } catch {
      return [];
    }
  }, [sourceText, targetPhrase, remainingLetters]);

  const handlePlaySolution = (phrase: string) => {
    triggerHaptic('success');
    onSetWordAsTarget(phrase);
    onShowToast(`Solved with "${phrase}"!`, 'success');
  };

  const handlePlayWebsite = (site: WebsiteSolution & { isFullPhrase?: boolean }) => {
    triggerHaptic('success');
    if (hasPartialTarget && !site.isFullPhrase) {
      const combined = `${targetPhrase.trim()} ${site.url.toUpperCase()}`;
      onSetWordAsTarget(combined);
      onShowToast(`Solved with "${combined}"!`, 'success');
    } else {
      onSetWordAsTarget(site.url.toUpperCase());
      onShowToast(`Solved with website "${site.url}"!`, 'success');
    }
  };

  const handleAppendSolution = (phrase: string) => {
    triggerHaptic('light');
    onAddWordToTarget(phrase);
    onShowToast(`Added "${phrase}"`, 'info');
  };

  const handlePlayOneWord = (word: string) => {
    triggerHaptic('success');
    if (hasPartialTarget) {
      onAddWordToTarget(word);
    } else {
      onSetWordAsTarget(word);
    }
    onShowToast(`Solved with 1-word win "${word}"!`, 'success');
  };

  const handlePlayPair = (pair: FinisherPair) => {
    triggerHaptic('success');
    const pairText = `${pair.word1} ${pair.word2}`;
    if (hasPartialTarget) {
      onAddWordToTarget(pairText);
    } else {
      onSetWordAsTarget(pairText);
    }
    onShowToast(`Solved with pair: "${pairText}"!`, 'success');
  };

  // Sort complete multi-word solutions by score
  const sortedSolutions = useMemo(() => {
    const list = [...completeSolutions];
    list.sort((a, b) => b.score - a.score);
    return list;
  }, [completeSolutions]);

  const totalExactSolutions =
    completeSolutions.length +
    allWebsiteSolutions.length +
    exactClosers.length +
    finisherPairs.length +
    progressiveCompletions.length;

  return (
    <div className="w-full h-full relative bg-white select-none flex flex-col p-3 overflow-hidden text-zinc-900">
      {/* Tethered to "Remix it" Header Banner when user has words in Remix It */}
      {hasPartialTarget && (
        <div className="mb-2.5 px-2.5 py-2 rounded-xl border-2 border-black bg-zinc-50 flex flex-wrap items-center justify-between gap-2 shrink-0 shadow-[2px_2px_0px_#000000]">
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            <span className="text-[9.5px] font-mono font-black uppercase tracking-wider text-zinc-500 shrink-0">
              Anchored to Remix:
            </span>
            {targetWords.map((w, idx) => (
              <span
                key={`${w}-${idx}`}
                className="px-1.5 py-0.5 rounded bg-black text-white font-mono text-[10px] font-black uppercase tracking-wider"
              >
                {w}
              </span>
            ))}
            <span className="text-zinc-400 font-mono text-xs font-bold">+</span>
            <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-zinc-300 bg-white font-mono text-[10px] font-bold text-zinc-800 uppercase tracking-widest">
              <span>{remainingLetters.join('')}</span>
              <span className="text-[9px] text-zinc-400 font-normal">
                ({remainingLetters.length}L left)
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onSetWordAsTarget('');
            }}
            className="px-2 py-0.5 rounded border border-zinc-300 bg-white hover:bg-black hover:text-white hover:border-black text-[9.5px] font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer shrink-0"
            title="Clear Remix it field to explore all un-anchored solutions"
          >
            Clear Remix
          </button>
        </div>
      )}

      {/* Main Solutions Surface - Pure content, zero toolbars */}
      <div className="flex-1 w-full min-h-0 overflow-y-auto space-y-4 pr-1">
        {/* Loading Banner when Engine is Searching */}
        {isSolvingSolutions && completeSolutions.length === 0 && allWebsiteSolutions.length === 0 && (
          <div className="w-full p-6 flex flex-col items-center justify-center text-center bg-zinc-50 border-2 border-black rounded-xl space-y-2">
            <Sparkles className="w-5 h-5 text-black animate-spin" />
            <span className="font-mono text-xs font-bold text-black">
              {hasPartialTarget
                ? `Finding exact completions for "${targetPhrase.trim().toUpperCase()}"...`
                : 'Exploring 270,000+ words & global domains for exact solutions...'}
            </span>
            <span className="font-mono text-[10px] text-zinc-600">
              {hasPartialTarget
                ? `Solving remaining ${remainingLetters.length} letters (${remainingLetters.join('')}) with 0 leftovers`
                : 'Matching every character with 0 leftovers'}
            </span>
          </div>
        )}

        {/* 1. Direct 1-Word Wins (Immediate 1-Click Closers) */}
        {exactClosers.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-black uppercase tracking-wider text-black flex items-center gap-1">
                <Trophy className="w-3 h-3 text-black" />
                {hasPartialTarget
                  ? `1-Word Remix Closers (${exactClosers.length})`
                  : `1-Word Direct Wins (${exactClosers.length})`}
              </span>
              <div className="flex-1 h-px bg-zinc-200" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {exactClosers.map((word) => {
                const isCompat = isSolutionCompatibleWithHover([word], word);
                return (
                  <button
                    key={word}
                    type="button"
                    draggable
                    onPointerEnter={() => onHoverWordChange?.(word)}
                    onPointerLeave={() => onHoverWordChange?.(null)}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', word);
                      e.dataTransfer.setData('application/x-anagram-word', word);
                      e.dataTransfer.effectAllowed = 'copy';
                    }}
                    onClick={() => handlePlayOneWord(word)}
                    style={{ borderRadius: getBlobBorderRadius(word, 'tile') }}
                    className={`p-2.5 border-2 border-black bg-black text-white hover:bg-zinc-800 flex flex-col items-center justify-center text-center cursor-grab active:cursor-grabbing transition-all duration-150 group ${
                      isCompat
                        ? 'opacity-100 shadow-[2px_2px_0px_#000000] hover:shadow-[3px_3px_0px_#000000] hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none'
                        : 'opacity-15 shadow-none'
                    }`}
                    title={
                      hasPartialTarget
                        ? `Click to complete "${targetPhrase.trim().toUpperCase()} ${word.toUpperCase()}"`
                        : `Click to play "${word.toUpperCase()}" or drag into Remix it`
                    }
                  >
                    <div className="flex items-center gap-1 flex-wrap justify-center">
                      <Sparkles className="w-3 h-3 text-white fill-white shrink-0" />
                      {hasPartialTarget && (
                        <span className="font-mono font-bold text-[10px] text-zinc-400 uppercase">
                          {targetPhrase.trim()} +
                        </span>
                      )}
                      <span className="font-mono font-black text-sm tracking-wider uppercase">
                        {word}
                      </span>
                    </div>
                    <span className="text-[9px] font-mono font-bold text-zinc-300 mt-0.5 uppercase tracking-widest">
                      {hasPartialTarget ? `Completes Remix · +${word.length}L` : `100% Match · ${word.length}L`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. Website & Domain Solutions (domain.tld, sub.domain.tld, domain.tld/path) */}
        {allWebsiteSolutions.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-black uppercase tracking-wider text-black flex items-center gap-1">
                <Globe className="w-3 h-3 text-black" />
                Website & Domain Solutions ({allWebsiteSolutions.length})
              </span>
              <div className="flex-1 h-px bg-zinc-200" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {allWebsiteSolutions.map((site) => {
                const isCompat = isSolutionCompatibleWithHover(site.words, site.url);
                return (
                  <div
                    key={site.url}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', site.url);
                      e.dataTransfer.setData('application/x-anagram-word', site.url);
                      e.dataTransfer.effectAllowed = 'copy';
                    }}
                    className={`p-3 border-2 bg-white hover:bg-zinc-50 rounded-xl flex flex-col justify-between gap-2 transition-all duration-150 group cursor-grab active:cursor-grabbing ${
                      isCompat
                        ? 'opacity-100 border-black shadow-[2px_2px_0px_#000000] hover:shadow-[3px_3px_0px_#000000] hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none'
                        : 'opacity-15 border-zinc-300 shadow-none'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 text-[9px] font-mono font-bold text-zinc-500 mb-1">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-black text-white font-extrabold uppercase tracking-wider">
                          <Globe className="w-2.5 h-2.5" />
                          .{site.tld}
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-zinc-100 border border-zinc-300 text-zinc-700 uppercase">
                          {site.format === 'url-path'
                            ? 'URL + PATH'
                            : site.format === 'domain-hack'
                            ? 'DOMAIN HACK'
                            : site.format === 'subdomain'
                            ? 'SUBDOMAIN'
                            : `${site.tldCategory} DOMAIN`}
                        </span>
                      </div>

                      {/* Formatted Website URL */}
                      <div className="font-mono font-black text-sm text-black tracking-wide leading-snug lowercase break-all">
                        {hasPartialTarget && !site.isFullPhrase ? (
                          <>
                            <span className="text-zinc-400 uppercase text-xs mr-1">
                              {targetPhrase.trim()} +
                            </span>
                            <span>{site.url}</span>
                          </>
                        ) : (
                          site.url
                        )}
                      </div>

                      {/* Constituent Words */}
                      <div className="flex flex-wrap items-center gap-1 mt-1.5">
                        {site.words.map((w, idx) => {
                          const isAnchoredWord =
                            (hasPartialTarget && targetWordsSet.has(w.toLowerCase())) ||
                            (Boolean(cleanHoveredWord) && w.toLowerCase() === cleanHoveredWord);
                          const isTldWord = w.toLowerCase() === site.tld.toLowerCase();
                          return (
                            <span
                              key={`${w}-${idx}`}
                              className={`px-1.5 py-0.5 rounded text-[9.5px] font-mono font-semibold ${
                                isAnchoredWord
                                  ? 'bg-black text-white font-black ring-1 ring-black'
                                  : isTldWord
                                  ? 'bg-zinc-900 text-white'
                                  : 'bg-zinc-100 text-zinc-700'
                              }`}
                            >
                              {isTldWord ? `.${w}` : w}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 pt-1 border-t border-zinc-100">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayWebsite(site);
                        }}
                        className="flex-1 py-1.5 px-2 bg-black hover:bg-zinc-800 text-white rounded-md text-[10px] font-mono font-black uppercase flex items-center justify-center gap-1 transition-transform active:scale-95 cursor-pointer shadow-2xs"
                        title={`Send "${site.url}" to Remix it`}
                      >
                        <Play className="w-2.5 h-2.5 fill-white" />
                        {hasPartialTarget ? 'Complete Remix' : 'Send to Remix'}
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAppendSolution(site.url);
                        }}
                        className="py-1.5 px-2.5 bg-zinc-100 hover:bg-zinc-200 text-black border border-zinc-300 rounded-md text-[10px] font-mono font-bold uppercase transition-transform active:scale-95 cursor-pointer"
                        title="Append website to Remix it"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. 2-Word Finisher Pairs */}
        {finisherPairs.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-black uppercase tracking-wider text-black flex items-center gap-1">
                <Layers className="w-3 h-3 text-black" />
                {hasPartialTarget
                  ? `2-Word Remix Finishers (${finisherPairs.length})`
                  : `2-Word Finishing Pairs (${finisherPairs.length})`}
              </span>
              <div className="flex-1 h-px bg-zinc-200" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {finisherPairs.map((pair) => {
                const isCompat = isSolutionCompatibleWithHover(
                  [pair.word1, pair.word2],
                  `${pair.word1}${pair.word2}`
                );
                return (
                  <button
                    key={`${pair.word1}-${pair.word2}`}
                    type="button"
                    draggable
                    onDragStart={(e) => {
                      const pairText = `${pair.word1} ${pair.word2}`;
                      e.dataTransfer.setData('text/plain', pairText);
                      e.dataTransfer.setData('application/x-anagram-word', pairText);
                      e.dataTransfer.effectAllowed = 'copy';
                    }}
                    onClick={() => handlePlayPair(pair)}
                    style={{
                      borderRadius: getBlobBorderRadius(`${pair.word1}-${pair.word2}`, 'compact'),
                    }}
                    className={`p-2 border-2 bg-white hover:bg-zinc-950 hover:text-white text-black flex items-center justify-between px-3 cursor-grab active:cursor-grabbing transition-all duration-150 group ${
                      isCompat
                        ? 'opacity-100 border-black shadow-[2px_2px_0px_#000000] hover:shadow-[3px_3px_0px_#000000] hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none'
                        : 'opacity-15 border-zinc-300 shadow-none'
                    }`}
                    title={
                      hasPartialTarget
                        ? `Click to complete "${targetPhrase.trim().toUpperCase()} ${pair.word1.toUpperCase()} ${pair.word2.toUpperCase()}"`
                        : `Click to play pair "${pair.word1.toUpperCase()} + ${pair.word2.toUpperCase()}" or drag into Remix it`
                    }
                  >
                    <div className="flex items-center gap-1.5 font-mono font-black text-xs tracking-wide uppercase flex-wrap">
                      {hasPartialTarget && (
                        <span className="text-zinc-400 group-hover:text-zinc-400 text-[10px] font-bold">
                          {targetPhrase.trim()} +
                        </span>
                      )}
                      <span
                        className={
                          cleanHoveredWord && pair.word1.toLowerCase() === cleanHoveredWord
                            ? 'underline decoration-2 underline-offset-2'
                            : ''
                        }
                      >
                        {pair.word1}
                      </span>
                      <span className="text-zinc-400 group-hover:text-zinc-500 text-[10px] font-normal">+</span>
                      <span
                        className={
                          cleanHoveredWord && pair.word2.toLowerCase() === cleanHoveredWord
                            ? 'underline decoration-2 underline-offset-2'
                            : ''
                        }
                      >
                        {pair.word2}
                      </span>
                    </div>
                    <span className="text-[9px] font-mono font-bold text-zinc-400 group-hover:text-zinc-300 shrink-0 ml-1">
                      {pair.word1.length + pair.word2.length}L
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. Progressive Sentence Completions (Matching unplaced remainder) */}
        {progressiveCompletions.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-black uppercase tracking-wider text-black flex items-center gap-1">
                <Zap className="w-3 h-3 text-black" />
                Finish Remix Sentence ({progressiveCompletions.length})
              </span>
              <div className="flex-1 h-px bg-zinc-200" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {progressiveCompletions.map((comp) => {
                const compWords = comp.phrase.split(/\s+/).filter(Boolean);
                const isCompat = isSolutionCompatibleWithHover(compWords, comp.phrase);
                return (
                  <div
                    key={comp.id}
                    className={`p-2.5 border-2 bg-zinc-50 rounded-lg flex items-center justify-between gap-2 transition-opacity duration-150 ${
                      isCompat ? 'opacity-100 border-black shadow-[2px_2px_0px_#000]' : 'opacity-15 border-zinc-300 shadow-none'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-1.5 py-0.2 rounded bg-black text-white text-[10px] font-mono font-bold uppercase">
                          {targetPhrase.trim()}
                        </span>
                        <ArrowRight className="w-2.5 h-2.5 text-zinc-400" />
                        <span className="font-mono font-black text-xs text-black uppercase tracking-wide">
                          +{comp.phrase}
                        </span>
                      </div>
                      <span className="text-[9px] font-mono text-zinc-500 block truncate mt-0.5">
                        Remix: {comp.fullPhrase}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handlePlaySolution(comp.fullPhrase)}
                      className="px-2.5 py-1 bg-black hover:bg-zinc-800 text-white rounded text-[10px] font-mono font-bold uppercase cursor-pointer shrink-0 transition-transform active:scale-95"
                      title="Complete Remix phrase"
                    >
                      Complete
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 5. Complete Exact Anagram Solutions (Full Multi-Word Solutions) */}
        {sortedSolutions.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-black uppercase tracking-wider text-black flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-black" />
                {hasPartialTarget
                  ? `Exact Anagrams with "${targetPhrase.trim().toUpperCase()}" (${sortedSolutions.length})`
                  : `Complete Exact Anagrams (${sortedSolutions.length})`}
              </span>
              <div className="flex-1 h-px bg-zinc-200" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {sortedSolutions.map((sol) => {
                const isCompat = isSolutionCompatibleWithHover(sol.words, sol.phrase);
                return (
                  <div
                    key={sol.phrase}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', sol.phrase);
                      e.dataTransfer.setData('application/x-anagram-word', sol.phrase);
                      e.dataTransfer.effectAllowed = 'copy';
                    }}
                    className={`p-3 border-2 bg-white hover:bg-zinc-50 rounded-xl flex flex-col justify-between gap-2.5 transition-all duration-150 group cursor-grab active:cursor-grabbing ${
                      isCompat
                        ? 'opacity-100 border-black shadow-[2px_2px_0px_#000000] hover:shadow-[3px_3px_0px_#000000] hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none'
                        : 'opacity-15 border-zinc-300 shadow-none'
                    }`}
                  >
                    <div>
                      {/* Header tags: word count & score */}
                      <div className="flex items-center justify-between gap-1 text-[9px] font-mono font-bold text-zinc-500 mb-1">
                        <span className="px-1.5 py-0.2 rounded bg-zinc-100 border border-zinc-300 text-zinc-700">
                          {sol.words.length} words
                        </span>
                        {sol.funninessScore >= 3.5 && (
                          <span className="flex items-center gap-0.5 text-black font-extrabold">
                            <Flame className="w-2.5 h-2.5 fill-black" /> Fun
                          </span>
                        )}
                        <span className="text-zinc-600 font-black">
                          Score {Math.round(sol.score)}
                        </span>
                      </div>

                      {/* The Full Anagram Phrase */}
                      <div className="font-mono font-black text-sm text-black tracking-wide leading-snug uppercase">
                        {sol.phrase}
                      </div>

                      {/* Optional Website Form Preview Pill */}
                      {sol.websiteUrl && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlaySolution(sol.websiteUrl!.toUpperCase());
                          }}
                          className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-700 text-white text-[9.5px] font-mono font-bold lowercase transition-colors cursor-pointer"
                          title={`Send website to Remix it: ${sol.websiteUrl}`}
                        >
                          <Globe className="w-2.5 h-2.5 shrink-0" />
                          <span>{sol.websiteUrl}</span>
                        </button>
                      )}

                      {/* Words breakdown chips (highlight words anchored in Remix it or currently hovered) */}
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {sol.words.map((w, wIdx) => {
                          const isAnchoredOrHovered =
                            (hasPartialTarget && targetWordsSet.has(w.toLowerCase())) ||
                            (Boolean(cleanHoveredWord) && w.toLowerCase() === cleanHoveredWord);
                          return (
                            <span
                              key={`${w}-${wIdx}`}
                              className={`px-1.5 py-0.5 rounded text-[9.5px] font-mono ${
                                isAnchoredOrHovered
                                  ? 'bg-black text-white font-black'
                                  : 'bg-zinc-100 font-semibold text-zinc-700'
                              }`}
                            >
                              {w}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Actions: Send to Remix / Complete Remix */}
                    <div className="flex items-center gap-1.5 pt-1 border-t border-zinc-100">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlaySolution(sol.phrase);
                        }}
                        className="flex-1 py-1.5 px-2 bg-black hover:bg-zinc-800 text-white rounded-md text-[10px] font-mono font-black uppercase flex items-center justify-center gap-1 transition-transform active:scale-95 cursor-pointer shadow-2xs"
                        title="Send full solution to Remix it"
                      >
                        <Play className="w-2.5 h-2.5 fill-white" />
                        {hasPartialTarget ? 'Complete Remix' : 'Send to Remix'}
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAppendSolution(sol.phrase);
                        }}
                        className="py-1.5 px-2.5 bg-zinc-100 hover:bg-zinc-200 text-black border border-zinc-300 rounded-md text-[10px] font-mono font-bold uppercase transition-transform active:scale-95 cursor-pointer"
                        title="Append to Remix it"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state: ONLY if zero solutions of any kind exist and not solving */}
        {!isSolvingSolutions && totalExactSolutions === 0 && (
          <div className="w-full h-full min-h-[200px] flex flex-col items-center justify-center text-zinc-400 p-8 text-center space-y-2">
            <span className="font-mono text-xs font-bold text-zinc-700 uppercase tracking-wide">
              {hasPartialTarget
                ? `No exact completions found for "${targetPhrase.trim().toUpperCase()}"`
                : 'No complete solutions found yet'}
            </span>
            <span className="font-mono text-[10.5px] text-zinc-400 max-w-sm">
              {hasPartialTarget
                ? `The remaining letters (${remainingLetters.join('')}) cannot form an exact dictionary word combination. Try removing a word from Remix it.`
                : 'Try typing or changing the source name, or place words to narrow down candidate letters.'}
            </span>
            {hasPartialTarget && (
              <button
                type="button"
                onClick={() => onSetWordAsTarget('')}
                className="mt-1 px-3 py-1 rounded-lg border-2 border-black bg-white hover:bg-black hover:text-white text-black font-mono text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer"
              >
                Reset Remix Field
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
