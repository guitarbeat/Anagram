import { useState, useEffect } from 'react';

export interface ToastItem {
  id: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  icon?: string;
}

type ToastListener = (toasts: ToastItem[]) => void;

let toastsState: ToastItem[] = [];
const listeners = new Set<ToastListener>();

function notify() {
  listeners.forEach(fn => fn([...toastsState]));
}

export function showToast(
  message: string,
  type: 'info' | 'success' | 'warning' | 'error' = 'info'
) {
  const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
  const item: ToastItem = { id, message, type };
  toastsState = [...toastsState.slice(-3), item]; // keep max 4 toasts
  notify();

  setTimeout(() => {
    toastsState = toastsState.filter(t => t.id !== id);
    notify();
  }, 2600);
}

export function useToasts(): ToastItem[] {
  const [toasts, setToasts] = useState<ToastItem[]>(toastsState);

  useEffect(() => {
    const handleUpdate: ToastListener = newToasts => setToasts(newToasts);
    listeners.add(handleUpdate);
    return () => {
      listeners.delete(handleUpdate);
    };
  }, []);

  return toasts;
}
