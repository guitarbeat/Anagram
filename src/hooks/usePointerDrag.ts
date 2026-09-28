import React, { useRef, useState, useCallback } from 'react';

export interface UsePointerDragOptions {
  onDragStart?: (e: React.PointerEvent) => void;
  onDragMove: (deltaX: number, deltaY: number, currentX: number, currentY: number) => void;
  onDragEnd?: () => void;
}

/**
 * Modern pointer-capture drag hook.
 * Uses native setPointerCapture so drag events stay routed to the element
 * without needing fragile global window listeners or polluting document state.
 */
export function usePointerDrag({ onDragStart, onDragMove, onDragEnd }: UsePointerDragOptions) {
  const [isDragging, setIsDragging] = useState(false);
  const startPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLElement>) => {
    // Only respond to primary mouse button or touch
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore if setPointerCapture fails on certain virtual elements
    }

    startPosRef.current = { x: e.clientX, y: e.clientY };
    setIsDragging(true);
    onDragStart?.(e);
  }, [onDragStart]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (!isDragging) return;
    const dx = e.clientX - startPosRef.current.x;
    const dy = e.clientY - startPosRef.current.y;
    onDragMove(dx, dy, e.clientX, e.clientY);
  }, [isDragging, onDragMove]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (!isDragging) return;
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore
    }
    setIsDragging(false);
    onDragEnd?.();
  }, [isDragging, onDragEnd]);

  return {
    isDragging,
    pointerProps: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerUp,
      style: { touchAction: 'none' as const },
    },
  };
}
