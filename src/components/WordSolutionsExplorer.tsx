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
}) => {
  const hasPartialTarget = Boolean(targetPhrase.trim() && remainingLetters.length > 0);

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
      {/* Main Solutions Surface - Pure content, zero toolbars */}
      <div className="flex-1 w-full min-h-0 overflow-y-auto space-y-4 pr-1">
        {/* Loading Banner when Engine is Searching */}
        {isSolvingSolutions && completeSolutions.length === 0 && allWebsiteSolutions.length === 0 && (
          <div className="w-full p-6 flex flex-col items-center justify-center text-center bg-zinc-50 border-2 border-black rounded-xl space-y-2">
            <Sparkles className="w-5 h-5 text-black animate-spin" />
            <span className="font-mono text-xs font-bold text-black">
              Exploring 270,000+ words & global domains for exact solutions...
            </span>
            <span className="font-mono text-[10px] text-zinc-600">
              Matching every character with 0 leftovers
            </span>
          </div>
        )}

        {/* 1. Direct 1-Word Wins (Immediate 1-Click Closers) */}
        {exactClosers.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-black uppercase tracking-wider text-black flex items-center gap-1">
                <Trophy className="w-3 h-3 text-black" />
                1-Word Direct Wins ({exactClosers.length})
              </span>
              <div className="flex-1 h-px bg-zinc-200" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {exactClosers.map((word) => (
                <button
                  key={word}
                  type="button"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', word);
                    e.dataTransfer.setData('application/x-anagram-word', word);
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  onClick={() => handlePlayOneWord(word)}
                  style={{ borderRadius: getBlobBorderRadius(word, 'tile') }}
                  className="p-2.5 border-2 border-black bg-black text-white hover:bg-zinc-800 flex flex-col items-center justify-center text-center cursor-grab active:cursor-grabbing transition-all duration-75 shadow-[2px_2px_0px_#000000] hover:shadow-[3px_3px_0px_#000000] hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none group"
                  title={`Click to play "${word.toUpperCase()}" or drag into sentence`}
                >
                  <div className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-white fill-white" />
                    <span className="font-mono font-black text-sm tracking-wider uppercase">
                      {word}
                    </span>
                  </div>
                  <span className="text-[9px] font-mono font-bold text-zinc-300 mt-0.5 uppercase tracking-widest">
                    100% Match · {word.length}L
                  </span>
                </button>
              ))}
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
              {allWebsiteSolutions.map((site) => (
                <div
                  key={site.url}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', site.url);
                    e.dataTransfer.setData('application/x-anagram-word', site.url);
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  className="p-3 border-2 border-black bg-white hover:bg-zinc-50 rounded-xl flex flex-col justify-between gap-2 transition-all duration-75 shadow-[2px_2px_0px_#000000] hover:shadow-[3px_3px_0px_#000000] hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none group cursor-grab active:cursor-grabbing"
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
                      {site.url}
                    </div>

                    {/* Constituent Words */}
                    <div className="flex flex-wrap items-center gap-1 mt-1.5">
                      {site.words.map((w, idx) => (
                        <span
                          key={`${w}-${idx}`}
                          className={`px-1.5 py-0.5 rounded text-[9.5px] font-mono font-semibold ${
                            w.toLowerCase() === site.tld.toLowerCase()
                              ? 'bg-zinc-900 text-white'
                              : 'bg-zinc-100 text-zinc-700'
                          }`}
                        >
                          {w.toLowerCase() === site.tld.toLowerCase() ? `.${w}` : w}
                        </span>
                      ))}
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
                      title={`Set "${site.url}" as target solution`}
                    >
                      <Play className="w-2.5 h-2.5 fill-white" />
                      Solve Website
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAppendSolution(site.url);
                      }}
                      className="py-1.5 px-2.5 bg-zinc-100 hover:bg-zinc-200 text-black border border-zinc-300 rounded-md text-[10px] font-mono font-bold uppercase transition-transform active:scale-95 cursor-pointer"
                      title="Append website to sentence"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. 2-Word Finisher Pairs */}
        {finisherPairs.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-black uppercase tracking-wider text-black flex items-center gap-1">
                <Layers className="w-3 h-3 text-black" />
                2-Word Finishing Pairs ({finisherPairs.length})
              </span>
              <div className="flex-1 h-px bg-zinc-200" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {finisherPairs.map((pair) => (
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
                  className="p-2 border-2 border-black bg-white hover:bg-zinc-950 hover:text-white text-black flex items-center justify-between px-3 cursor-grab active:cursor-grabbing transition-all duration-75 shadow-[2px_2px_0px_#000000] hover:shadow-[3px_3px_0px_#000000] hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none group"
                  title={`Click to play pair "${pair.word1.toUpperCase()} + ${pair.word2.toUpperCase()}" or drag into sentence`}
                >
                  <div className="flex items-center gap-1.5 font-mono font-black text-xs tracking-wide uppercase">
                    <span>{pair.word1}</span>
                    <span className="text-zinc-400 group-hover:text-zinc-500 text-[10px] font-normal">+</span>
                    <span>{pair.word2}</span>
                  </div>
                  <span className="text-[9px] font-mono font-bold text-zinc-400 group-hover:text-zinc-300">
                    {pair.word1.length + pair.word2.length}L
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 4. Progressive Sentence Completions (Matching unplaced remainder) */}
        {progressiveCompletions.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-black uppercase tracking-wider text-black flex items-center gap-1">
                <Zap className="w-3 h-3 text-black" />
                Finish Current Sentence ({progressiveCompletions.length})
              </span>
              <div className="flex-1 h-px bg-zinc-200" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {progressiveCompletions.map((comp) => (
                <div
                  key={comp.id}
                  className="p-2.5 border-2 border-black bg-zinc-50 rounded-lg flex items-center justify-between gap-2 shadow-[2px_2px_0px_#000]"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-mono text-zinc-400 line-through">
                        {targetPhrase}
                      </span>
                      <ArrowRight className="w-2.5 h-2.5 text-zinc-400" />
                      <span className="font-mono font-black text-xs text-black uppercase tracking-wide">
                        +{comp.phrase}
                      </span>
                    </div>
                    <span className="text-[9px] font-mono text-zinc-500 block truncate">
                      Complete: {comp.fullPhrase}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handlePlaySolution(comp.fullPhrase)}
                    className="px-2.5 py-1 bg-black hover:bg-zinc-800 text-white rounded text-[10px] font-mono font-bold uppercase cursor-pointer shrink-0 transition-transform active:scale-95"
                    title="Solve complete phrase"
                  >
                    Solve
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. Complete Exact Anagram Solutions (Full Multi-Word Solutions) */}
        {sortedSolutions.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-black uppercase tracking-wider text-black flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-black" />
                Complete Exact Anagrams ({sortedSolutions.length})
              </span>
              <div className="flex-1 h-px bg-zinc-200" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {sortedSolutions.map((sol) => (
                <div
                  key={sol.phrase}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', sol.phrase);
                    e.dataTransfer.setData('application/x-anagram-word', sol.phrase);
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  className="p-3 border-2 border-black bg-white hover:bg-zinc-50 rounded-xl flex flex-col justify-between gap-2.5 transition-all duration-75 shadow-[2px_2px_0px_#000000] hover:shadow-[3px_3px_0px_#000000] hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none group cursor-grab active:cursor-grabbing"
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
                        title={`Solve as website: ${sol.websiteUrl}`}
                      >
                        <Globe className="w-2.5 h-2.5 shrink-0" />
                        <span>{sol.websiteUrl}</span>
                      </button>
                    )}

                    {/* Words breakdown chips */}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {sol.words.map((w, wIdx) => (
                        <span
                          key={`${w}-${wIdx}`}
                          className="px-1.5 py-0.5 bg-zinc-100 rounded text-[9.5px] font-mono font-semibold text-zinc-700"
                        >
                          {w}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions: Solve / Play now */}
                  <div className="flex items-center gap-1.5 pt-1 border-t border-zinc-100">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlaySolution(sol.phrase);
                      }}
                      className="flex-1 py-1.5 px-2 bg-black hover:bg-zinc-800 text-white rounded-md text-[10px] font-mono font-black uppercase flex items-center justify-center gap-1 transition-transform active:scale-95 cursor-pointer shadow-2xs"
                      title="Set as target phrase and animate"
                    >
                      <Play className="w-2.5 h-2.5 fill-white" />
                      Solve
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAppendSolution(sol.phrase);
                      }}
                      className="py-1.5 px-2.5 bg-zinc-100 hover:bg-zinc-200 text-black border border-zinc-300 rounded-md text-[10px] font-mono font-bold uppercase transition-transform active:scale-95 cursor-pointer"
                      title="Append to sentence"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state: ONLY if zero solutions of any kind exist and not solving */}
        {!isSolvingSolutions && totalExactSolutions === 0 && (
          <div className="w-full h-full min-h-[200px] flex flex-col items-center justify-center text-zinc-400 p-8 text-center space-y-1">
            <span className="font-mono text-xs font-bold text-zinc-700 uppercase tracking-wide">
              No complete solutions found yet
            </span>
            <span className="font-mono text-[10.5px] text-zinc-400 max-w-sm">
              Try typing or changing the source name, or place words to narrow down candidate letters.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
