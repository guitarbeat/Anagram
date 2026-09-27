export interface Glyph {
  char: string;
  letter: boolean;
  x: number;
  y: number;
  w: number;
  index: number;
}

export interface RenderLetterMapping {
  char: string;
  from: { x: number; y: number; char: string; index: number };
  to: { x: number; y: number; char: string; index: number };
  order: number;
}

export type MotionStyle = 'arc';

export function clamp(x: number, a = 0, b = 1): number {
  return Math.max(a, Math.min(b, x));
}

export function smoother(t: number): number {
  t = clamp(t);
  return t * t * t * (t * (t * 6 - 15) + 10);
}

export function seed01(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

export function computeLetterTransform(
  m: RenderLetterMapping,
  normT: number,
  _motionStyle: MotionStyle = 'arc',
  _w: number,
  h: number,
  _totalLetters = 16
): { x: number; y: number; rotation: number; scale: number; local: number; shadowBlur: number; shadowY: number } {
  const local = smoother(normT);
  let x = m.from.x + (m.to.x - m.from.x) * local;
  let y = m.from.y + (m.to.y - m.from.y) * local;

  const dir = seed01(m.order * 19) > 0.5 ? 1 : -1;
  const arcPeak = Math.sin(normT * Math.PI);
  const archHeight = Math.min(h * 0.42, Math.max(14, 12 + seed01(m.order * 37) * 22));

  // Natural curved trajectory across canvas
  y -= arcPeak * archHeight * (m.from.y === m.to.y ? (dir * 0.85) : 1);
  x += arcPeak * dir * (4 + seed01(m.order * 7) * 12);

  // Dynamic 3D depth scale: Letters lift closer to camera mid-flight
  let scale = 1 + arcPeak * 0.28;

  // Landing spring impact pop when letter arrives at target
  if (normT >= 0.92) {
    const landingProgress = (normT - 0.92) / 0.08;
    const pop = Math.sin(landingProgress * Math.PI) * 0.12;
    scale = 1 + pop;
  }

  // Tilt/rotate during arc movement
  const rotation = arcPeak * (dir * 0.28);

  // Shadow physics for 3D elevation feeling
  const shadowBlur = arcPeak * 16;
  const shadowY = arcPeak * 8;

  return { x, y, rotation, scale, local, shadowBlur, shadowY };
}

export function fitFontSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  start = 42
): number {
  let size = start;
  while (size > 6) {
    ctx.font = `bold ${size}px 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 1;
  }
  return size;
}

export function computeGlyphLayoutAtCenter(
  ctx: CanvasRenderingContext2D,
  text: string,
  y: number,
  fontSize: number,
  centerX: number
): Glyph[] {
  const upperText = text.toUpperCase();
  ctx.font = `bold ${fontSize}px 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
  const chars = [...upperText];
  const widths = chars.map(ch => ctx.measureText(ch).width);
  const totalWidth = widths.reduce((a, b) => a + b, 0);

  let cursor = centerX - totalWidth / 2;
  const glyphs: Glyph[] = [];

  chars.forEach((ch, i) => {
    const w = widths[i];
    glyphs.push({
      char: ch,
      letter: /[A-Z]/.test(ch),
      x: cursor + w / 2,
      y,
      w,
      index: i,
    });
    cursor += w;
  });

  return glyphs;
}

export function computeGlyphLayout(
  ctx: CanvasRenderingContext2D,
  text: string,
  y: number,
  fontSize: number,
  canvasWidth: number
): Glyph[] {
  return computeGlyphLayoutAtCenter(ctx, text, y, fontSize, canvasWidth / 2);
}

export function mapGlyphs(
  srcGlyphs: Glyph[],
  dstGlyphs: Glyph[]
): RenderLetterMapping[] {
  const buckets: Record<string, Glyph[]> = {};
  srcGlyphs.forEach(g => {
    if (!g.letter) return;
    const k = g.char.toUpperCase();
    if (!buckets[k]) buckets[k] = [];
    buckets[k].push(g);
  });

  const mapping: RenderLetterMapping[] = [];
  const used: Record<string, number> = {};

  dstGlyphs.forEach(g => {
    if (!g.letter) return;
    const k = g.char.toUpperCase();
    const n = used[k] || 0;
    const s = (buckets[k] || [])[n];
    used[k] = n + 1;
    if (s) {
      mapping.push({
        char: g.char.toUpperCase(),
        from: { x: s.x, y: s.y, char: s.char.toUpperCase(), index: s.index },
        to: { x: g.x, y: g.y, char: g.char.toUpperCase(), index: g.index },
        order: mapping.length,
      });
    }
  });

  return mapping;
}

export function buildLetterMapping(
  ctx: CanvasRenderingContext2D,
  from: string,
  to: string,
  canvasWidth: number,
  canvasHeight: number
): {
  mapping: RenderLetterMapping[];
  src: Glyph[];
  dst: Glyph[];
  fontSize: number;
  srcY: number;
  dstY: number;
  isSideBySide: boolean;
  arrowPos?: { x: number; y: number };
} {
  const upperFrom = from.toUpperCase();
  const upperTo = to.toUpperCase();

  // Decide if shrunk / wide aspect ratio calls for Side-by-Side layout
  const isSideBySide = canvasHeight <= 115 || (canvasWidth / Math.max(1, canvasHeight) >= 3.0 && canvasWidth >= 380);

  if (isSideBySide) {
    // Side by Side: Source on Left, Target on Right
    // Horizontal gap size that expands gracefully but keeps safety margins
    const gap = Math.max(28, canvasWidth * 0.12);
    // Real, mathematical remaining width for each half, leaving a clean 16px safety margin on the outer edges
    const allowedHalfWidth = Math.max(40, (canvasWidth - gap - 32) / 2);

    const targetMaxFont = Math.min(100, Math.max(12, Math.floor(canvasHeight * 0.65)));
    const sizeFrom = fitFontSize(ctx, upperFrom, allowedHalfWidth, targetMaxFont);
    const sizeTo = fitFontSize(ctx, upperTo, allowedHalfWidth, targetMaxFont);
    const fontSize = Math.max(10, Math.min(sizeFrom, sizeTo));

    const leftCenterX = (canvasWidth - gap) / 4 + 8;
    const rightCenterX = canvasWidth - (canvasWidth - gap) / 4 - 8;
    const midY = canvasHeight / 2;

    const src = computeGlyphLayoutAtCenter(ctx, upperFrom, midY, fontSize, leftCenterX);
    const dst = computeGlyphLayoutAtCenter(ctx, upperTo, midY, fontSize, rightCenterX);
    const mapping = mapGlyphs(src, dst);

    return {
      mapping,
      src,
      dst,
      fontSize,
      srcY: midY,
      dstY: midY,
      isSideBySide: true,
      arrowPos: { x: canvasWidth / 2, y: midY },
    };
  } else {
    // Two-line stacked: Source on Line 1 (Top), Target on Line 2 (Bottom)
    // Real remaining width leaving a clean 32px padding on each side so letters are 100% visible
    const allowedW = Math.max(60, canvasWidth - 64);
    const targetMaxFont = Math.min(110, Math.max(14, Math.floor(canvasHeight * 0.35)));
    const sizeFrom = fitFontSize(ctx, upperFrom, allowedW, targetMaxFont);
    const sizeTo = fitFontSize(ctx, upperTo, allowedW, targetMaxFont);
    const fontSize = Math.max(11, Math.min(sizeFrom, sizeTo));

    // Dynamic line spacing to prevent vertical line collisions, bounded gracefully by height proportions
    const lineSpacing = Math.max(28, Math.min(canvasHeight * 0.40, fontSize * 1.5));
    const srcY = canvasHeight / 2 - lineSpacing / 2;
    const dstY = canvasHeight / 2 + lineSpacing / 2;

    const src = computeGlyphLayout(ctx, upperFrom, srcY, fontSize, canvasWidth);
    const dst = computeGlyphLayout(ctx, upperTo, dstY, fontSize, canvasWidth);
    const mapping = mapGlyphs(src, dst);

    return { mapping, src, dst, fontSize, srcY, dstY, isSideBySide: false };
  }
}
