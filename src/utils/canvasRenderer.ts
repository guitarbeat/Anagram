import { CanvasFont, CanvasTheme, MotionStyle } from '../types';
import { exact } from './anagramSolver';

export interface RenderLetterMapping {
  char: string;
  from: { x: number; y: number; char: string; index: number };
  to: { x: number; y: number; char: string; index: number };
  order: number;
}

export interface RenderThemeConfig {
  bg: string;
  bgGradient?: string[];
  fg: string;
  accent: string;
  accentGlow: string;
  muted: string;
  particleColor: string;
  fontFamily: string;
}

export const FONT_FAMILIES: Record<CanvasFont, string> = {
  mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  sans: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  serif: 'Georgia, Cambria, "Times New Roman", Times, serif',
  cyber: '"Courier New", Monaco, monospace',
  pixel: '"Courier New", monospace',
};

export const THEME_CONFIGS: Record<CanvasTheme, RenderThemeConfig> = {
  dark: {
    bg: '#09090b',
    bgGradient: ['#141418', '#09090b'],
    fg: '#f4f4f5',
    accent: '#f4f4f5',
    accentGlow: 'rgba(255, 255, 255, 0.45)',
    muted: '#71717a',
    particleColor: '#a1a1aa',
    fontFamily: FONT_FAMILIES.mono,
  },
  light: {
    bg: '#ffffff',
    bgGradient: ['#fafafa', '#f4f4f5'],
    fg: '#09090b',
    accent: '#18181b',
    accentGlow: 'rgba(0, 0, 0, 0.25)',
    muted: '#71717a',
    particleColor: '#a1a1aa',
    fontFamily: FONT_FAMILIES.sans,
  },
  neon: {
    bg: '#050508',
    bgGradient: ['#0d0221', '#050508'],
    fg: '#00f5d4',
    accent: '#ff007f',
    accentGlow: 'rgba(255, 0, 127, 0.6)',
    muted: '#7000ff',
    particleColor: '#00f5d4',
    fontFamily: FONT_FAMILIES.mono,
  },
  cyberpunk: {
    bg: '#0b0c10',
    bgGradient: ['#1f2833', '#0b0c10'],
    fg: '#66fcf1',
    accent: '#ffe600',
    accentGlow: 'rgba(255, 230, 0, 0.5)',
    muted: '#45a29e',
    particleColor: '#ff0055',
    fontFamily: FONT_FAMILIES.cyber,
  },
  parchment: {
    bg: '#fcf6e8',
    bgGradient: ['#fffbf0', '#f4ecd8'],
    fg: '#3d2b1f',
    accent: '#a04000',
    accentGlow: 'rgba(160, 64, 0, 0.25)',
    muted: '#7a6244',
    particleColor: '#d4ac0d',
    fontFamily: FONT_FAMILIES.serif,
  },
  retro: {
    bg: '#2b1055',
    bgGradient: ['#43187a', '#1e0836'],
    fg: '#ffd166',
    accent: '#ff4d6d',
    accentGlow: 'rgba(255, 77, 109, 0.5)',
    muted: '#c77dff',
    particleColor: '#06d6a0',
    fontFamily: FONT_FAMILIES.mono,
  },
  emerald: {
    bg: '#062018',
    bgGradient: ['#0a3327', '#03140f'],
    fg: '#a7f3d0',
    accent: '#10b981',
    accentGlow: 'rgba(16, 185, 129, 0.5)',
    muted: '#34d399',
    particleColor: '#34d399',
    fontFamily: FONT_FAMILIES.mono,
  },
  sunset: {
    bg: '#1a0933',
    bgGradient: ['#380036', '#0c021f'],
    fg: '#fed9b7',
    accent: '#f72585',
    accentGlow: 'rgba(247, 37, 133, 0.5)',
    muted: '#7209b7',
    particleColor: '#4cc9f0',
    fontFamily: FONT_FAMILIES.sans,
  },
};

function clamp(x: number, a = 0, b = 1): number {
  return Math.max(a, Math.min(b, x));
}

