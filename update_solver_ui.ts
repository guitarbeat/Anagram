import fs from 'fs';

let content = fs.readFileSync('src/components/SolverSection.tsx', 'utf-8');

const UI_REPLACEMENT = `
        {/* Word Chain Interactive Builder */}
        <div className="pt-3 border-t border-zinc-850 space-y-3 mt-2">
          {placedWords.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                  Locked Words (Word Chain)
                </span>
                <button
                  onClick={() => {
                    setPlacedWords([]);
                    soundFX.playPop();
                  }}
                  className="text-[10px] font-mono text-zinc-500 hover:text-zinc-300 flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> Clear
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 items-center">
                {placedWords.map((word, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-800 border border-zinc-700 text-zinc-100 font-mono text-xs shadow-xs">
                      <span className="font-semibold">{word}</span>
                      <button
                        onClick={() => {
                          setPlacedWords(prev => prev.filter((_, i) => i !== idx));
                          soundFX.playPop();
                        }}
                        className="text-zinc-400 hover:text-rose-400 rounded transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    {idx < placedWords.length - 1 && (
                      <ChevronRight className="w-3 h-3 text-zinc-600" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {remainingLetterCount > 0 && validNextWords.length > 0 && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                  Suggested Next Words (Click to lock)
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                {validNextWords.slice(0, 30).map(item => (
                  <button
                    key={item.word}
                    onClick={() => {
                      setPlacedWords(prev => [...prev, item.word]);
                      soundFX.playPop();
                    }}
                    className="px-2.5 py-1 rounded text-[11px] font-mono transition-colors flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 text-zinc-300 hover:border-zinc-700"
                    title={\`\${item.length} letters, \${Math.round(item.score)} pts\`}
                  >
                    <span>{item.word}</span>
                    {item.isExactFinal && (
                      <span className="text-[9px] px-1 bg-emerald-950 text-emerald-400 rounded border border-emerald-800">
                        Exact
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
`;

content = content.replace(
  /\{\/\* Substring Anchor Suggestions \*\/\}[\s\S]*?(?=\{\/\* Results Header \*\/)/,
  UI_REPLACEMENT
);

fs.writeFileSync('src/components/SolverSection.tsx', content);
