import { useState, useEffect } from 'react';

export interface VisualViewportInfo {
  viewportHeight: number;
  viewportWidth: number;
  isKeyboardOpen: boolean;
}

/**
 * Clean, non-intrusive hook tracking mobile visual viewport height
 * using standard window.visualViewport API without layout thrashing.
 */
export function useVisualViewport(): VisualViewportInfo {
  const [viewportHeight, setViewportHeight] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      return window.visualViewport ? Math.round(window.visualViewport.height) : window.innerHeight;
    }
    return 800;
  });

  const [viewportWidth, setViewportWidth] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      return window.visualViewport ? Math.round(window.visualViewport.width) : window.innerWidth;
    }
    return 390;
  });

  const [isKeyboardOpen, setIsKeyboardOpen] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let rafId: number | null = null;

    const update = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const vv = window.visualViewport;
        if (vv) {
          const height = Math.round(vv.height);
          const width = Math.round(vv.width);
          setViewportHeight(height);
          setViewportWidth(width);
          const windowHeight = window.innerHeight;
          setIsKeyboardOpen(windowHeight - height > 120);
        } else {
          setViewportHeight(window.innerHeight);
          setViewportWidth(window.innerWidth);
          setIsKeyboardOpen(false);
        }
      });
    };

    update();

    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener('resize', update, { passive: true });
    } else {
      window.addEventListener('resize', update, { passive: true });
    }

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (vv) {
        vv.removeEventListener('resize', update);
      } else {
        window.removeEventListener('resize', update);
      }
    };
  }, []);

  return { viewportHeight, viewportWidth, isKeyboardOpen };
}
