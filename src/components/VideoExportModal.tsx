import React, { useState, useRef, useEffect } from 'react';
import {
  Film,
  Download,
  X,
  CheckCircle2,
  Sparkles,
  Loader2,
  Play,
  RotateCcw,
  Video,
} from 'lucide-react';
import {
  recordAnagramVideo,
  downloadVideoBlob,
  generateVideoFilename,
} from '../utils/recordAnagramVideo';
import { triggerHaptic } from '../hooks/useHaptics';

export interface VideoExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceName: string;
  targetPhrase: string;
  onShowToast: (msg: string) => void;
}

export type VideoFormatPreset = '16:9' | '1:1' | 'stage';
export type VideoFpsOption = 60 | 30;

export const VideoExportModal: React.FC<VideoExportModalProps> = ({
  isOpen,
  onClose,
  sourceName,
  targetPhrase,
  onShowToast,
}) => {
  const [formatPreset, setFormatPreset] = useState<VideoFormatPreset>('16:9');
  const [fps, setFps] = useState<VideoFpsOption>(60);
  const [isRecording, setIsRecording] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [generatedFilename, setGeneratedFilename] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);

  // Revoke object URL on unmount or new recording
  useEffect(() => {
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  if (!isOpen) return null;

  const handleStartRecording = async () => {
    if (isRecording) return;
    triggerHaptic('snap');

    let width = 1280;
    let height = 720;
    if (formatPreset === '1:1') {
      width = 1080;
      height = 1080;
    } else if (formatPreset === 'stage') {
      const stageElem = document.getElementById('anagram-stage');
      if (stageElem) {
        const rect = stageElem.getBoundingClientRect();
        const baseW = Math.max(640, Math.round(rect.width * 1.5));
        const baseH = Math.max(360, Math.round(rect.height * 1.5));
        width = Math.round(baseW / 2) * 2;
        height = Math.round(baseH / 2) * 2;
      }
    }

    const filename = generateVideoFilename(sourceName, targetPhrase);
    setGeneratedFilename(filename);

    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
      setVideoUrl(null);
    }
    setVideoBlob(null);
    setIsRecording(true);
    setProgressPercent(0);
    setStatusText('Preparing animation sequence...');

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const blob = await recordAnagramVideo({
        sourceName,
        targetPhrase: targetPhrase.trim() || sourceName,
        width,
        height,
        fps,
        duration: 4.2,
        onProgress: (p, status) => {
          setProgressPercent(p);
          setStatusText(status);
        },
        signal: controller.signal,
      });

      setVideoBlob(blob);
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);

      // Auto-trigger download
      downloadVideoBlob(blob, filename);
      triggerHaptic('success');
      onShowToast(`Downloaded MP4: ${filename}`);
    } catch (err: any) {
      if (err?.message?.includes('cancelled')) {
        onShowToast('Video export cancelled');
      } else {
        console.error('Export video error:', err);
        onShowToast('Could not generate video: ' + (err?.message || 'Unknown error'));
      }
    } finally {
      setIsRecording(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancelRecording = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsRecording(false);
    triggerHaptic('light');
  };

  const handleDownloadAgain = () => {
    if (videoBlob && generatedFilename) {
      downloadVideoBlob(videoBlob, generatedFilename);
      triggerHaptic('light');
      onShowToast(`Downloaded MP4: ${generatedFilename}`);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="video-export-title"
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isRecording) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-md bg-white border-2 border-black rounded-xl sm:rounded-2xl shadow-[6px_6px_0px_#000000] overflow-hidden flex flex-col text-zinc-900">
        {/* Header */}
        <div className="px-4 py-3 border-b-2 border-black bg-zinc-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-black text-white border border-black flex items-center justify-center shadow-[1.5px_1.5px_0px_#000]">
              <Film className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <h2 id="video-export-title" className="font-mono text-xs font-black uppercase tracking-wider text-black">
                Export MP4 Reveal
              </h2>
              <p className="font-mono text-[10px] text-zinc-500">
                High-definition kinetic video sequence
              </p>
            </div>
          </div>

          {!isRecording && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded text-zinc-400 hover:text-black hover:bg-zinc-200 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-4">
          {/* Active Reveal Titles Preview */}
          <div className="p-2.5 bg-zinc-50 border border-zinc-200 rounded-lg font-mono space-y-1">
            <div className="flex items-center justify-between text-[9px] uppercase tracking-wider text-zinc-500 font-bold">
              <span>Source → Reveal Target</span>
              <span className="text-black font-extrabold">100% Match</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-black text-black truncate uppercase">
              <span className="truncate">{sourceName}</span>
              <span className="text-zinc-400">→</span>
              <span className="text-black font-black truncate">
                {targetPhrase.trim() || sourceName}
              </span>
            </div>
          </div>

          {/* Video Preview Player if already recorded */}
          {videoUrl && !isRecording && (
            <div className="space-y-2">
              <div className="relative rounded-lg overflow-hidden border-2 border-black bg-zinc-900 aspect-video flex items-center justify-center shadow-[2px_2px_0px_#000]">
                <video
                  src={videoUrl}
                  controls
                  autoPlay
                  loop
                  playsInline
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono font-bold text-zinc-600 px-1">
                <span className="flex items-center gap-1 text-black font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-black" />
                  MP4 Video Generated Successfully
                </span>
                {videoBlob && (
                  <span className="text-zinc-500">
                    {(videoBlob.size / (1024 * 1024)).toFixed(1)} MB
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Format and Quality Controls (hidden during recording) */}
          {!isRecording && (
            <div className="space-y-3">
              {/* Aspect Ratio Preset */}
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-600 mb-1">
                  Format / Aspect Ratio
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setFormatPreset('16:9');
                    }}
                    className={`py-1.5 px-2 border-2 rounded-md font-mono text-[10.5px] font-bold flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all ${
                      formatPreset === '16:9'
                        ? 'border-black bg-black text-white shadow-[2px_2px_0px_#000000]'
                        : 'border-zinc-300 bg-white hover:border-black text-zinc-700'
                    }`}
                  >
                    <span>16:9 HD</span>
                    <span className="text-[8.5px] opacity-70">1280 × 720</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setFormatPreset('1:1');
                    }}
                    className={`py-1.5 px-2 border-2 rounded-md font-mono text-[10.5px] font-bold flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all ${
                      formatPreset === '1:1'
                        ? 'border-black bg-black text-white shadow-[2px_2px_0px_#000000]'
                        : 'border-zinc-300 bg-white hover:border-black text-zinc-700'
                    }`}
                  >
                    <span>1:1 Square</span>
                    <span className="text-[8.5px] opacity-70">1080 × 1080</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setFormatPreset('stage');
                    }}
                    className={`py-1.5 px-2 border-2 rounded-md font-mono text-[10.5px] font-bold flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all ${
                      formatPreset === 'stage'
                        ? 'border-black bg-black text-white shadow-[2px_2px_0px_#000000]'
                        : 'border-zinc-300 bg-white hover:border-black text-zinc-700'
                    }`}
                  >
                    <span>Stage Fit</span>
                    <span className="text-[8.5px] opacity-70">Custom Ratio</span>
                  </button>
                </div>
              </div>

              {/* Framerate Selection */}
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-600 mb-1">
                  Frame Rate (Quality)
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setFps(60);
                    }}
                    className={`py-1 px-2 border-2 rounded-md font-mono text-[10px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                      fps === 60
                        ? 'border-black bg-black text-white shadow-[2px_2px_0px_#000000]'
                        : 'border-zinc-300 bg-white hover:border-black text-zinc-700'
                    }`}
                  >
                    <Sparkles className="w-3 h-3 text-white" />
                    <span>60 FPS (Ultra Smooth)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setFps(30);
                    }}
                    className={`py-1 px-2 border-2 rounded-md font-mono text-[10px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                      fps === 30
                        ? 'border-black bg-black text-white shadow-[2px_2px_0px_#000000]'
                        : 'border-zinc-300 bg-white hover:border-black text-zinc-700'
                    }`}
                  >
                    <span>30 FPS (Standard)</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Recording in Progress State */}
          {isRecording && (
            <div className="space-y-2.5 p-4 bg-zinc-50 border-2 border-black rounded-xl">
              <div className="flex items-center justify-between text-xs font-mono font-bold text-black">
                <div className="flex items-center gap-1.5">
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                  <span>{statusText || 'Rendering video frames...'}</span>
                </div>
                <span className="font-mono tabular-nums font-black">{progressPercent}%</span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2.5 bg-zinc-200 rounded-full overflow-hidden border border-black">
                <div
                  className="h-full bg-black rounded-full transition-all duration-100 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[9.5px] font-mono text-zinc-600">
                  Capturing 60fps kinetic trajectory paths
                </span>
                <button
                  type="button"
                  onClick={handleCancelRecording}
                  className="text-[10px] font-mono font-bold text-zinc-600 hover:text-black underline cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-4 py-3 border-t-2 border-black bg-zinc-50 flex items-center justify-between gap-2">
          {!isRecording && videoUrl ? (
            <>
              <button
                type="button"
                onClick={handleStartRecording}
                className="py-2 px-3 border border-zinc-300 hover:border-black rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer bg-white hover:bg-zinc-100 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Re-Record
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="py-2 px-3 text-xs font-mono font-bold text-zinc-600 hover:text-black cursor-pointer"
                >
                  Done
                </button>
                <button
                  type="button"
                  onClick={handleDownloadAgain}
                  className="py-2 px-4 border-2 border-black bg-black hover:bg-zinc-800 rounded-lg text-xs font-mono font-black uppercase tracking-wider text-white flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download MP4
                </button>
              </div>
            </>
          ) : !isRecording ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="py-2 px-3 text-xs font-mono font-bold text-zinc-600 hover:text-black cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStartRecording}
                className="py-2 px-4 border-2 border-black bg-black hover:bg-zinc-800 text-white rounded-lg text-xs font-mono font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
              >
                <Video className="w-3.5 h-3.5 text-white" />
                Generate & Download MP4
              </button>
            </>
          ) : (
            <div className="w-full flex justify-end">
              <button
                type="button"
                onClick={handleCancelRecording}
                className="py-1.5 px-3 border border-zinc-300 rounded text-xs font-mono font-bold text-zinc-600 hover:text-black cursor-pointer"
              >
                Cancel Recording
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
