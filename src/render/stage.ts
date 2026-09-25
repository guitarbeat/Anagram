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
  const clientW = canvas.clientWidth || (canvas.width / dpr);
  const clientH = canvas.clientHeight || (canvas.height / dpr);

  // Strictly sync buffer resolution with CSS client dimensions to avoid any distortion or smushing
  const targetBufferW = Math.round(clientW * dpr);
  const targetBufferH = Math.round(clientH * dpr);
  if (targetBufferW > 0 && targetBufferH > 0 && (canvas.width !== targetBufferW || canvas.height !== targetBufferH)) {
    canvas.width = targetBufferW;
    canvas.height = targetBufferH;
  }

  const w = clientW;
  const h = clientH;

  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);

  if (!fromText || !toText) {
    ctx.restore();
    return;
  }

  const upperFrom = fromText.toUpperCase();
  const upperTo = toText.toUpperCase();

  const { mapping, src, dst, fontSize, srcY, dstY, isSideBySide, arrowPos } = buildLetterMapping(
    ctx,
    upperFrom,
    upperTo,
    w,
    h
  );

  ctx.font = `bold ${fontSize}px 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // 1. In Side-by-Side mode, draw subtle transition arrow in the center
  if (isSideBySide && arrowPos) {
    ctx.save();
    ctx.font = `bold ${Math.max(12, fontSize * 0.9)}px 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillText('→', arrowPos.x, arrowPos.y);
    ctx.restore();
  }

  // 2. Draw static source ghost baseline on Left (or Line 1)
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
  src.forEach(g => {
    ctx.fillText(g.char, g.x, g.y);
  });
  ctx.restore();

  // 3. Draw static destination ghost targets on Right (or Line 2)
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
  dst.forEach(g => {
    ctx.fillText(g.char, g.x, g.y);
  });
  ctx.restore();

  // 4. Draw static non-letter punctuation symbols (e.g. '-' or "'") from source
  const nonLetterPunctuation = src.filter(g => !g.letter && g.char.trim());
  if (nonLetterPunctuation.length > 0) {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    nonLetterPunctuation.forEach(g => {
      ctx.fillText(g.char, g.x, g.y);
    });
    ctx.restore();
  }

  // 5. Draw arc trails for each moving letter
  for (const m of mapping) {
    ctx.save();
    ctx.beginPath();
    const steps = 24;
    for (let s = 0; s <= steps; s++) {
      const normT = s / steps;
      const pt = computeLetterTransform(m, normT, motionStyle, w, h, mapping.length);
      if (s === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    }
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
  }

  // 6. Draw animated letters with 3D elevation shadows & scale dynamics
  mapping.forEach(m => {
    const stagger = (m.order / Math.max(1, mapping.length)) * 0.12;
    const normT = clamp((progress - 0.08 - stagger) / 0.82);

    const { x, y, rotation, scale, shadowBlur, shadowY } = computeLetterTransform(
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
      ctx.fillStyle = '#000000';
      ctx.shadowColor = 'rgba(16, 185, 129, 0.25)'; // Gentle emerald glow on arrival
      ctx.shadowBlur = 4;
      ctx.shadowOffsetY = 1;
    } else if (isMoving) {
      ctx.fillStyle = '#09090b';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.22)';
      ctx.shadowBlur = Math.max(4, shadowBlur);
      ctx.shadowOffsetY = Math.max(2, shadowY);
    } else {
      ctx.fillStyle = '#18181b';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.06)';
      ctx.shadowBlur = 2;
      ctx.shadowOffsetY = 1;
    }

    ctx.fillText(m.char, 0, 0);
    ctx.restore();
  });

  ctx.restore();
}
