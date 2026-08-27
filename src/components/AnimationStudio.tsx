import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Download,
  Video,
  Image as ImageIcon,
  Repeat,
  ChevronLeft,
  ChevronRight,
  Grid,
  Sparkles,
  Type,
} from 'lucide-react';
import { AnimationSpeed, AspectRatio, CanvasFont, CanvasTheme, LoopMode, MotionStyle } from '../types';
import { renderRearrangementCanvas } from '../utils/canvasRenderer';
import { createRearrangementGif } from '../utils/gifExporter';
import { soundFX, fireConfetti } from '../utils/audioEffects';
import { exact } from '../utils/anagramSolver';

interface AnimationStudioProps {
  sourceText: string;
  targetPhrase: string;
  onSetSource: (val: string) => void;
  onSetTarget: (val: string) => void;
}

export const AnimationStudio: React.FC<AnimationStudioProps> = ({
  sourceText,
  targetPhrase,
  onSetSource,
  onSetTarget,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [motionStyle, setMotionStyle] = useState<MotionStyle>('arc');
  const [speed, setSpeed] = useState<AnimationSpeed>('normal');
  const [loopMode, setLoopMode] = useState<LoopMode>('pingpong');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('wide');
  const [theme, setTheme] = useState<CanvasTheme>('dark');
  const [fontOption, setFontOption] = useState<CanvasFont>('mono');
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [trailIntensity, setTrailIntensity] = useState<'none' | 'subtle' | 'high'>('subtle');
  const [customSubtitle, setCustomSubtitle] = useState<string>('SAME LETTERS, NEW ORDER');

  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [progress, setProgress] = useState<number>(0);
  const [isGeneratingGif, setIsGeneratingGif] = useState<boolean>(false);
  const [gifProgress, setGifProgress] = useState<number>(0);
  const [generatedGifUrl, setGeneratedGifUrl] = useState<string | null>(null);

  const [isRecordingVideo, setIsRecordingVideo] = useState<boolean>(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const animTokenRef = useRef<number>(0);
  const isExactMatch = exact(sourceText, targetPhrase);

  // Set canvas dimensions
  const updateCanvasDimensions = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (aspectRatio === 'square') {
      canvas.width = 560;
      canvas.height = 560;
    } else if (aspectRatio === 'story') {
      canvas.width = 400;
      canvas.height = 700;
    } else if (aspectRatio === 'banner') {
      canvas.width = 800;
      canvas.height = 300;
    } else {
      // wide
      canvas.width = 760;
      canvas.height = 380;
    }
  }, [aspectRatio]);

  // Main animation loop
  useEffect(() => {
    updateCanvasDimensions();
    animTokenRef.current++;
    const token = animTokenRef.current;

    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!isExactMatch) {
      renderRearrangementCanvas(1, canvas, sourceText, targetPhrase, motionStyle, theme, customSubtitle, fontOption, showGrid, trailIntensity);
      return;
    }

    if (!isPlaying) {
      renderRearrangementCanvas(progress, canvas, sourceText, targetPhrase, motionStyle, theme, customSubtitle, fontOption, showGrid, trailIntensity);
      return;
    }

    const duration = speed === 'slow' ? 3400 : speed === 'fast' ? 1700 : speed === 'turbo' ? 1100 : 2500;
    const pauseDuration = 450;

    let phase: 'forward' | 'reverse' = 'forward';
    let phaseStartTime = performance.now();
    let pauseUntil = 0;

    const loop = (now: number) => {
      if (token !== animTokenRef.current) return;

      if (pauseUntil > 0) {
        if (now < pauseUntil) {
          requestAnimationFrame(loop);
          return;
        }
        pauseUntil = 0;
        phaseStartTime = now;
      }

      const elapsed = now - phaseStartTime;
      const p = Math.min(1, Math.max(0, elapsed / duration));

      const currentProg = phase === 'forward' ? p : 1 - p;
      setProgress(currentProg);
      renderRearrangementCanvas(currentProg, canvas, sourceText, targetPhrase, motionStyle, theme, customSubtitle, fontOption, showGrid, trailIntensity);

      if (p >= 1) {
        if (loopMode === 'once') {
          setIsPlaying(false);
          return;
        }
        if (loopMode === 'pingpong') {
          phase = phase === 'forward' ? 'reverse' : 'forward';
          pauseUntil = now + pauseDuration;
        } else {
          // restart
          phase = 'forward';
          pauseUntil = now + pauseDuration;
        }
      }

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);

    return () => {
      animTokenRef.current++;
    };
  }, [
    sourceText,
    targetPhrase,
    motionStyle,
    speed,
    loopMode,
    aspectRatio,
    theme,
    fontOption,
    showGrid,
    trailIntensity,
    customSubtitle,
    isPlaying,
    isExactMatch,
    updateCanvasDimensions,
  ]);

  const handleStep = (delta: number) => {
    setIsPlaying(false);
    setProgress(prev => {
      const next = Math.max(0, Math.min(1, prev + delta));
      const canvas = canvasRef.current;
      if (canvas) {
        renderRearrangementCanvas(next, canvas, sourceText, targetPhrase, motionStyle, theme, customSubtitle, fontOption, showGrid, trailIntensity);
      }
      return next;
    });
    soundFX.playPop();
  };

  const handleExportGif = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !isExactMatch) return;

    soundFX.playPop();
    setIsGeneratingGif(true);
    setGifProgress(5);

    try {
      const { url } = await createRearrangementGif({
        canvas,
        source: sourceText,
        target: targetPhrase,
        motionStyle,
        speed,
        loopMode,
        aspectRatio,
        theme,
        customSubtitle,
        onProgress: p => setGifProgress(p),
        renderFrame: (p, c) =>
          renderRearrangementCanvas(p, c, sourceText, targetPhrase, motionStyle, theme, customSubtitle, fontOption, showGrid, trailIntensity),
      });

      setGeneratedGifUrl(url);
      soundFX.playSuccess();
      fireConfetti();
    } catch (err) {
      console.error('GIF Export Error:', err);
    } finally {
      setIsGeneratingGif(false);
      updateCanvasDimensions();
    }
  };

  const handleExportVideo = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !isExactMatch) return;

    soundFX.playPop();
    setIsRecordingVideo(true);

    try {
      const stream = canvas.captureStream(30);
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
      const chunks: Blob[] = [];

      recorder.ondataavailable = e => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setVideoUrl(url);
        setIsRecordingVideo(false);
        soundFX.playSuccess();
      };

      recorder.start();

      const duration = speed === 'slow' ? 7000 : speed === 'fast' ? 3600 : 5200;
      setTimeout(() => {
        recorder.stop();
      }, duration);
    } catch (err) {
      console.error('Video capture error:', err);
      setIsRecordingVideo(false);
    }
  };

  const [pngNotice, setPngNotice] = useState<boolean>(false);

  const handleCapturePng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    soundFX.playPop();
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `anagram-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
    setPngNotice(true);
    setTimeout(() => setPngNotice(false), 2000);
  };

  const handleSwap = () => {
    soundFX.playPop();
    const temp = sourceText;
    onSetSource(targetPhrase);
    onSetTarget(temp);
  };

  return (
    <div className="space-y-5">
      <section className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-5 sm:p-6 space-y-5">
        {/* Header & Direct Target Phrase Controller */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-850 pb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-semibold text-zinc-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Motion Letter Animator</span>
              </h2>
              <span className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
                isExactMatch
                  ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                  : 'bg-amber-950/60 border-amber-800 text-amber-300'
              }`}>
                {isExactMatch ? 'Exact Anagram' : 'Letter Discrepancy'}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Live vector rearrangement with customizable particle physics and recording export.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              onClick={handleSwap}
              className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-colors shadow-xs"
              title="Swap source text and target phrase"
            >
              <Repeat className="w-3.5 h-3.5" />
              <span>Swap Order</span>
            </button>
          </div>
        </div>

        {/* Compact Target Input Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 bg-zinc-950 p-2.5 rounded-lg border border-zinc-800/80">
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-mono shrink-0 pl-1">
            <span className="text-zinc-400 font-medium">Animating Target:</span>
          </div>
          <input
            type="text"
            value={targetPhrase}
            onChange={e => onSetTarget(e.target.value)}
            placeholder="Target anagram phrase to animate..."
            className="flex-1 bg-zinc-900 border border-zinc-800 focus:border-zinc-500 rounded px-2.5 py-1.5 text-xs sm:text-sm font-mono text-zinc-100 focus:outline-none transition-all"
          />
          <div className="text-[11px] font-mono text-zinc-500 px-2 py-1 bg-zinc-900 rounded border border-zinc-850 shrink-0">
            Source: <span className="text-zinc-300">{sourceText}</span>
          </div>
        </div>

        {/* Canvas Viewport */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 flex flex-col items-center justify-center p-3 sm:p-5">
          <canvas
            ref={canvasRef}
            className="w-full max-w-3xl rounded-lg border border-zinc-850 bg-black object-contain max-h-[420px]"
          />

          {/* Timeline & Scrubber Bar */}
          <div className="w-full max-w-3xl flex items-center justify-between gap-2.5 pt-3 px-1 text-xs text-zinc-400">
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setIsPlaying(!isPlaying);
                  soundFX.playPop();
                }}
                aria-label={isPlaying ? 'Pause animation playback' : 'Start animation playback'}
                className="p-1.5 rounded-md bg-zinc-100 hover:bg-white text-zinc-950 transition-colors focus:ring-2 focus:ring-zinc-400 focus:outline-none"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              </button>

              <button
                onClick={() => {
                  setProgress(0);
                  setIsPlaying(true);
                  soundFX.playPop();
                }}
                aria-label="Restart animation from beginning"
                className="p-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition-colors focus:ring-1 focus:ring-zinc-500 focus:outline-none"
                title="Restart"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => handleStep(-0.05)}
                aria-label="Step backward 5 percent"
                className="p-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition-colors focus:ring-1 focus:ring-zinc-500 focus:outline-none"
                title="Step backward 5%"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => handleStep(0.05)}
                aria-label="Step forward 5 percent"
                className="p-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition-colors focus:ring-1 focus:ring-zinc-500 focus:outline-none"
                title="Step forward 5%"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <span className="font-mono text-[11px] text-zinc-400 tabular-nums ml-1 min-w-[34px]">
                {Math.round(progress * 100)}%
              </span>
            </div>

            {/* Slider */}
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={progress}
              aria-label="Animation progress scrubber"
              onChange={e => {
                setIsPlaying(false);
                const val = Number(e.target.value);
                setProgress(val);
                const canvas = canvasRef.current;
                if (canvas) {
                  renderRearrangementCanvas(val, canvas, sourceText, targetPhrase, motionStyle, theme, customSubtitle, fontOption, showGrid, trailIntensity);
                }
              }}
              className="flex-1 mx-2 accent-zinc-100 h-1 bg-zinc-800 rounded-lg cursor-pointer"
            />

            <div className="flex items-center gap-1.5">
              {pngNotice && (
                <span className="text-[10px] font-mono text-emerald-400 animate-in fade-in duration-200">
                  PNG Saved!
                </span>
              )}
              <button
                onClick={handleCapturePng}
                aria-label="Capture single PNG snapshot frame"
                className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-md font-mono text-[11px] flex items-center gap-1 transition-colors"
              >
                <ImageIcon className="w-3 h-3" />
                <span className="hidden sm:inline">PNG</span>
              </button>
            </div>
          </div>
        </div>

        {/* Physics & Render Controls */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-medium text-zinc-400 block mb-1">
              Trajectory
            </label>
            <select
              value={motionStyle}
              onChange={e => setMotionStyle(e.target.value as MotionStyle)}
              className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-zinc-600 font-mono"
            >
              <option value="arc">Flying Arcs</option>
              <option value="orbit">Orbit & Settle</option>
              <option value="direct">Direct</option>
              <option value="explosion">Scatter</option>
              <option value="vortex">Vortex</option>
              <option value="bounce">Elastic Bounce</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-400 block mb-1">
              Color Theme
            </label>
            <select
              value={theme}
              onChange={e => setTheme(e.target.value as CanvasTheme)}
              className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-zinc-600 font-mono"
            >
              <option value="dark">Standard Dark</option>
              <option value="light">Clean Light</option>
              <option value="neon">Neon Blue</option>
              <option value="cyberpunk">Cyberpunk</option>
              <option value="parchment">Parchment</option>
              <option value="retro">80s Retro</option>
              <option value="emerald">Emerald</option>
              <option value="sunset">Sunset</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-400 block mb-1">
              Typography Font
            </label>
            <select
              value={fontOption}
              onChange={e => setFontOption(e.target.value as CanvasFont)}
              className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-zinc-600 font-mono"
            >
              <option value="mono">Clean Monospace</option>
              <option value="sans">Geometric Sans</option>
              <option value="serif">Classical Serif</option>
              <option value="cyber">Cyber Hacker</option>
              <option value="pixel">Pixel 8-Bit</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-400 block mb-1">
              Particle Sparks
            </label>
            <select
              value={trailIntensity}
              onChange={e => setTrailIntensity(e.target.value as any)}
              className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-zinc-600 font-mono"
            >
              <option value="none">No Particles</option>
              <option value="subtle">Subtle Glow (Default)</option>
              <option value="high">High Sparks</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-400 block mb-1">
              Speed
            </label>
            <select
              value={speed}
              onChange={e => setSpeed(e.target.value as AnimationSpeed)}
              className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-zinc-600 font-mono"
            >
              <option value="slow">0.5x (Slow)</option>
              <option value="normal">1.0x (Normal)</option>
              <option value="fast">1.5x (Fast)</option>
              <option value="turbo">2.0x (Turbo)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-400 block mb-1">
              Looping
            </label>
            <select
              value={loopMode}
              onChange={e => setLoopMode(e.target.value as LoopMode)}
              className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-zinc-600 font-mono"
            >
              <option value="pingpong">Ping-Pong</option>
              <option value="restart">Restart</option>
              <option value="once">Play Once</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-400 block mb-1">
              Aspect Ratio
            </label>
            <select
              value={aspectRatio}
              onChange={e => setAspectRatio(e.target.value as AspectRatio)}
              className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-zinc-600 font-mono"
            >
              <option value="wide">16:9 Wide</option>
              <option value="square">1:1 Square</option>
              <option value="story">9:16 Story</option>
              <option value="banner">Banner</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-400 block mb-1">
              Subtitle
            </label>
            <input
              type="text"
              value={customSubtitle}
              onChange={e => setCustomSubtitle(e.target.value)}
              placeholder="Tagline..."
              className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-zinc-600 font-mono"
            />
          </div>
        </div>

        {/* Blueprint Grid Toggle */}
        <div className="flex items-center gap-2 pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-zinc-400 font-mono">
            <input
              type="checkbox"
              checked={showGrid}
              onChange={e => setShowGrid(e.target.checked)}
              className="rounded bg-zinc-950 border-zinc-700 text-zinc-100 focus:ring-0 w-3.5 h-3.5"
            />
            <span>Show Blueprint Grid Background</span>
          </label>
        </div>

        {/* Export Strip */}
        <div className="pt-2 border-t border-zinc-850 flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportGif}
            disabled={isGeneratingGif || !isExactMatch}
            className="px-4 py-2 bg-zinc-100 hover:bg-white disabled:opacity-40 text-zinc-950 font-semibold rounded-lg text-xs transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isGeneratingGif ? `Rendering GIF (${gifProgress}%)...` : 'Export Animated GIF'}</span>
          </button>

          <button
            onClick={handleExportVideo}
            disabled={isRecordingVideo || !isExactMatch}
            className="px-3.5 py-2 bg-zinc-950 hover:bg-zinc-800 disabled:opacity-40 text-zinc-300 border border-zinc-800 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
          >
            <Video className="w-3.5 h-3.5" />
            <span>{isRecordingVideo ? 'Recording WebM...' : 'Export WebM Video'}</span>
          </button>

          {videoUrl && (
            <a
              href={videoUrl}
              download="anagram-motion.webm"
              className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 rounded-lg text-xs font-medium flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download WebM</span>
            </a>
          )}
        </div>

        {/* Exported GIF Card */}
        {generatedGifUrl && (
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-zinc-300">
                GIF Rendered Successfully
              </span>
              <a
                href={generatedGifUrl}
                download="anagram-rearrangement.gif"
                className="px-3 py-1 bg-zinc-100 hover:bg-white text-zinc-950 rounded-md text-xs font-semibold flex items-center gap-1"
              >
                <Download className="w-3 h-3" />
                <span>Save File</span>
              </a>
            </div>
            <div className="flex justify-center bg-black/50 p-2 rounded-lg border border-zinc-900">
              <img
                src={generatedGifUrl}
                alt="Generated Anagram Rearrangement"
                className="max-h-[340px] rounded object-contain"
              />
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
