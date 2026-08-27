// No-op SoundFX stub ensuring zero audio output or audio context initialization
class SoundFX {
  public enabled: boolean = false;
  playPop() {}
  playSuccess() {}
  playWhoosh() {}
}

export const soundFX = new SoundFX();

export function fireConfetti() {
  // Confetti completely removed
}

