import React, { useState, useRef } from 'react';
import { SolverSection } from './components/SolverSection';
import { AnimationStudio } from './components/AnimationStudio';
import { StoryGeneratorModal } from './components/StoryGeneratorModal';

export default function App() {
  const [sourceText, setSourceText] = useState<string>('Aaron Lorenzo Woods');
  const [targetPhrase, setTargetPhrase] = useState<string>('Zoolander owns a roo.');
  const [candidateText, setCandidateText] = useState<string>('Zoolander owns a roo.');

  const [storyModalOpen, setStoryModalOpen] = useState<boolean>(false);
  const [modalSource, setModalSource] = useState<string>('');
  const [modalTarget, setModalTarget] = useState<string>('');

  const solverRef = useRef<HTMLDivElement | null>(null);
  const animatorRef = useRef<HTMLDivElement | null>(null);

  const handleAnimatePhrase = (phrase: string) => {
    setTargetPhrase(phrase);
    if (animatorRef.current) {
      animatorRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleTestLieDetector = (phrase: string) => {
    setCandidateText(phrase);
    if (solverRef.current) {
      solverRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleOpenSandbox = () => {
    if (solverRef.current) {
      solverRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleOpenSubWords = () => {
    if (solverRef.current) {
      solverRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleOpenStoryGenerator = (src: string, tgt: string) => {
    setModalSource(src);
    setModalTarget(tgt);
    setStoryModalOpen(true);
  };

  return (
    <div className="min-h-[100dvh] bg-[#09090b] text-zinc-100 flex flex-col selection:bg-zinc-800 selection:text-zinc-100 font-sans antialiased">
      {/* Main Unified Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-7 space-y-12">
        {/* Section 1: Anagram Solver & Words Hub */}
        <div id="solver-section" ref={solverRef} className="scroll-mt-20">
          <SolverSection
            sourceText={sourceText}
            setSourceText={setSourceText}
            candidateText={candidateText}
            setCandidateText={setCandidateText}
            onAnimatePhrase={handleAnimatePhrase}
            onTestLieDetector={handleTestLieDetector}
            onOpenSandbox={handleOpenSandbox}            
            onOpenSubWords={handleOpenSubWords}
            onOpenStoryGenerator={handleOpenStoryGenerator}
          />
        </div>

        {/* Subtle Divider */}
        <div className="border-t border-zinc-850 my-6" />

        {/* Section 2: Motion Canvas Letter Animator */}
        <div id="animator-section" ref={animatorRef} className="scroll-mt-20">
          <AnimationStudio
            sourceText={sourceText}
            targetPhrase={targetPhrase}
            onSetSource={setSourceText}
            onSetTarget={setTargetPhrase}
          />
        </div>
      </main>

      {/* Story Lore Modal */}
      <StoryGeneratorModal
        isOpen={storyModalOpen}
        onClose={() => setStoryModalOpen(false)}
        source={modalSource}
        target={modalTarget}
      />

      {/* Footer */}
      <footer className="border-t border-zinc-850 bg-zinc-950 text-zinc-500 py-4 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Anagram Lab</span>
          <span className="text-zinc-600">Client-Side Vector Engine & Motion Studio</span>
        </div>
      </footer>
    </div>
  );
}

