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
  const height = h * 0.22 + seed01(m.order * 37) * (h * 0.28);
  y -= Math.sin(normT * Math.PI) * height;
  x += Math.sin(normT * Math.PI) * dir * (12 + seed01(m.order * 7) * 26);
  const rotation = Math.sin(normT * Math.PI) * (dir * 0.35);

  return { x, y, rotation, scale, local };
}

export function fitFontSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  start = 54
): number {
  let size = start;
  while (size > 14) {
    ctx.font = `bold ${size}px Inter, -apple-system, BlinkMacSystemFont, sans-serif`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 2;
  }
  return size;
}

export function computeGlyphLayout(
  ctx: CanvasRenderingContext2D,
  text: string,
  y: number,
  fontSize: number,
  canvasWidth: number
): Glyph[] {
  ctx.font = `bold ${fontSize}px Inter, -apple-system, BlinkMacSystemFont, sans-serif`;
  const chars = [...text];
  const widths = chars.map(ch => ctx.measureText(ch).width);
  const totalWidth = widths.reduce((a, b) => a + b, 0);

  let cursor = canvasWidth / 2 - totalWidth / 2;
  const glyphs: Glyph[] = [];

  chars.forEach((ch, i) => {
    const w = widths[i];
    glyphs.push({
      char: ch,
      letter: /[A-Za-z]/.test(ch),
      x: cursor + w / 2,
      y,
      w,
      index: i,
    });
    cursor += w;
  });

  return glyphs;
}

export function mapGlyphs(
  srcGlyphs: Glyph[],
  dstGlyphs: Glyph[]
): RenderLetterMapping[] {
  const buckets: Record<string, Glyph[]> = {};
  srcGlyphs.forEach(g => {
    if (!g.letter) return;
    const k = g.char.toLowerCase();
    if (!buckets[k]) buckets[k] = [];
    buckets[k].push(g);
  });

  const mapping: RenderLetterMapping[] = [];
  const used: Record<string, number> = {};

  dstGlyphs.forEach(g => {
    if (!g.letter) return;
    const k = g.char.toLowerCase();
    const n = used[k] || 0;
    const s = (buckets[k] || [])[n];
    used[k] = n + 1;
    if (s) {
      mapping.push({
        char: g.char,
        from: { x: s.x, y: s.y, char: s.char, index: s.index },
        to: { x: g.x, y: g.y, char: g.char, index: g.index },
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
): { mapping: RenderLetterMapping[]; src: Glyph[]; dst: Glyph[]; fontSize: number } {
  const maxW = canvasWidth - 80;
  const sizeFrom = fitFontSize(ctx, from, maxW, Math.min(54, Math.floor(canvasHeight * 0.16)));
  const sizeTo = fitFontSize(ctx, to, maxW, Math.min(54, Math.floor(canvasHeight * 0.16)));
  const fontSize = Math.min(sizeFrom, sizeTo);

  const centerY = canvasHeight / 2;
  const src = computeGlyphLayout(ctx, from, centerY, fontSize, canvasWidth);
  const dst = computeGlyphLayout(ctx, to, centerY, fontSize, canvasWidth);
  const mapping = mapGlyphs(src, dst);

  return { mapping, src, dst, fontSize };
}
