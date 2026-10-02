/**
 * Deterministic organic blob border-radius generator for UI elements
 * Produces soft, tactile organic pebble/blob outlines consistent with canvas word nodes.
 */
export function getBlobBorderRadius(seed: string | number, variant: 'tile' | 'chip' | 'compact' = 'tile'): string {
  let hash = 0;
  if (typeof seed === 'number') {
    hash = seed * 2654435761;
  } else {
    for (let i = 0; i < seed.length; i++) {
      hash = (hash * 31 + seed.charCodeAt(i)) | 0;
    }
  }
  const idx = Math.abs(hash);

  if (variant === 'chip') {
    const chipPresets = [
      '12px 18px 14px 20px / 18px 12px 20px 14px',
      '18px 12px 20px 14px / 12px 20px 14px 18px',
      '16px 22px 12px 18px / 20px 14px 18px 14px',
      '20px 14px 18px 12px / 14px 18px 14px 20px',
      '14px 20px 16px 22px / 22px 16px 20px 14px',
      '18px 14px 22px 16px / 14px 22px 16px 18px',
    ];
    return chipPresets[idx % chipPresets.length];
  }

  if (variant === 'compact') {
    const compactPresets = [
      '8px 14px 10px 16px / 14px 8px 16px 10px',
      '14px 8px 16px 10px / 8px 16px 10px 14px',
      '12px 16px 8px 14px / 16px 10px 14px 10px',
      '16px 10px 14px 8px / 10px 14px 10px 16px',
    ];
    return compactPresets[idx % compactPresets.length];
  }

  // Standard tile variant (for treemap tiles and larger cards)
  const tilePresets = [
    '16px 24px 18px 26px / 24px 16px 26px 18px',
    '24px 16px 26px 18px / 16px 26px 18px 24px',
    '20px 28px 16px 24px / 26px 18px 24px 18px',
    '26px 18px 24px 16px / 18px 24px 18px 26px',
    '18px 26px 20px 28px / 28px 20px 26px 18px',
    '24px 18px 28px 20px / 18px 28px 20px 24px',
  ];
  return tilePresets[idx % tilePresets.length];
}
