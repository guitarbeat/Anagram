import { useCallback, useRef } from 'react';

export type HapticType = 'add' | 'remove' | 'success' | 'snap' | 'light' | 'medium' | 'heavy';

/**
 * Audio Context singleton for subtle tactile click synthesis
 * (fallback for iOS Safari and desktop where navigator.vibrate is unsupported)
 */
let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!sharedAudioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      try {
        sharedAudioCtx = new AudioContextClass();
      } catch {
        // AudioContext may be blocked before user gesture
      }
    }
  }
  if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

/**
 * Synthesizes a subtle, tactile mechanical pop via Web Audio
 */
function playTactileClick(type: HapticType) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    switch (type) {
      case 'add':
      case 'light':
        // Crisp high-frequency tactile micro-tap (like a mechanical key switch)
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.025);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.025);
        osc.start(now);
        osc.stop(now + 0.025);
        break;

      case 'remove':
        // Deeper tactile release click
        osc.frequency.setValueAtTime(95, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.035);
        gain.gain.setValueAtTime(0.07, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);
        osc.start(now);
        osc.stop(now + 0.035);
        break;

      case 'success':
        // Double rising harmonic pop
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.06);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
        osc.start(now);
        osc.stop(now + 0.06);
        break;

      case 'snap':
      case 'medium':
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.02);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);
        osc.start(now);
        osc.stop(now + 0.02);
        break;

      case 'heavy':
        osc.frequency.setValueAtTime(80, now);
        osc.frequency.exponentialRampToValueAtTime(25, now + 0.045);
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);
        osc.start(now);
        osc.stop(now + 0.045);
        break;
    }
  } catch {
    // Non-critical audio feedback
  }
}

/**
 * Triggers physical vibration and tactile feedback
 */
export function triggerHaptic(type: HapticType = 'light'): boolean {
  if (typeof window === 'undefined') return false;

  let didVibrate = false;

  // 1. Hardware Vibration API (Android Chrome, Firefox, Progressive Web Apps)
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      switch (type) {
        case 'add':
        case 'light':
          // Crisp 12ms micro-pulse for placing word
          didVibrate = navigator.vibrate(12);
          break;

        case 'remove':
          // Distinctive double micro-pulse [14ms on, 35ms off, 10ms on] for removal
          didVibrate = navigator.vibrate([14, 35, 10]);
          break;

        case 'success':
          // Triumphant 3-pulse crescendo when solved [15ms, 45ms, 20ms, 40ms, 30ms]
          didVibrate = navigator.vibrate([15, 45, 20, 40, 30]);
          break;

        case 'snap':
          // Subtle 8ms notch snap
          didVibrate = navigator.vibrate(8);
          break;

        case 'medium':
          didVibrate = navigator.vibrate(18);
          break;

        case 'heavy':
          didVibrate = navigator.vibrate(28);
          break;
      }
    } catch {
      didVibrate = false;
    }
  }

  // 2. Play acoustic tactile pop (vital for iOS Safari and desktop tactile feel)
  playTactileClick(type);

  return didVibrate;
}

/**
 * Dedicated React hook for physical tactile feedback
 */
export function useHaptics() {
  const lastTriggerTime = useRef<number>(0);

  const trigger = useCallback((type: HapticType = 'light', throttleMs: number = 25) => {
    const now = Date.now();
    if (now - lastTriggerTime.current < throttleMs) {
      return;
    }
    lastTriggerTime.current = now;
    triggerHaptic(type);
  }, []);

  return {
    trigger,
    wordAdded: useCallback(() => trigger('add'), [trigger]),
    wordRemoved: useCallback(() => trigger('remove'), [trigger]),
    solved: useCallback(() => trigger('success'), [trigger]),
    snap: useCallback(() => trigger('snap'), [trigger]),
    light: useCallback(() => trigger('light'), [trigger]),
    medium: useCallback(() => trigger('medium'), [trigger]),
    heavy: useCallback(() => trigger('heavy'), [trigger]),
  };
}
