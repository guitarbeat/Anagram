import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import { AnimationSpeed, AspectRatio, CanvasTheme, LoopMode, MotionStyle } from '../types';

export interface GifExportOptions {
  canvas: HTMLCanvasElement;
  source: string;
  target: string;
  motionStyle: MotionStyle;
  speed: AnimationSpeed;
  loopMode: LoopMode;
  aspectRatio: AspectRatio;
  theme: CanvasTheme;
  customSubtitle?: string;
  onProgress?: (progress: number) => void;
  renderFrame: (progress: number, canvas: HTMLCanvasElement) => void;
}

export async function createRearrangementGif(options: GifExportOptions): Promise<{ url: string; blob: Blob }> {
  const {
    canvas,
    speed,
    loopMode,
    aspectRatio,
    onProgress,
    renderFrame,
  } = options;

  // Set resolution based on aspect ratio
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

  const framesCount = speed === 'slow' ? 56 : speed === 'fast' ? 32 : speed === 'turbo' ? 24 : 44;
  const frameDelay = speed === 'slow' ? 70 : speed === 'fast' ? 42 : speed === 'turbo' ? 32 : 55;

  const gif = GIFEncoder();
  const forwardFrames: number[] = Array.from({ length: framesCount }, (_, i) => i / (framesCount - 1));
  const sequence = loopMode === 'pingpong'
    ? [...forwardFrames, ...forwardFrames.slice(0, -1).reverse()]
    : forwardFrames;

  const repeatMode = loopMode === 'once' ? -1 : 0;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  for (let i = 0; i < sequence.length; i++) {
    renderFrame(sequence[i], canvas);

    const rgba = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const palette = quantize(rgba, 256);
    const indexed = applyPalette(rgba, palette);

    const isTurnaround = loopMode === 'pingpong' && i === framesCount - 1;
    const isEnd = i === sequence.length - 1;

    let delay = frameDelay;
    if (isTurnaround) delay = 520;
    else if (isEnd && loopMode === 'once') delay = 1200;
    else if (isEnd) delay = 600;

    gif.writeFrame(indexed, canvas.width, canvas.height, {
      palette,
      delay,
      repeat: i === 0 ? repeatMode : undefined,
    });

    if (i % 3 === 0 || i === sequence.length - 1) {
      onProgress?.(Math.round(((i + 1) / sequence.length) * 100));
      await new Promise(r => setTimeout(r, 0));
    }
  }

  gif.finish();
  const blob = new Blob([gif.bytes()], { type: 'image/gif' });
  const url = URL.createObjectURL(blob);
  return { url, blob };
}
