import { useEffect } from 'react';

/**
 * useWindowPointerDrag
 * Reusable hook to handle window pointer events during dragging.
 * Automatically manages listener attachment, cleanup, and cancellation.
 */
export function useWindowPointerDrag(
  isDragging: boolean,
  onPointerMove: (e: PointerEvent) => void,
  onPointerUp: (e: PointerEvent) => void
): void {
  useEffect(() => {
    if (!isDragging) return;

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [isDragging, onPointerMove, onPointerUp]);
}
