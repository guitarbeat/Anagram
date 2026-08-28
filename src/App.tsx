import React, { useState, useRef } from 'react';
import { Sparkles, Play, Search, SlidersHorizontal, BookOpen } from 'lucide-react';
import { SolverSection } from './components/SolverSection';
import { AnimationStudio } from './components/AnimationStudio';
import { ToastContainer } from './components/ToastContainer';

export default function App() {
  const [sourceText, setSourceText] = useState<string>('Aaron Lorenzo Woods');
  const [targetPhrase, setTargetPhrase] = useState<string>('Zoolander owns a roo.');
  const [candidateText, setCandidateText] = useState<string>('Zoolander owns a roo.');
  const [solverTab, setSolverTab] = useState<'anagrams' | 'rack' | 'dictionary'>('anagrams');

  const animatorRef = useRef<HTMLDivElement | null>(null);

  const handleAnimatePhrase = (phrase: string) => {
    setTargetPhrase(phrase);
    if (animatorRef.current) {
      animatorRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleOpenRack = (phrase: string) => {
    setCandidateText(phrase);
    setSolverTab('rack');
    const elem = document.getElementById('workspace-section');
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#09090b] text-zinc-100 flex flex-col selection:bg-zinc-800 selection:text-zinc-100 font-sans antialiased">
      {/* Sticky Top Navigation */}
      <header className="sticky top-0 z-30 bg-[#09090b]/95 backdrop-blur-md border-b border-zinc-800/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-200">
              <Sparkles className="w-4 h-4 text-zinc-300" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-semibold tracking-tight text-zinc-100">Anagram Lab</span>
              <span className="hidden sm:inline text-xs text-zinc-500 font-mono">Lexicon &amp; Motion Studio</span>
            </div>
          </div>

          <nav aria-label="Quick jump" className="flex items-center gap-1.5">
            <button
              onClick={() => {
                setSolverTab('anagrams');
                document.getElementById('workspace-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition-colors flex items-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Solver</span>
            </button>

            <button
              onClick={() => {
                setSolverTab('rack');
                document.getElementById('workspace-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition-colors flex items-center gap-1.5"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Rack &amp; Verifier</span>
            </button>

            <button
              onClick={() => animatorRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="px-3 py-1 rounded-lg text-xs font-semibold text-zinc-950 bg-zinc-100 hover:bg-white transition-colors flex items-center gap-1.5"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Animator</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        {/* Unified Solver, Rack & Dictionary Workspace */}
        <section id="workspace-section" className="scroll-mt-18">
          <SolverSection
            sourceText={sourceText}
            setSourceText={setSourceText}
            candidateText={candidateText}
            setCandidateText={setCandidateText}
            onAnimatePhrase={handleAnimatePhrase}
            activeTab={solverTab}
          />
        </section>

        {/* Divider */}
        <div className="border-t border-zinc-800/80" />

        {/* Motion Letter Rearrangement Studio */}
        <section id="animator-section" ref={animatorRef} className="scroll-mt-18">
          <AnimationStudio
            sourceText={sourceText}
            targetPhrase={targetPhrase}
            onSetSource={setSourceText}
            onSetTarget={setTargetPhrase}
            onOpenRack={handleOpenRack}
          />
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/80 bg-zinc-950 text-zinc-500 py-4 text-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="font-medium text-zinc-400">Anagram Lab</span>
          <span className="font-mono text-zinc-500 text-[11px]">Exact multi-word solver, live parity verifier, and vector letter animator.</span>
        </div>
      </footer>

      {/* Toast notifications */}
      <ToastContainer />
    </div>
  );
}
