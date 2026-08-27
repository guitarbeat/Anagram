import React, { useState } from 'react';
import { Sparkles, X, Copy, Check } from 'lucide-react';
import { soundFX } from '../utils/audioEffects';

interface StoryGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  source: string;
  target: string;
}

export const StoryGeneratorModal: React.FC<StoryGeneratorModalProps> = ({
  isOpen,
  onClose,
  source,
  target,
}) => {
  const [story, setStory] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const generateFunnyStory = async () => {
    setIsLoading(true);
    soundFX.playPop();

    const templates = [
      `Dossier Record:\n\nIn a parallel timeline, "${source}" was living an unremarkable existence until an exact letter conservation anomaly occurred. Under the unyielding laws of alphabet algebra, their secret alter-ego was revealed: "${target}". Witnesses describe the transformation as mathematically undeniable.`,
      `Cryptographic Bulletin:\n\nLinguists have confirmed that if you strictly conserve every glyph inside "${source}", the letters reveal the classified message: "${target}". "We double checked the vowel-to-consonant ratios," stated the lead analyst, "and the universe was not joking."`,
      `Ancient Anagram Chronicler:\n\nLegend claimed that "${source}" concealed a hidden prophecy. When the glyphs were rotated and rearranged into their destined sequence, they formed: "${target}".`,
    ];

    await new Promise(r => setTimeout(r, 450));
    const randomPick = templates[Math.floor(Math.random() * templates.length)];
    setStory(randomPick);
    setIsLoading(false);
    soundFX.playSuccess();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(story);
    setCopied(true);
    soundFX.playPop();
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-zinc-100 text-sm">Anagram Lore Generator</h3>
          </div>
          <button onClick={onClose} className="p-1 text-zinc-500 hover:text-zinc-300 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-850 text-xs font-mono text-zinc-300 space-y-1">
          <div><span className="text-zinc-500">Source:</span> {source}</div>
          <div><span className="text-zinc-500">Anagram:</span> {target}</div>
        </div>

        <div className="min-h-[120px] p-3.5 bg-zinc-950/70 border border-zinc-850 rounded-lg text-xs sm:text-sm text-zinc-200 whitespace-pre-line font-mono leading-relaxed">
          {isLoading ? (
            <div className="flex items-center justify-center h-24 text-zinc-500 gap-2">
              <Sparkles className="w-4 h-4 text-zinc-400 animate-spin" />
              <span>Drafting backstory...</span>
            </div>
          ) : story ? (
            story
          ) : (
            <div className="text-center py-6 text-zinc-500 text-xs">
              Generate a short comedic scenario for this exact anagram pair.
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-1">
          <button
            onClick={generateFunnyStory}
            disabled={isLoading}
            className="px-3.5 py-1.5 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs rounded-md flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{story ? 'Regenerate' : 'Generate Lore'}</span>
          </button>

          {story && (
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-mono rounded-md flex items-center gap-1 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
