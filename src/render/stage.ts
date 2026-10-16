import {
  buildLetterMapping,
  computeLetterTransform,
  clamp,
  seed01,
  type MotionStyle,
} from './mapping';

export interface ShuffleEffectState {
  intensity: number; // 1.0 down to 0.0
  phase: number;     // discrete ticker for glyph flicker
}

export function renderRearrangementCanvas(
  progress: number,
  canvas: HTMLCanvasElement | null,
  fromText: string,
  toText: string,
  motionStyle: MotionStyle = 'arc',
  shuffleEffect?: ShuffleEffectState
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
  const ghostIntensity = shuffleEffect?.intensity || 0;
  dst.forEach(g => {
    // Subtle destination ghost target pulse during shuffle
    const slotJitter = ghostIntensity > 0.08 ? (seed01(g.index * 19 + (shuffleEffect?.phase || 0)) - 0.5) * 2 * ghostIntensity : 0;
    ctx.fillStyle = ghostIntensity > 0.08
      ? `rgba(0, 0, 0, ${0.12 + 0.14 * ghostIntensity})`
      : 'rgba(0, 0, 0, 0.08)';
    ctx.fillText(g.char, g.x + slotJitter, g.y);
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

    let { x, y, rotation, scale, shadowBlur, shadowY } = computeLetterTransform(
      m,
      normT,
      motionStyle,
      w,
      h,
      mapping.length
    );

    let renderChar = m.char;

    // Apply subtle flicker-shuffle transition if active
    if (shuffleEffect && shuffleEffect.intensity > 0.001) {
      const { intensity, phase } = shuffleEffect;

      // 1. Kinetic micro-vibration / mechanical displacement jitter
      const jitterX = (seed01(m.order * 53 + phase * 7) - 0.5) * 5.5 * intensity;
      const jitterY = (seed01(m.order * 79 + phase * 11) - 0.5) * 4.5 * intensity;
      x += jitterX;
      y += jitterY;

      // 2. Subtle angular flutter
      const rotFlutter = (seed01(m.order * 97 + phase * 13) - 0.5) * 0.14 * intensity;
      rotation += rotFlutter;

      // 3. Tactile spring scale bounce
      const scaleBounce = Math.sin(intensity * Math.PI) * 0.12;
      scale *= 1 + scaleBounce;

      // 4. Glyph flicker / split-flap cycle
      // In the first portion of the shuffle, cycle through uppercase letters
      const flickerSeed = seed01(m.order * 29 + phase * 19);
      if (intensity > 0.22 && flickerSeed > 1 - intensity * 0.72) {
        const charCode = 65 + Math.floor(seed01(m.order * 17 + phase * 23) * 26);
        renderChar = String.fromCharCode(charCode);
      }
    }

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.scale(scale, scale);

    const isDone = normT >= 0.99;
    const isMoving = normT > 0.01 && normT < 0.99;

    if (shuffleEffect && shuffleEffect.intensity > 0.08) {
      // Kinetic mechanical phosphor flash & elevation shadow during active shuffle
      ctx.fillStyle = shuffleEffect.intensity > 0.4 ? '#000000' : '#18181b';
      ctx.shadowColor = `rgba(0, 0, 0, ${0.35 * shuffleEffect.intensity})`;
      ctx.shadowBlur = Math.max(shadowBlur, 8 * shuffleEffect.intensity);
      ctx.shadowOffsetY = Math.max(shadowY, 2.5 * shuffleEffect.intensity);
    } else if (isDone) {
      ctx.fillStyle = '#000000';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.2)'; // Crisp elevation shadow on arrival
      ctx.shadowBlur = 3;
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

    ctx.fillText(renderChar, 0, 0);
    ctx.restore();
  });

  ctx.restore();
}
