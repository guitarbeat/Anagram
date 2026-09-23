import {
  computeGlyphLayout,
  mapGlyphs,
  smoother,
  clamp,
} from './mapping';

export function renderMultiAnagramCanvas(
  progress: number,
  canvas: HTMLCanvasElement | null,
  fromText: string,
  targetPhrases: string[]
): void {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const w = canvas.width / dpr;
  const h = canvas.height / dpr;

  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  ctx.clearRect(0, 0, w, h);

  if (!fromText || !targetPhrases || targetPhrases.length === 0) {
    ctx.restore();
    return;
  }

  const targets = targetPhrases.slice(0, 5);
  const count = targets.length;

  const srcFontSize = Math.min(18, Math.max(12, Math.floor(w / (fromText.length * 1.1))));
  ctx.font = `bold ${srcFontSize}px Inter, -apple-system, BlinkMacSystemFont, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const srcY = h * 0.16;
  const srcGlyphs = computeGlyphLayout(ctx, fromText, srcY, srcFontSize, w);

  // Draw source text
  ctx.save();
  ctx.fillStyle = '#f4f4f5';
  srcGlyphs.forEach(g => {
    ctx.fillText(g.char, g.x, g.y);
  });
  ctx.restore();

  const colors = [
    { base: 'hsl(150, 85%, 60%)', dim: 'hsla(150, 85%, 60%, 0.2)' },
    { base: 'hsl(190, 90%, 65%)', dim: 'hsla(190, 90%, 65%, 0.2)' },
    { base: 'hsl(280, 85%, 70%)', dim: 'hsla(280, 85%, 70%, 0.2)' },
    { base: 'hsl(340, 85%, 65%)', dim: 'hsla(340, 85%, 65%, 0.2)' },
    { base: 'hsl(40, 90%, 60%)', dim: 'hsla(40, 90%, 60%, 0.2)' },
  ];

  targets.forEach((target, tIdx) => {
    const col = colors[tIdx % colors.length];
    const targetY = h * 0.52 + (tIdx * ((h * 0.38) / Math.max(1, count - 1)));
    const tFontSize = Math.min(13, Math.max(10, Math.floor(130 / Math.max(1, count))));
    ctx.font = `600 ${tFontSize}px Inter, -apple-system, BlinkMacSystemFont, sans-serif`;

    const dstGlyphs = computeGlyphLayout(ctx, target, targetY, tFontSize, w);
    const mapping = mapGlyphs(srcGlyphs, dstGlyphs);

    for (const m of mapping) {
      ctx.save();
      ctx.beginPath();
      const steps = 12;
      for (let s = 0; s <= steps; s++) {
        const normT = s / steps;
        const local = smoother(normT);
        const x = m.from.x + (m.to.x - m.from.x) * local;
        const curveOffset = Math.sin(normT * Math.PI) * (20 + (tIdx - 2) * 12);
        const y = m.from.y + (m.to.y - m.from.y) * local + curveOffset;
        if (s === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = col.dim;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      const stagger = (m.order / Math.max(1, mapping.length)) * 0.12;
      const normT = clamp((progress - 0.08 - stagger) / 0.82);

      if (normT > 0.01) {
        const local = smoother(normT);
        const curveOffset = Math.sin(normT * Math.PI) * (20 + (tIdx - 2) * 12);
        const px = m.from.x + (m.to.x - m.from.x) * local;
        const py = m.from.y + (m.to.y - m.from.y) * local + curveOffset;

        ctx.save();
        ctx.fillStyle = col.base;
        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fill();

        if (normT > 0.15 && normT < 0.95) {
          ctx.font = `bold 10px Inter, -apple-system, BlinkMacSystemFont, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillText(m.char, px, py - 3);
        }
        ctx.restore();
      }
    }

    ctx.save();
    ctx.font = `600 ${tFontSize}px Inter, -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = progress > 0.8 ? col.base : 'rgba(244, 244, 245, 0.65)';
    dstGlyphs.forEach(g => {
      ctx.fillText(g.char, g.x, g.y);
    });
    ctx.restore();
  });

  ctx.restore();
}
