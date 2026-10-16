import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import { renderRearrangementCanvas } from '../render/stage';
import type { MotionStyle } from '../render/mapping';

export interface RecordVideoOptions {
  sourceName: string;
  targetPhrase: string;
  motionStyle?: MotionStyle;
  width?: number;
  height?: number;
  fps?: number;
  duration?: number;
  onProgress?: (percent: number, statusText: string) => void;
  signal?: AbortSignal;
}

/**
 * Computes the kinetic animation progress for a given elapsed time `t`
 * Includes an intro hold so the viewer reads the initial phrase,
 * smooth cubic easing during letter rearrangement,
 * and an outro hold so the viewer appreciates the solved reveal.
 */
function computeProgressAtTime(t: number, totalDuration: number): number {
  const introHold = 0.65; // Seconds to display source phrase
  const outroHold = 1.0; // Seconds to display solved anagram
  const animDuration = Math.max(0.5, totalDuration - introHold - outroHold);

  if (t <= introHold) {
    return 0.0;
  }
  if (t >= totalDuration - outroHold) {
    return 1.0;
  }

  const animT = (t - introHold) / animDuration;
  // Smooth cubic ease-in-out
  const eased =
    animT < 0.5
      ? 4 * animT * animT * animT
      : 1 - Math.pow(-2 * animT + 2, 3) / 2;

  return Math.max(0, Math.min(1, eased));
}

/**
 * Sanitizes a phrase into a clean file-friendly slug
 */
export function generateVideoFilename(sourceName: string, targetPhrase: string): string {
  const primary = (targetPhrase.trim() || sourceName.trim())
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const timestamp = new Date().toISOString().slice(0, 10);
  return `${primary || 'anagram'}-reveal-${timestamp}.mp4`;
}

/**
 * Initiates browser download of a generated video blob
 */
export function downloadVideoBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1200);
}

/**
 * Attempts recording using WebCodecs VideoEncoder + mp4-muxer.
 * Guarantees frame-accurate, high-bitrate, deterministic MP4 encoding.
 */
