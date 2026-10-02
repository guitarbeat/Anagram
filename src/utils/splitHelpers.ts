/**
 * splitHelpers.ts
 * Direct TypeScript implementation of Helpers.swift from VerticalSplit
 */

/**
 * ScaleDownButtonStyle representation for web/Tailwind
 * Applies tactile scale-down and opacity reduction on press:
 * - opacity: configuration.isPressed ? 0.8 : 1
 * - scaleEffect: configuration.isPressed ? 0.85 : 1
 * - animation: .smooth(0.15s)
 */
export const scaleDownButtonClass =
  'transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.85] active:opacity-80 select-none';

/**
 * Calculates accessible text color (black or white) based on background luminance
 * Direct port of `extension Color { var textColor: Color { ... } }` from Helpers.swift:
 * brightness = ((r * 299) + (g * 587) + (b * 114)) / 1000
 * return brightness < 0.6 ? .white : .black
 */
export function getContrastTextColor(color: string): string {
  let r = 0;
  let g = 0;
  let b = 0;

  if (color.startsWith('#')) {
    const hex = color.replace('#', '');
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16);
      g = parseInt(hex[1] + hex[1], 16);
      b = parseInt(hex[2] + hex[2], 16);
    } else if (hex.length >= 6) {
      r = parseInt(hex.substring(0, 2), 16);
      g = parseInt(hex.substring(2, 4), 16);
      b = parseInt(hex.substring(4, 6), 16);
    }
  } else if (color.startsWith('rgb')) {
    const match = color.match(/\d+/g);
    if (match && match.length >= 3) {
      r = Number(match[0]);
      g = Number(match[1]);
      b = Number(match[2]);
    }
  }

  const brightness = (r * 299 + g * 587 + b * 114) / 1000 / 255;
  return brightness < 0.6 ? '#ffffff' : '#09090b';
}

/**
 * Smart safe area bottom calculation
 * Direct port of `extension EdgeInsets { var smartBottom: CGFloat { bottom == 0 ? 16 : bottom } }`
 */
export function getSmartBottomInset(bottom = 0): number {
  return bottom === 0 ? 16 : bottom;
}

/**
 * Blur Transition helper
 * Direct port of `BlurTransitionModifier` and `AnyTransition.blur(radius:)`
 * (m0ahs refinement: 4px blur instead of 8px for sharper optical clarity)
 */
export function getBlurTransitionStyle(isBlurActive: boolean, radius = 4): React.CSSProperties {
  return {
    filter: isBlurActive ? `blur(${radius}px)` : 'none',
    transition: 'filter 0.3s cubic-bezier(0.2, 0.9, 0.3, 1)',
  };
}

/**
 * Spring transition class matching SwiftUI `.spring(response: 0.3, dampingFraction: 0.7)`
 * from benhernes fork (VerticalSplitBen)
 */
export const springTransitionClass =
  'transition-all duration-300 ease-[cubic-bezier(0.2,0.9,0.3,1)]';

/**
 * Haptic feedback trigger for supported touch/mobile devices
 * Directly implements tuned intensities from benhernes fork:
 * - heavyImpact: 0.8 (overscroll limit)
 * - rigidImpact: 0.9 (harmonic detent notch crossing)
 * - lightImpact: 0.5 (accessory tap)
 */
export function triggerHaptic(type: 'light' | 'notch' | 'medium' | 'heavy'): void {
  if (typeof window === 'undefined' || !('vibrate' in navigator)) return;
  try {
    switch (type) {
      case 'light':
        navigator.vibrate?.(8);
        break;
      case 'notch':
        navigator.vibrate?.(15);
        break;
      case 'medium':
        navigator.vibrate?.([10, 20, 15]);
        break;
      case 'heavy':
        navigator.vibrate?.([25, 35, 20]);
        break;
    }
  } catch {
    // Ignore unsupported environments
  }
}
