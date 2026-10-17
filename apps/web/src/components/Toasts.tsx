import React from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { useToastStore, type ToastKind } from '../lib/toast.js';

const KIND_CONFIG: Record<ToastKind, { bg: string; icon: React.ReactNode }> = {
  error: {
    bg: 'bg-red-50',
    icon: <AlertCircle className="w-5 h-5 shrink-0 text-cartoon-coral" />,
  },
  success: {
    bg: 'bg-green-50',
    icon: <CheckCircle2 className="w-5 h-5 shrink-0 text-green-600" />,
  },
  info: {
    bg: 'bg-sky-50',
    icon: <Info className="w-5 h-5 shrink-0 text-cartoon-sky" />,
  },
};

/**
 * Host global de toasts. Renderizado uma vez no App.
 */
export const Toasts: React.FC = () => {
  const toasts = useToastStore((s) => s.toasts);
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-3 inset-x-0 z-[100] flex flex-col items-center gap-2 px-4 pointer-events-none">
      {toasts.map((t) => {
        const config = KIND_CONFIG[t.kind];
        return (
          <div
            key={t.id}
            role="status"
            aria-live="polite"
            className={`pointer-events-auto w-full max-w-sm flex items-center gap-2 px-4 py-3 rounded-2xl border-3 border-cartoon-dark shadow-cartoon font-bold text-sm text-cartoon-dark animate-fade-in ${config.bg}`}
          >
            {config.icon}
            <span className="flex-1">{t.message}</span>
          </div>
        );
      })}
    </div>
  );
};
