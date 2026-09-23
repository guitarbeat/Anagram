import {
  buildLetterMapping,
  computeLetterTransform,
  clamp,
  type MotionStyle,
} from './mapping';

export function renderRearrangementCanvas(
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

  const { mapping, src, dst, fontSize } = buildLetterMapping(
    ctx,
    fromText,
    toText,
    w,
    h
  );

  ctx.font = `bold ${fontSize}px Inter, -apple-system, BlinkMacSystemFont, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // 1. Draw static destination ghost targets (dim guide)
  ctx.save();
  ctx.fillStyle = 'rgba(244, 244, 245, 0.08)';
  dst.forEach(g => {
    ctx.fillText(g.char, g.x, g.y);
  });
  ctx.restore();

  // 2. Draw static source positions when at start
  if (progress < 0.05) {
    const fade = 1 - progress / 0.05;
    ctx.save();
    ctx.fillStyle = `rgba(244, 244, 245, ${0.4 * fade})`;
    src.forEach(g => {
      ctx.fillText(g.char, g.x, g.y);
    });
    ctx.restore();
  }

  // 3. Draw arc trails for each moving letter
  for (const m of mapping) {
    ctx.save();
    ctx.beginPath();
    const steps = 18;
    for (let s = 0; s <= steps; s++) {
      const normT = s / steps;
      const pt = computeLetterTransform(m, normT, motionStyle, w, h, mapping.length);
      if (s === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    }
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.14)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  // 4. Draw moving letters
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

    const isDone = normT >= 0.99;
    const isMoving = normT > 0.01 && normT < 0.99;

    if (isDone) {
      ctx.fillStyle = '#34d399'; // Emerald completion
      ctx.shadowColor = 'rgba(52, 211, 153, 0.5)';
      ctx.shadowBlur = 8;
    } else if (isMoving) {
      ctx.fillStyle = '#f4f4f5';
      ctx.shadowColor = 'rgba(52, 211, 153, 0.3)';
      ctx.shadowBlur = 5;
    } else {
      ctx.fillStyle = 'rgba(244, 244, 245, 0.75)';
      ctx.shadowBlur = 0;
    }

    ctx.fillText(m.char, 0, 0);
    ctx.restore();
  });

  ctx.restore();
}