function smoother(t: number): number {
  t = clamp(t);
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function bounceEase(t: number): number {
  t = clamp(t);
  if (t < 0.36364) return 7.5625 * t * t;
  if (t < 0.72727) return 7.5625 * (t -= 0.54545) * t + 0.75;
  if (t < 0.90909) return 7.5625 * (t -= 0.81818) * t + 0.9375;
  return 7.5625 * (t -= 0.95455) * t + 0.984375;
}

function seed01(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

function fitFontSize(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, start = 54): number {
  let size = start;
  while (size > 16) {
    ctx.font = `bold ${size}px Inter, sans-serif`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 2;
  }
  return size;
}

interface Glyph {
  char: string;
  letter: boolean;
  x: number;
  y: number;
  w: number;
  index: number;
}

function computeGlyphLayout(ctx: CanvasRenderingContext2D, text: string, y: number, fontSize: number, canvasWidth: number): Glyph[] {
  ctx.font = `bold ${fontSize}px Inter, sans-serif`;
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

  const buckets: Record<string, Glyph[]> = {};
  src.forEach(g => {
    if (!g.letter) return;
    const k = g.char.toLowerCase();
    if (!buckets[k]) buckets[k] = [];
    buckets[k].push(g);
  });

  const mapping: RenderLetterMapping[] = [];
  const used: Record<string, number> = {};

  dst.forEach(g => {
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

  return { mapping, src, dst, fontSize };
}

export function renderRearrangementCanvas(
  progress: number,
  canvas: HTMLCanvasElement,
  source: string,
  target: string,
  motionStyle: MotionStyle = 'arc',
  theme: CanvasTheme = 'dark',
  customSubtitle?: string,
  fontOption?: CanvasFont,
  showGrid: boolean = false,
  trailIntensity: 'none' | 'subtle' | 'high' = 'subtle'
) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  const t = THEME_CONFIGS[theme] || THEME_CONFIGS.dark;
  const activeFont = fontOption ? FONT_FAMILIES[fontOption] : t.fontFamily;

  // Draw background
  if (t.bgGradient && t.bgGradient.length >= 2) {
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, t.bgGradient[0]);
    grad.addColorStop(1, t.bgGradient[1]);
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = t.bg;
  }
  ctx.fillRect(0, 0, w, h);

  // Optional subtle blueprint grid
  if (showGrid) {
    ctx.save();
    ctx.strokeStyle = theme === 'light' ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    const gridSize = 24;
    for (let x = 0; x <= w; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y <= h; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  const from = source.trim();
  const to = target.trim();

  if (!from || !to || !exact(from, to)) {
    ctx.fillStyle = t.muted;
    ctx.font = `600 ${Math.max(16, Math.floor(h * 0.05))}px ${activeFont}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Select or verify an exact anagram pair to animate', w / 2, h / 2);
    return;
  }

  const { mapping, src, dst, fontSize } = buildLetterMapping(ctx, from, to, w, h);

  // Subtitle header
  ctx.font = `600 ${Math.max(11, Math.floor(h * 0.04))}px ${activeFont}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = t.muted;
  ctx.letterSpacing = '2px';
  const subtitle = customSubtitle || 'EXACT ANAGRAM, SAME LETTERS, NEW ORDER';
  ctx.fillText(subtitle.toUpperCase(), w / 2, Math.max(24, Math.floor(h * 0.1)));
  ctx.letterSpacing = '0px';

  const holdStart = 0.12;
  const moveEnd = 0.85;

  ctx.font = `bold ${fontSize}px ${activeFont}`;

  // Draw static non-letter punctuation
  const drawPunctuation = (glyphs: Glyph[], alpha: number) => {
    ctx.save();
    ctx.fillStyle = t.fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = alpha;
    for (const g of glyphs) {
      if (!g.letter && g.char.trim()) {
        ctx.fillText(g.char, g.x, g.y);
      }
    }
    ctx.restore();
  };

  // Draw motion letters
  for (const m of mapping) {
    const stagger = (m.order / Math.max(1, mapping.length)) * 0.14;
    const normT = clamp((progress - holdStart - stagger) / (moveEnd - holdStart - 0.1));
    const local = motionStyle === 'bounce' ? bounceEase(normT) : smoother(normT);

    let x = m.from.x + (m.to.x - m.from.x) * local;
    let y = m.from.y + (m.to.y - m.from.y) * local;
    let rotation = 0;
    let scale = 1;

    if (motionStyle === 'arc') {
      const dir = seed01(m.order * 19) > 0.5 ? 1 : -1;
      const height = (h * 0.22) + seed01(m.order * 37) * (h * 0.28);
      y -= Math.sin(normT * Math.PI) * height;
      x += Math.sin(normT * Math.PI) * dir * (12 + seed01(m.order * 7) * 26);
      rotation = Math.sin(normT * Math.PI) * (dir * 0.35);
    } else if (motionStyle === 'orbit') {
      const angle = (m.order / mapping.length) * Math.PI * 2;
      const orbit = Math.sin(normT * Math.PI);
      x += Math.cos(angle + normT * Math.PI * 2.5) * orbit * (w * 0.14);
      y += Math.sin(angle + normT * Math.PI * 2.5) * orbit * (h * 0.2);
      rotation = Math.sin(normT * Math.PI * 2) * 0.5;
    } else if (motionStyle === 'explosion') {
      const angle = (m.order / mapping.length) * Math.PI * 2 + seed01(m.order * 13);
      const blast = Math.sin(normT * Math.PI) * (h * 0.35);
      x += Math.cos(angle) * blast;
      y += Math.sin(angle) * blast;
      rotation = Math.sin(normT * Math.PI) * (seed01(m.order) > 0.5 ? 1 : -1) * 0.8;
      scale = 1 + Math.sin(normT * Math.PI) * 0.4;
    } else if (motionStyle === 'vortex') {
      const swirl = (1 - normT) * Math.sin(normT * Math.PI) * (w * 0.25);
      const angle = (m.order * 0.6) + normT * Math.PI * 4;
      x += Math.cos(angle) * swirl;
      y += Math.sin(angle) * swirl;
      rotation = normT * Math.PI * 2;
    }

    const inFlight = normT > 0.02 && normT < 0.98;

    ctx.save();
    ctx.translate(x, y);
    if (rotation !== 0) ctx.rotate(rotation);
    if (scale !== 1) ctx.scale(scale, scale);

    // Glow effect when in flight
    if (inFlight) {
      ctx.shadowColor = t.accentGlow;
      ctx.shadowBlur = 16;
      ctx.fillStyle = t.accent;
    } else {
      ctx.fillStyle = t.fg;
      ctx.shadowBlur = 0;
    }

    // Capitalization morphing based on destination
    const displayChar = local > 0.6 ? m.to.char : m.from.char;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(displayChar, 0, 0);
    ctx.restore();

    // Particle sparkles when in motion
    if (inFlight && trailIntensity !== 'none') {
      const particleCount = trailIntensity === 'high' ? 3 : 1;
      ctx.save();
      ctx.fillStyle = t.particleColor;
      for (let p = 0; p < particleCount; p++) {
        const pAngle = seed01(m.order * 23 + p * 17) * Math.PI * 2;
        const pDist = seed01(m.order * 31 + p * 7) * 14 + 6;
        const px = x + Math.cos(pAngle) * pDist;
        const py = y + Math.sin(pAngle) * pDist;
        const pSize = seed01(m.order * 11 + p * 13) * 2 + 1;
        ctx.globalAlpha = Math.sin(normT * Math.PI) * 0.7;
        ctx.beginPath();
        ctx.arc(px, py, pSize, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // Draw source and target punctuation smoothly
  if (progress < holdStart) {
    drawPunctuation(src, 1);
  } else {
    drawPunctuation(dst, clamp((progress - 0.78) / 0.18));
  }

  // Footer badge watermark
  ctx.font = `500 ${Math.max(9, Math.floor(h * 0.032))}px ${activeFont}`;
  ctx.textAlign = 'center';
  ctx.fillStyle = t.muted;
  ctx.globalAlpha = 0.5;
  ctx.fillText('ANAGRAM LAB ANIMATION', w / 2, h - Math.max(16, Math.floor(h * 0.06)));
  ctx.globalAlpha = 1;
}
