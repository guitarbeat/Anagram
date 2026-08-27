import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

// Add import
if (!content.includes("import { AnimatePresence, motion }")) {
  content = content.replace(
    /import React, \{ useState \} from 'react';/,
    "import React, { useState } from 'react';\nimport { AnimatePresence, motion } from 'motion/react';"
  );
}

const renderSection = `      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-7">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {activeTab === 'solver' && (
              <SolverSection
                sourceText={sourceText}
                setSourceText={setSourceText}
                onAnimatePhrase={handleAnimatePhrase}
                onTestLieDetector={handleTestLieDetector}
                onOpenSandbox={handleOpenSandbox}            
                onOpenSubWords={handleOpenSubWords}
                onOpenStoryGenerator={handleOpenStoryGenerator}
              />
            )}
            {activeTab === 'studio' && (
              <AnimationStudio
                sourceText={sourceText}
                targetPhrase={targetPhrase}
                onSetSource={setSourceText}
                onSetTarget={setTargetPhrase}
              />
            )}        
            {activeTab === 'subwords' && (
              <SubWordsExplorer
                sourceText={sourceText}
                onLoadIntoSolver={src => {
                  setSourceText(src);
                  setActiveTab('solver');
                }}
              />
            )}
            {activeTab === 'detector' && (
              <LieDetectorSection
                sourceText={sourceText}
                candidateText={candidateText}
                setCandidateText={setCandidateText}
                onAnimatePhrase={handleAnimatePhrase}
                onOpenSandbox={handleOpenSandbox}
              />
            )}
            {activeTab === 'sandbox' && (
              <LetterSandbox
                sourceText={sourceText}
                onAnimatePhrase={handleAnimatePhrase}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>`;

content = content.replace(
  /      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-7">[\s\S]*?<\/main>/,
  renderSection
);

fs.writeFileSync('src/App.tsx', content);
