import rawWords from 'an-array-of-english-words';

// Filter clean lowercase alphabetical words (274,900+ words)
export const UNABRIDGED_WORDS: string[] = (rawWords as string[]).filter(
  (w: string) => /^[a-z]+$/.test(w) && (w.length >= 2 || w === 'a' || w === 'i')
);

export const UNABRIDGED_COUNT = UNABRIDGED_WORDS.length;

// Lazy precomputed letter count flat buffer for zero-overhead candidate search
let _countsBuffer: Uint8Array | null = null;

export function getUnabridgedCountsBuffer(): Uint8Array {
  if (!_countsBuffer) {
    const total = UNABRIDGED_WORDS.length;
    _countsBuffer = new Uint8Array(total * 26);
    for (let i = 0; i < total; i++) {
      const w = UNABRIDGED_WORDS[i];
      const offset = i * 26;
      for (let j = 0; j < w.length; j++) {
        const code = w.charCodeAt(j) - 97;
        if (code >= 0 && code < 26) {
          _countsBuffer[offset + code]++;
        }
      }
    }
  }
  return _countsBuffer;
}
