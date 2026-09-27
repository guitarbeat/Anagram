import { useState, useEffect } from 'react';

export interface VisualViewportInfo {
  viewportHeight: number;
  viewportWidth: number;
  isKeyboardOpen: boolean;
}

/**
 * Hook to track mobile visual viewport dimensions accurately,
 * preventing iOS Safari and Chrome virtual keyboard from pushing
 * inputs, headers, and UI elements out of view.
 */
export function useVisualViewport(): VisualViewportInfo {
  const [viewportHeight, setViewportHeight] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      return window.visualViewport ? window.visualViewport.height : window.innerHeight;
    }
    return 800;
  });

  const [viewportWidth, setViewportWidth] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      return window.visualViewport ? window.visualViewport.width : window.innerWidth;
    }
    return 390;
  });

  const [isKeyboardOpen, setIsKeyboardOpen] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleViewportChange = () => {
      const vv = window.visualViewport;
      if (vv) {
        const height = Math.round(vv.height);
        const width = Math.round(vv.width);
        setViewportHeight(height);
        setViewportWidth(width);

        // Detect if virtual keyboard is active (viewport significantly smaller than screen/window)
        const windowHeight = window.innerHeight;
        const diff = windowHeight - height;
        setIsKeyboardOpen(diff > 100);

        // Prevent iOS Safari from shifting/scrolling the layout viewport off-screen
        if (window.scrollY !== 0 || window.scrollX !== 0) {
          window.scrollTo(0, 0);
        }
        if (document.documentElement.scrollTop !== 0) {
          document.documentElement.scrollTop = 0;
        }
        if (document.body.scrollTop !== 0) {
          document.body.scrollTop = 0;
        }
      } else {
        setViewportHeight(window.innerHeight);
        setViewportWidth(window.innerWidth);
      }
    };

    handleViewportChange();

    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener('resize', handleViewportChange, { passive: true });
      vv.addEventListener('scroll', handleViewportChange, { passive: true });
    }
    window.addEventListener('resize', handleViewportChange, { passive: true });
    window.addEventListener('scroll', handleViewportChange, { passive: true });

    return () => {
      if (vv) {
        vv.removeEventListener('resize', handleViewportChange);
        vv.removeEventListener('scroll', handleViewportChange);
      }
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange);
    };
  }, []);

  return { viewportHeight, viewportWidth, isKeyboardOpen };
}
