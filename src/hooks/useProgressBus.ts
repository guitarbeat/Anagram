import { useRef, useCallback } from 'react';

export type ProgressSubscriber = (progress: number) => void;

export interface ProgressBus {
  progressRef: React.MutableRefObject<number>;
  subscribe: (cb: ProgressSubscriber) => () => void;
  notify: (progress: number) => void;
  get: () => number;
  set: (progress: number) => void;
}

export function useProgressBus(initialProgress = 0): ProgressBus {
  const progressRef = useRef<number>(initialProgress);
  const subscribersRef = useRef<Set<ProgressSubscriber>>(new Set());

  const notify = useCallback((progress: number) => {
    progressRef.current = progress;
    subscribersRef.current.forEach(cb => {
      try {
        cb(progress);
      } catch {
        // Ignore subscriber errors
      }
    });
  }, []);

  const subscribe = useCallback((cb: ProgressSubscriber) => {
    subscribersRef.current.add(cb);
    // Initial sync
    cb(progressRef.current);
    return () => {
      subscribersRef.current.delete(cb);
    };
  }, []);

  const get = useCallback(() => progressRef.current, []);

  const set = useCallback(
    (val: number) => {
      notify(val);
    },
    [notify]
  );

  return {
    progressRef,
    subscribe,
    notify,
    get,
    set,
  };
}
