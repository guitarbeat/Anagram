import React from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useToasts } from '../utils/toast';

export const ToastContainer: React.FC = () => {
  const toasts = useToasts();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full px-2">
      {toasts.map(t => {
        const isSuccess = t.type === 'success';
        const isWarning = t.type === 'warning';
        const isError = t.type === 'error';

        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border text-xs font-mono shadow-lg transition-all animate-in slide-in-from-bottom-2 fade-in duration-200 ${
              isSuccess
                ? 'bg-zinc-900 border-emerald-800 text-emerald-300'
                : isError
                ? 'bg-zinc-900 border-rose-800 text-rose-300'
                : isWarning
                ? 'bg-zinc-900 border-amber-800 text-amber-300'
                : 'bg-zinc-900 border-zinc-700 text-zinc-200'
            }`}
          >
            {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            {isError && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
            {isWarning && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />}
            {(!t.type || t.type === 'info') && <Info className="w-4 h-4 text-zinc-400 shrink-0" />}
            <span className="flex-1">{t.message}</span>
          </div>
        );
      })}
    </div>
  );
};
