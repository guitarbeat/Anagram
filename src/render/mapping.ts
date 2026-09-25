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
): { x: number; y: number; rotation: number; scale: number; local: number } {
  const local = smoother(normT);
  let x = m.from.x + (m.to.x - m.from.x) * local;
  let y = m.from.y + (m.to.y - m.from.y) * local;
  const scale = 1;

  const dir = seed01(m.order * 19) > 0.5 ? 1 : -1;
  const archHeight = Math.min(h * 0.35, Math.max(10, 8 + seed01(m.order * 37) * 16));
  
  // Natural curved trajectory across canvas
  y -= Math.sin(normT * Math.PI) * archHeight * (m.from.y === m.to.y ? (dir * 0.8) : 1);
  x += Math.sin(normT * Math.PI) * dir * (3 + seed01(m.order * 7) * 8);
  const rotation = Math.sin(normT * Math.PI) * (dir * 0.12);

  return { x, y, rotation, scale, local };
}

export function fitFontSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  start = 42
): number {
  let size = start;
  while (size > 11) {
    ctx.font = `bold ${size}px Inter, -apple-system, BlinkMacSystemFont, sans-serif`;
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
  ctx.font = `bold ${fontSize}px Inter, -apple-system, BlinkMacSystemFont, sans-serif`;
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
    const gap = Math.max(36, Math.min(80, canvasWidth * 0.08));
    const halfWidth = (canvasWidth - gap - 40) / 2;
    const maxHalfW = Math.max(120, halfWidth);

    const targetMaxFont = Math.min(110, Math.max(13, Math.floor(canvasHeight * 0.65)));
    const sizeFrom = fitFontSize(ctx, upperFrom, maxHalfW, targetMaxFont);
    const sizeTo = fitFontSize(ctx, upperTo, maxHalfW, targetMaxFont);
    const fontSize = Math.max(11, Math.min(sizeFrom, sizeTo));

    const leftCenterX = (canvasWidth - gap) / 4 + 10;
    const rightCenterX = canvasWidth - (canvasWidth - gap) / 4 - 10;
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
    const maxW = Math.max(200, canvasWidth - 48);
    const targetMaxFont = Math.min(130, Math.max(16, Math.floor(canvasHeight * 0.38)));
    const sizeFrom = fitFontSize(ctx, upperFrom, maxW, targetMaxFont);
    const sizeTo = fitFontSize(ctx, upperTo, maxW, targetMaxFont);
    const fontSize = Math.max(13, Math.min(sizeFrom, sizeTo));

    const lineSpacing = Math.max(40, fontSize * 1.45);
    const srcY = canvasHeight / 2 - lineSpacing / 2;
    const dstY = canvasHeight / 2 + lineSpacing / 2;

    const src = computeGlyphLayout(ctx, upperFrom, srcY, fontSize, canvasWidth);
    const dst = computeGlyphLayout(ctx, upperTo, dstY, fontSize, canvasWidth);
    const mapping = mapGlyphs(src, dst);

    return { mapping, src, dst, fontSize, srcY, dstY, isSideBySide: false };
  }
}