async function recordWithWebCodecs(
  canvas: HTMLCanvasElement,
  options: RecordVideoOptions
): Promise<Blob> {
  const {
    sourceName,
    targetPhrase,
    motionStyle = 'arc',
    width = 1280,
    height = 720,
    fps = 60,
    duration = 4.2,
    onProgress,
    signal,
  } = options;

  // VideoEncoder requires even dimensions (divisible by 2)
  const evenWidth = Math.round(width / 2) * 2;
  const evenHeight = Math.round(height / 2) * 2;

  const candidateCodecs = [
    'avc1.42001f', // Baseline profile
    'avc1.4d001f', // Main profile
    'avc1.640028', // High profile
    'avc1.42e01e',
  ];

  let selectedCodec: string | null = null;
  for (const c of candidateCodecs) {
    try {
      const res = await (window as any).VideoEncoder.isConfigSupported({
        codec: c,
        width: evenWidth,
        height: evenHeight,
        bitrate: 4_500_000,
      });
      if (res?.supported) {
        selectedCodec = c;
        break;
      }
    } catch {
      // test next codec
    }
  }

  if (!selectedCodec) {
    throw new Error('No compatible H.264 video codec supported by WebCodecs');
  }

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: {
      codec: 'avc',
      width: evenWidth,
      height: evenHeight,
    },
    fastStart: 'in-memory',
  });

  let encoderError: Error | null = null;
  const encoder = new (window as any).VideoEncoder({
    output: (chunk: any, meta: any) => muxer.addVideoChunk(chunk, meta),
    error: (err: any) => {
      encoderError = err instanceof Error ? err : new Error(String(err));
    },
  });

  encoder.configure({
    codec: selectedCodec,
    width: evenWidth,
    height: evenHeight,
    bitrate: 4_500_000,
  });

  const totalFrames = Math.round(duration * fps);

  for (let i = 0; i < totalFrames; i++) {
    if (signal?.aborted) {
      encoder.close();
      throw new Error('Video recording cancelled by user');
    }
    if (encoderError) {
      encoder.close();
      throw encoderError;
    }

    const t = i / fps;
    const progress = computeProgressAtTime(t, duration);

    // Draw the exact frame
    renderRearrangementCanvas(progress, canvas, sourceName, targetPhrase, motionStyle);

    // Create VideoFrame with microsecond timestamp
    const timestampMicros = Math.round(t * 1_000_000);
    const videoFrame = new (window as any).VideoFrame(canvas, {
      timestamp: timestampMicros,
      duration: Math.round((1 / fps) * 1_000_000),
    });

    const isKeyframe = i % (fps * 2) === 0;
    encoder.encode(videoFrame, { keyFrame: isKeyframe });
    videoFrame.close();

    // Progress update
    const percent = Math.min(92, Math.round(((i + 1) / totalFrames) * 92));
    onProgress?.(percent, `Capturing frame ${i + 1} of ${totalFrames}...`);

    // Periodic yield to maintain browser responsiveness
    if (i % 8 === 0) {
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  onProgress?.(95, 'Muxing MP4 stream...');
  await encoder.flush();
  muxer.finalize();
  encoder.close();

  onProgress?.(100, 'Video ready!');
  return new Blob([muxer.target.buffer], { type: 'video/mp4' });
}

/**
 * Fallback recording using MediaRecorder and canvas.captureStream().
 */
async function recordWithMediaRecorder(
  canvas: HTMLCanvasElement,
  options: RecordVideoOptions
): Promise<Blob> {
  const {
    sourceName,
    targetPhrase,
    motionStyle = 'arc',
    fps = 30,
    duration = 4.2,
    onProgress,
    signal,
  } = options;

  if (typeof (canvas as any).captureStream !== 'function') {
    throw new Error('Canvas captureStream is not supported in this browser');
  }

  const stream = (canvas as any).captureStream(fps);

  const candidateMimeTypes = [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4;codecs=avc1',
    'video/mp4;codecs=h264',
    'video/mp4',
    'video/webm;codecs=h264',
    'video/webm;codecs=vp9',
    'video/webm',
  ];

  let chosenMime = '';
  for (const mime of candidateMimeTypes) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mime)) {
      chosenMime = mime;
      break;
    }
  }

  const recorder = new MediaRecorder(stream, {
    mimeType: chosenMime || undefined,
    videoBitsPerSecond: 4_000_000,
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  const recordingPromise = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => {
      const outputType = chosenMime.startsWith('video/mp4') ? 'video/mp4' : (chosenMime || 'video/mp4');
      resolve(new Blob(chunks, { type: outputType }));
    };
    recorder.onerror = (err) => reject(err);
  });

  recorder.start();

  const startTime = performance.now();
  const totalDurationMs = duration * 1000;

  await new Promise<void>((resolve, reject) => {
    const step = () => {
      if (signal?.aborted) {
        recorder.stop();
        reject(new Error('Video recording cancelled'));
        return;
      }

      const elapsed = performance.now() - startTime;
      const t = elapsed / 1000;
      const progress = computeProgressAtTime(t, duration);

      renderRearrangementCanvas(progress, canvas, sourceName, targetPhrase, motionStyle);

      const percent = Math.min(94, Math.round((elapsed / totalDurationMs) * 94));
      onProgress?.(percent, `Recording video (${Math.round(t)}s / ${Math.round(duration)}s)...`);

      if (elapsed < totalDurationMs) {
        requestAnimationFrame(step);
      } else {
        onProgress?.(96, 'Finishing recording...');
        recorder.stop();
        resolve();
      }
    };

    requestAnimationFrame(step);
  });

  const recordedBlob = await recordingPromise;
  onProgress?.(100, 'Video ready!');
  return recordedBlob;
}

/**
 * Main recording function.
 * Sets up an offscreen rendering surface, captures the animation sequence,
 * and returns the generated MP4 Blob.
 */
export async function recordAnagramVideo(options: RecordVideoOptions): Promise<Blob> {
  const {
    width = 1280,
    height = 720,
    onProgress,
  } = options;

  // Create an offscreen canvas with fixed pixel dimensions
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width / 2) * 2;
  canvas.height = Math.round(height / 2) * 2;

  // Mount offscreen canvas to guarantee CSS client dimensions match canvas pixels
  canvas.style.position = 'fixed';
  canvas.style.left = '-9999px';
  canvas.style.top = '-9999px';
  canvas.style.width = `${canvas.width}px`;
  canvas.style.height = `${canvas.height}px`;
  canvas.style.visibility = 'hidden';
  canvas.style.pointerEvents = 'none';
  document.body.appendChild(canvas);

  try {
    onProgress?.(2, 'Initializing video recorder...');

    // Prefer high-speed, frame-accurate WebCodecs + mp4-muxer
    const hasWebCodecs =
      typeof window !== 'undefined' &&
      typeof (window as any).VideoEncoder !== 'undefined' &&
      typeof (window as any).VideoFrame !== 'undefined';

    if (hasWebCodecs) {
      try {
        return await recordWithWebCodecs(canvas, options);
      } catch (wcErr) {
        console.warn('WebCodecs recording attempt failed, falling back to MediaRecorder:', wcErr);
      }
    }

    // Reliable fallback via MediaRecorder
    return await recordWithMediaRecorder(canvas, options);
  } finally {
    if (canvas.parentNode) {
      canvas.parentNode.removeChild(canvas);
    }
  }
}
