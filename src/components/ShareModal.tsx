import React, { useState, useRef, useEffect } from 'react';
import {
  Share2,
  Copy,
  Check,
  Globe,
  Download,
  Image as ImageIcon,
  Film,
  X,
  Sparkles,
  ExternalLink,
  MessageCircle,
  Loader2,
  Play,
  Video,
} from 'lucide-react';
import {
  recordAnagramVideo,
  downloadVideoBlob,
  generateVideoFilename,
} from '../utils/recordAnagramVideo';
import { triggerHaptic } from '../hooks/useHaptics';

export interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceName: string;
  targetPhrase: string;
  onShowToast: (msg: string) => void;
}

export type ShareModalTab = 'link' | 'card' | 'video';
export type VideoFormatPreset = '16:9' | '1:1' | 'stage';
export type VideoFpsOption = 60 | 30;

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  sourceName,
  targetPhrase,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<ShareModalTab>('link');
  const [copied, setCopied] = useState(false);

  // Social Card Image Generation state
  const cardCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isGeneratingCard, setIsGeneratingCard] = useState(false);
  const [cardDataUrl, setCardDataUrl] = useState<string | null>(null);

  // Video Export state
  const [formatPreset, setFormatPreset] = useState<VideoFormatPreset>('16:9');
  const [fps, setFps] = useState<VideoFpsOption>(60);
  const [isRecording, setIsRecording] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Derive Deep Link URL
  const shareUrl = React.useMemo(() => {
    if (typeof window === 'undefined') return '';
    const origin = window.location.origin + window.location.pathname;
    const params = new URLSearchParams();
    if (sourceName.trim()) params.set('src', sourceName.trim());
    if (targetPhrase.trim()) params.set('tgt', targetPhrase.trim());
    const query = params.toString();
    return query ? `${origin}?${query}` : origin;
  }, [sourceName, targetPhrase]);

  // Clean up object URLs on unmount or tab changes
  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  // Render Social Media Preview Card onto 2D Canvas when Card tab is active
  useEffect(() => {
    if (!isOpen || activeTab !== 'card') return;

    setIsGeneratingCard(true);
    const canvas = cardCanvasRef.current || document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 630; // Standard OpenGraph 1.91:1 social card size
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // 1. Dark High-Contrast Background
      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Subtle grid overlay
      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // 2. White Inner Frame / Card Container
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 8;
      const margin = 40;
      ctx.fillRect(margin, margin, canvas.width - margin * 2, canvas.height - margin * 2);
      ctx.strokeRect(margin, margin, canvas.width - margin * 2, canvas.height - margin * 2);

      // Top Tag Badge
      ctx.fillStyle = '#000000';
      ctx.fillRect(margin + 30, margin + 30, 220, 36);
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 14px monospace';
      ctx.fillText('KINETIC ANAGRAM', margin + 45, margin + 53);

      // Source Phrase Kicker
      ctx.fillStyle = '#71717a';
      ctx.font = '700 18px monospace';
      ctx.fillText('SOURCE NAME / INPUT:', margin + 30, margin + 110);

      ctx.fillStyle = '#000000';
      ctx.font = '900 38px monospace';
      const cleanSource = sourceName.toUpperCase() || 'ANAGRAM';
      ctx.fillText(cleanSource.slice(0, 32), margin + 30, margin + 155);

      // Divider Line
      ctx.strokeStyle = '#e4e4e7';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(margin + 30, margin + 185);
      ctx.lineTo(canvas.width - margin - 30, margin + 185);
      ctx.stroke();

      // Target Phrase
      ctx.fillStyle = '#71717a';
      ctx.font = '700 18px monospace';
      ctx.fillText('REARRANGED ANAGRAM TARGET:', margin + 30, margin + 230);

      ctx.fillStyle = '#000000';
      ctx.font = '900 48px monospace';
      const cleanTarget = targetPhrase.toUpperCase() || cleanSource;
      ctx.fillText(cleanTarget.slice(0, 28), margin + 30, margin + 290);

      // Anagram Letter Tiles Preview Box
      const tilesY = margin + 340;
      const letters = cleanTarget.replace(/[^A-Z]/g, '').split('');
      let tileX = margin + 30;
      const maxLetterShow = Math.min(letters.length, 16);

      for (let i = 0; i < maxLetterShow; i++) {
        const char = letters[i];
        ctx.fillStyle = '#000000';
        ctx.fillRect(tileX, tilesY, 44, 48);
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 24px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(char, tileX + 22, tilesY + 33);
        tileX += 52;
      }
      ctx.textAlign = 'left';

      // Footer Bar
      ctx.fillStyle = '#09090b';
      ctx.fillRect(margin, canvas.height - margin - 60, canvas.width - margin * 2, 60);

      ctx.fillStyle = '#ffffff';
      ctx.font = '800 16px monospace';
      ctx.fillText('GENERATED WITH GOOGLE AI STUDIO · ANAGRAM SOLVER & EXPLORER', margin + 30, canvas.height - margin - 24);

      setCardDataUrl(canvas.toDataURL('image/png'));
      setIsGeneratingCard(false);
    }
  }, [isOpen, activeTab, sourceName, targetPhrase]);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    triggerHaptic('snap');
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      onShowToast('Copied shareable link to clipboard!');
      setTimeout(() => setCopied(false), 2200);
    } catch {
      onShowToast('Link ready: ' + shareUrl);
    }
  };

  const handleNativeShare = async () => {
    triggerHaptic('snap');
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({
          title: `Kinetic Anagram: ${sourceName} → ${targetPhrase || sourceName}`,
          text: `Check out this kinetic anagram animation: "${sourceName}" → "${targetPhrase || sourceName}"`,
          url: shareUrl,
        });
        onShowToast('Shared successfully!');
      } catch (err: any) {
        if (!err?.message?.includes('abort')) {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  const handleDownloadCard = () => {
    if (!cardDataUrl) return;
    triggerHaptic('success');
    const link = document.createElement('a');
    const safeName = (sourceName || 'anagram').toLowerCase().replace(/[^a-z0-9]/g, '-');
    link.download = `anagram-card-${safeName}.png`;
    link.href = cardDataUrl;
    link.click();
    onShowToast('Downloaded social media card (.png)');
  };

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
        onShowToast('Export failed: ' + (err?.message || 'Unknown error'));
      }
    } finally {
      setIsRecording(false);
      abortControllerRef.current = null;
    }
  };

  const tweetIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    `Check out this kinetic anagram: "${sourceName}" → "${targetPhrase || sourceName}"`
  )}&url=${encodeURIComponent(shareUrl)}`;

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(
    `Kinetic Anagram: "${sourceName}" → "${targetPhrase || sourceName}" ${shareUrl}`
  )}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs select-none">
      <div className="w-full max-w-lg bg-white border-2 border-black rounded-xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b-2 border-black flex items-center justify-between bg-zinc-50">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-black" />
            <h2 className="text-xs sm:text-sm font-mono font-black uppercase tracking-wider text-black">
              Share Anagram Animation
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-zinc-600 hover:text-black hover:bg-zinc-200 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher: Link / Social Card / MP4 Video */}
        <div className="flex border-b border-zinc-300 bg-zinc-100 p-1 gap-1">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setActiveTab('link');
            }}
            className={`flex-1 py-1.5 px-2 rounded-md font-mono text-[10px] sm:text-[11px] font-bold uppercase transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'link'
                ? 'bg-black text-white shadow-xs'
                : 'text-zinc-600 hover:text-black hover:bg-zinc-200/70'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Deep Link</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setActiveTab('card');
            }}
            className={`flex-1 py-1.5 px-2 rounded-md font-mono text-[10px] sm:text-[11px] font-bold uppercase transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'card'
                ? 'bg-black text-white shadow-xs'
                : 'text-zinc-600 hover:text-black hover:bg-zinc-200/70'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Social Card</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setActiveTab('video');
            }}
            className={`flex-1 py-1.5 px-2 rounded-md font-mono text-[10px] sm:text-[11px] font-bold uppercase transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'video'
                ? 'bg-black text-white shadow-xs'
                : 'text-zinc-600 hover:text-black hover:bg-zinc-200/70'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>MP4 Video</span>
          </button>
        </div>

        {/* TAB 1: DEEP LINK SHARE */}
        {activeTab === 'link' && (
          <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto">
            {/* Phrase Kicker Summary */}
            <div className="p-3 bg-zinc-50 border-2 border-black rounded-lg flex flex-col gap-1">
              <span className="text-[9px] font-mono font-extrabold uppercase text-zinc-500 tracking-wider">
                CURRENT ANAGRAM REARRANGEMENT
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-sm font-black text-black uppercase">{sourceName}</span>
                <span className="text-zinc-400 font-mono text-xs font-bold">→</span>
                <span className="font-mono text-sm font-black text-black uppercase underline underline-offset-2">
                  {targetPhrase || sourceName}
                </span>
              </div>
            </div>

            {/* Deep Link URL Box */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono font-bold uppercase text-zinc-700 tracking-wider">
                Shareable Interactive Link
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  className="flex-1 px-3 py-2 bg-zinc-100 border-2 border-black rounded-lg text-xs font-mono font-bold text-black select-all focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={`px-3.5 py-2 min-h-[40px] rounded-lg border-2 border-black text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95 ${
                    copied
                      ? 'bg-emerald-600 text-white border-emerald-700'
                      : 'bg-black text-white hover:bg-zinc-800'
                  }`}
                >
                  {copied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
              <span className="text-[9.5px] font-mono text-zinc-500">
                Anyone opening this link will see this exact anagram pre-loaded into the kinetic solver.
              </span>
            </div>

            {/* Native Share & Quick Social Shortcuts */}
            <div className="flex flex-col gap-2 pt-2 border-t border-zinc-200">
              <span className="text-[10px] font-mono font-extrabold uppercase text-zinc-500 tracking-wider">
                Quick Share Options
              </span>

              <div className="grid grid-cols-1 xs:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="py-2 px-3 bg-zinc-900 text-white hover:bg-black rounded-lg border border-black text-xs font-mono font-bold uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Device Share</span>
                </button>

                <a
                  href={tweetIntentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2 px-3 bg-zinc-100 hover:bg-zinc-200 text-black rounded-lg border border-zinc-300 text-xs font-mono font-bold uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Post on X</span>
                </a>

                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2 px-3 bg-zinc-100 hover:bg-zinc-200 text-black rounded-lg border border-zinc-300 text-xs font-mono font-bold uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SOCIAL MEDIA PREVIEW CARD */}
        {activeTab === 'card' && (
          <div className="flex-1 flex flex-col p-4 gap-3 overflow-y-auto">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-extrabold uppercase text-zinc-500 tracking-wider">
                1200×630 OpenGraph Preview Image
              </span>
              {cardDataUrl && (
                <button
                  type="button"
                  onClick={handleDownloadCard}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-black text-white rounded text-xs font-mono font-bold uppercase hover:bg-zinc-800 cursor-pointer shadow-xs active:scale-95 transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Card (.png)</span>
                </button>
              )}
            </div>

            {/* Social Card Canvas Preview Container */}
            <div className="w-full aspect-[1.91/1] bg-zinc-900 border-2 border-black rounded-lg overflow-hidden flex items-center justify-center relative shadow-inner">
              {cardDataUrl ? (
                <img
                  src={cardDataUrl}
                  alt="Anagram Social Media Card Preview"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="flex items-center gap-2 text-zinc-400 font-mono text-xs">
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Rendering card canvas...</span>
                </div>
              )}
            </div>

            <p className="text-[9.5px] font-mono text-zinc-500 text-center">
              High-resolution PNG formatted for Twitter/X cards, LinkedIn posts, Discord embeds, and Instagram.
            </p>
          </div>
        )}

        {/* TAB 3: MP4 VIDEO EXPORT */}
        {activeTab === 'video' && (
          <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-mono font-bold uppercase text-zinc-700 tracking-wider">
                Canvas Resolution & Format
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: '16:9' as const, label: '16:9 Widescreen', sub: '1280 × 720' },
                  { id: '1:1' as const, label: '1:1 Square', sub: '1080 × 1080' },
                  { id: 'stage' as const, label: 'Stage Bounds', sub: 'Current viewport' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setFormatPreset(item.id);
                    }}
                    className={`p-2 rounded-lg border-2 text-left transition-all cursor-pointer ${
                      formatPreset === item.id
                        ? 'bg-black text-white border-black shadow-xs font-bold'
                        : 'bg-white text-zinc-800 border-zinc-200 hover:border-black font-medium'
                    }`}
                  >
                    <div className="text-[11px] font-mono uppercase font-black">{item.label}</div>
                    <div className="text-[9px] font-mono text-zinc-400 mt-0.5">{item.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Frame Rate */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-200">
              <span className="text-[10px] font-mono font-bold uppercase text-zinc-700">Frame Rate</span>
              <div className="flex items-center gap-1">
                {[60, 30].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setFps(rate as VideoFpsOption);
                    }}
                    className={`px-3 py-1 rounded text-xs font-mono font-bold cursor-pointer border ${
                      fps === rate
                        ? 'bg-black text-white border-black'
                        : 'bg-zinc-100 text-zinc-600 border-zinc-200 hover:border-black'
                    }`}
                  >
                    {rate} FPS
                  </button>
                ))}
              </div>
            </div>

            {/* Progress / Status */}
            {isRecording ? (
              <div className="flex flex-col gap-2 p-3 bg-zinc-50 border-2 border-black rounded-lg">
                <div className="flex items-center justify-between text-xs font-mono font-black uppercase">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                    <span>{statusText || 'Rendering video frames...'}</span>
                  </div>
                  <span>{progressPercent}%</span>
                </div>
                <div className="w-full h-2 bg-zinc-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-black transition-all duration-150"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleStartRecording}
                className="w-full py-3 bg-black hover:bg-zinc-800 text-white rounded-lg border-2 border-black font-mono font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-98 transition-all"
              >
                <Video className="w-4 h-4 text-white" />
                <span>Render & Download 60fps MP4 Reveal</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
