import {
  computeGlyphLayout,
  mapGlyphs,
  computeLetterTransform,
  clamp,
  type MotionStyle,
} from './mapping';

export function renderMiniCardCanvas(
  progress: number,
  canvas: HTMLCanvasElement | null,
  fromText: string,
  toText: string,
  motionStyle: MotionStyle = 'arc'
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

  if (!fromText || !toText) {
    ctx.restore();
    return;
  }

  const fontSize = Math.min(13, Math.max(10, Math.floor(h * 0.22)));
  const centerY = h / 2;

  const srcGlyphs = computeGlyphLayout(ctx, fromText, centerY - 10, fontSize, w);
  const dstGlyphs = computeGlyphLayout(ctx, toText, centerY + 10, fontSize, w);
  const mapping = mapGlyphs(srcGlyphs, dstGlyphs);

  ctx.font = `bold ${fontSize}px Inter, -apple-system, BlinkMacSystemFont, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Trails
  for (const m of mapping) {
    ctx.save();
    ctx.beginPath();
    const steps = 10;
    for (let s = 0; s <= steps; s++) {
      const normT = s / steps;
      const pt = computeLetterTransform(m, normT, motionStyle, w, h, mapping.length);
      if (s === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    }
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  // Moving or completed letters
  mapping.forEach(m => {
    const stagger = (m.order / Math.max(1, mapping.length)) * 0.12;
    const normT = clamp((progress - 0.08 - stagger) / 0.82);

    const { x, y, rotation, scale } = computeLetterTransform(
      m,
      normT,
      motionStyle,
      w,
      h,
      mapping.length
    );

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.scale(scale, scale);

    if (normT >= 0.99) {
      ctx.fillStyle = '#34d399';
    } else if (normT > 0.01) {
      ctx.fillStyle = '#f4f4f5';
    } else {
      ctx.fillStyle = 'rgba(244, 244, 245, 0.4)';
    }

    ctx.fillText(m.char, 0, 0);
    ctx.restore();
  });

  ctx.restore();
}
